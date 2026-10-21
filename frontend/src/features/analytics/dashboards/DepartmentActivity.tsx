import { Activity } from "lucide-react";
import { Empty } from "../../../components/shared";
import {
  DashboardLink,
  formatNumber,
  PanelHeading,
  panelStyle,
  theme,
  validNumber,
} from "./DashboardPresentation";
import { Analytics } from "./dashboardTypes";

export function DepartmentActivity({ data }: { data: Analytics }) {
  const activity = [...data.activity_by_kind]

    .filter((item) => typeof item.kind === "string" && validNumber(item.count))

    .sort((a, b) => b.count - a.count)

    .slice(0, 6);

  const maximum = Math.max(
    1,

    ...activity.map((item) => item.count),
  );

  return (
    <section style={panelStyle}>
      <PanelHeading
        icon={Activity}

        title="Recorded learning activity"

        description="Activity counts grouped by type within your academic scope."

        action={<DashboardLink to="/analytics">All analytics</DashboardLink>}
      />

      <div
        style={{
          display: "flex",

          alignItems: "baseline",

          gap: 10,

          marginBottom: 24,
        }}
      >
        <strong
          style={{
            color: theme.dark,

            fontSize: 30,
          }}
        >
          {formatNumber(data.activity_events)}
        </strong>

        <span
          style={{
            color: theme.muted,

            fontSize: 12,
          }}
        >
          total recorded events
        </span>
      </div>

      {!activity.length ? (
        <Empty>No categorized activity has been recorded yet.</Empty>
      ) : (
        <div
          style={{
            display: "grid",

            gap: 17,
          }}
        >
          {activity.map((item) => (
            <div key={item.kind}>
              <div
                style={{
                  display: "flex",

                  justifyContent: "space-between",

                  gap: 12,

                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    color: theme.dark,

                    fontSize: 13,

                    textTransform: "capitalize",
                  }}
                >
                  {item.kind.replace(/[_-]/g, " ")}
                </span>

                <strong
                  style={{
                    color: theme.green,

                    fontSize: 13,
                  }}
                >
                  {formatNumber(item.count)}
                </strong>
              </div>

              <div
                style={{
                  height: 7,

                  borderRadius: 999,

                  background: "#e8f0e9",

                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(item.count / maximum) * 100}%`,

                    height: "100%",

                    background: theme.accent,

                    borderRadius: 999,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
