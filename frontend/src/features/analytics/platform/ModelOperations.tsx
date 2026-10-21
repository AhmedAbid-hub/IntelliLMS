import { Activity, AlertTriangle, Database, FlaskConical } from "lucide-react";
import { ErrorState, Loading } from "../../../components/shared";
import { type RecordData } from "../../../lib/api";
import { mutedStyle, panelStyle, readableStatus } from "./PlatformPresentation";

export function ModelOperations({
  model,
}: {
  model: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    data?: RecordData;
  };
}) {
  if (model.isPending) {
    return (
      <section style={panelStyle}>
        <div style={{ padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>Experimental model operations</h2>
          <Loading />
        </div>
      </section>
    );
  }

  if (model.isError) {
    return (
      <section style={panelStyle}>
        <div style={{ padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>Experimental model operations</h2>
          <ErrorState error={model.error} />
        </div>
      </section>
    );
  }

  const data = model.data;

  const status = readableStatus(data?.status);

  const version = data?.version ? String(data.version) : "Not available";

  const warning =
    typeof data?.warning === "string" && data.warning.trim()
      ? data.warning
      : "This experimental model has not been validated for real student decisions.";

  return (
    <section style={panelStyle}>
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid #edf1ed",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 11,
            background: "#eef3ef",
            color: "#37664b",
            flexShrink: 0,
          }}
        >
          <FlaskConical size={20} aria-hidden="true" />
        </div>

        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              color: "#173c2d",
            }}
          >
            Experimental model operations
          </h2>

          <p
            style={{
              ...mutedStyle,
              margin: "5px 0 0",
            }}
          >
            Current status of the platform's experimental prediction model.
          </p>
        </div>
      </div>

      <div
        style={{
          padding: 20,
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          gap: 14,
        }}
      >
        <div
          style={{
            padding: 16,
            borderRadius: 11,
            background: "#f6f9f6",
            border: "1px solid #e5eee7",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              marginBottom: 10,
              color: "#52735d",
            }}
          >
            <Activity size={18} aria-hidden="true" />
            <span style={{ fontSize: 13 }}>Model status</span>
          </div>

          <strong
            style={{
              fontSize: 18,
              color: "#173c2d",
              overflowWrap: "anywhere",
            }}
          >
            {status}
          </strong>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 11,
            background: "#f6f9f6",
            border: "1px solid #e5eee7",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              marginBottom: 10,
              color: "#52735d",
            }}
          >
            <Database size={18} aria-hidden="true" />
            <span style={{ fontSize: 13 }}>Model version</span>
          </div>

          <strong
            style={{
              fontSize: 18,
              color: "#173c2d",
              overflowWrap: "anywhere",
            }}
          >
            {version}
          </strong>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 11,
          margin: "0 20px 20px",
          padding: "12px 14px",
          borderRadius: 10,
          border: "1px solid #f1dfb8",
          background: "#fff9ed",
          color: "#856123",
          fontSize: 12,
          lineHeight: 1.7,
        }}
      >
        <AlertTriangle
          size={18}
          style={{
            flexShrink: 0,
            marginTop: 1,
          }}
          aria-hidden="true"
        />

        <span>{warning}</span>
      </div>
    </section>
  );
}
