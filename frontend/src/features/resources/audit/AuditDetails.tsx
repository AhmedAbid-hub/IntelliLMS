export function auditLabel(value: unknown): string {
  const raw = String(value ?? "").trim();

  if (!raw) return "Activity recorded";

  const normalized = raw
    .replace(/[._-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function auditDetail(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();

  if (!trimmed) return null;

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      // Preserve the original text.
    }
  }

  return value;
}

export function auditText(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

export function auditId(value: unknown): string {
  const text = String(value ?? "").trim();

  if (!text) return "Not specified";

  return text.length > 20 ? `${text.slice(0, 8)}…${text.slice(-6)}` : text;
}

export function AuditDetailContent({ detail }: { detail: unknown }) {
  const parsed = auditDetail(detail);

  if (parsed === null || parsed === undefined || parsed === "") {
    return <p>No additional details were recorded.</p>;
  }

  if (typeof parsed !== "object") {
    return (
      <p
        style={{
          overflowWrap: "anywhere",
          whiteSpace: "pre-wrap",
        }}
      >
        {auditText(parsed)}
      </p>
    );
  }

  if (Array.isArray(parsed)) {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        {parsed.map((item, index) => (
          <div
            key={index}
            style={{
              padding: 12,
              background: "#f6f9f6",
              borderRadius: 9,
            }}
          >
            <strong>Item {index + 1}</strong>
            <AuditDetailContent detail={item} />
          </div>
        ))}
      </div>
    );
  }

  const data = parsed as Record<string, unknown>;

  const previous = data.before ?? data.old ?? data.previous ?? data.old_values;

  const next = data.after ?? data.new ?? data.current ?? data.new_values;

  const hasComparison = previous !== undefined || next !== undefined;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {hasComparison && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <div
            style={{
              border: "1px solid #e1e9e1",
              borderRadius: 10,
              padding: 12,
              minWidth: 0,
            }}
          >
            <strong>Previous value</strong>

            <pre
              style={{
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                font: "inherit",
                fontSize: 13,
              }}
            >
              {auditText(previous)}
            </pre>
          </div>

          <div
            style={{
              border: "1px solid #cde6d4",
              borderRadius: 10,
              padding: 12,
              minWidth: 0,
              background: "#f5faf6",
            }}
          >
            <strong>New value</strong>

            <pre
              style={{
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                font: "inherit",
                fontSize: 13,
              }}
            >
              {auditText(next)}
            </pre>
          </div>
        </div>
      )}

      {Object.entries(data)
        .filter(
          ([key]) =>
            !hasComparison ||
            ![
              "before",
              "old",
              "previous",
              "old_values",
              "after",
              "new",
              "current",
              "new_values",
            ].includes(key),
        )
        .map(([key, value]) => (
          <div
            key={key}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(110px, 160px) minmax(0, 1fr)",
              gap: 12,
              borderBottom: "1px solid #edf1ed",
              paddingBottom: 9,
            }}
          >
            <strong style={{ fontSize: 13 }}>{auditLabel(key)}</strong>

            <span
              style={{
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                fontSize: 13,
              }}
            >
              {auditText(value)}
            </span>
          </div>
        ))}
    </div>
  );
}

export function auditSummary(value: unknown): string {
  const parsed = auditDetail(value);

  if (parsed == null || parsed === "") {
    return "No additional details";
  }

  if (typeof parsed === "object") {
    if (Array.isArray(parsed)) {
      return `${parsed.length} recorded item${parsed.length === 1 ? "" : "s"}`;
    }

    const data = parsed as Record<string, unknown>;

    for (const key of [
      "message",
      "reason",
      "description",
      "summary",
      "event",
    ]) {
      if (typeof data[key] === "string" && data[key]) {
        return String(data[key]);
      }
    }

    const count = Object.keys(data).length;

    return `${count} detail field${count === 1 ? "" : "s"}`;
  }

  return String(parsed);
}
