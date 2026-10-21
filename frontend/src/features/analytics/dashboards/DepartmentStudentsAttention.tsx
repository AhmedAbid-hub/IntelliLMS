import { AlertCircle } from "lucide-react";
import {
  DashboardLink,
  formatPercentage,
  PanelHeading,
  panelStyle,
  theme,
  validNumber,
} from "./DashboardPresentation";
import { GradeRow } from "./dashboardTypes";

export function DepartmentStudentsAttention({ rows }: { rows: GradeRow[] }) {
  // These are simple recorded-data checks,

  // not machine-learning predictions.

  const attentionRows = rows

    .filter(
      (row) =>
        (validNumber(row.attendance_pct) && row.attendance_pct < 75) ||
        (validNumber(row.score) && row.score < 50),
    )

    .sort((a, b) => {
      const aAttendance = validNumber(a.attendance_pct)
        ? a.attendance_pct
        : 100;

      const bAttendance = validNumber(b.attendance_pct)
        ? b.attendance_pct
        : 100;

      return aAttendance - bAttendance;
    })

    .slice(0, 5);

  return (
    <section style={panelStyle}>
      <PanelHeading
        icon={AlertCircle}

        title="Students needing attention"

        description="Students with low recorded attendance or released course scores."

        action={<DashboardLink to="/grades">View gradebook</DashboardLink>}
      />

      {!attentionRows.length ? (
        <div
          style={{
            background: theme.soft,

            padding: 22,

            borderRadius: 12,

            color: theme.muted,

            fontSize: 13,

            lineHeight: 1.7,
          }}
        >
          No students in the available gradebook results currently meet these
          review thresholds.
        </div>
      ) : (
        <div
          style={{
            display: "grid",

            gap: 12,
          }}
        >
          {attentionRows.map((row) => {
            const lowAttendance =
              validNumber(row.attendance_pct) && row.attendance_pct < 75;

            const lowScore = validNumber(row.score) && row.score < 50;

            return (
              <div
                key={`${row.student}-${row.offering}`}

                style={{
                  border: `1px solid ${theme.border}`,

                  borderRadius: 11,

                  padding: "13px 15px",

                  display: "flex",

                  justifyContent: "space-between",

                  alignItems: "center",

                  gap: 12,

                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <strong
                    style={{
                      display: "block",

                      color: theme.dark,

                      fontSize: 13,
                    }}
                  >
                    {row.student_label}
                  </strong>

                  <span
                    style={{
                      display: "block",

                      color: theme.muted,

                      fontSize: 12,

                      marginTop: 4,
                    }}
                  >
                    {row.offering_label}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",

                    gap: 7,

                    flexWrap: "wrap",
                  }}
                >
                  {lowAttendance && (
                    <span
                      style={{
                        padding: "6px 9px",

                        borderRadius: 8,

                        background: "#fff4e8",

                        color: "#946322",

                        fontSize: 11,

                        fontWeight: 650,
                      }}
                    >
                      Attendance {formatPercentage(row.attendance_pct)}
                    </span>
                  )}

                  {lowScore && (
                    <span
                      style={{
                        padding: "6px 9px",

                        borderRadius: 8,

                        background: "#fff0ef",

                        color: "#a3443b",

                        fontSize: 11,

                        fontWeight: 650,
                      }}
                    >
                      Score {formatPercentage(row.score)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p
        style={{
          margin: "16px 0 0",

          color: theme.muted,

          fontSize: 11,

          lineHeight: 1.7,
        }}
      >
        Review thresholds: attendance below 75% or recorded course score below
        50%. These are informational flags, not predictive AI assessments.
      </p>
    </section>
  );
}
