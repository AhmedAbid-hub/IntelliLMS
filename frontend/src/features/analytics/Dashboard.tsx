import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Building2,
  ClipboardCheck,
  GraduationCap,
  Users,
  UserRoundCheck,
  AlertCircle,
  BarChart3,
  TrendingUp,
  FileCheck2,
} from "lucide-react";

import { StudentPriorities } from "./StudentPriorities";
import { api, type Page, type RecordData } from "../../lib/api";
import { useAuth } from "../auth/Auth";
import {
  PageHeader,
  Loading,
  ErrorState,
  Empty,
} from "../../components/shared";

export interface GradeRow {
  letter_grade?: string | null;
  grade_points?: number | null;
  student: string;
  student_label: string;
  offering: string;
  offering_label: string;
  score: number | null;
  attendance_pct: number | null;
  assignment_pct: number | null;
  quiz_pct: number | null;
  manual_pct: number | null;
  completion_pct: number | null;
  activity_count: number;
}

interface Analytics {
  active_courses: number;
  students: number;
  teachers: number;
  enrollments: number;
  attendance_pct: number | null;
  submissions: number;
  activity_events: number;
  gradebook: GradeRow[];
  activity_by_kind: {
    kind: string;
    count: number;
  }[];
  institute: string;
  role: string;
}

type Stat = {
  label: string;
  value: string | number;
  description: string;
  icon: typeof BookOpen;
};

const theme = {
  dark: "#193e2e",
  green: "#176443",
  accent: "#4f9c70",
  muted: "#718579",
  border: "#dce8df",
  pale: "#edf5ef",
  soft: "#f7faf7",
  white: "#ffffff",
};

const panelStyle: React.CSSProperties = {
  background: theme.white,
  border: `1px solid ${theme.border}`,
  borderRadius: 15,
  padding: "24px 26px",
  minWidth: 0,
};

function validNumber(
  value: number | null | undefined
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function formatNumber(
  value: number | null | undefined
): string {
  return validNumber(value)
    ? new Intl.NumberFormat("en").format(value)
    : "—";
}

function formatPercentage(
  value: number | null | undefined
): string {
  return validNumber(value)
    ? `${value.toFixed(1)}%`
    : "—";
}

function clampPercentage(
  value: number | null | undefined
): number {
  return validNumber(value)
    ? Math.max(0, Math.min(100, value))
    : 0;
}

function DashboardStats({
  stats,
}: {
  stats: Stat[];
}) {
  return (
    <div
      className="stat-grid"
      style={{ marginBottom: 0 }}
    >
      {stats.map(
        ({
          label,
          value,
          description,
          icon: Icon,
        }) => (
          <article
            className="stat-card"
            key={label}
            style={{
              minHeight: 145,
              padding: "18px 22px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <span>{label}</span>
              <Icon
                size={20}
                aria-hidden="true"
              />
            </div>

            <strong
              style={{
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              {value}
            </strong>

            <small>{description}</small>
          </article>
        )
      )}
    </div>
  );
}

function DashboardLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link className="text-link" to={to}>
      {children}
      <ArrowUpRight
        size={15}
        aria-hidden="true"
      />
    </Link>
  );
}

function PanelHeading({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof BookOpen;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: 14,
        marginBottom: 23,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: theme.pale,
            color: theme.green,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={20} />
        </div>

        <div>
          <h2
            style={{
              margin: 0,
              color: theme.dark,
              fontSize: 17,
              fontWeight: 750,
            }}
          >
            {title}
          </h2>

          <p
            style={{
              margin: "6px 0 0",
              color: theme.muted,
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            {description}
          </p>
        </div>
      </div>

      {action}
    </div>
  );
}

function ProgressBar({
  value,
  label,
}: {
  value: number | null | undefined;
  label: string;
}) {
  const available = validNumber(value);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={
        available
          ? clampPercentage(value)
          : undefined
      }
      style={{
        height: 9,
        background: "#e8f0e9",
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${
            available
              ? clampPercentage(value)
              : 0
          }%`,
          height: "100%",
          background: theme.accent,
          borderRadius: 999,
          transition: "width 200ms ease",
        }}
      />
    </div>
  );
}

function AcademicHealth({
  data,
}: {
  data: Analytics;
}) {
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
            A summary of academic activity across
            your institute.
          </p>
        </div>

        <DashboardLink to="/analytics">
          Detailed analytics
        </DashboardLink>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
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
            <span className="muted">
              Overall attendance
            </span>

            <strong>
              {formatPercentage(
                data.attendance_pct
              )}
            </strong>
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
          <span className="muted">
            Active course enrollments
          </span>

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
            Course registrations, not unique
            students
          </small>
        </div>

        <div>
          <span className="muted">
            Recorded submissions
          </span>

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
            Submissions within your academic
            scope
          </small>
        </div>
      </div>
    </section>
  );
}

function DepartmentAcademicHealth({
  data,
}: {
  data: Analytics;
}) {
  return (
    <section style={panelStyle}>
      <PanelHeading
        icon={TrendingUp}
        title="Department academic health"
        description="Current academic indicators from recorded department data."
        action={
          <DashboardLink to="/analytics">
            Detailed analytics
          </DashboardLink>
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
              {formatPercentage(
                data.attendance_pct
              )}
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
            Based on recorded attendance.
            Excused attendance is excluded.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
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

function DepartmentStudentsAttention({
  rows,
}: {
  rows: GradeRow[];
}) {
  // These are simple recorded-data checks,
  // not machine-learning predictions.
  const attentionRows = rows
    .filter(
      (row) =>
        (validNumber(row.attendance_pct) &&
          row.attendance_pct < 75) ||
        (validNumber(row.score) &&
          row.score < 50)
    )
    .sort((a, b) => {
      const aAttendance =
        validNumber(a.attendance_pct)
          ? a.attendance_pct
          : 100;

      const bAttendance =
        validNumber(b.attendance_pct)
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
        action={
          <DashboardLink to="/grades">
            View gradebook
          </DashboardLink>
        }
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
          No students in the available gradebook
          results currently meet these review
          thresholds.
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
              validNumber(row.attendance_pct) &&
              row.attendance_pct < 75;

            const lowScore =
              validNumber(row.score) &&
              row.score < 50;

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
                      Attendance{" "}
                      {formatPercentage(
                        row.attendance_pct
                      )}
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
                      Score{" "}
                      {formatPercentage(row.score)}
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
        Review thresholds: attendance below 75%
        or recorded course score below 50%.
        These are informational flags, not
        predictive AI assessments.
      </p>
    </section>
  );
}

function DepartmentCourseProgress({
  rows,
}: {
  rows: GradeRow[];
}) {
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
      completion:
        value.count > 0
          ? value.total / value.count
          : null,
    }))
    .slice(0, 5);

  return (
    <section style={panelStyle}>
      <PanelHeading
        icon={BookOpen}
        title="Course progress"
        description="Average recorded lesson completion for courses represented in the gradebook."
        action={
          <DashboardLink to="/grades">
            View courses
          </DashboardLink>
        }
      />

      {!courses.length ? (
        <Empty>
          No course progress data is available
          yet.
        </Empty>
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
                  {formatPercentage(
                    course.completion
                  )}
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

function DepartmentActivity({
  data,
}: {
  data: Analytics;
}) {
  const activity = [...data.activity_by_kind]
    .filter(
      (item) =>
        typeof item.kind === "string" &&
        validNumber(item.count)
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const maximum = Math.max(
    1,
    ...activity.map((item) => item.count)
  );

  return (
    <section style={panelStyle}>
      <PanelHeading
        icon={Activity}
        title="Recorded learning activity"
        description="Activity counts grouped by type within your academic scope."
        action={
          <DashboardLink to="/analytics">
            All analytics
          </DashboardLink>
        }
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
        <Empty>
          No categorized activity has been
          recorded yet.
        </Empty>
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
                  {item.kind
                    .replace(/[_-]/g, " ")}
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
                    width: `${
                      (item.count / maximum) * 100
                    }%`,
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

function DepartmentOverview({
  data,
}: {
  data: Analytics;
}) {
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
            Academic oversight based on available
            department records.
          </p>
        </div>

        <DashboardLink to="/analytics">
          View detailed analytics
        </DashboardLink>
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

        <DepartmentStudentsAttention
          rows={data.gradebook ?? []}
        />

        <DepartmentCourseProgress
          rows={data.gradebook ?? []}
        />

        <DepartmentActivity data={data} />
      </div>
    </div>
  );
}

function LearningProgress({
  rows,
  isStudent,
}: {
  rows: GradeRow[];
  isStudent: boolean;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>
            {isStudent
              ? "My learning progress"
              : "Course progress"}
          </h2>

          <p className="muted">
            Based on released assessments and
            completed lessons.
          </p>
        </div>

        <DashboardLink to="/grades">
          View gradebook
        </DashboardLink>
      </div>

      {!rows.length ? (
        <Empty>
          No learning progress is available yet.
        </Empty>
      ) : (
        <div className="progress-list">
          {rows.slice(0, 5).map((row, index) => (
            <div
              className="progress-row"
              key={`${row.student}-${row.offering}`}
            >
              <div
                className={`course-initial tint-${
                  index % 3
                }`}
              >
                {row.offering_label
                  .slice(0, 2)
                  .toUpperCase()}
              </div>

              <div className="progress-info">
                <b>{row.offering_label}</b>

                <span>
                  {isStudent
                    ? "Lesson completion"
                    : row.student_label}
                </span>

                <div className="progress-track">
                  <div
                    style={{
                      width: `${
                        clampPercentage(
                          row.completion_pct
                        )
                      }%`,
                    }}
                  />
                </div>
              </div>

              <strong>
                {formatPercentage(
                  row.completion_pct
                )}
                <small>complete</small>
              </strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function UpcomingAssignments() {
  const assignments = useQuery({
    queryKey: ["dashboard-assignments"],
    queryFn: () =>
      api<Page<RecordData>>(
        `assignments/?published=true&ordering=due_at&due_at__gte=${encodeURIComponent(
          new Date().toISOString()
        )}`
      ),
  });

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Upcoming assignments</h2>

        <Link
          className="text-link"
          to="/assignments"
        >
          View all
        </Link>
      </div>

      {assignments.isPending ? (
        <Loading />
      ) : assignments.isError ? (
        <ErrorState error={assignments.error} />
      ) : (
        <div className="upcoming-list">
          {assignments.data.results
            .filter(
              (row) =>
                row.due_at &&
                new Date(String(row.due_at)) >=
                  new Date()
            )
            .sort((a, b) =>
              String(a.due_at).localeCompare(
                String(b.due_at)
              )
            )
            .slice(0, 3)
            .map((row) => {
              const dueDate = new Date(
                String(row.due_at)
              );

              return (
                <Link
                  to="/assignments"
                  key={String(row.id)}
                  className="upcoming-item"
                >
                  <div className="date-block">
                    <span>
                      {dueDate.toLocaleDateString(
                        "en",
                        { month: "short" }
                      )}
                    </span>

                    <strong>
                      {dueDate.getDate()}
                    </strong>
                  </div>

                  <div>
                    <b>{String(row.title)}</b>

                    <small>
                      {String(
                        row.offering_label ?? ""
                      )}
                    </small>

                    <span className="pill small">
                      Assignment
                    </span>
                  </div>
                </Link>
              );
            })}

          {!assignments.data.results.some(
            (row) =>
              row.due_at &&
              new Date(String(row.due_at)) >=
                new Date()
          ) && (
            <Empty>
              No upcoming assignments.
            </Empty>
          )}
        </div>
      )}
    </section>
  );
}

function AnnouncementsPreview() {
  const announcements = useQuery({
    queryKey: ["dashboard-announcements"],
    queryFn: () =>
      api<Page<RecordData>>(
        "announcements/?published=true"
      ),
  });

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Announcements</h2>

        <Link
          className="text-link"
          to="/announcements"
        >
          View all
        </Link>
      </div>

      {announcements.isPending ? (
        <Loading />
      ) : announcements.isError ? (
        <ErrorState error={announcements.error} />
      ) : (
        <>
          {announcements.data.results
            .filter((row) =>
              Boolean(row.published)
            )
            .slice(0, 2)
            .map((row) => (
              <article
                className="announcement-item"
                key={String(row.id)}
              >
                <span className="pill small">
                  ANNOUNCEMENT
                </span>

                <h3>{String(row.title)}</h3>

                <p>{String(row.body)}</p>

                <small>
                  {row.created_at
                    ? new Date(
                        String(row.created_at)
                      ).toLocaleDateString()
                    : ""}
                </small>
              </article>
            ))}

          {!announcements.data.results.some(
            (row) =>
              Boolean(row.published)
          ) && (
            <Empty>
              No announcements available.
            </Empty>
          )}
        </>
      )}
    </section>
  );
}

export function Dashboard() {
  const { user, role } = useAuth();

  const hasInstitute = Boolean(
    user?.institute_id
  );

  const isSuperAdmin =
    role === "superadmin";

  const isAdmin = role === "admin";
  const isHead = role === "head";
  const isTeacher = role === "teacher";
  const isStudent = role === "student";

  const query = useQuery({
    queryKey: [
      "analytics",
      user?.institute_id,
    ],
    queryFn: () =>
      api<Analytics>("analytics/"),
    enabled:
      hasInstitute && !isSuperAdmin,
  });

  const platform = useQuery({
    queryKey: ["platform"],
    queryFn: () =>
      api<Record<string, number>>(
        "platform/"
      ),
    enabled: isSuperAdmin,
  });

  if (isSuperAdmin) {
    const platformStats: Stat[] =
      Object.entries(
        platform.data ?? {}
      ).map(([key, value]) => ({
        label: key.replaceAll("_", " "),
        value: formatNumber(value),
        description: "Platform overview",
        icon: Building2,
      }));

    return (
      <>
        <PageHeader
          title="Platform overview"
          description="Manage institutions and administrative oversight across IntelliLMS."
        />

        {platform.isPending ? (
          <Loading />
        ) : platform.isError ? (
          <ErrorState
            error={platform.error}
          />
        ) : (
          <>
            {platformStats.length ? (
              <DashboardStats
                stats={platformStats}
              />
            ) : (
              <Empty>
                Platform statistics are not
                available.
              </Empty>
            )}

            <section
              className="panel"
              style={{ marginTop: 20 }}
            >
              <div className="panel-heading">
                <div>
                  <h2>
                    Institution management
                  </h2>

                  <p className="muted">
                    Manage institutions through
                    the dedicated administration
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
    return (
      <ErrorState error={query.error} />
    );
  }

  const data = query.data;

  const instituteStats: Stat[] = [
    {
      label: "Active students",
      value: formatNumber(data.students),
      description:
        "Students within your academic scope",
      icon: GraduationCap,
    },
    {
      label: "Teachers",
      value: formatNumber(data.teachers),
      description:
        "Teaching staff within your scope",
      icon: UserRoundCheck,
    },
    {
      label: "Active courses",
      value: formatNumber(
        data.active_courses
      ),
      description:
        "Current course offerings",
      icon: BookOpen,
    },
    {
      label: "Attendance",
      value: formatPercentage(
        data.attendance_pct
      ),
      description:
        "Present and late; excused excluded",
      icon: ClipboardCheck,
    },
  ];

  const teacherStats: Stat[] = [
    {
      label: "My courses",
      value: formatNumber(
        data.active_courses
      ),
      description:
        "Assigned course offerings",
      icon: BookOpen,
    },
    {
      label: "Enrolled learners",
      value: formatNumber(data.students),
      description:
        "Students within teaching scope",
      icon: Users,
    },
    {
      label: "Attendance",
      value: formatPercentage(
        data.attendance_pct
      ),
      description:
        "Attendance within teaching scope",
      icon: ClipboardCheck,
    },
    {
      label: "Submissions",
      value: formatNumber(
        data.submissions
      ),
      description:
        "Recorded submissions",
      icon: Activity,
    },
  ];

  const studentStats: Stat[] = [
    {
      label: "My courses",
      value: formatNumber(
        data.active_courses
      ),
      description:
        "Current enrolled courses",
      icon: BookOpen,
    },
    {
      label: "My submissions",
      value: formatNumber(
        data.submissions
      ),
      description:
        "Submitted coursework",
      icon: ClipboardCheck,
    },
    {
      label: "Attendance",
      value: formatPercentage(
        data.attendance_pct
      ),
      description:
        "My recorded attendance",
      icon: Users,
    },
    {
      label: "Learning activity",
      value: formatNumber(
        data.activity_events
      ),
      description:
        "Recorded learning events",
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
    ? "Institution-wide academic information and management."
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

      {isAdmin && (
        <AcademicHealth data={data} />
      )}

      {isHead && (
        <DepartmentOverview data={data} />
      )}

      {isTeacher && (
        <div
          className="dashboard-grid"
          style={{ marginTop: 20 }}
        >
          <LearningProgress
            rows={data.gradebook}
            isStudent={false}
          />

          <UpcomingAssignments />

          <AnnouncementsPreview />
        </div>
      )}

      {isStudent && (
        <>
          <StudentPriorities
            progress={data.gradebook}
          />

          <div
            className="dashboard-grid"
            style={{ marginTop: 20 }}
          >
            <LearningProgress
              rows={data.gradebook}
              isStudent
            />

            <UpcomingAssignments />

            <AnnouncementsPreview />
          </div>
        </>
      )}
    </>
  );
}
export { Gradebook } from "./Gradebook";
