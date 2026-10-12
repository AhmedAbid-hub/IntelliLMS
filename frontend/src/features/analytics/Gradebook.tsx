import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, type Page } from "../../lib/api";
import { useAuth } from "../auth/Auth";
import { PageHeader, Loading, ErrorState, Empty } from "../../components/shared";
import { Button } from "../../components/ui/button";
import { ReportFilters, Pagination, reportParams } from "../../components/ReportControls";
import type { GradeRow } from "./Dashboard";

export function Gradebook({ offering }: { offering?: string }) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const effective = { ...filters, ...(offering ? {offering} : {}) };
  const query = useQuery({
    queryKey: ["gradebook", effective, page],
    queryFn: () =>
      api<Page<GradeRow>>(`grades/?${reportParams(effective, page)}`),
  });
  const { role, user } = useAuth();
  return (
    <>
      <PageHeader
        title="Gradebook & progress"
        description="Released assessment results, attendance, and recorded learning progress."
      >
        {role !== "student" && (
          <Button variant="outline" asChild>
            <a href={`/api/v1/reports/?${reportParams(effective)}`}>Export CSV</a>
          </Button>
        )}
      </PageHeader>
      <Link className="text-link" to={offering ? `/manual-grades?offering=${offering}` : "/manual-grades"}>
        View manual assessment grades →
      </Link>
      <p className="info-strip">
        Scores are provisional. Only released grades contribute.{" "}
        {user?.institute_profile?.grading_rules?.missing_category_policy ===
        "zero"
          ? "Missing categories count as zero after a released grade is available."
          : "Missing categories are excluded and available category weights are normalized."}
      </p>
      <ReportFilters
        value={filters}
        onChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
      />
      <div className="panel">
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState error={query.error} />
        ) : !query.data.results.length ? (
          <Empty />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {[
                    "Student",
                    "Course",
                    "Course score",
                    "Letter / points",
                    "Assignments",
                    "Quizzes",
                    "Manual",
                    "Attendance",
                    "Lessons",
                  ].map((x) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {query.data.results.map((row) => (
                  <tr key={row.student + row.offering}>
                    <td className="primary-cell">{row.student_label}</td>
                    <td>{row.offering_label}</td>
                    <td>
                      {row.score === null ? "—" : `${row.score.toFixed(1)}%`}
                    </td>
                    <td>
                      {row.letter_grade ?? "—"}
                      {row.grade_points != null ? ` / ${row.grade_points}` : ""}
                    </td>
                    {[
                      row.assignment_pct,
                      row.quiz_pct,
                      row.manual_pct,
                      row.attendance_pct,
                      row.completion_pct,
                    ].map((x, i) => (
                      <td key={i}>{x === null ? "—" : `${x.toFixed(1)}%`}</td>
                    ))}
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
