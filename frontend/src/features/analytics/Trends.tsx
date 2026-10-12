import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  GraduationCap,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";

import { Workload } from "./Workload";
import { StudentPriorities } from "./StudentPriorities";
import { useAuth } from "../auth/Auth";
import {
  api,
  display,
  type Page,
  type RecordData,
} from "../../lib/api";
import { Button } from "../../components/ui/button";
import {
  PageHeader,
  Loading,
  ErrorState,
  Empty,
} from "../../components/shared";

type Point = {
  date: string;
  percentage?: number | null;
  count?: number | null;
};

interface DepartmentSummary {
  unit_id: string | null;
  unit: string;
  learners: number;
  courses: number;
  average_score: number | null;
  average_attendance: number | null;
}

interface TrendsData {
  window_days: number;
  activity: Point[];
  attendance: Point[];
  assignment_scores: Point[];
  assignment_completion_pct: number | null;
  score_basis: string;
  departments: DepartmentSummary[];
  instructor_workload: {
    teacher: string;
    courses: number;
    learners: number;
  }[];
}

type SelectedClass = {
  id: string;
  title: string;
  subtitle: string;
};

type TrendsProps = {
  offering?: string;
};

const colors = {
  dark: "#173e2d",
  green: "#4f9c70",
  lightGreen: "#e8f3ec",
  muted: "#718078",
  border: "#dfe9e2",
  surface: "#f5f9f6",
  white: "#ffffff",
};

function isNumber(
  value: number | null | undefined,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function formatNumber(
  value: number | null | undefined,
): string {
  if (!isNumber(value)) return "—";

  return new Intl.NumberFormat("en").format(value);
}

function formatPercent(
  value: number | null | undefined,
): string {
  if (!isNumber(value)) return "—";

  return `${value.toFixed(1)}%`;
}

function clampPercent(
  value: number | null | undefined,
): number {
  if (!isNumber(value)) return 0;

  return Math.max(0, Math.min(100, value));
}

function formatDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

function getPointValue(
  point: Point,
  percent: boolean,
): number | null {
  const value = percent
    ? point.percentage
    : point.count;

  return isNumber(value) ? value : null;
}

function getOfferingTitle(row: RecordData): string {
  const candidates = [
    row.display_name,
    row.label,
    row.offering_label,
    row.title,
    row.name,
    row.course_label,
    row.subject_label,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate === "string" &&
      candidate.trim()
    ) {
      return candidate.trim();
    }
  }

  const course = row.course;

  if (
    course &&
    typeof course === "object" &&
    !Array.isArray(course)
  ) {
    const nested = course as Record<
      string,
      unknown
    >;

    for (const candidate of [
      nested.title,
      nested.name,
      nested.code,
    ]) {
      if (
        typeof candidate === "string" &&
        candidate.trim()
      ) {
        return candidate.trim();
      }
    }
  }

  return `Class ${String(row.id).slice(0, 8)}`;
}

function getOfferingSubtitle(
  row: RecordData,
): string {
  const parts: string[] = [];

  const code =
    row.course_code ??
    row.code ??
    row.subject_code;

  const section =
    row.section_label ??
    row.section_name ??
    row.section;

  const semester =
    row.semester_label ??
    row.term_label ??
    row.semester;

  if (
    code !== null &&
    code !== undefined &&
    typeof code !== "object"
  ) {
    parts.push(String(code));
  }

  if (
    section !== null &&
    section !== undefined &&
    typeof section !== "object"
  ) {
    parts.push(`Section ${display(section)}`);
  }

  if (
    semester !== null &&
    semester !== undefined &&
    typeof semester !== "object"
  ) {
    parts.push(String(semester));
  }

  return parts.join(" · ");
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof Activity;
}) {
  return (
    <article
      style={{
        background: colors.white,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        padding: 20,
        minHeight: 145,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 15,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span
          style={{
            color: colors.muted,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {label}
        </span>

        <span
          style={{
            width: 36,
            height: 36,
            display: "grid",
            placeItems: "center",
            borderRadius: 10,
            background: colors.lightGreen,
            color: colors.dark,
            flexShrink: 0,
          }}
        >
          <Icon
            size={18}
            aria-hidden="true"
          />
        </span>
      </div>

      <div>
        <strong
          style={{
            display: "block",
            color: colors.dark,
            fontSize: 27,
            lineHeight: 1.2,
            marginBottom: 7,
          }}
        >
          {value}
        </strong>

        <small
          style={{
            color: colors.muted,
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {description}
        </small>
      </div>
    </article>
  );
}

function ProgressBar({
  value,
  label,
}: {
  value: number | null;
  label: string;
}) {
  if (!isNumber(value)) {
    return (
      <span
        style={{
          color: colors.muted,
          fontSize: 13,
        }}
        title={`${label}: no available result`}
      >
        —
      </span>
    );
  }

  return (
    <div
      style={{
        minWidth: 105,
        display: "grid",
        gap: 7,
      }}
    >
      <strong
        style={{
          color: colors.dark,
          fontSize: 13,
        }}
      >
        {formatPercent(value)}
      </strong>

      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clampPercent(value)}
        style={{
          height: 6,
          background: "#e8eee9",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${clampPercent(value)}%`,
            background: colors.green,
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}

function TrendChart({
  title,
  description,
  points,
  percent = false,
}: {
  title: string;
  description: string;
  points: Point[];
  percent?: boolean;
}) {
  const [showTable, setShowTable] =
    useState(false);

  const observations = useMemo(
    () =>
      [...points].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    [points],
  );

  const available = observations.filter(
    (point) =>
      getPointValue(point, percent) !== null,
  );

  const maximum = percent
    ? 100
    : Math.max(
        1,
        ...available.map(
          (point) =>
            getPointValue(point, false) ?? 0,
        ),
      );

  const total = percent
    ? null
    : available.reduce(
        (sum, point) =>
          sum + (getPointValue(point, false) ?? 0),
        0,
      );

  const average = percent && available.length
    ? available.reduce(
        (sum, point) =>
          sum + (getPointValue(point, true) ?? 0),
        0,
      ) / available.length
    : null;

  const summary = percent
    ? formatPercent(average)
    : formatNumber(total);

  const summaryLabel = percent
    ? "Mean of recorded daily percentages"
    : "Recorded events in this period";

  return (
    <section
      className="panel"
      style={{
        padding: "22px 24px",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div
          style={{
            minWidth: 0,
            flex: "1 1 220px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              color: colors.dark,
            }}
          >
            {title}
          </h2>

          <p
            className="muted"
            style={{
              margin: "8px 0 0",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {description}
          </p>
        </div>

        <div
          style={{
            padding: "10px 13px",
            borderRadius: 10,
            background: colors.surface,
            textAlign: "right",
            flexShrink: 0,
          }}
        >
          <strong
            style={{
              display: "block",
              fontSize: 19,
              color: colors.dark,
            }}
          >
            {summary}
          </strong>

          <small
            style={{
              display: "block",
              maxWidth: 180,
              fontSize: 11,
              lineHeight: 1.4,
              color: colors.muted,
              marginTop: 3,
            }}
          >
            {summaryLabel}
          </small>
        </div>
      </div>

      {!observations.length ? (
        <div style={{ marginTop: 24 }}>
          <Empty>
            No recorded observations in this period.
          </Empty>
        </div>
      ) : !available.length ? (
        <div style={{ marginTop: 24 }}>
          <Empty>
            No values are available for the recorded
            dates.
          </Empty>
        </div>
      ) : (
        <>
          <div
            style={{
              marginTop: 26,
              border: `1px solid ${colors.border}`,
              background: "#fbfdfb",
              borderRadius: 12,
              padding: "18px 16px 14px",
              overflowX: "auto",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap:
                  observations.length <= 5
                    ? 22
                    : 10,
                minWidth:
                  observations.length > 12
                    ? observations.length * 52
                    : undefined,
                minHeight: 185,
                width: "100%",
              }}
            >
              {observations.map((point) => {
                const value = getPointValue(
                  point,
                  percent,
                );

                const height =
                  value === null
                    ? 0
                    : value === 0
                      ? 3
                      : Math.max(
                          5,
                          (Math.max(0, value) /
                            maximum) *
                            130,
                        );

                return (
                  <div
                    key={point.date}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 9,
                      flex:
                        observations.length <= 5
                          ? "0 1 100px"
                          : "1 0 35px",
                      minWidth: 35,
                      height: 180,
                    }}
                  >
                    <strong
                      style={{
                        fontSize: 11,
                        color: colors.dark,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {value === null
                        ? "—"
                        : percent
                          ? formatPercent(value)
                          : formatNumber(value)}
                    </strong>

                    <div
                      style={{
                        height,
                        width: "100%",
                        maxWidth: 65,
                        borderRadius:
                          "7px 7px 2px 2px",
                        background:
                          value === null
                            ? "transparent"
                            : colors.green,
                        flexShrink: 0,
                      }}
                    />

                    <small
                      style={{
                        color: colors.muted,
                        fontSize: 11,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(point.date)}
                    </small>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <button
              type="button"
              onClick={() =>
                setShowTable((current) => !current)
              }
              aria-expanded={showTable}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "5px 0",
                border: 0,
                background: "transparent",
                color: colors.muted,
                cursor: "pointer",
                font: "inherit",
                fontSize: 12,
              }}
            >
              <ChevronDown
                size={14}
                aria-hidden="true"
                style={{
                  transform: showTable
                    ? "rotate(180deg)"
                    : undefined,
                }}
              />

              {showTable
                ? "Hide accessible data table"
                : "View accessible data table"}
            </button>

            {showTable && (
              <div
                className="table-scroll"
                style={{
                  marginTop: 10,
                }}
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">
                        {percent
                          ? "Percentage"
                          : "Events"}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {observations.map((point) => {
                      const value = getPointValue(
                        point,
                        percent,
                      );

                      return (
                        <tr key={point.date}>
                          <td>{point.date}</td>
                          <td>
                            {value === null
                              ? "—"
                              : percent
                                ? formatPercent(value)
                                : formatNumber(value)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function DepartmentOverview({
  departments,
}: {
  departments: DepartmentSummary[];
}) {
  if (!departments.length) return null;

  return (
    <section
      className="panel"
      style={{
        padding: "22px 24px",
      }}
    >
      <div className="panel-heading">
        <div>
          <h2>Academic unit overview</h2>

          <p className="muted">
            Compare learner participation and released
            results across academic units.
          </p>
        </div>
      </div>

      <div
        className="table-scroll"
        style={{
          marginTop: 20,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          overflowX: "auto",
        }}
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Academic unit</th>
              <th scope="col">Learners</th>
              <th scope="col">Courses</th>
              <th scope="col">
                Average released score
              </th>
              <th scope="col">
                Mean learner attendance
              </th>
            </tr>
          </thead>

          <tbody>
            {departments.map((department) => (
              <tr
                key={
                  department.unit_id ??
                  "unassigned"
                }
              >
                <td className="primary-cell">
                  <strong>
                    {department.unit}
                  </strong>
                </td>

                <td>
                  {formatNumber(
                    department.learners,
                  )}
                </td>

                <td>
                  {formatNumber(
                    department.courses,
                  )}
                </td>

                <td>
                  <ProgressBar
                    value={
                      department.average_score
                    }
                    label={`Average released score for ${department.unit}`}
                  />
                </td>

                <td>
                  <ProgressBar
                    value={
                      department.average_attendance
                    }
                    label={`Mean attendance for ${department.unit}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ClassSelectionCard({
  row,
  onOpen,
}: {
  row: RecordData;
  onOpen: (value: SelectedClass) => void;
}) {
  const title = getOfferingTitle(row);
  const subtitle = getOfferingSubtitle(row);

  return (
    <button
      type="button"
      onClick={() =>
        onOpen({
          id: String(row.id),
          title,
          subtitle,
        })
      }
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        width: "100%",
        minWidth: 0,
        padding: "18px 20px",
        background: colors.white,
        border: `1px solid ${colors.border}`,
        borderRadius: 13,
        textAlign: "left",
        font: "inherit",
        color: "inherit",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          minWidth: 0,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            display: "grid",
            placeItems: "center",
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: 11,
            background: colors.lightGreen,
            color: colors.dark,
          }}
        >
          <BookOpen size={21} />
        </div>

        <div style={{ minWidth: 0 }}>
          <strong
            style={{
              display: "block",
              color: colors.dark,
              fontSize: 14,
              lineHeight: 1.5,
              overflowWrap: "anywhere",
            }}
          >
            {title}
          </strong>

          <small
            style={{
              display: "block",
              color: colors.muted,
              marginTop: 5,
              fontSize: 12,
            }}
          >
            {subtitle || "Course offering"}
          </small>
        </div>
      </div>

      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          color: colors.dark,
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        View progress
        <ArrowRight
          size={16}
          aria-hidden="true"
        />
      </span>
    </button>
  );
}

function ClassSelector({
  onOpen,
}: {
  onOpen: (value: SelectedClass) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({
    page: String(page),
  });

  if (search.trim()) {
    params.set("search", search.trim());
  }

  const query = useQuery({
    queryKey: [
      "progress-classes",
      page,
      search.trim(),
    ],
    queryFn: () =>
      api<Page<RecordData>>(
        `offerings/?${params.toString()}`,
      ),
  });

  return (
    <section
      className="panel"
      style={{
        padding: "22px 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              color: colors.dark,
              fontSize: 19,
            }}
          >
            Browse classes
          </h2>

          <p
            className="muted"
            style={{
              margin: "7px 0 0",
              fontSize: 13,
            }}
          >
            Select a class to inspect its recorded
            learning progress.
          </p>
        </div>

        {query.data && (
          <span className="count-badge">
            {formatNumber(query.data.count)} classes
          </span>
        )}
      </div>

      <label
        style={{
          display: "block",
          maxWidth: 520,
          marginTop: 22,
          marginBottom: 22,
        }}
      >
        <span
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 650,
            marginBottom: 9,
          }}
        >
          Search course or class
        </span>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            padding: "0 13px",
          }}
        >
          <Search
            size={18}
            color={colors.muted}
            aria-hidden="true"
          />

          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search courses and classes..."
            style={{
              width: "100%",
              height: 44,
              border: 0,
              outline: "none",
              background: "transparent",
              font: "inherit",
              fontSize: 13,
            }}
          />
        </div>
      </label>

      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} />
      ) : !query.data.results.length ? (
        <Empty>
          {search.trim()
            ? "No classes match your search."
            : "No classes are available."}
        </Empty>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 350px), 1fr))",
            gap: 12,
          }}
        >
          {query.data.results.map((row) => (
            <ClassSelectionCard
              key={String(row.id)}
              row={row}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}

      {query.data && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginTop: 22,
            flexWrap: "wrap",
          }}
        >
          <small className="muted">
            Page {page} ·{" "}
            {formatNumber(query.data.count)} classes
          </small>

          <div
            style={{
              display: "flex",
              gap: 8,
            }}
          >
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() =>
                setPage((current) =>
                  Math.max(1, current - 1),
                )
              }
            >
              Previous
            </Button>

            <Button
              variant="outline"
              disabled={!query.data.next}
              onClick={() =>
                setPage((current) => current + 1)
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function ProgressOverview({
  data,
  role,
  offering,
}: {
  data: TrendsData;
  role: string;
  offering?: string;
}) {
  const activityTotal = data.activity.reduce(
    (sum, point) =>
      sum +
      (isNumber(point.count)
        ? point.count
        : 0),
    0,
  );

  const recordedAttendance =
    data.attendance.filter((point) =>
      isNumber(point.percentage),
    );

  const meanDailyAttendance =
    recordedAttendance.length
      ? recordedAttendance.reduce(
          (sum, point) =>
            sum +
            (point.percentage ?? 0),
          0,
        ) / recordedAttendance.length
      : null;

  const recordedScores =
    data.assignment_scores.filter((point) =>
      isNumber(point.percentage),
    );

  const meanDailyAssignmentScore =
    recordedScores.length
      ? recordedScores.reduce(
          (sum, point) =>
            sum +
            (point.percentage ?? 0),
          0,
        ) / recordedScores.length
      : null;

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <MetricCard
          label="Learning activity"
          value={formatNumber(activityTotal)}
          description="Recorded learning events in the selected period"
          icon={Activity}
        />

        <MetricCard
          label="Daily attendance"
          value={formatPercent(
            meanDailyAttendance,
          )}
          description="Mean of available daily attendance percentages"
          icon={Users}
        />

        <MetricCard
          label="Assignment completion"
          value={
            data.assignment_completion_pct === null
              ? "—"
              : formatPercent(
                  data.assignment_completion_pct,
                )
          }
          description={
            data.assignment_completion_pct === null
              ? "No published assignments"
              : "Completion across active enrollments"
          }
          icon={ClipboardCheck}
        />

        <MetricCard
          label="Released performance"
          value={formatPercent(
            meanDailyAssignmentScore,
          )}
          description="Mean of available daily released assignment percentages"
          icon={TrendingUp}
        />
      </div>

      <div
        className="info-strip"
        style={{
          marginBottom: 20,
          lineHeight: 1.7,
        }}
      >
        <strong>
          Reporting period: last {data.window_days} days
        </strong>

        <div style={{ marginTop: 5 }}>
          Assignment completion across active
          enrollments:{" "}
          {data.assignment_completion_pct === null
            ? "No published assignments"
            : formatPercent(
                data.assignment_completion_pct,
              )}
          . Missing observations are not interpreted
          as inactivity or failure.
        </div>

        <div
          style={{
            marginTop: 5,
            fontSize: 12,
          }}
        >
          Summary attendance and released-performance
          figures above are simple means of recorded
          daily percentages, not weighted
          institution-wide averages.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <TrendChart
          title="Learning activity"
          description="Lesson completions, assignment submissions, and submitted quizzes."
          points={data.activity}
        />

        <TrendChart
          title="Attendance over time"
          description="Present and late records; excused sessions excluded."
          points={data.attendance}
          percent
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <TrendChart
          title="Released assignment performance"
          description={data.score_basis}
          points={data.assignment_scores}
          percent
        />
      </div>

      {!offering && (
        <div style={{ marginBottom: 20 }}>
          <DepartmentOverview
            departments={data.departments}
          />
        </div>
      )}

      {role !== "student" && !offering && (
        <Workload />
      )}
    </>
  );
}

function ClassProgress({
  selected,
  onBack,
  role,
}: {
  selected: SelectedClass;
  onBack?: () => void;
  role: string;
}) {
  const query = useQuery({
    queryKey: [
      "trends",
      selected.id,
    ],
    queryFn: () =>
      api<TrendsData>(
        `analytics/trends/?offering=${encodeURIComponent(
          selected.id,
        )}`,
      ),
  });

  return (
    <>
      {onBack && (
        <div style={{ marginBottom: 18 }}>
          <Button
            variant="outline"
            onClick={onBack}
          >
            <ArrowLeft
              size={16}
              aria-hidden="true"
            />
            All classes
          </Button>
        </div>
      )}

      <section
        className="panel"
        style={{
          padding: "22px 24px",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 15,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: colors.lightGreen,
              color: colors.dark,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <BookOpen size={23} />
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                color: colors.dark,
                fontSize: 20,
              }}
            >
              {selected.title}
            </h2>

            <p
              className="muted"
              style={{
                margin: "6px 0 0",
                fontSize: 13,
              }}
            >
              {selected.subtitle ||
                "Class learning progress"}
            </p>
          </div>
        </div>
      </section>

      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} />
      ) : (
        <ProgressOverview
          data={query.data}
          role={role}
          offering={selected.id}
        />
      )}
    </>
  );
}

export function Trends({
  offering,
}: TrendsProps = {}) {
  const { role } = useAuth();

  const isStudent = role === "student";
  const isAdmin = role === "admin";
  const isHead = role === "head";
  const isTeacher = role === "teacher";

  const [view, setView] = useState<
    "overview" | "classes"
  >(
    isAdmin ? "overview" : "classes",
  );

  const [selectedClass, setSelectedClass] =
    useState<SelectedClass | null>(null);

  const overviewQuery = useQuery({
    queryKey: ["trends", "overview"],
    queryFn: () =>
      api<TrendsData>("analytics/trends/"),
    enabled:
      !offering &&
      !selectedClass &&
      (isStudent || view === "overview"),
  });

  const pageTitle = isStudent
    ? "My academic progress"
    : isAdmin
      ? "Academic progress"
      : isHead
        ? "Department progress"
        : isTeacher
          ? "Teaching progress"
          : "Academic progress";

  const pageDescription = isStudent
    ? "Review your recorded learning activity, attendance, and released work."
    : isAdmin
      ? "Monitor academic performance across your institution or inspect an individual class."
      : isHead
        ? "Review academic activity within your department and its classes."
        : isTeacher
          ? "Review learning activity and progress in your assigned classes."
          : "Patterns in recorded learning activity, attendance, and released work.";

  const fixedClass: SelectedClass | null =
    offering
      ? {
          id: String(offering),
          title: "Selected class",
          subtitle: "",
        }
      : selectedClass;

  return (
    <>
      <PageHeader
        title={pageTitle}
        description={pageDescription}
      />

      {isStudent && (
        <StudentPriorities />
      )}

      {!offering && !isStudent && (
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <Button
            variant={
              view === "overview"
                ? "default"
                : "outline"
            }
            onClick={() => {
              setView("overview");
              setSelectedClass(null);
            }}
          >
            <BarChart3
              size={16}
              aria-hidden="true"
            />
            {isAdmin
              ? "Institution overview"
              : isHead
                ? "Department overview"
                : "Teaching overview"}
          </Button>

          <Button
            variant={
              view === "classes"
                ? "default"
                : "outline"
            }
            onClick={() => {
              setView("classes");
              setSelectedClass(null);
            }}
          >
            <BookOpen
              size={16}
              aria-hidden="true"
            />
            Browse classes
          </Button>
        </div>
      )}

      {fixedClass ? (
        <ClassProgress
          key={fixedClass.id}
          selected={fixedClass}
          role={role}
          onBack={
            offering
              ? undefined
              : () => setSelectedClass(null)
          }
        />
      ) : isStudent || view === "overview" ? (
        overviewQuery.isPending ? (
          <Loading />
        ) : overviewQuery.isError ? (
          <ErrorState
            error={overviewQuery.error}
          />
        ) : (
          <ProgressOverview
            data={overviewQuery.data}
            role={role}
          />
        )
      ) : (
        <ClassSelector
          onOpen={setSelectedClass}
        />
      )}
    </>
  );
}