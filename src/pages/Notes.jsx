import { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { CrudToolbar, DetailGrid, Field, ItemActions } from '../components/Crud.jsx';
import { Modal } from '../components/Feedback.jsx';
import MarkdownPreview from '../components/MarkdownPreview.jsx';
import { uid } from '../data/storage.js';
import { buildCourseCatalog, courseLabel } from '../utils/courses.js';
import { cleanText, compareDate, compareText, entityTimestamps, formatUpdated, matchesSearch } from '../utils/entity.js';
import { buildNoteExport, downloadTextFile, normalizeIds, normalizeTags, readingMinutes, stripMarkdown, wordCount } from '../utils/knowledge.js';

const emptyNote = {
  title: '', body: '', tags: '', tag: '', pinned: false, favorite: false, archived: false, folder: '', courseId: '', resourceIds: [], format: 'markdown',
};

function noteFilename(note, extension = 'md') {
  const base = (note.title || 'lifeos-note').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lifeos-note';
  return `${base}.${extension}`;
}

function recordRecent(api, note) {
  const entry = { id: uid(), entityType: 'Note', entityId: note.id, title: note.title || 'Untitled Note', page: 'notes', openedAt: new Date().toISOString() };
  const previous = (api.data.recentItems || []).filter((item) => !(item.entityType === entry.entityType && item.entityId === entry.entityId));
  api.update('recentItems', [entry, ...previous].slice(0, 12));
}

export default function Notes({ api }) {
  const notes = api.data.notes || [];
  const resources = api.data.resources || [];
  const catalog = buildCourseCatalog(api.data.courses || [], api.data.semesters || []);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('All');
  const [folder, setFolder] = useState('All');
  const [course, setCourse] = useState('All');
  const [scope, setScope] = useState('Active');
  const [sort, setSort] = useState('pinned');
  const [draft, setDraft] = useState({ ...emptyNote });
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editorMode, setEditorMode] = useState('edit');
  const [dirty, setDirty] = useState(false);
  const [autosaveState, setAutosaveState] = useState('Saved');
  const savedSnapshot = useRef('');

  const courseName = (id) => { const found = catalog.find((entry) => entry.id === id || entry.sourceId === id); return found ? courseLabel(found) : 'Not linked'; };

  useEffect(() => {
    const target = api.navigationTarget;
    if (target?.page !== 'notes' || !target.id) return;
    const item = notes.find((entry) => entry.id === target.id);
    if (item) { setViewing(item); recordRecent(api, item); }
    api.consumeNavigationTarget?.();
  }, [api, notes]);

  useEffect(() => {
    if (!formOpen || !editingId || !dirty) return undefined;
    setAutosaveState('Saving…');
    const timeout = window.setTimeout(() => {
      const existing = notes.find((note) => note.id === editingId);
      if (!existing) return;
      const next = buildNote(draft, existing, editingId);
      api.update('notes', notes.map((note) => note.id === editingId ? next : note));
      const selectedResources = new Set(next.resourceIds || []);
      api.update('resources', resources.map((resource) => ({
        ...resource,
        noteIds: selectedResources.has(resource.id)
          ? [...new Set([...(resource.noteIds || []), next.id])]
          : (resource.noteIds || []).filter((id) => id !== next.id),
      })));
      savedSnapshot.current = JSON.stringify(draft);
      setDirty(false);
      setAutosaveState(`Saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [api, dirty, draft, editingId, formOpen, notes]);

  const buildNote = (source, existing = {}, id = null) => {
    const tags = normalizeTags(source.tags?.length ? source.tags : source.tag);
    return {
      ...existing,
      ...source,
      id: id || uid(),
      title: cleanText(source.title),
      body: String(source.body || '').trimEnd(),
      folder: cleanText(source.folder),
      tags,
      tag: tags[0] || '',
      resourceIds: normalizeIds(source.resourceIds),
      format: 'markdown',
      ...entityTimestamps(existing),
    };
  };

  const setDraftValue = (patch) => {
    setDraft((current) => ({ ...current, ...patch }));
    setDirty(true);
  };

  const startCreate = () => {
    const next = { ...emptyNote, tags: '', resourceIds: [] };
    setDraft(next); setEditingId(null); setFormOpen(true); setEditorMode('edit'); setDirty(false); setAutosaveState('New note'); savedSnapshot.current = JSON.stringify(next);
  };

  const openEdit = (note) => {
    const next = { ...emptyNote, ...note, tags: normalizeTags(note.tags?.length ? note.tags : note.tag).join(', '), resourceIds: normalizeIds(note.resourceIds) };
    setEditingId(note.id); setDraft(next); setFormOpen(true); setEditorMode('edit'); setDirty(false); setAutosaveState('Saved'); savedSnapshot.current = JSON.stringify(next);
  };

  const closeForm = async () => {
    if (dirty && JSON.stringify(draft) !== savedSnapshot.current && !editingId) {
      const accepted = await api.confirm({ title: 'Discard unsaved note?', message: 'This new note has not been saved yet.', confirmLabel: 'Discard', danger: true });
      if (!accepted) return;
    }
    setFormOpen(false); setEditingId(null); setDraft({ ...emptyNote }); setDirty(false); setEditorMode('edit');
  };

  const saveNote = (event) => {
    event.preventDefault();
    const title = cleanText(draft.title);
    const body = String(draft.body || '').trim();
    if (!title && !body) return api.notify('Add a title or note content.', 'warning', 'Note not saved');
    const existing = notes.find((note) => note.id === editingId) || {};
    const next = buildNote(draft, existing, editingId);
    api.update('notes', editingId ? notes.map((note) => note.id === editingId ? next : note) : [...notes, next]);
    const selectedResources = new Set(next.resourceIds || []);
    api.update('resources', resources.map((resource) => ({
      ...resource,
      noteIds: selectedResources.has(resource.id)
        ? [...new Set([...(resource.noteIds || []), next.id])]
        : (resource.noteIds || []).filter((id) => id !== next.id),
    })));
    api.activity?.(`${editingId ? 'Note updated' : 'Note saved'}: ${title || 'Untitled'}`);
    api.notify('Note saved successfully.', 'success');
    savedSnapshot.current = JSON.stringify(next);
    setDirty(false); setFormOpen(false); setEditingId(null); setDraft({ ...emptyNote });
  };

  const toggleField = (note, field) => api.update('notes', notes.map((item) => item.id === note.id ? { ...item, [field]: !item[field], ...entityTimestamps(item) } : item));

  const duplicate = (note) => {
    const copy = { ...note, id: uid(), title: `${note.title || 'Untitled Note'} (Copy)`, pinned: false, favorite: false, lastOpenedAt: '', ...entityTimestamps() };
    api.update('notes', [...notes, copy]);
    const linkedResources = new Set(copy.resourceIds || []);
    if (linkedResources.size) {
      api.update('resources', resources.map((resource) => linkedResources.has(resource.id)
        ? { ...resource, noteIds: [...new Set([...(resource.noteIds || []), copy.id])] }
        : resource));
    }
    api.notify('Note duplicated.', 'success');
  };

  const remove = async (note) => {
    if (!await api.confirm({ title: 'Delete note?', message: `“${note.title || 'Untitled Note'}” will be permanently removed. Resources will remain.`, confirmLabel: 'Delete note', danger: true })) return;
    api.update('notes', notes.filter((item) => item.id !== note.id));
    api.update('resources', resources.map((resource) => ({ ...resource, noteIds: (resource.noteIds || []).filter((id) => id !== note.id) })));
    api.notify('Note deleted.', 'success');
  };

  const openNote = (note) => {
    const updated = { ...note, lastOpenedAt: new Date().toISOString() };
    api.update('notes', notes.map((item) => item.id === note.id ? updated : item));
    setViewing(updated);
    recordRecent(api, updated);
  };

  const exportNote = (note, extension = 'md') => {
    const content = extension === 'txt' ? `${note.title || 'Untitled Note'}\n\n${stripMarkdown(note.body)}` : buildNoteExport(note, courseName(note.courseId));
    downloadTextFile(noteFilename(note, extension), content);
    api.notify(`Note exported as ${extension.toUpperCase()}.`, 'success');
  };

  const copyNote = async (note) => {
    try {
      await navigator.clipboard.writeText(buildNoteExport(note, courseName(note.courseId)));
      api.notify('Note copied to clipboard.', 'success');
    } catch {
      api.notify('Clipboard access was blocked by the browser.', 'warning');
    }
  };

  const printNote = (note) => {
    setViewing(note);
    document.body.classList.add('printing-note');
    const cleanup = () => document.body.classList.remove('printing-note');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(() => window.print(), 80);
  };

  const allTags = ['All', ...new Set(notes.flatMap((note) => normalizeTags(note.tags?.length ? note.tags : note.tag)))];
  const folders = ['All', ...new Set(notes.map((note) => note.folder).filter(Boolean))];
  const visible = useMemo(() => notes.filter((note) => {
    if (scope === 'Active' && note.archived) return false;
    if (scope === 'Archived' && !note.archived) return false;
    if (scope === 'Pinned' && !note.pinned) return false;
    if (scope === 'Favorites' && !note.favorite) return false;
    if (tag !== 'All' && !normalizeTags(note.tags?.length ? note.tags : note.tag).includes(tag)) return false;
    if (folder !== 'All' && note.folder !== folder) return false;
    if (course !== 'All' && note.courseId !== course) return false;
    return matchesSearch(query, note.title, note.body, note.folder, note.tags, courseName(note.courseId));
  }).sort((a, b) => {
    if (sort === 'title') return compareText(a.title, b.title);
    if (sort === 'oldest') return compareDate(a.updatedAt || '', b.updatedAt || '');
    if (sort === 'course') return compareText(courseName(a.courseId), courseName(b.courseId)) || compareText(a.title, b.title);
    if (sort === 'opened') return compareDate(b.lastOpenedAt || '', a.lastOpenedAt || '');
    if (sort === 'updated') return compareDate(b.updatedAt || '', a.updatedAt || '');
    return Number(b.pinned) - Number(a.pinned) || Number(b.favorite) - Number(a.favorite) || compareDate(b.updatedAt || '', a.updatedAt || '');
  }), [course, folder, notes, query, scope, sort, tag]);

  return (
    <>
      <Header title="Knowledge Notes" subtitle="Write Markdown notes, organize by course and folder, connect resources, export and find knowledge quickly." />
      <section className="statsGrid four">
        <StatCard label="Total Notes" value={notes.length} note={`${notes.filter((note) => !note.archived).length} active`} />
        <StatCard label="Pinned" value={notes.filter((note) => note.pinned).length} note="important notes" tone="green" />
        <StatCard label="Words" value={notes.reduce((sum, note) => sum + wordCount(note.body), 0)} note="across all notes" tone="purple" />
        <StatCard label="Folders" value={folders.length - 1} note={`${allTags.length - 1} tags`} tone="orange" />
      </section>
      <Card>
        <div className="cardHead"><div><h3>Note Library</h3><p>Markdown, autosave, course links, folders, tags and connected resources.</p></div><button type="button" className="primaryBtn" onClick={startCreate}>Create Note</button></div>
        <CrudToolbar query={query} onQueryChange={setQuery} count={visible.length} queryPlaceholder="Search title, content, folder, course or tag" filters={[
          { label: 'View', value: scope, onChange: setScope, options: ['Active', 'All', 'Pinned', 'Favorites', 'Archived'] },
          { label: 'Tag', value: tag, onChange: setTag, options: allTags },
          { label: 'Folder', value: folder, onChange: setFolder, options: folders },
          { label: 'Course', value: course, onChange: setCourse, options: [{ value: 'All', label: 'All courses' }, ...catalog.map((item) => ({ value: item.id, label: courseLabel(item) }))] },
        ]} sortValue={sort} onSortChange={setSort} sortOptions={[{ value: 'pinned', label: 'Pinned first' }, { value: 'updated', label: 'Recently updated' }, { value: 'opened', label: 'Recently opened' }, { value: 'oldest', label: 'Oldest updated' }, { value: 'title', label: 'Title' }, { value: 'course', label: 'Course' }]} />
        {visible.length === 0 ? <EmptyState title="No matching notes" text="Create a note or change your search and filters." /> : <div className="itemGrid noteGrid">{visible.map((note) => <article className={`itemCard note ${note.archived ? 'archivedItem' : ''}`} key={note.id}>
          <div className="inlinePills"><span className="pill">{note.folder || 'Note'}</span>{note.pinned ? <span className="pill subtle">Pinned</span> : null}{note.favorite ? <span className="pill subtle">Favorite</span> : null}</div>
          <h4>{note.title || 'Untitled Note'}</h4><p className="notePreview">{stripMarkdown(note.body) || 'No content'}</p>
          <div className="tagRow">{normalizeTags(note.tags).slice(0, 4).map((item) => <span className="tagChip" key={item}>#{item}</span>)}</div>
          <p className="metadata">{courseName(note.courseId)} · {wordCount(note.body)} words · {formatUpdated(note.updatedAt)}</p>
          <div className="resourceQuickActions"><button className="ghostBtn" type="button" onClick={() => toggleField(note, 'favorite')}>{note.favorite ? 'Unfavorite' : 'Favorite'}</button><button className="ghostBtn" type="button" onClick={() => exportNote(note, 'md')}>Export</button></div>
          <ItemActions onView={() => openNote(note)} onEdit={() => openEdit(note)} onDuplicate={() => duplicate(note)} onArchive={() => toggleField(note, 'archived')} archiveLabel={note.archived ? 'Restore' : 'Archive'} onDelete={() => remove(note)} />
        </article>)}</div>}
      </Card>

      <Modal open={formOpen} wide title={editingId ? 'Edit Note' : 'Create Note'} onClose={closeForm} actions={<><span className="autosaveStatus">{editingId ? autosaveState : dirty ? 'Unsaved changes' : 'New note'}</span><button className="ghostBtn" type="button" onClick={closeForm}>Close</button><button className="primaryBtn" type="submit" form="note-form">Save Note</button></>}>
        <form id="note-form" className="formGrid modalForm noteEditorForm" onSubmit={saveNote}>
          <Field label="Title" full><input value={draft.title} onChange={(event) => setDraftValue({ title: event.target.value })} placeholder="Note title" autoFocus /></Field>
          <Field label="Course"><select value={draft.courseId || ''} onChange={(event) => setDraftValue({ courseId: event.target.value })}><option value="">Not linked</option>{catalog.map((item) => <option value={item.id} key={item.id}>{courseLabel(item)}</option>)}</select></Field>
          <Field label="Folder"><input value={draft.folder || ''} onChange={(event) => setDraftValue({ folder: event.target.value })} placeholder="e.g. Semester 4" /></Field>
          <Field label="Tags" full><input value={draft.tags || ''} onChange={(event) => setDraftValue({ tags: event.target.value })} placeholder="exam, algorithm, revision" /></Field>
          <Field label="Related resources" full><select multiple value={draft.resourceIds || []} onChange={(event) => setDraftValue({ resourceIds: [...event.target.selectedOptions].map((option) => option.value) })}>{resources.filter((resource) => !resource.archived).map((resource) => <option value={resource.id} key={resource.id}>{resource.title}</option>)}</select></Field>
          <Field label="Flags" full><div className="settingsChecks"><label><input type="checkbox" checked={Boolean(draft.pinned)} onChange={(event) => setDraftValue({ pinned: event.target.checked })} /> Pin</label><label><input type="checkbox" checked={Boolean(draft.favorite)} onChange={(event) => setDraftValue({ favorite: event.target.checked })} /> Favorite</label></div></Field>
          <div className="fieldFull editorModeTabs"><button type="button" className={editorMode === 'edit' ? 'active' : ''} onClick={() => setEditorMode('edit')}>Edit</button><button type="button" className={editorMode === 'preview' ? 'active' : ''} onClick={() => setEditorMode('preview')}>Preview</button><span>{wordCount(draft.body)} words · {readingMinutes(draft.body)} min read</span></div>
          {editorMode === 'edit' ? <Field label="Markdown content" full hint="Supports headings, bold, italic, lists, checklists, links, quotes and code blocks."><textarea className="noteMarkdownEditor" rows="18" value={draft.body} onChange={(event) => setDraftValue({ body: event.target.value })} placeholder={'# Topic\n\nWrite your note with **Markdown**...'} /></Field> : <div className="fieldFull notePreviewPanel"><MarkdownPreview value={draft.body} /></div>}
        </form>
      </Modal>

      <Modal open={Boolean(viewing)} wide title={viewing?.title || 'Untitled Note'} onClose={() => setViewing(null)} actions={<><button className="ghostBtn" type="button" onClick={() => copyNote(viewing)}>Copy</button><button className="ghostBtn" type="button" onClick={() => exportNote(viewing, 'txt')}>Export TXT</button><button className="ghostBtn" type="button" onClick={() => exportNote(viewing, 'md')}>Export MD</button><button className="ghostBtn" type="button" onClick={() => printNote(viewing)}>Print</button><button className="primaryBtn" type="button" onClick={() => { openEdit(viewing); setViewing(null); }}>Edit Note</button></>}>
        {viewing ? <div className="notePrintArea"><DetailGrid rows={[{ label: 'Folder', value: viewing.folder || 'None' }, { label: 'Course', value: courseName(viewing.courseId) }, { label: 'Tags', value: normalizeTags(viewing.tags).join(', ') || 'None' }, { label: 'Words', value: `${wordCount(viewing.body)} · ${readingMinutes(viewing.body)} min read` }, { label: 'Status', value: viewing.archived ? 'Archived' : 'Active' }, { label: 'Last updated', value: formatUpdated(viewing.updatedAt) }]} /><MarkdownPreview value={viewing.body} />
          {viewing.resourceIds?.length ? <div className="relatedResources"><h4>Related Resources</h4>{viewing.resourceIds.map((id) => { const resource = resources.find((entry) => entry.id === id); return resource ? <button type="button" className="textLink" onClick={() => api.navigate('resources', { id: resource.id })} key={id}>{resource.title}</button> : null; })}</div> : null}</div> : null}
      </Modal>
    </>
  );
}
