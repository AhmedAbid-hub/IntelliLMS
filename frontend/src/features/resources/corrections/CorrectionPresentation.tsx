import { AlertTriangle, CheckCircle2, Clock3, XCircle } from "lucide-react";
import type { Control } from "../AcademicControl";

export type CorrectionStatus = "pending" | "approved" | "rejected";

export const statusOptions: {
  value: string;
  label: string;
}[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "", label: "All requests" },
];

export const statusStyles = {
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

export function readable(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return String(value);
}

export function humanize(value: unknown): string {
  const text = readable(value);
  if (text === "—") {
    return text;
  }
  return text
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatDate(value: unknown): string {
  if (!value) {
    return "—";
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export function getStatus(value: unknown): CorrectionStatus | null {
  const status = String(value ?? "").toLowerCase();
  if (status === "pending" || status === "approved" || status === "rejected") {
    return status;
  }
  return null;
}

export function StatusBadge({
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

export function SectionHeading({
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

export function Values({
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
            <dt style={{ color: "#718078" }}>{question.prompt}</dt>
            <dd style={{ margin: 0, fontWeight: 650 }}>
              {String(
                (values.manual_marks as Record<string, unknown> | undefined)?.[
                  question.id
                ] ?? "Not graded",
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
