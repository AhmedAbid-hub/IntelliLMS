import { AlertCircle } from "lucide-react";

export function Loading() {
  return (
    <div aria-label="Loading" className="skeleton-grid">
      {[1, 2, 3].map((n) => (
        <div key={n} className="skeleton" />
      ))}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  return (
    <div role="alert" className="error">
      <AlertCircle size={18} aria-hidden="true" />
      {error instanceof Error
        ? error.message
        : "Something went wrong."}
    </div>
  );
}

