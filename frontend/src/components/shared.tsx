import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { useAuth } from "../features/auth/Auth";

export { Loading, ErrorState } from "./Feedback";

export function Empty({
  children = "No records yet. Add your first record to get started.",
}: {
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={30} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  const { role } = useAuth();

  const defaultEyebrow =
    role === "superadmin"
      ? "PLATFORM ADMINISTRATION"
      : "YOUR LEARNING WORKSPACE";

  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">
          {eyebrow ?? defaultEyebrow}
        </p>

        <h1>{title}</h1>

        <p className="muted">{description}</p>
      </div>

      {children != null && (
        <div className="heading-actions">
          {children}
        </div>
      )}
    </header>
  );
}