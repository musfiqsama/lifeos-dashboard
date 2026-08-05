import { useEffect, useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { CrudToolbar, DetailGrid, Field, ItemActions } from '../components/Crud.jsx';
import { Modal } from '../components/Feedback.jsx';
import { uid } from '../data/storage.js';
import { buildCourseCatalog, courseLabel } from '../utils/courses.js';
import { cleanText, compareDate, compareText, entityTimestamps, formatUpdated, matchesSearch } from '../utils/entity.js';
import { isSafeResourceUrl, normalizeIds, normalizeTags, resourceHost } from '../utils/knowledge.js';

const TYPES = ['PDF', 'Website', 'Video', 'Drive Link', 'Image', 'Book', 'Lecture Slide', 'Assignment', 'Other'];
const emptyResource = {
  title: '', type: 'Website', url: '', description: '', courseId: '', tags: '', noteIds: [], taskId: '', examId: '',
  pinned: false, favorite: false, archived: false,
};

function recordRecent(api, resource) {
  const entry = { id: uid(), entityType: 'Resource', entityId: resource.id, title: resource.title || 'Untitled Resource', page: 'resources', openedAt: new Date().toISOString() };
  const previous = (api.data.recentItems || []).filter((item) => !(item.entityType === entry.entityType && item.entityId === entry.entityId));
  api.update('recentItems', [entry, ...previous].slice(0, 12));
}

export default function Resources({ api }) {
  const resources = api.data.resources || [];
  const notes = api.data.notes || [];
  const tasks = api.data.tasks || [];
  const exams = api.data.exams || [];
  const catalog = buildCourseCatalog(api.data.courses || [], api.data.semesters || []);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');
  const [course, setCourse] = useState('All');
  const [scope, setScope] = useState('Active');
  const [sort, setSort] = useState('pinned');
  const [draft, setDraft] = useState(emptyResource);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    const target = api.navigationTarget;
    if (target?.page !== 'resources' || !target.id) return;
    const item = resources.find((entry) => entry.id === target.id);
    if (item) setViewing(item);
    api.consumeNavigationTarget?.();
  }, [api, resources]);

  const courseName = (id) => { const found = catalog.find((entry) => entry.id === id || entry.sourceId === id); return found ? courseLabel(found) : 'Not linked'; };
  const closeForm = () => { setDraft(emptyResource); setEditingId(null); };
  const openEdit = (resource) => { setEditingId(resource.id); setDraft({ ...emptyResource, ...resource, tags: normalizeTags(resource.tags).join(', '), noteIds: normalizeIds(resource.noteIds) }); };

  const saveResource = (event) => {
    event.preventDefault();
    const title = cleanText(draft.title);
    const url = cleanText(draft.url);
    if (!title) return api.notify('Resource title is required.', 'warning', 'Resource not saved');
    if (!isSafeResourceUrl(url)) return api.notify('Use a valid http, https or mailto link.', 'warning', 'Unsafe resource link');
    const existing = resources.find((item) => item.id === editingId) || {};
    const next = {
      ...existing,
      ...draft,
      id: editingId || uid(),
      title,
      url,
      description: cleanText(draft.description),
      tags: normalizeTags(draft.tags),
      noteIds: normalizeIds(draft.noteIds),
      ...entityTimestamps(existing),
    };
    api.update('resources', editingId ? resources.map((item) => item.id === editingId ? next : item) : [...resources, next]);
    const selectedNotes = new Set(next.noteIds || []);
    api.update('notes', notes.map((note) => ({
      ...note,
      resourceIds: selectedNotes.has(note.id)
        ? [...new Set([...(note.resourceIds || []), next.id])]
        : (note.resourceIds || []).filter((id) => id !== next.id),
    })));
    api.activity?.(`${editingId ? 'Resource updated' : 'Resource saved'}: ${title}`);
    api.notify('Resource saved successfully.', 'success');
    closeForm();
  };

  const remove = async (resource) => {
    if (!await api.confirm({ title: 'Delete resource?', message: `“${resource.title}” will be permanently removed. Linked notes will remain.`, confirmLabel: 'Delete resource', danger: true })) return;
    api.update('resources', resources.filter((item) => item.id !== resource.id));
    api.update('notes', notes.map((note) => ({ ...note, resourceIds: (note.resourceIds || []).filter((id) => id !== resource.id) })));
    api.notify('Resource deleted.', 'success');
  };

  const duplicate = (resource) => {
    const copy = { ...resource, id: uid(), title: `${resource.title} (Copy)`, pinned: false, favorite: false, lastOpenedAt: '', ...entityTimestamps() };
    api.update('resources', [...resources, copy]);
    const linkedNotes = new Set(copy.noteIds || []);
    if (linkedNotes.size) {
      api.update('notes', notes.map((note) => linkedNotes.has(note.id)
        ? { ...note, resourceIds: [...new Set([...(note.resourceIds || []), copy.id])] }
        : note));
    }
    api.notify('Resource duplicated.', 'success');
  };

  const toggleField = (resource, field) => api.update('resources', resources.map((item) => item.id === resource.id ? { ...item, [field]: !item[field], ...entityTimestamps(item) } : item));

  const openLink = (resource) => {
    if (!resource.url || !isSafeResourceUrl(resource.url)) return api.notify('This resource does not have a valid link.', 'warning');
    const openedAt = new Date().toISOString();
    api.update('resources', resources.map((item) => item.id === resource.id ? { ...item, lastOpenedAt: openedAt } : item));
    recordRecent(api, resource);
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };

  const visible = useMemo(() => resources.filter((item) => {
    if (scope === 'Active' && item.archived) return false;
    if (scope === 'Archived' && !item.archived) return false;
    if (scope === 'Favorites' && !item.favorite) return false;
    if (type !== 'All' && item.type !== type) return false;
    if (course !== 'All' && item.courseId !== course) return false;
    return matchesSearch(query, item.title, item.description, item.url, item.tags, courseName(item.courseId));
  }).sort((a, b) => {
    if (sort === 'title') return compareText(a.title, b.title);
    if (sort === 'type') return compareText(a.type, b.type) || compareText(a.title, b.title);
    if (sort === 'opened') return compareDate(b.lastOpenedAt || '', a.lastOpenedAt || '');
    if (sort === 'updated') return compareDate(b.updatedAt || '', a.updatedAt || '');
    return Number(b.pinned) - Number(a.pinned) || Number(b.favorite) - Number(a.favorite) || compareDate(b.updatedAt || '', a.updatedAt || '');
  }), [course, query, resources, scope, sort, type]);

  const formOpen = editingId !== null || draft !== emptyResource;
  const active = resources.filter((item) => !item.archived);

  return (
    <>
      <Header title="Course Resources" subtitle="Keep course links, PDFs, videos, slides and references connected to your study system." />
      <section className="statsGrid four">
        <StatCard label="Resources" value={resources.length} note={`${active.length} active`} />
        <StatCard label="Pinned" value={resources.filter((item) => item.pinned).length} note="quick access" tone="green" />
        <StatCard label="Favorites" value={resources.filter((item) => item.favorite).length} note="saved references" tone="purple" />
        <StatCard label="Courses" value={new Set(resources.map((item) => item.courseId).filter(Boolean)).size} note="with resources" tone="orange" />
      </section>
      <Card>
        <div className="cardHead"><div><h3>Resource Library</h3><p>Store metadata and safe external links without filling browser storage with large files.</p></div><button type="button" className="primaryBtn" onClick={() => setDraft({ ...emptyResource, tags: '', noteIds: [] })}>Add Resource</button></div>
        <CrudToolbar query={query} onQueryChange={setQuery} count={visible.length} queryPlaceholder="Search title, link, description or tag"
          filters={[
            { label: 'View', value: scope, onChange: setScope, options: ['Active', 'All', 'Favorites', 'Archived'] },
            { label: 'Type', value: type, onChange: setType, options: ['All', ...TYPES] },
            { label: 'Course', value: course, onChange: setCourse, options: [{ value: 'All', label: 'All courses' }, ...catalog.map((item) => ({ value: item.id, label: courseLabel(item) }))] },
          ]}
          sortValue={sort} onSortChange={setSort} sortOptions={[{ value: 'pinned', label: 'Pinned first' }, { value: 'updated', label: 'Recently updated' }, { value: 'opened', label: 'Recently opened' }, { value: 'title', label: 'Title' }, { value: 'type', label: 'Type' }]} />
        {visible.length === 0 ? <EmptyState title="No matching resources" text="Add a resource or change the current filters." /> : <div className="itemGrid resourceGrid">{visible.map((resource) => <article className={`itemCard resourceCard ${resource.archived ? 'archivedItem' : ''}`} key={resource.id}>
          <div className="inlinePills"><span className="pill">{resource.type}</span>{resource.pinned ? <span className="pill subtle">Pinned</span> : null}{resource.favorite ? <span className="pill subtle">Favorite</span> : null}</div>
          <h4>{resource.title}</h4><p className="notePreview">{resource.description || resourceHost(resource.url) || 'No description'}</p>
          <p className="metadata">{courseName(resource.courseId)} · {normalizeTags(resource.tags).join(', ') || 'No tags'}</p>
          <div className="resourceQuickActions">{resource.url ? <button className="primaryBtn" type="button" onClick={() => openLink(resource)}>Open Link</button> : null}<button className="ghostBtn" type="button" onClick={() => toggleField(resource, 'favorite')}>{resource.favorite ? 'Unfavorite' : 'Favorite'}</button></div>
          <ItemActions onView={() => { setViewing(resource); recordRecent(api, resource); }} onEdit={() => openEdit(resource)} onDuplicate={() => duplicate(resource)} onArchive={() => toggleField(resource, 'archived')} archiveLabel={resource.archived ? 'Restore' : 'Archive'} onDelete={() => remove(resource)} />
        </article>)}</div>}
      </Card>

      <Modal open={Boolean(formOpen)} wide title={editingId ? 'Edit Resource' : 'Add Resource'} onClose={closeForm} actions={<><button className="ghostBtn" type="button" onClick={closeForm}>Cancel</button><button className="primaryBtn" type="submit" form="resource-form">Save Resource</button></>}>
        <form id="resource-form" className="formGrid modalForm" onSubmit={saveResource}>
          <Field label="Title" full><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Resource title" autoFocus /></Field>
          <Field label="Type"><select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>{TYPES.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Course"><select value={draft.courseId || ''} onChange={(event) => setDraft({ ...draft, courseId: event.target.value })}><option value="">Not linked</option>{catalog.map((item) => <option value={item.id} key={item.id}>{courseLabel(item)}</option>)}</select></Field>
          <Field label="Resource URL" full hint="Use a public http/https link. Large files are not stored in localStorage."><input type="url" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="https://..." /></Field>
          <Field label="Tags" full><input value={draft.tags || ''} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="lecture, exam, chapter 3" /></Field>
          <Field label="Related notes" full><select multiple value={draft.noteIds || []} onChange={(event) => setDraft({ ...draft, noteIds: [...event.target.selectedOptions].map((option) => option.value) })}>{notes.filter((note) => !note.archived).map((note) => <option value={note.id} key={note.id}>{note.title || 'Untitled Note'}</option>)}</select></Field>
          <Field label="Related task"><select value={draft.taskId || ''} onChange={(event) => setDraft({ ...draft, taskId: event.target.value })}><option value="">Not linked</option>{tasks.map((task) => <option value={task.id} key={task.id}>{task.title}</option>)}</select></Field>
          <Field label="Related exam"><select value={draft.examId || ''} onChange={(event) => setDraft({ ...draft, examId: event.target.value })}><option value="">Not linked</option>{exams.map((exam) => <option value={exam.id} key={exam.id}>{exam.title}</option>)}</select></Field>
          <Field label="Flags"><div className="settingsChecks"><label><input type="checkbox" checked={Boolean(draft.pinned)} onChange={(event) => setDraft({ ...draft, pinned: event.target.checked })} /> Pin resource</label><label><input type="checkbox" checked={Boolean(draft.favorite)} onChange={(event) => setDraft({ ...draft, favorite: event.target.checked })} /> Favorite</label></div></Field>
          <Field label="Description" full><textarea rows="6" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="What is this resource useful for?" /></Field>
        </form>
      </Modal>

      <Modal open={Boolean(viewing)} wide title={viewing?.title || 'Resource details'} onClose={() => setViewing(null)} actions={<>{viewing?.url ? <button className="ghostBtn" type="button" onClick={() => openLink(viewing)}>Open Link</button> : null}<button className="primaryBtn" type="button" onClick={() => { openEdit(viewing); setViewing(null); }}>Edit Resource</button></>}>
        {viewing ? <><DetailGrid rows={[{ label: 'Type', value: viewing.type }, { label: 'Course', value: courseName(viewing.courseId) }, { label: 'Tags', value: normalizeTags(viewing.tags).join(', ') || 'None' }, { label: 'Host', value: resourceHost(viewing.url) || 'No link' }, { label: 'Last opened', value: viewing.lastOpenedAt ? formatUpdated(viewing.lastOpenedAt) : 'Never' }, { label: 'Last updated', value: formatUpdated(viewing.updatedAt) }, { label: 'Description', value: viewing.description || 'No description', full: true }]} />
          {viewing.noteIds?.length ? <div className="detailChecklist"><h4>Related Notes</h4>{viewing.noteIds.map((id) => <p key={id}>{notes.find((note) => note.id === id)?.title || 'Missing note'}</p>)}</div> : null}</> : null}
      </Modal>
    </>
  );
}
