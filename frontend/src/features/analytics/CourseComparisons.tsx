import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, type Page } from "../../lib/api";
import { useTerminology } from "../../lib/terminology";
import { useInstitution } from "../../lib/institution";
import { Pagination, ReportFilters } from "../../components/ReportControls";
import { Empty, ErrorState, Loading } from "../../components/shared";

type CourseRow = {
  id: string;
  title: string;
  department: string;
  term: string;
  section: string | null;
  learners: number;
  instructors: number;
  missing_submissions: number;
  released_grades: number;
  below_pass_mark: number;
  meeting_pass_mark: number;
  assignment_average: number | null;
  attendance_records: number;
  attendance_percentage: number | null;
};
const percent = (value: number | null) =>
  value === null ? "No records" : `${value.toFixed(1)}%`;

export function CourseComparisons() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [ordering, setOrdering] = useState("title");
  const terms = useTerminology();
  const institution = useInstitution();
  const change = (next: Record<string, string>) => {
    setFilters(next);
    setPage(1);
  };
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value !== ""),
  );
  params.set("page", String(page));
  params.set("ordering", ordering);
  const query = useQuery({
    queryKey: ["course-comparisons", params.toString()],
    queryFn: () => api<Page<CourseRow>>(`analytics/courses/?${params}`),
  });
  return (
    <section className="panel padded" aria-label="Course comparisons">
      <h2>Course comparisons</h2>
      <p className="muted">
        Compare recorded facts for active enrollments. Assignment averages and
        pass counts use released assignment grades, not weighted course grades
        or model estimates. Missing work counts overdue published assignments
        without a submission.
      </p>
      <ReportFilters value={filters} onChange={change} />

      <label>
        Sort courses
        <select
          value={ordering}
          onChange={(event) => {
            setOrdering(event.target.value);
            setPage(1);
          }}
        >
          <option value="title">Title A–Z</option>
          <option value="-title">Title Z–A</option>
          <option value="-learners">Most enrolled learners</option>
          <option value="learners">Fewest enrolled learners</option>
        </select>
      </label>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} />
      ) : (
        <>
          {query.data.results.length ? (
            <div className="table-scroll">
              <table>
                <caption>
                  Course coverage, attendance and released assignment results
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{terms.label("offering")}</th>
                    <th scope="col">Enrollment / teaching</th>
                    <th scope="col">Attendance</th>
                    <th scope="col">Released assignments</th>
                    <th scope="col">Missing work</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.results.map((row) => (
                    <tr key={row.id}>
                      <th scope="row">
                        <Link to={`/course/${row.id}`}>{row.title}</Link>
                        <div className="muted">
                          {institution.departments ? `${row.department} · ` : ""}{row.term}
                          {row.section ? ` · ${row.section}` : ""}
                        </div>
                      </th>
                      <td>
                        {row.learners} learners
                        <div className="muted">
                          {row.instructors
                            ? `${row.instructors} assigned instructors`
                            : "No instructor assigned"}
                        </div>
                      </td>
                      <td>
                        {percent(row.attendance_percentage)}
                        <div className="muted">
                          {row.attendance_records} records; excused excluded
                        </div>
                      </td>
                      <td>
                        {percent(row.assignment_average)}
                        <div className="muted">
                          {row.released_grades} grades · {row.below_pass_mark}{" "}
                          below pass mark · {row.meeting_pass_mark} meeting pass
                          mark
                        </div>
                      </td>
                      <td>{row.missing_submissions} missing submissions</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No courses match these filters.</Empty>
          )}
          <Pagination
            data={query.data}
            page={page}
            onChange={setPage}
            label="Course comparisons"
          />
        </>
      )}
    </section>
  );
}
