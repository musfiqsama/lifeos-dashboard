import { useEffect, useId, useRef } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

const modalStack = [];

const icons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertTriangle,
  info: Info,
};

export function ToastStack({ items, onDismiss }) {
  return (
    <div className="toastStack" aria-live="polite" aria-atomic="true">
      {items.map((item) => {
        const Icon = icons[item.type] || Info;
        return (
          <div className={`toast toast-${item.type || 'info'}`} key={item.id} role="status">
            <Icon size={20} aria-hidden="true" />
            <div>
              {item.title ? <strong>{item.title}</strong> : null}
              <p>{item.message}</p>
            </div>
            <button type="button" className="toastClose" aria-label="Dismiss notification" onClick={() => onDismiss(item.id)}>
              <X size={18} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function Modal({ open, title, children, actions, onClose, wide = false }) {
  const panelRef = useRef(null);
  const dialogId = useId();
  const titleId = `${dialogId}-title`;

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const panel = panelRef.current;
    modalStack.push(dialogId);
    const selector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
    const focusables = () => [...(panel?.querySelectorAll(selector) || [])];
    window.requestAnimationFrame(() => focusables()[0]?.focus());

    const onKeyDown = (event) => {
      if (modalStack.at(-1) !== dialogId) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('modalOpen');
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const index = modalStack.lastIndexOf(dialogId);
      if (index >= 0) modalStack.splice(index, 1);
      if (!modalStack.length) document.body.classList.remove('modalOpen');
      previousFocus?.focus?.();
    };
  }, [dialogId, onClose, open]);

  if (!open) return null;
  return (
    <div className="modalBackdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose?.();
    }}>
      <section ref={panelRef} className={`modalPanel ${wide ? 'modalWide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modalHeader">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="iconBtn" aria-label="Close dialog" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modalBody">{children}</div>
        {actions ? <div className="modalActions">{actions}</div> : null}
      </section>
    </div>
  );
}

export function ConfirmDialog({ request, onResolve }) {
  return (
    <Modal
      open={Boolean(request)}
      title={request?.title || 'Confirm action'}
      onClose={() => onResolve(false)}
      actions={(
        <>
          <button type="button" className="ghostBtn" onClick={() => onResolve(false)}>Cancel</button>
          <button type="button" className={request?.danger ? 'dangerBtn' : 'primaryBtn'} onClick={() => onResolve(true)}>
            {request?.confirmLabel || 'Confirm'}
          </button>
        </>
      )}
    >
      <p>{request?.message}</p>
    </Modal>
  );
}
