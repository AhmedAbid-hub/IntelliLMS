import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BookOpen,
  Building2,
  ClipboardCheck,
  GraduationCap,
  UserRoundCheck,
  Users,
} from "lucide-react";
import {
  Empty,
  ErrorState,
  Loading,
  PageHeader,
} from "../../components/shared";
import { api } from "../../lib/api";
import { useInstitution } from "../../lib/institution";
import { useTerminology } from "../../lib/terminology";
import { useAuth } from "../auth/Auth";
import {
  DashboardLink,
  DashboardStats,
  formatNumber,
  formatPercentage,
  StructureOverview,
} from "./dashboards/DashboardPresentation";
import { Analytics, Stat } from "./dashboards/dashboardTypes";
import { DepartmentHeadDashboard as DepartmentOverview } from "./dashboards/DepartmentHeadDashboard";
import { InstituteAdminDashboard as AcademicHealth } from "./dashboards/InstituteAdminDashboard";
import { StudentDashboard } from "./dashboards/StudentDashboard";
import { TeacherDashboard } from "./dashboards/TeacherDashboard";

export function Dashboard() {
  const { user, role } = useAuth();

  const institution = useInstitution();

  const terms = useTerminology();

  const hasInstitute = Boolean(user?.institute_id);

  const isSuperAdmin = role === "superadmin";

  const isAdmin = role === "admin";

  const isHead = role === "head";

  const isTeacher = role === "teacher";

  const isStudent = role === "student";

  const query = useQuery({
    queryKey: ["analytics", user?.institute_id],

    queryFn: () => api<Analytics>("analytics/"),

    enabled: hasInstitute && !isSuperAdmin,
  });

  const platform = useQuery({
    queryKey: ["platform"],

    queryFn: () => api<Record<string, number>>("platform/"),

    enabled: isSuperAdmin,
  });

  if (isSuperAdmin) {
    const platformStats: Stat[] = Object.entries(platform.data ?? {}).map(
      ([key, value]) => ({
        label: key.replaceAll("_", " "),

        value: formatNumber(value),

        description: "Platform overview",

        icon: Building2,
      }),
    );

    return (
      <>
        <PageHeader
          title="Platform overview"

          description="Manage institutions and administrative oversight across IntelliLMS."
        />

        {platform.isPending ? (
          <Loading />
        ) : platform.isError ? (
          <ErrorState error={platform.error} />
        ) : (
          <>
            {platformStats.length ? (
              <DashboardStats stats={platformStats} />
            ) : (
              <Empty>Platform statistics are not available.</Empty>
            )}

            <section
              className="panel"

              style={{ marginTop: 20 }}
            >
              <div className="panel-heading">
                <div>
                  <h2>Institution management</h2>

                  <p className="muted">
                    Manage institutions through the dedicated administration
                    pages.
                  </p>
                </div>

                <DashboardLink to="/institutes">
                  Manage institutes
                </DashboardLink>
              </div>
            </section>
          </>
        )}
      </>
    );
  }

  if (!hasInstitute) {
    return (
      <PageHeader
        title="Welcome to IntelliLMS"

        description="Choose an institute in the sidebar to enter its workspace."
      />
    );
  }

  if (query.isPending) {
    return <Loading />;
  }

  if (query.isError) {
    return <ErrorState error={query.error} />;
  }

  const data = query.data;

  const instituteStats: Stat[] = [
    {
      label: "Active students",

      value: formatNumber(data.students),

      description: "Students within your academic scope",

      icon: GraduationCap,
    },

    {
      label: "Teachers",

      value: formatNumber(data.teachers),

      description: "Teaching staff within your scope",

      icon: UserRoundCheck,
    },

    {
      label: `Active ${terms.label("offering", true).toLowerCase()}`,

      value: formatNumber(data.active_courses),

      description: "Current course offerings",

      icon: BookOpen,
    },

    {
      label: "Attendance",

      value: formatPercentage(data.attendance_pct),

      description: "Present and late; excused excluded",

      icon: ClipboardCheck,
    },
  ];

  const teacherStats: Stat[] = [
    {
      label: `My ${terms.label("offering", true).toLowerCase()}`,

      value: formatNumber(data.active_courses),

      description: "Assigned course offerings",

      icon: BookOpen,
    },

    {
      label: "Enrolled learners",

      value: formatNumber(data.students),

      description: "Students within teaching scope",

      icon: Users,
    },

    {
      label: "Attendance",

      value: formatPercentage(data.attendance_pct),

      description: "Attendance within teaching scope",

      icon: ClipboardCheck,
    },

    {
      label: "Submissions",

      value: formatNumber(data.submissions),

      description: "Recorded submissions",

      icon: Activity,
    },
  ];

  const studentStats: Stat[] = [
    {
      label: `My ${terms.label("course", true).toLowerCase()}`,

      value: formatNumber(data.active_courses),

      description: "Current enrolled courses",

      icon: BookOpen,
    },

    {
      label: "My submissions",

      value: formatNumber(data.submissions),

      description: "Submitted coursework",

      icon: ClipboardCheck,
    },

    {
      label: "Attendance",

      value: formatPercentage(data.attendance_pct),

      description: "My recorded attendance",

      icon: Users,
    },

    {
      label: "Learning activity",

      value: formatNumber(data.activity_events),

      description: "Recorded learning events",

      icon: Activity,
    },
  ];

  const heading = isAdmin
    ? "Institute overview"
    : isHead
      ? "Department overview"
      : isTeacher
        ? "Teaching overview"
        : "My learning";

  const description = isAdmin
    ? institution.kind === "school"
      ? "Manage classes, sections, subjects, admissions and school results."
      : institution.kind === "college"
        ? "Manage departments, programs, annual study years and college results."
        : "Manage departments, programs, batches, semesters and academic results."
    : isHead
      ? "Academic information within your department."
      : isTeacher
        ? "An overview of your teaching activities."
        : "Your courses, progress, and upcoming work.";

  const stats = isStudent
    ? studentStats
    : isTeacher
      ? teacherStats
      : instituteStats;

  return (
    <>
      <PageHeader
        eyebrow={data.institute.toUpperCase()}

        title={heading}

        description={description}
      />

      <DashboardStats stats={stats} />

      {isAdmin && data.structure_counts && (
        <StructureOverview
          counts={data.structure_counts}
          kind={institution.kind}
          terms={terms}
        />
      )}

      {isStudent && (
        <div className="panel-heading">
          <DashboardLink to="/academic-history">
            Academic history and previous results
          </DashboardLink>
        </div>
      )}

      {isAdmin && <AcademicHealth data={data} />}

      {isHead && <DepartmentOverview data={data} />}

      {isTeacher && <TeacherDashboard data={data} />}

      {isStudent && <StudentDashboard data={data} />}
    </>
  );
}

export { type GradeRow } from "./dashboards/dashboardTypes";
export { Gradebook } from "./Gradebook";
