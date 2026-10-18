import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FilePenLine,
  History,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  api,
  post,
  type Page,
  type RecordData,
} from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import {
  PageHeader,
  ErrorState,
  Loading,
  Empty,
} from "../../components/shared";
import { Pagination } from "../../components/ReportControls";
import { useAuth } from "../auth/Auth";
const kinds: Record<string, string> = {
  submissions: "submission",
  attempts: "attempt",
  "manual-grades": "manual",
  attendance: "attendance",
  "attendance-sessions": "attendance_session",
};
type Control = {
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
type CorrectionStatus = "pending" | "approved" | "rejected";
const statusOptions: {
  value: string;
  label: string;
}[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "", label: "All requests" },
];
const statusStyles = {
  pending: {
    color: "#986500",
    background: "#fff8e7",
    border: "#f0dca9",
    Icon: Clock3,
    label: "Pending",
  },
  approved: {
    color: "#176348",
    background: "#eaf6ee",
    border: "#c7e5d0",
    Icon: CheckCircle2,
    label: "Approved",
  },
  rejected: {
    color: "#b42318",
    background: "#fff1f0",
    border: "#f3c2bc",
    Icon: XCircle,
    label: "Rejected",
  },
} as const;
function readable(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return String(value);
}
function humanize(value: unknown): string {
  const text = readable(value);
  if (text === "—") {
    return text;
  }
  return text
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
function formatDate(value: unknown): string {
  if (!value) {
    return "—";
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString();
}
function getStatus(value: unknown): CorrectionStatus | null {
  const status = String(value ?? "").toLowerCase();
  if (
    status === "pending" ||
    status === "approved" ||
    status === "rejected"
  ) {
    return status;
  }
  return null;
}
function StatusBadge({
  status,
  emergency = false,
}: {
  status: unknown;
  emergency?: boolean;
}) {
  const normalized = getStatus(status);
  if (!normalized) {
    return <span className="pill">{humanize(status)}</span>;
  }
  const style = statusStyles[normalized];
  const Icon = style.Icon;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 7,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 8,
          color: style.color,
          background: style.background,
          border: `1px solid ${style.border}`,
          fontSize: 12,
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        <Icon size={14} aria-hidden="true" />
        {style.label}
      </span>
      {emergency && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "6px 9px",
            borderRadius: 8,
            color: "#b42318",
            background: "#fff1f0",
            border: "1px solid #f3c2bc",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          <AlertTriangle size={13} aria-hidden="true" />
          Emergency override
        </span>
      )}
    </div>
  );
}
function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div style={{ marginBottom: 15 }}>
      <h3
        style={{
          margin: 0,
          fontSize: 15,
          fontWeight: 750,
          color: "#173e2d",
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          className="muted"
          style={{
            margin: "6px 0 0",
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
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
  const allowed =
    !!kind && ["admin", "head", "teacher"].includes(role);
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
          onOpenChange={(nextOpen) => { if (!nextOpen) setOpen(false); }}
        >
          {query.isPending ? (
            <Loading />
          ) : query.isError ? (
            <ErrorState error={query.error} />
          ) : (
            <ControlForm
              key={`${kind}:${String(row.id)}`}
              data={query.data}
            />
          )}
        </Dialog>
      )}
    </>
  );
}
function ControlForm({ data }: { data: Control }) {
  const { role } = useAuth();
  const client = useQueryClient();
  const [reason, setReason] = useState("");
  const [values, setValues] = useState<Record<string, unknown>>(
    data.current,
  );
  const [emergency, setEmergency] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [status, setStatus] = useState("");
  const canRequestCorrection = [
    "admin",
    "head",
    "teacher",
  ].includes(role);
  const canFinalize = role === "admin" && data.can_finalize;
  const canEmergencyOverride = canFinalize;
  const manual = (values.manual_marks || {}) as Record<
    string,
    number
  >;
  async function execute(
    path: string,
    body: unknown,
    message: string,
  ) {
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
      <div
        className="info-strip"
        style={{ marginBottom: 20 }}
      >
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
            : data.lock_reason ? `${data.lock_reason} Use an audited correction.` : "Existing authorized teaching workflows remain available."}
        </p>
      </div>
      {canRequestCorrection && data.kind !== "attendance_session" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void execute(
              emergency
                ? "corrections/emergency/"
                : "corrections/",
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
                to={`/attendance?session=${encodeURIComponent(
                  data.target,
                )}`}
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
                {[
                  "present",
                  "absent",
                  "late",
                  "excused",
                ].map((value) => (
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
                          [question.id]: Number(
                            event.target.value,
                          ),
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
              onChange={(event) =>
                setReason(event.target.value)
              }
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
                    onChange={(event) =>
                      setEmergency(event.target.checked)
                    }
                  />
                  Apply an emergency Admin override directly
                  (audited)
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
                  Emergency overrides apply directly without
                  the ordinary approval workflow. Use only
                  when authorized and necessary.
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
              {data.finalized
                ? "Reopen record with reason"
                : "Finalize record"}
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
          <Link className="text-link" to={`/attendance?session=${encodeURIComponent(data.target)}`}>
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
function Values({
  label,
  values,
  questions,
}: {
  label: string;
  values: Record<string, unknown>;
  questions: Control["questions"];
}) {
  return (
    <section
      style={{
        border: "1px solid #dfe9e2",
        borderRadius: 12,
        padding: 15,
        minWidth: 0,
      }}
    >
      <h3
        style={{
          margin: "0 0 13px",
          fontSize: 14,
          color: "#173e2d",
        }}
      >
        {label}
      </h3>
      <dl style={{ margin: 0 }}>
        {Object.entries(values)
          .filter(([key]) => key !== "manual_marks")
          .map(([key, value]) => (
            <div
              key={key}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(100px, 1fr) 1fr",
                gap: 12,
                padding: "8px 0",
                borderBottom: "1px solid #edf1ee",
                fontSize: 12,
              }}
            >
              <dt
                style={{
                  color: "#718078",
                  textTransform: "capitalize",
                }}
              >
                {humanize(key)}
              </dt>
              <dd
                style={{
                  margin: 0,
                  fontWeight: 650,
                  overflowWrap: "anywhere",
                }}
              >
                {value == null
                  ? "Not recorded"
                  : typeof value === "boolean"
                    ? value
                      ? "Yes"
                      : "No"
                    : typeof value === "object"
                      ? JSON.stringify(value)
                      : String(value)}
              </dd>
            </div>
          ))}
        {questions?.map((question) => (
          <div
            key={question.id}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(100px, 1fr) 1fr",
              gap: 12,
              padding: "8px 0",
              borderBottom: "1px solid #edf1ee",
              fontSize: 12,
            }}
          >
            <dt style={{ color: "#718078" }}>
              {question.prompt}
            </dt>
            <dd style={{ margin: 0, fontWeight: 650 }}>
              {String(
                (
                  values.manual_marks as
                    | Record<string, unknown>
                    | undefined
                )?.[question.id] ?? "Not graded",
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
function Decision({
  row,
  onClose,
}: {
  row: RecordData;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [decision, setDecision] = useState("approved");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const current = useQuery({
    queryKey: [
      "academic-control",
      row.kind,
      row.target,
    ],
    queryFn: () =>
      api<Control>(
        `academic-control/?kind=${encodeURIComponent(
          String(row.kind),
        )}&target=${encodeURIComponent(String(row.target))}`,
      ),
  });
  const original =
    row.original &&
    typeof row.original === "object" &&
    !Array.isArray(row.original)
      ? (row.original as Record<string, unknown>)
      : {};
  const proposed =
    row.proposed &&
    typeof row.proposed === "object" &&
    !Array.isArray(row.proposed)
      ? (row.proposed as Record<string, unknown>)
      : {};
  const canDecide =
    row.status === "pending" &&
    current.data?.can_review === true &&
    String(row.requester) !== String(user?.id);
  return (
    <Dialog
      open
      title="Grade & Attendance Correction Review"
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !busy) {
          onClose();
        }
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              color: "#173e2d",
              fontSize: 16,
            }}
          >
            {readable(row.offering_label)}
          </h3>
          <p
            className="muted"
            style={{
              margin: "6px 0 0",
              fontSize: 12,
            }}
          >
            {humanize(row.kind)} correction
          </p>
        </div>
        <StatusBadge
          status={row.status}
          emergency={!!row.emergency}
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <small className="muted">Requested by</small>
          <p style={{ margin: "5px 0 0", fontWeight: 650 }}>
            {readable(row.requester_label)}
          </p>
        </div>
        <div>
          <small className="muted">Requested at</small>
          <p style={{ margin: "5px 0 0", fontWeight: 650 }}>
            {formatDate(row.created_at)}
          </p>
        </div>
      </div>
      <div
        style={{
          background: "#f4f8f5",
          border: "1px solid #dfe9e2",
          borderRadius: 11,
          padding: "13px 15px",
          marginBottom: 18,
        }}
      >
        <strong style={{ fontSize: 13 }}>
          Request reason
        </strong>
        <p
          style={{
            margin: "7px 0 0",
            lineHeight: 1.7,
            overflowWrap: "anywhere",
          }}
        >
          {readable(row.reason)}
        </p>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(230px, 1fr))",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <Values
          label="Recorded when requested"
          values={original}
          questions={current.data?.questions}
        />
        <Values
          label="Proposed correction"
          values={proposed}
          questions={current.data?.questions}
        />
      </div>
      {current.isPending && <Loading />}
      {current.isError && (
        <ErrorState error={current.error} />
      )}
      {canDecide ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) {
              return;
            }
            setBusy(true);
            setError(undefined);
            try {
              await post(
                `corrections/${String(row.id)}/decide/`,
                {
                  decision,
                  reason,
                },
              );
              await client.invalidateQueries();
              onClose();
            } catch (err) {
              setError(err);
            } finally {
              setBusy(false);
            }
          }}
        >
          <SectionHeading
            title="Correction decision"
            description="Check the recorded and proposed values before approving or rejecting this correction."
          />
          <label>
            Decision
            <select
              value={decision}
              onChange={(event) =>
                setDecision(event.target.value)
              }
            >
              <option value="approved">
                Approve correction
              </option>
              <option value="rejected">
                Reject correction
              </option>
            </select>
          </label>
          <label>
            Decision reason
            <textarea
              required
              minLength={5}
              maxLength={1000}
              value={reason}
              onChange={(event) =>
                setReason(event.target.value)
              }
              placeholder="Explain the reason for your decision..."
            />
          </label>
          {!!error && <ErrorState error={error} />}
          <Button disabled={busy || reason.trim().length < 5}>
            {busy
              ? "Saving decision…"
              : decision === "approved"
                ? "Approve correction"
                : "Reject correction"}
          </Button>
        </form>
      ) : (
        <div
          className="info-strip"
          style={{ marginTop: 10 }}
        >
          {row.status === "pending"
            ? current.isPending
              ? "Checking review permissions…"
              : current.isError
                ? "Unable to verify review permissions. Please try again."
                : "This request is awaiting an authorized reviewer. Requesters cannot approve their own corrections."
            : (
                <>
                  <strong>
                    Decision: {humanize(row.status)}
                  </strong>
                  {row.decision_reason && (
                    <p style={{ margin: "7px 0 0" }}>
                      {String(row.decision_reason)}
                    </p>
                  )}
                </>
              )}
        </div>
      )}
    </Dialog>
  );
}
export function AcademicReviews() {
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<RecordData>();
  const query = useQuery({
    queryKey: ["academic-reviews", status, page],
    queryFn: () =>
      api<Page<RecordData>>(
        `corrections/?status=${encodeURIComponent(
          status,
        )}&page=${page}`,
      ),
  });
  const count = query.data?.count ?? 0;
  return (
    <>
      <PageHeader
        title="Grade & Attendance Corrections"
        description="Review and track requests to correct recorded grades and attendance. Teachers can follow requests for their assigned courses."
      />
      <section
        className="panel padded"
        style={{
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 19,
                color: "#173e2d",
              }}
            >
              Correction requests
            </h2>
            <p
              className="muted"
              style={{
                margin: "7px 0 0",
                fontSize: 13,
              }}
            >
              Review requests and track their decisions.
            </p>
          </div>
          {!query.isPending && !query.isError && (
            <span className="count-badge">
              {count.toLocaleString()}{" "}
              {count === 1 ? "request" : "requests"}
            </span>
          )}
        </div>
        <div
          style={{
            display: "flex",
            gap: 9,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
          role="group"
          aria-label="Filter correction requests by status"
        >
          {statusOptions.map((option) => {
            const active = status === option.value;
            return (
              <Button
                key={option.value}
                variant={active ? "default" : "outline"}
                onClick={() => {
                  setStatus(option.value);
                  setPage(1);
                }}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState error={query.error} />
        ) : !query.data.results.length ? (
          <div
            style={{
              padding: "35px 18px",
              textAlign: "center",
              border: "1px dashed #d9e6dc",
              borderRadius: 12,
              background: "#fbfdfb",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "#eaf6ee",
                color: "#176348",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 15px",
              }}
            >
              {status === "pending" ? (
                <CheckCircle2 size={23} />
              ) : (
                <Search size={23} />
              )}
            </div>
            <h3
              style={{
                margin: "0 0 8px",
                color: "#173e2d",
                fontSize: 16,
              }}
            >
              {status === "pending"
                ? "No pending corrections"
                : status === "approved"
                  ? "No approved corrections"
                  : status === "rejected"
                    ? "No rejected corrections"
                    : "No correction requests yet"}
            </h3>
            <p
              className="muted"
              style={{
                margin: "0 auto",
                maxWidth: 440,
                lineHeight: 1.7,
                fontSize: 13,
              }}
            >
              {status === "pending"
                ? "There are currently no correction requests awaiting review in your authorized scope."
                : status === "approved"
                  ? "Approved correction requests will appear here."
                  : status === "rejected"
                    ? "Rejected correction requests will appear here."
                    : "Requests created through academic record controls will appear here."}
            </p>
            {status !== "" && (
              <div style={{ marginTop: 17 }}>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatus("");
                    setPage(1);
                  }}
                >
                  View all requests
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Record</th>
                  <th>Requester</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {query.data.results.map((row) => (
                  <tr key={String(row.id)}>
                    <td>
                      <strong>
                        {readable(row.offering_label)}
                      </strong>
                    </td>
                    <td>
                      {humanize(row.kind)}
                    </td>
                    <td>
                      {readable(row.requester_label)}
                    </td>
                    <td
                      style={{
                        maxWidth: 320,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {readable(row.reason)}
                    </td>
                    <td>
                      <StatusBadge
                        status={row.status}
                        emergency={!!row.emergency}
                      />
                    </td>
                    <td>
                      <Button
                        variant="outline"
                        onClick={() => setSelected(row)}
                      >
                        {row.status === "pending"
                          ? "Review request"
                          : "View details"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!query.isPending && !query.isError && (
          <div style={{ marginTop: 20 }}>
            <Pagination
              data={query.data}
              page={page}
              onChange={setPage}
              label="Correction requests"
            />
          </div>
        )}
      </section>
      {selected && (
        <Decision
          key={String(selected.id)}
          row={selected}
          onClose={() => setSelected(undefined)}
        />
      )}
    </>
  );
}
