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

  const client = useQueryClient();

  const invite = row.invitation as Invitation | undefined;

  const pending =
    invite && ["pending", "expired"].includes(invite.state);

  function openDialog() {
    setError(undefined);
    setStatus("");
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
              {invite?.state.replaceAll("_", " ") ||
                "Existing account"}
            </strong>
          </p>

          <p>
            Email:{" "}
            <strong>
              {invite?.email_status === "sent"
                ? "Submitted to mail backend"
                : invite?.email_status ||
                  "No invitation transport record"}
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
            invalidates the previous invitation. Mail-backend
            acceptance does not confirm delivery to the
            recipient's inbox.
          </p>

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

                try {
                  await post(
                    `memberships/${row.id}/resend-invitation/`
                  );

                  await client.invalidateQueries();

                  setStatus(
                    "Invitation request processed. Review the refreshed email status above."
                  );
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