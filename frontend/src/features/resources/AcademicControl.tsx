import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FilePenLine, History, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ErrorState, Loading } from "../../components/shared";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { api, post, type RecordData } from "../../lib/api";
import { useAuth } from "../auth/Auth";
import { SectionHeading, humanize } from "./corrections/CorrectionPresentation";

export const kinds: Record<string, string> = {
  submissions: "submission",
  attempts: "attempt",
  "manual-grades": "manual",
  attendance: "attendance",
  "attendance-sessions": "attendance_session",
};

export type Control = {
  lock_reason?: string | null;
  kind: string;
  target: string;
  finalized: boolean;
  current: Record<string, unknown>;
  can_finalize: boolean;
  can_review: boolean;
  questions?: {
    id: string;
    prompt: string;
    marks: number;
  }[];
};

export function AcademicControl({
  resource,
  row,
}: {
  resource: string;
  row: RecordData;
}) {
  const { role } = useAuth();
  const [open, setOpen] = useState(false);
  const kind = kinds[resource];
  const allowed = !!kind && ["admin", "head", "teacher"].includes(role);
  const query = useQuery({
    queryKey: ["academic-control", kind, row.id],
    queryFn: () =>
      api<Control>(
        `academic-control/?kind=${encodeURIComponent(
          kind,
        )}&target=${encodeURIComponent(String(row.id))}`,
      ),
    enabled: open && allowed,
  });
  if (!allowed) {
    return null;
  }
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <ShieldCheck size={15} aria-hidden="true" />
        Request correction
      </Button>
      {open && (
        <Dialog
          open
          title="Grade & attendance record correction"
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setOpen(false);
          }}
        >
          {query.isPending ? (
            <Loading />
          ) : query.isError ? (
            <ErrorState error={query.error} />
          ) : (
            <ControlForm key={`${kind}:${String(row.id)}`} data={query.data} />
          )}
        </Dialog>
      )}
    </>
  );
}

export function ControlForm({ data }: { data: Control }) {
  const { role } = useAuth();
  const client = useQueryClient();
  const [reason, setReason] = useState("");
  const [values, setValues] = useState<Record<string, unknown>>(data.current);
  const [emergency, setEmergency] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [status, setStatus] = useState("");
  const canRequestCorrection = ["admin", "head", "teacher"].includes(role);
  const canFinalize = role === "admin" && data.can_finalize;
  const canEmergencyOverride = canFinalize;
  const manual = (values.manual_marks || {}) as Record<string, number>;
  async function execute(path: string, body: unknown, message: string) {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(undefined);
    setStatus("");
    try {
      await post(path, body);
      await client.invalidateQueries();
      setStatus(message);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  function correctionPayload() {
    const proposed =
      data.kind === "attendance"
        ? {
            status: values.status,
          }
        : data.kind === "attempt"
          ? {
              manual_marks: manual,
            }
          : {
              marks: values.marks,
              feedback: values.feedback || "",
              released: !!values.released,
            };
    return {
      kind: data.kind,
      target: data.target,
      reason,
      proposed,
    };
  }
  return (
    <>
      <div className="info-strip" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            flexWrap: "wrap",
          }}
        >
          {data.finalized ? (
            <ShieldCheck size={17} aria-hidden="true" />
          ) : (
            <FilePenLine size={17} aria-hidden="true" />
          )}
          <strong>
            {data.finalized
              ? "Finalized academic record"
              : "Academic record not finalized"}
          </strong>
        </div>
        <p style={{ margin: "8px 0 0" }}>
          {data.finalized
            ? "Ordinary edits are locked. Approved corrections preserve the finalized status."
            : data.lock_reason
              ? `${data.lock_reason} Use an audited correction.`
              : "Existing authorized teaching workflows remain available."}
        </p>
      </div>
      {canRequestCorrection && data.kind !== "attendance_session" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void execute(
              emergency ? "corrections/emergency/" : "corrections/",
              correctionPayload(),
              emergency
                ? "Emergency override applied and audited."
                : "Correction requested. An authorized reviewer must approve it before the record changes.",
            );
          }}
        >
          <SectionHeading
            title="Request a grade or attendance correction"
            description="Provide the proposed change and a reason. The original record remains unchanged until an authorized decision is made."
          />
          {data.kind === "attendance_session" ? (
            <p>
              <Link
                className="text-link"
                to={`/attendance?session=${encodeURIComponent(data.target)}`}
              >
                Open individual attendance records to request corrections
              </Link>
            </p>
          ) : data.kind === "attendance" ? (
            <label>
              Proposed attendance status
              <select
                value={String(values.status ?? "")}
                onChange={(event) =>
                  setValues({
                    ...values,
                    status: event.target.value,
                  })
                }
              >
                {["present", "absent", "late", "excused"].map((value) => (
                  <option key={value} value={value}>
                    {humanize(value)}
                  </option>
                ))}
              </select>
            </label>
          ) : data.kind === "attempt" ? (
            <>
              {data.questions?.map((question) => (
                <label key={question.id}>
                  {question.prompt} (out of {question.marks})
                  <input
                    aria-label={`Corrected marks: ${question.prompt}`}
                    type="number"
                    min="0"
                    max={question.marks}
                    step="0.01"
                    required
                    value={manual[question.id] ?? ""}
                    onChange={(event) =>
                      setValues({
                        ...values,
                        manual_marks: {
                          ...manual,
                          [question.id]: Number(event.target.value),
                        },
                      })
                    }
                  />
                </label>
              ))}
            </>
          ) : (
            <>
              <label>
                Proposed marks
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={String(values.marks ?? "")}
                  onChange={(event) =>
                    setValues({
                      ...values,
                      marks: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Proposed feedback
                <textarea
                  value={String(values.feedback ?? "")}
                  onChange={(event) =>
                    setValues({
                      ...values,
                      feedback: event.target.value,
                    })
                  }
                />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={!!values.released}
                  onChange={(event) =>
                    setValues({
                      ...values,
                      released: event.target.checked,
                    })
                  }
                />
                Release corrected result
              </label>
            </>
          )}
          <label>
            Reason for this academic action
            <textarea
              required
              minLength={5}
              maxLength={1000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why this correction is necessary..."
            />
          </label>
          {data.kind !== "attendance_session" && (
            <>
              {canEmergencyOverride && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={emergency}
                    onChange={(event) => setEmergency(event.target.checked)}
                  />
                  Apply an emergency Admin override directly (audited)
                </label>
              )}
              {emergency && (
                <p
                  style={{
                    color: "#b42318",
                    background: "#fff1f0",
                    border: "1px solid #f3c2bc",
                    padding: "11px 13px",
                    borderRadius: 9,
                    fontSize: 12,
                  }}
                >
                  Emergency overrides apply directly without the ordinary
                  approval workflow. Use only when authorized and necessary.
                </p>
              )}
              <Button disabled={busy || reason.trim().length < 5}>
                {busy
                  ? "Saving…"
                  : emergency
                    ? "Apply emergency correction"
                    : "Request correction"}
              </Button>
            </>
          )}
          {canFinalize && data.kind !== "attendance" && (
            <Button
              type="button"
              variant="outline"
              disabled={busy || reason.trim().length < 5}
              onClick={() =>
                void execute(
                  "academic-control/finalize/",
                  {
                    kind: data.kind,
                    target: data.target,
                    reason,
                    finalized: !data.finalized,
                  },
                  data.finalized
                    ? "Record reopened with an audited reason."
                    : "Record finalized. Ordinary edits are now locked.",
                )
              }
            >
              {data.finalized ? "Reopen record with reason" : "Finalize record"}
            </Button>
          )}
          {!!error && <ErrorState error={error} />}
          {status && (
            <p role="status" className="info-strip">
              {status}
            </p>
          )}
        </form>
      ) : (
        <p className="muted">
          {data.kind === "attendance_session"
            ? "Open an individual attendance record to request a correction."
            : "You can review this academic record, but you cannot request corrections."}
        </p>
      )}
      {data.kind === "attendance_session" && (
        <p>
          <Link
            className="text-link"
            to={`/attendance?session=${encodeURIComponent(data.target)}`}
          >
            Open individual attendance records to request corrections →
          </Link>
        </p>
      )}
      <div style={{ marginTop: 20 }}>
        <Link className="text-link" to="/academic-reviews">
          <History
            size={15}
            aria-hidden="true"
            style={{ verticalAlign: "middle", marginRight: 6 }}
          />
          Open correction requests
        </Link>
      </div>
    </>
  );
}

export { AcademicReviews } from "./corrections/AcademicReviews";
