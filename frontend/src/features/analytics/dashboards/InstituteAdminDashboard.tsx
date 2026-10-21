import { ClipboardCheck, Users } from "lucide-react";
import {
  DashboardLink,
  formatNumber,
  formatPercentage,
  ProgressBar,
  theme,
} from "./DashboardPresentation";
import { Analytics } from "./dashboardTypes";

export function InstituteAdminDashboard({ data }: { data: Analytics }) {
  return (
    <section
      className="panel"

      style={{
        marginTop: 20,

        padding: "24px 28px",
      }}
    >
      <div className="panel-heading">
        <div>
          <h2>Academic health</h2>

          <p className="muted">
            A summary of academic activity across your institute.
          </p>
        </div>

        <DashboardLink to="/analytics">Detailed analytics</DashboardLink>
      </div>

      <div
        style={{
          display: "grid",

          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",

          gap: 24,

          marginTop: 20,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",

              justifyContent: "space-between",

              gap: 12,

              marginBottom: 12,
            }}
          >
            <span className="muted">Overall attendance</span>

            <strong>{formatPercentage(data.attendance_pct)}</strong>
          </div>

          <ProgressBar
            value={data.attendance_pct}

            label="Overall attendance"
          />

          <small
            className="muted"

            style={{
              display: "block",

              marginTop: 10,
            }}
          >
            Present and late; excused excluded
          </small>
        </div>

        <div>
          <span className="muted">Active course enrollments</span>

          <div
            style={{
              display: "flex",

              alignItems: "center",

              gap: 12,

              marginTop: 12,
            }}
          >
            <Users
              size={24}

              color={theme.accent}
            />

            <strong style={{ fontSize: 30 }}>
              {formatNumber(data.enrollments)}
            </strong>
          </div>

          <small className="muted">
            Course registrations, not unique students
          </small>
        </div>

        <div>
          <span className="muted">Recorded submissions</span>

          <div
            style={{
              display: "flex",

              alignItems: "center",

              gap: 12,

              marginTop: 12,
            }}
          >
            <ClipboardCheck
              size={24}

              color={theme.accent}
            />

            <strong style={{ fontSize: 30 }}>
              {formatNumber(data.submissions)}
            </strong>
          </div>

          <small className="muted">
            Submissions within your academic scope
          </small>
        </div>
      </div>
    </section>
  );
}
