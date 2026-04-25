import { useState } from 'react';
import Header from '../components/Header.jsx';
import { Card, EmptyState, StatCard } from '../components/Card.jsx';
import { uid } from '../data/storage.js';

export default function Notes({ api }) {
  const notes = api.data.notes || [];
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState({ title: '', body: '', tag: '' });
  const addNote = () => {
    if (!draft.title && !draft.body) return;
    api.update('notes', [...notes, { id: uid(), ...draft, pinned: false, date: new Date().toLocaleDateString() }]);
    api.activity?.(`Note saved: ${draft.title || 'Untitled'}`);
    setDraft({ title: '', body: '', tag: '' });
  };
  const remove = (id) => api.update('notes', notes.filter((n) => n.id !== id));
  const togglePin = (id) => api.update('notes', notes.map((n) => n.id === id ? { ...n, pinned: !n.pinned } : n));
  const visible = notes.filter((n) => `${n.title} ${n.body} ${n.tag}`.toLowerCase().includes(query.toLowerCase())).sort((a,b) => Number(b.pinned) - Number(a.pinned));

  return (
    <>
      <Header title="Notes Vault" subtitle="Save quick ideas, class notes and personal study reminders." />
      <section className="statsGrid three">
        <StatCard label="Total Notes" value={notes.length} note="saved locally" />
        <StatCard label="Pinned" value={notes.filter((n)=>n.pinned).length} note="important notes" tone="green" />
        <StatCard label="Tags" value={new Set(notes.map((n)=>n.tag).filter(Boolean)).size} note="categories" tone="purple" />
      </section>
      <section className="twoCol wideLeft">
        <Card>
          <h3>Create Note</h3>
          <div className="noteEditor">
            <input placeholder="Note title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <input placeholder="Tag / subject" value={draft.tag} onChange={(e) => setDraft({ ...draft, tag: e.target.value })} />
            <textarea placeholder="Write your note..." rows="8" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            <button className="primaryBtn" onClick={addNote}>Save Note</button>
          </div>
        </Card>
        <Card>
          <h3>Search Notes</h3>
          <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search title, body or tag" />
          <div className="summaryBig">{visible.length}</div>
          <p>Matching notes</p>
        </Card>
      </section>
      <Card>
        <h3>Saved Notes</h3>
        {visible.length === 0 ? <EmptyState title="No notes found" text="Create your first note or try another search." /> : (
          <div className="itemGrid">
            {visible.map((note) => (
              <div className="itemCard note" key={note.id}>
                <p className="pill">{note.pinned ? 'Pinned' : (note.tag || note.date)}</p>
                <h4>{note.title || 'Untitled Note'}</h4>
                <p>{note.body}</p>
                <div className="timerButtons"><button className="ghostBtn" onClick={() => togglePin(note.id)}>{note.pinned ? 'Unpin' : 'Pin'}</button><button className="dangerBtn" onClick={() => remove(note.id)}>Delete</button></div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
