import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./Auth";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/Feedback";

export function HeadWorkspace() {
  const { user, selectWorkspace } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const membership = user?.memberships.find(
    (m) => m.institute_id === user.institute_id,
  );
  if (membership?.role !== "head") return null;
  const workspace = user?.academic_workspace || "department";
  async function change(next: "department" | "teaching") {
    if (busy || next === workspace) return;
    setBusy(true);
    setError(undefined);
    try {
      await selectWorkspace(next);
      navigate(next === "teaching" ? "/offerings" : "/");
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Head workspace" className="sidebar-nav-group">
      <div className="sidebar-nav-heading">Head workspace</div>
      <div
        className="row-actions"
        role="group"
        aria-label="Select Head workspace"
      >
        <Button
          variant={workspace === "department" ? "default" : "outline"}
          aria-pressed={workspace === "department"}
          disabled={busy}
          onClick={() => void change("department")}
        >
          Department management
        </Button>
        <Button
          variant={workspace === "teaching" ? "default" : "outline"}
          aria-pressed={workspace === "teaching"}
          disabled={busy || !membership?.can_teach}
          onClick={() => void change("teaching")}
        >
          My teaching
        </Button>
      </div>
      <p className="muted">
        {workspace === "teaching"
          ? "Only your assigned classes. Department approvals are in management."
          : "Department oversight and approvals. Teaching access requires a personal assignment."}
      </p>
      {!!error && <ErrorState error={error} />}
    </section>
  );
}
