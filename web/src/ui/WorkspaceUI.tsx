import { ReactNode, useEffect, useId, useRef } from "react";
import { Icon } from "./Icons";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name="document" size={26} />
      </span>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export function LoadingRows() {
  return (
    <div className="loading-rows" role="status" aria-label="Memuatkan">
      <span className="sr-only">Memuatkan…</span>
      {[1, 2, 3].map((n) => (
        <div className="skeleton" key={n} />
      ))}
    </div>
  );
}
export function ErrorNotice({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="err" role="alert">
      <span>{message}</span>
      {retry && (
        <button className="btn" onClick={retry}>
          Cuba lagi
        </button>
      )}
    </div>
  );
}
export function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog${wide ? " dialog-wide" : ""}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Tutup"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="dialog-content">{children}</div>
    </dialog>
  );
}
export const KIND_LABEL: Record<string, string> = {
  diary: "Site Diary",
  memo: "Memo",
  minit: "Minit mesyuarat",
};
export const STATUS_LABEL: Record<string, string> = {
  overdue: "Tamat tempoh",
  due_soon: "Hampir tamat",
  active: "Aktif",
  issued: "Dikeluarkan",
};
export function dateLabel(value?: string | null) {
  return value
    ? new Date(
        value.length === 10 ? `${value}T00:00:00` : value,
      ).toLocaleDateString("ms-MY", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
}
