import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";

import { api, post, type RecordData } from "../../lib/api";
import { Dialog } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { RelationSelect } from "../../components/RelationSelect";
import { ErrorState, Loading } from "../../components/shared";
import { useAuth } from "../auth/Auth";
import { notifySaved } from "../../components/ToastProvider";

type StaffLifecycleProps = {
  row: RecordData;
  triggerVariant?: "default" | "menu";
  onOpen?: () => void;
};

export function StaffLifecycle({
  row,
  triggerVariant = "default",
  onOpen,
}: StaffLifecycleProps) {
  const { role, user } = useAuth();

  const [open, setOpen] = useState(false);
  const [operation, setOperation] = useState(
    row.active ? "deactivate" : "reactivate"
  );
  const [nextRole, setNextRole] = useState(String(row.role));
  const [unit, setUnit] = useState(String(row.unit || ""));
  const [replacement, setReplacement] = useState("");
  const [reason, setReason] = useState("");
  const [outgoing, setOutgoing] = useState("teacher");
  const [canTeach, setCanTeach] = useState(Boolean(row.can_teach));
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);

  const client = useQueryClient();

  const impact = useQuery({
    queryKey: ["membership-impact", row.id],
    queryFn: () =>
      api<{
        active_assignments: number;
        active_enrollments: number;
        courses: { id: string; title: string }[];
      }>(`memberships/${row.id}/impact/`),
    enabled: open,
  });

  if (
    row.user === user?.id ||
    (row.role === "admin" && role !== "superadmin")
  ) {
    return null;
  }

  function openDialog() {
    setOperation(row.active ? "deactivate" : "reactivate");
    setNextRole(String(row.role));
    setUnit(String(row.unit || ""));
    setReplacement("");
    setReason("");
    setOutgoing("teacher");
    setCanTeach(Boolean(row.can_teach));
    setError(undefined);
    setOpen(true);
    onOpen?.();
  }

  return (
    <>
      {triggerVariant === "menu" ? (
        <button
          type="button"
          onClick={openDialog}
          className="people-action-menu-item"
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
          <ShieldCheck size={16} aria-hidden="true" />
          <span>Manage access</span>
        </button>
      ) : (
        <Button variant="outline" onClick={openDialog}>
          Manage access
        </Button>
      )}

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={`Manage ${row.display_name || row.username}`}
      >
        {impact.isPending ? (
          <Loading />
        ) : impact.isError ? (
          <ErrorState error={impact.error} />
        ) : (
          <>
            <p>
              Review the consequences before confirming. Historical
              grades, attendance and audit records are preserved.
              This changes this institute's membership only.
            </p>

            <div className="info-strip">
              {impact.data.active_assignments} active teaching
              assignments · {impact.data.active_enrollments} active
              enrollments
            </div>

            {impact.data.courses.length > 0 && (
              <ul>
                {impact.data.courses.map((course) => (
                  <li key={course.id}>{course.title}</li>
                ))}
              </ul>
            )}

            {impact.data.active_assignments >
              impact.data.courses.length && (
              <p>
                Showing the first 50 assignments. The server
                validates and reassigns all affected active courses.
              </p>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError(undefined);

                try {
                  const target =
                    operation === "replace_head"
                      ? "replace-head"
                      : "transition";

                  await post(
                    `memberships/${row.id}/${target}/`,
                    operation === "replace_head"
                      ? {
                          replacement,
                          outgoing_action: outgoing,
                          reason,
                        }
                      : {
                          operation,
                          reason,
                          ...(replacement ? { replacement } : {}),
                          ...(operation === "change_role"
                            ? {
                                role: nextRole,
                                unit: unit || null,
                                can_teach: canTeach,
                              }
                            : {}),
                        }
                  );

                  await client.invalidateQueries();
                  setOpen(false);

                  notifySaved(
                    "Membership access updated. Historical records preserved."
                  );
                } catch (err) {
                  setError(err);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Action
                <select
                  value={operation}
                  onChange={(e) => setOperation(e.target.value)}
                >
                  <option value="deactivate">
                    Deactivate membership
                  </option>
                  <option value="remove">
                    Remove from institute
                  </option>
                  <option value="reactivate">
                    Reactivate membership
                  </option>

                  {row.role !== "student" &&
                    role !== "superadmin" && (
                      <option value="change_role">
                        Change staff role or department
                      </option>
                    )}

                  {row.role === "head" && !!row.active && (
                    <option value="replace_head">
                      Replace Department Head
                    </option>
                  )}
                </select>
              </label>

              {operation === "change_role" && (
                <>
                  <label>
                    New staff role
                    <select
                      value={nextRole}
                      onChange={(e) => setNextRole(e.target.value)}
                    >
                      <option value="teacher">Teacher</option>
                      <option value="head">Department Head</option>

                      {role === "superadmin" && (
                        <option value="admin">
                          Institute Admin
                        </option>
                      )}
                    </select>
                  </label>

                  <RelationSelect
                    label="Department"
                    source="units"
                    value={unit}
                    onChange={(v) => setUnit(String(v))}
                  />

                  {nextRole === "head" && (
                    <label className="checkbox-label">
                      Retain teaching responsibilities
                      <input
                        type="checkbox"
                        checked={canTeach}
                        onChange={(e) =>
                          setCanTeach(e.target.checked)
                        }
                      />
                    </label>
                  )}
                </>
              )}

              {operation === "replace_head" && (
                <label>
                  Outgoing head's membership
                  <select
                    value={outgoing}
                    onChange={(e) => setOutgoing(e.target.value)}
                  >
                    <option value="teacher">
                      Become a Teacher
                    </option>
                    <option value="deactivate">Deactivate</option>
                    <option value="remove">
                      Remove from institute
                    </option>
                  </select>
                </label>
              )}

              {(operation === "replace_head" ||
                (impact.data.active_assignments > 0 &&
                  operation !== "reactivate")) && (
                <RelationSelect
                  label="Replacement teacher"
                  valueKey="id"
                  source={`memberships?role=teacher&active=true${
                    operation === "replace_head"
                      ? `&unit=${row.unit}`
                      : ""
                  }`}
                  value={replacement}
                  onChange={(v) => setReplacement(String(v))}
                  required={operation === "replace_head"}
                />
              )}

              {row.role === "student" &&
                ["remove", "deactivate"].includes(operation) && (
                  <p className="warning-banner">
                    Active enrollments will be withdrawn.
                    Reactivating membership will not automatically
                    restore enrollments.
                  </p>
                )}

              <label>
                Reason
                <textarea
                  required
                  minLength={5}
                  maxLength={1000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>

              {!!error && <ErrorState error={error} />}

              <Button disabled={busy}>
                {busy
                  ? "Updating access…"
                  : "Confirm membership change"}
              </Button>
            </form>
          </>
        )}
      </Dialog>
    </>
  );
}