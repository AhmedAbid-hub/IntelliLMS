import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  Info,
  Link2,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { post, type RecordData } from "../../lib/api";
import { useAuth } from "../auth/Auth";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { ErrorState } from "../../components/shared";

type LinkAccountProps = {
  row: RecordData;
};

const colors = {
  dark: "#183e2e",
  green: "#176443",
  muted: "#6b8073",
  border: "#dce8df",
  soft: "#f5f9f5",
};

export function LinkAccount({ row }: LinkAccountProps) {
  const { user } = useAuth();
  const client = useQueryClient();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [done, setDone] = useState(false);

  const instituteId = user?.institute_id;
  const hasInstitute = Boolean(instituteId);

  const username = String(row.username || "Account");

  const fullName = [
    row.first_name,
    row.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const email = String(row.email || "");

  function openDialog() {
    setDone(false);
    setError(undefined);
    setOpen(true);
  }

  function closeDialog() {
    if (busy) return;
    setOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy || !hasInstitute || done) return;

    setBusy(true);
    setError(undefined);

    try {
      await post("memberships/attach/", {
        user: row.id,
        role: "admin",
        institute: instituteId,
      });

      await client.invalidateQueries();

      setDone(true);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={!hasInstitute || busy}
        onClick={openDialog}
        title={
          hasInstitute
            ? "Appoint this account as an Institute Administrator"
            : "Select an institute from the sidebar first"
        }
      >
        <Link2 size={15} aria-hidden="true" />
        Link to institute
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            openDialog();
          } else {
            closeDialog();
          }
        }}
        title={
          done
            ? "Administrator linked"
            : "Link Institute Administrator"
        }
      >
        {done ? (
          <div
            role="status"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 14,
              padding: "16px 4px 4px",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#e5f5ea",
                color: colors.green,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h3
                style={{
                  margin: "0 0 8px",
                  fontSize: 20,
                  color: colors.dark,
                }}
              >
                Administrator linked successfully
              </h3>

              <p
                style={{
                  margin: 0,
                  color: colors.muted,
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                <strong style={{ color: colors.dark }}>
                  {username}
                </strong>{" "}
                has been appointed as an Institute Administrator
                for the selected institute.
              </p>
            </div>

            <div
              style={{
                width: "100%",
                padding: "13px 15px",
                background: colors.soft,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                boxSizing: "border-box",
                fontSize: 13,
                color: colors.dark,
              }}
            >
              The account can now use the institute access
              granted by this appointment.
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                width: "100%",
                paddingTop: 17,
                borderTop: `1px solid ${colors.border}`,
                marginTop: 8,
              }}
            >
              <Button type="button" onClick={closeDialog}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              {/* Selected account */}
              <section>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    marginBottom: 12,
                    color: colors.dark,
                  }}
                >
                  <UserRound size={18} />

                  <strong style={{ fontSize: 14 }}>
                    Selected account
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    padding: "15px 16px",
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    background: "#ffffff",
                  }}
                >
                  <div
                    style={{
                      width: 45,
                      height: 45,
                      borderRadius: "50%",
                      background: "#e4f1e8",
                      color: colors.green,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 750,
                      fontSize: 15,
                      flexShrink: 0,
                    }}
                  >
                    {username.charAt(0).toUpperCase()}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <strong
                      style={{
                        display: "block",
                        color: colors.dark,
                        fontSize: 14,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {username}
                    </strong>

                    {fullName && (
                      <span
                        style={{
                          display: "block",
                          marginTop: 3,
                          color: colors.muted,
                          fontSize: 13,
                        }}
                      >
                        {fullName}
                      </span>
                    )}

                    {email && (
                      <span
                        style={{
                          display: "block",
                          marginTop: 3,
                          color: colors.muted,
                          fontSize: 12,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {email}
                      </span>
                    )}
                  </div>
                </div>
              </section>

              {/* Appointment */}
              <section>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    marginBottom: 12,
                    color: colors.dark,
                  }}
                >
                  <Building2 size={18} />

                  <strong style={{ fontSize: 14 }}>
                    Institute appointment
                  </strong>
                </div>

                <div
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    background: colors.soft,
                    padding: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(0, 1fr) auto",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          color: colors.muted,
                          fontSize: 12,
                          marginBottom: 5,
                        }}
                      >
                        Target institute
                      </span>

                      <strong
                        style={{
                          display: "block",
                          color: colors.dark,
                          fontSize: 14,
                        }}
                      >
                        Currently selected institute
                      </strong>

                      <span
                        style={{
                          display: "block",
                          color: colors.muted,
                          fontSize: 12,
                          marginTop: 4,
                        }}
                      >
                        Institute ID: {String(instituteId)}
                      </span>
                    </div>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "6px 9px",
                        borderRadius: 8,
                        background: "#e0f1e6",
                        color: colors.green,
                        fontSize: 12,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <ShieldCheck size={14} />
                      Institute Admin
                    </span>
                  </div>
                </div>
              </section>

              {/* Explanation */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "13px 15px",
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                  background: "#f8faf7",
                  color: colors.muted,
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                <Info
                  size={17}
                  style={{
                    flexShrink: 0,
                    marginTop: 2,
                    color: colors.green,
                  }}
                />

                <div>
                  This action creates an{" "}
                  <strong style={{ color: colors.dark }}>
                    Institute Administrator
                  </strong>{" "}
                  membership for the selected account in the
                  currently selected institute.
                  It does not grant teaching or student access.
                </div>
              </div>

              {!!error && <ErrorState error={error} />}

              {/* Footer */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: 12,
                  paddingTop: 18,
                  borderTop: `1px solid ${colors.border}`,
                  flexWrap: "wrap",
                }}
              >
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={closeDialog}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={busy || !hasInstitute}
                >
                  <Link2 size={16} aria-hidden="true" />
                  {busy
                    ? "Linking administrator…"
                    : "Link administrator"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
