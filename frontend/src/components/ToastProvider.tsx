import { useEffect, useState, type ReactNode } from "react";
const eventName = "intellilms:saved";
export function notifySaved(message = "Changes saved.") {
  window.dispatchEvent(new CustomEvent(eventName, { detail: message }));
}
export function ToastProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<{ message: string } | null>(null);
  useEffect(() => {
    const receive = (event: Event) =>
      setNotice({ message: String((event as CustomEvent).detail) });
    window.addEventListener(eventName, receive);
    return () => window.removeEventListener(eventName, receive);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  return (
    <>
      {children}
      {notice && (
        <div className="toast" role="status" aria-live="polite">
          <span>{notice.message}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
