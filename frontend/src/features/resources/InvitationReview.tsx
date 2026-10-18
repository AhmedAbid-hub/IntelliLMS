import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Mail } from "lucide-react";

import { post, type RecordData } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { ErrorState } from "../../components/shared";

type Invitation = {
  state: string;
  email_status: string | null;
  issued_at: string | null;
  expires_at: string | null;
  accepted_at: string | null;
};

type InvitationReviewProps = {
  row: RecordData;
  triggerVariant?: "default" | "menu";
  onOpen?: () => void;
};

export function InvitationReview({
  row,
  triggerVariant = "default",
  onOpen,
}: InvitationReviewProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [status, setStatus] = useState("");
  const [latest, setLatest] = useState<Invitation>();

  const client = useQueryClient();

  const invite = latest || (row.invitation as Invitation | undefined);
  const setupLabel = { pending: "Pending setup", expired: "Invitation expired", accepted: "Invitation accepted", existing_account: "Existing account" }[invite?.state || ""] || "Existing account";
  const emailLabel = busy ? "Sending" : ({
    pending: "Sending",
    accepted: "Submitted to email provider",
    failed: "Email sending failed",
    local: "Captured locally — not sent to an email provider",
    sent: "Previous mail-backend acceptance — provider submission unverified",
  }[invite?.email_status || ""] || "No invitation transport record");

  const pending =
    invite && ["pending", "expired"].includes(invite.state);

  function openDialog() {
    setError(undefined);
    setStatus("");
    setLatest(undefined);
    setOpen(true);
    onOpen?.();
  }

  return (
    <>
      {triggerVariant === "menu" ? (
        <button
          type="button"
          className="people-action-menu-item"
          onClick={openDialog}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "10px 11px",
            border: 0,
            borderRadius: 8,
            background: "transparent",
            color: "inherit",
            font: "inherit",
            fontSize: 13,
            fontWeight: 500,
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <Mail size={16} aria-hidden="true" />
          <span>Invitation</span>
        </button>
      ) : (
        <Button variant="outline" onClick={openDialog}>
          Invitation
        </Button>
      )}

      {open && (
        <Dialog
          open
          title={`Invitation for ${row.username}`}
          onOpenChange={() => setOpen(false)}
        >
          <p>
            Account setup:{" "}
            <strong>
              {setupLabel}
            </strong>
          </p>

          <p>
            Email:{" "}
            <strong>
              {emailLabel}
            </strong>
          </p>

          {invite?.issued_at && (
            <p>
              Issued:{" "}
              {new Date(invite.issued_at).toLocaleString()}
            </p>
          )}

          {invite?.expires_at && (
            <p>
              Expires:{" "}
              {new Date(invite.expires_at).toLocaleString()}
            </p>
          )}

          <p className="muted">
            Invitations expire after 48 hours. Resending
            invalidates the previous invitation. Email-provider
            acceptance does not confirm delivery to the
            recipient's inbox.
          </p>

          {invite?.email_status === "failed" && !busy && <p role="alert">The email could not be submitted. Ask the system administrator to check the backend mail configuration and safe server error logs, then resend.</p>}
          {invite?.email_status === "local" && <p role="alert">This backend uses a local test mailbox. It does not deliver to the recipient. Start the intended SMTP-configured backend before resending.</p>}
          {invite?.email_status === "sent" && <p>This older record does not identify the mail transport. Check the backend configuration before resending.</p>}

          {!pending && (
            <p>
              This user can use Forgot Password to request a
              30-minute reset link.
            </p>
          )}

          {pending && (
            <Button
              disabled={busy || !row.active}
              onClick={async () => {
                setBusy(true);
                setError(undefined);
                setStatus("");

                try {
                  const result = await post<Invitation>(
                    `memberships/${row.id}/resend-invitation/`
                  );
                  setLatest(result);
                  setStatus(result.email_status === "accepted"
                    ? "Submitted to email provider. This does not confirm inbox delivery."
                    : result.email_status === "pending" ? "Invitation is queued for sending. Reopen this dialog to refresh its status."
                    : "");
                  await client.invalidateQueries();
                } catch (err) {
                  setError(err);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Sending…" : "Resend invitation"}
            </Button>
          )}

          {!!error && <ErrorState error={error} />}

          <p role="status">{status}</p>
        </Dialog>
      )}
    </>
  );
}
