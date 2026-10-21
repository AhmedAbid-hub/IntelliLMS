import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorState, Loading } from "../../../components/shared";
import { Button } from "../../../components/ui/button";
import { Dialog } from "../../../components/ui/dialog";
import { api, post, type RecordData } from "../../../lib/api";
import { useAuth } from "../../auth/Auth";
import type { Control } from "../AcademicControl";
import {
  formatDate,
  humanize,
  readable,
  SectionHeading,
  StatusBadge,
  Values,
} from "./CorrectionPresentation";

export function Decision({
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
    queryKey: ["academic-control", row.kind, row.target],
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
        <StatusBadge status={row.status} emergency={!!row.emergency} />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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
        <strong style={{ fontSize: 13 }}>Request reason</strong>
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
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
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
      {current.isError && <ErrorState error={current.error} />}
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
              await post(`corrections/${String(row.id)}/decide/`, {
                decision,
                reason,
              });
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
              onChange={(event) => setDecision(event.target.value)}
            >
              <option value="approved">Approve correction</option>
              <option value="rejected">Reject correction</option>
            </select>
          </label>
          <label>
            Decision reason
            <textarea
              required
              minLength={5}
              maxLength={1000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
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
        <div className="info-strip" style={{ marginTop: 10 }}>
          {row.status === "pending" ? (
            current.isPending ? (
              "Checking review permissions…"
            ) : current.isError ? (
              "Unable to verify review permissions. Please try again."
            ) : (
              "This request is awaiting an authorized reviewer. Requesters cannot approve their own corrections."
            )
          ) : (
            <>
              <strong>Decision: {humanize(row.status)}</strong>
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
