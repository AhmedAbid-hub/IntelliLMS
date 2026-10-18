import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ClipboardCheck, ExternalLink } from "lucide-react";

import { api, type Page } from "../../lib/api";
import { useAuth } from "../auth/Auth";

import {
  PageHeader,
  Loading,
  ErrorState,
  Empty,
} from "../../components/shared";

import { Button } from "../../components/ui/button";

import {
  ReportFilters,
  Pagination,
  reportParams,
} from "../../components/ReportControls";

import type { GradeRow } from "./Dashboard";

export function Gradebook({
  offering,
}: {
  offering?: string;
}) {
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState<
    Record<string, string>
  >({});

  const { role, user } = useAuth();

  const effective = {
    ...filters,
    ...(offering ? { offering } : {}),
  };

  const query = useQuery({
    queryKey: ["gradebook", effective, page],
    queryFn: () =>
      api<Page<GradeRow>>(
        `grades/?${reportParams(effective, page)}`,
      ),
  });

  const canExport = role !== "student";

  const canViewCorrections = [
    "admin",
    "head",
    "teacher",
  ].includes(role);

  const canViewManualGrades = [
    "head",
    "teacher",
  ].includes(role);

  const gradingPolicy =
    user?.institute_profile?.grading_rules
      ?.missing_category_policy;

  const updateFilters = (
    next: Record<string, string>,
  ) => {
    setFilters(next);
    setPage(1);
  };

  const formatPercent = (
    value: number | null | undefined,
  ) => {
    if (value == null) return "—";

    return `${value.toFixed(1)}%`;
  };

  const columns = [
    "Student",
    "Course",
    "Course score",
    "Letter / points",
    "Assignments",
    "Quizzes",
    "Manual",
    "Attendance",
    "Lessons",
  ];

  return (
    <>
      <style>{`
        .gradebook-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .gradebook-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin: 0 0 20px;
        }

        .gradebook-toolbar-links {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 18px;
        }

        .gradebook-toolbar-link {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #126348;
          font-size: 13px;
          font-weight: 650;
          text-decoration: none;
        }

        .gradebook-toolbar-link:hover {
          text-decoration: underline;
        }

        .gradebook-policy {
          margin-bottom: 24px;
        }

        .gradebook-table {
          width: 100%;
          border-collapse: collapse;
        }

        .gradebook-table th {
          white-space: nowrap;
          vertical-align: middle;
        }

        .gradebook-table td {
          vertical-align: middle;
        }

        .gradebook-table th:nth-child(n + 3),
        .gradebook-table td:nth-child(n + 3) {
          text-align: center;
        }

        .gradebook-table td:first-child {
          font-weight: 650;
        }

        .gradebook-table td:nth-child(2) {
          min-width: 170px;
        }

        .gradebook-score {
          font-weight: 650;
          font-variant-numeric: tabular-nums;
        }

        .gradebook-muted {
          color: #718078;
        }

        .gradebook-table-scroll {
          width: 100%;
          overflow-x: auto;
        }

        @media (max-width: 768px) {
          .gradebook-toolbar {
            align-items: flex-start;
            flex-direction: column;
          }

          .gradebook-actions {
            width: 100%;
          }

          .gradebook-table {
            min-width: 1050px;
          }
        }
      `}</style>

      <PageHeader
        title="Gradebook & progress"
        description="Released assessment results, attendance, and recorded learning progress."
      >
        {canExport && (
          <div className="gradebook-actions">
            <Button variant="outline" asChild>
              <a
                href={`/api/v1/reports/?${reportParams(
                  effective,
                )}`}
              >
                Export CSV
              </a>
            </Button>
          </div>
        )}
      </PageHeader>

      {(canViewCorrections || canViewManualGrades) && (
        <div className="gradebook-toolbar">
          <div className="gradebook-toolbar-links">
            {canViewCorrections && (
              <Link
                className="gradebook-toolbar-link"
                to="/academic-reviews"
              >
                <ClipboardCheck
                  size={16}
                  aria-hidden="true"
                />
                Grade & Attendance Corrections
                <ExternalLink
                  size={13}
                  aria-hidden="true"
                />
              </Link>
            )}

            {canViewManualGrades && (
              <Link
                className="gradebook-toolbar-link"
                to={
                  offering
                    ? `/manual-grades?offering=${encodeURIComponent(
                        offering,
                      )}`
                    : "/manual-grades"
                }
              >
                View manual assessment grades
                <ExternalLink
                  size={13}
                  aria-hidden="true"
                />
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="info-strip gradebook-policy">
        Scores are provisional. Only released grades
        contribute.{" "}
        {gradingPolicy === "zero"
          ? "Missing categories count as zero after a released grade is available."
          : "Missing categories are excluded and available category weights are normalized."}
      </div>

      <ReportFilters
        value={filters}
        onChange={updateFilters}
      />

      <div className="panel">
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState error={query.error} />
        ) : !query.data.results.length ? (
          <Empty />
        ) : (
          <div className="table-scroll gradebook-table-scroll">
            <table className="gradebook-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column} scope="col">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {query.data.results.map((row) => (
                  <tr
                    key={`${row.student}-${row.offering}`}
                  >
                    <td className="primary-cell">
                      {row.student_label}
                    </td>

                    <td>{row.offering_label}</td>

                    <td className="gradebook-score">
                      {formatPercent(row.score)}
                    </td>

                    <td>
                      {row.letter_grade ?? "—"}

                      {row.grade_points != null
                        ? ` / ${row.grade_points}`
                        : ""}
                    </td>

                    <td>
                      {formatPercent(row.assignment_pct)}
                    </td>

                    <td>
                      {formatPercent(row.quiz_pct)}
                    </td>

                    <td>
                      {formatPercent(row.manual_pct)}
                    </td>

                    <td>
                      {formatPercent(row.attendance_pct)}
                    </td>

                    <td>
                      {formatPercent(row.completion_pct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          data={query.data}
          page={page}
          onChange={setPage}
          label="Gradebook"
        />
      </div>
    </>
  );
}