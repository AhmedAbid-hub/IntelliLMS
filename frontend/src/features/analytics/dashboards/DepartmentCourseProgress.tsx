import { BookOpen } from "lucide-react";
import { Empty } from "../../../components/shared";
import {
  DashboardLink,
  formatPercentage,
  PanelHeading,
  panelStyle,
  ProgressBar,
  theme,
  validNumber,
} from "./DashboardPresentation";
import { GradeRow } from "./dashboardTypes";

export function DepartmentCourseProgress({ rows }: { rows: GradeRow[] }) {
  const offerings = new Map<
    string,
    {
      label: string;

      total: number;

      count: number;
    }
  >();

  for (const row of rows) {
    const existing = offerings.get(row.offering) ?? {
      label: row.offering_label,

      total: 0,

      count: 0,
    };

    if (validNumber(row.completion_pct)) {
      existing.total += row.completion_pct;

      existing.count += 1;
    }

    offerings.set(row.offering, existing);
  }

  const courses = Array.from(offerings.entries())

    .map(([id, value]) => ({
      id,

      label: value.label,

      completion: value.count > 0 ? value.total / value.count : null,
    }))

    .slice(0, 5);

  return (
    <section style={panelStyle}>
      <PanelHeading
        icon={BookOpen}

        title="Course progress"

        description="Average recorded lesson completion for courses represented in the gradebook."

        action={<DashboardLink to="/grades">View courses</DashboardLink>}
      />

      {!courses.length ? (
        <Empty>No course progress data is available yet.</Empty>
      ) : (
        <div
          style={{
            display: "grid",

            gap: 23,
          }}
        >
          {courses.map((course) => (
            <div key={course.id}>
              <div
                style={{
                  display: "flex",

                  justifyContent: "space-between",

                  gap: 12,

                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    color: theme.dark,

                    fontSize: 13,

                    fontWeight: 650,

                    overflowWrap: "anywhere",
                  }}
                >
                  {course.label}
                </span>

                <strong
                  style={{
                    color: theme.green,

                    fontSize: 13,

                    whiteSpace: "nowrap",
                  }}
                >
                  {formatPercentage(course.completion)}
                </strong>
              </div>

              <ProgressBar
                value={course.completion}

                label={`${course.label} lesson completion`}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
