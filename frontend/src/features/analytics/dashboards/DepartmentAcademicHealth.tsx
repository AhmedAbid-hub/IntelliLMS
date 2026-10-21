import { FileCheck2, TrendingUp, Users } from "lucide-react";
import {
  DashboardLink,
  formatNumber,
  formatPercentage,
  PanelHeading,
  panelStyle,
  ProgressBar,
  theme,
} from "./DashboardPresentation";
import { Analytics } from "./dashboardTypes";

export function DepartmentAcademicHealth({ data }: { data: Analytics }) {
  return (
    <section style={panelStyle}>
      <PanelHeading
        icon={TrendingUp}

        title="Department academic health"

        description="Current academic indicators from recorded department data."

        action={
          <DashboardLink to="/analytics">Detailed analytics</DashboardLink>
        }
      />

      <div
        style={{
          display: "grid",

          gap: 23,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",

              alignItems: "center",

              justifyContent: "space-between",

              gap: 12,

              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: 13,

                color: theme.muted,
              }}
            >
              Overall attendance
            </span>

            <strong
              style={{
                fontSize: 20,

                color: theme.dark,
              }}
            >
              {formatPercentage(data.attendance_pct)}
            </strong>
          </div>

          <ProgressBar
            value={data.attendance_pct}

            label="Department attendance"
          />

          <p
            style={{
              fontSize: 12,

              color: theme.muted,

              margin: "9px 0 0",
            }}
          >
            Based on recorded attendance. Excused attendance is excluded.
          </p>
        </div>

        <div
          style={{
            display: "grid",

            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",

            gap: 12,
          }}
        >
          <div
            style={{
              background: theme.soft,

              borderRadius: 12,

              padding: 17,
            }}
          >
            <Users
              size={20}

              color={theme.green}
            />

            <strong
              style={{
                display: "block",

                fontSize: 25,

                color: theme.dark,

                marginTop: 12,
              }}
            >
              {formatNumber(data.enrollments)}
            </strong>

            <span
              style={{
                color: theme.muted,

                fontSize: 12,
              }}
            >
              Course enrollments
            </span>
          </div>

          <div
            style={{
              background: theme.soft,

              borderRadius: 12,

              padding: 17,
            }}
          >
            <FileCheck2
              size={20}

              color={theme.green}
            />

            <strong
              style={{
                display: "block",

                fontSize: 25,

                color: theme.dark,

                marginTop: 12,
              }}
            >
              {formatNumber(data.submissions)}
            </strong>

            <span
              style={{
                color: theme.muted,

                fontSize: 12,
              }}
            >
              Recorded submissions
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
