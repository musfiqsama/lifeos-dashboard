export function Field({ label, hint, children, full = false }) {
  return (
    <label className={`fieldGroup ${full ? 'fieldFull' : ''}`}>
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function CrudToolbar({
  query,
  onQueryChange,
  queryPlaceholder = 'Search items',
  filters = [],
  sortValue,
  onSortChange,
  sortOptions = [],
  count,
}) {
  return (
    <div className="crudToolbar">
      <div className="crudSearch">
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={queryPlaceholder}
          aria-label={queryPlaceholder}
        />
        {typeof count === 'number' ? <span>{count} result{count === 1 ? '' : 's'}</span> : null}
      </div>
      {filters.map((filter) => (
        <label className="compactField" key={filter.label}>
          <span>{filter.label}</span>
          <select value={filter.value} onChange={(event) => filter.onChange(event.target.value)}>
            {filter.options.map((option) => {
              const value = typeof option === 'string' ? option : option.value;
              const label = typeof option === 'string' ? option : option.label;
              return <option value={value} key={value}>{label}</option>;
            })}
          </select>
        </label>
      ))}
      {sortOptions.length ? (
        <label className="compactField">
          <span>Sort</span>
          <select value={sortValue} onChange={(event) => onSortChange(event.target.value)}>
            {sortOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>
      ) : null}
    </div>
  );
}

export function ItemActions({ onView, onEdit, onDuplicate, onArchive, archiveLabel, onDelete }) {
  return (
    <div className="itemActions">
      {onView ? <button type="button" className="ghostBtn" onClick={onView}>View</button> : null}
      {onEdit ? <button type="button" className="ghostBtn" onClick={onEdit}>Edit</button> : null}
      {onDuplicate ? <button type="button" className="ghostBtn" onClick={onDuplicate}>Duplicate</button> : null}
      {onArchive ? <button type="button" className="ghostBtn" onClick={onArchive}>{archiveLabel || 'Archive'}</button> : null}
      {onDelete ? <button type="button" className="dangerBtn" onClick={onDelete}>Delete</button> : null}
    </div>
  );
}

export function DetailGrid({ rows }) {
  return (
    <dl className="detailGrid">
      {rows.filter((row) => row.value !== undefined && row.value !== null && row.value !== '').map((row) => (
        <div key={row.label} className={row.full ? 'detailFull' : ''}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}


export function ChecklistEditor({ items = [], onChange, addLabel = 'Add item', itemPlaceholder = 'Checklist item' }) {
  const add = () => onChange([...(items || []), { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, title: '', done: false }]);
  const update = (id, patch) => onChange((items || []).map((item) => item.id === id ? { ...item, ...patch } : item));
  const remove = (id) => onChange((items || []).filter((item) => item.id !== id));
  return (
    <div className="checklistEditor">
      {(items || []).map((item, index) => (
        <div className="checklistEditRow" key={item.id || index}>
          <input type="checkbox" checked={Boolean(item.done)} onChange={(event) => update(item.id, { done: event.target.checked })} aria-label={`Mark ${item.title || `item ${index + 1}`} complete`} />
          <input value={item.title || ''} onChange={(event) => update(item.id, { title: event.target.value })} placeholder={itemPlaceholder} />
          <button type="button" className="dangerBtn" onClick={() => remove(item.id)}>Remove</button>
        </div>
      ))}
      <button type="button" className="ghostBtn" onClick={add}>{addLabel}</button>
    </div>
  );
}
