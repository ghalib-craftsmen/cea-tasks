interface ToastProps {
  ok: boolean;
  message: string;
  onClose: () => void;
}

export default function Toast({ ok, message, onClose }: ToastProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`toast toast--${ok ? "success" : "error"}`}
    >
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss notification">
        ✕
      </button>
    </div>
  );
}
