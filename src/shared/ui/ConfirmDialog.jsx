import { useEffect, useId, useRef } from "react";
import { TriangleAlert } from "lucide-react";

/**
 * Confirmación de una acción destructiva. El foco empieza en «Cancelar»; Esc o un clic fuera la cierran.
 * Mientras `busy` es verdadero no se puede cerrar ni confirmar dos veces.
 */
export function ConfirmDialog({ open, title, children, confirmLabel = "Eliminar", busy = false, error, onConfirm, onCancel }) {
  const titleId = useId();
  const bodyId = useId();
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);
  const returnRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    returnRef.current = document.activeElement;
    cancelRef.current?.focus();
    // Al cerrar, el foco vuelve a quien abrió el diálogo si sigue en la página.
    return () => {
      if (returnRef.current?.isConnected) returnRef.current.focus();
    };
  }, [open]);

  if (!open) return null;

  const close = () => {
    if (!busy) onCancel();
  };
  const onKeyDown = (e) => {
    if (e.key === "Escape") close();
    if (e.key === "Tab") {
      // Mantiene el foco dentro del diálogo: solo hay dos botones.
      e.preventDefault();
      (document.activeElement === cancelRef.current ? confirmRef : cancelRef).current?.focus();
    }
  };

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId} onKeyDown={onKeyDown}>
        <span className="dialog__icon"><TriangleAlert size={22} aria-hidden="true" /></span>
        <h2 id={titleId} className="dialog__title">{title}</h2>
        <div id={bodyId} className="dialog__body">{children}</div>
        {error && <p className="dialog__error" role="alert">{error}</p>}
        <div className="dialog__actions">
          <button ref={cancelRef} type="button" className="btn" onClick={close} disabled={busy}>Cancelar</button>
          <button ref={confirmRef} type="button" className="btn btn--danger" onClick={onConfirm} disabled={busy}>
            {busy ? "Eliminando…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
