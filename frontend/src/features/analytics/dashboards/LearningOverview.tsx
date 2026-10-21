import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Empty, ErrorState, Loading } from "../../../components/shared";
import { api, type Page, type RecordData } from "../../../lib/api";
import {
  DashboardLink,
  clampPercentage,
  formatPercentage,
} from "./DashboardPresentation";
import { GradeRow } from "./dashboardTypes";

export function LearningProgress({
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
          <h2>{isStudent ? "My learning progress" : "Course progress"}</h2>

          <p className="muted">
            Based on released assessments and completed lessons.
          </p>
        </div>

        <DashboardLink to="/grades">View gradebook</DashboardLink>
      </div>

      {!rows.length ? (
        <Empty>No learning progress is available yet.</Empty>
      ) : (
        <div className="progress-list">
          {rows.slice(0, 5).map((row, index) => (
            <div
              className="progress-row"

              key={`${row.student}-${row.offering}`}
            >
              <div className={`course-initial tint-${index % 3}`}>
                {row.offering_label

                  .slice(0, 2)

                  .toUpperCase()}
              </div>

              <div className="progress-info">
                <b>{row.offering_label}</b>

                <span>
                  {isStudent ? "Lesson completion" : row.student_label}
                </span>

                <div className="progress-track">
                  <div
                    style={{
                      width: `${clampPercentage(row.completion_pct)}%`,
                    }}
                  />
                </div>
              </div>

              <strong>
                {formatPercentage(row.completion_pct)}

                <small>complete</small>
              </strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function UpcomingAssignments() {
  const assignments = useQuery({
    queryKey: ["dashboard-assignments"],

    queryFn: () =>
      api<Page<RecordData>>(
        `assignments/?published=true&ordering=due_at&due_at__gte=${encodeURIComponent(
          new Date().toISOString(),
        )}`,
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
              (row) => row.due_at && new Date(String(row.due_at)) >= new Date(),
            )

            .sort((a, b) => String(a.due_at).localeCompare(String(b.due_at)))

            .slice(0, 3)

            .map((row) => {
              const dueDate = new Date(String(row.due_at));

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

                        { month: "short" },
                      )}
                    </span>

                    <strong>{dueDate.getDate()}</strong>
                  </div>

                  <div>
                    <b>{String(row.title)}</b>

                    <small>{String(row.offering_label ?? "")}</small>

                    <span className="pill small">Assignment</span>
                  </div>
                </Link>
              );
            })}

          {!assignments.data.results.some(
            (row) => row.due_at && new Date(String(row.due_at)) >= new Date(),
          ) && <Empty>No upcoming assignments.</Empty>}
        </div>
      )}
    </section>
  );
}

export function AnnouncementsPreview() {
  const announcements = useQuery({
    queryKey: ["dashboard-announcements"],

    queryFn: () => api<Page<RecordData>>("announcements/?published=true"),
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

            .filter((row) => Boolean(row.published))

            .slice(0, 2)

            .map((row) => (
              <article
                className="announcement-item"

                key={String(row.id)}
              >
                <span className="pill small">ANNOUNCEMENT</span>

                <h3>{String(row.title)}</h3>

                <p>{String(row.body)}</p>

                <small>
                  {row.created_at
                    ? new Date(String(row.created_at)).toLocaleDateString()
                    : ""}
                </small>
              </article>
            ))}

          {!announcements.data.results.some((row) =>
            Boolean(row.published),
          ) && <Empty>No announcements available.</Empty>}
        </>
      )}
    </section>
  );
}
