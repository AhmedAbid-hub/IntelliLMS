import { DashboardLink, theme } from "./DashboardPresentation";
import { Analytics } from "./dashboardTypes";
import { DepartmentAcademicHealth } from "./DepartmentAcademicHealth";
import { DepartmentActivity } from "./DepartmentActivity";
import { DepartmentCourseProgress } from "./DepartmentCourseProgress";
import { DepartmentStudentsAttention } from "./DepartmentStudentsAttention";

export function DepartmentHeadDashboard({ data }: { data: Analytics }) {
  return (
    <div
      style={{
        marginTop: 24,

        display: "grid",

        gap: 20,
      }}
    >
      <div
        style={{
          display: "flex",

          alignItems: "center",

          justifyContent: "space-between",

          gap: 14,

          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,

              fontSize: 21,

              color: theme.dark,
            }}
          >
            Department insights
          </h2>

          <p
            style={{
              margin: "7px 0 0",

              color: theme.muted,

              fontSize: 13,
            }}
          >
            Academic oversight based on available department records.
          </p>
        </div>

        <DashboardLink to="/analytics">View detailed analytics</DashboardLink>
      </div>

      <div
        style={{
          display: "grid",

          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",

          gap: 20,

          alignItems: "stretch",
        }}
      >
        <DepartmentAcademicHealth data={data} />

        <DepartmentStudentsAttention rows={data.gradebook ?? []} />

        <DepartmentCourseProgress rows={data.gradebook ?? []} />

        <DepartmentActivity data={data} />
      </div>
    </div>
  );
}

export { DepartmentAcademicHealth } from "./DepartmentAcademicHealth";
export { DepartmentActivity } from "./DepartmentActivity";
export { DepartmentCourseProgress } from "./DepartmentCourseProgress";
export { DepartmentStudentsAttention } from "./DepartmentStudentsAttention";
