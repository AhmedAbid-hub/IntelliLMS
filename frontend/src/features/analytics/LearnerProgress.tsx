import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type Page } from "../../lib/api";
import { useAuth } from "../auth/Auth";
import { Pagination } from "../../components/ReportControls";
import { RelationSelect } from "../../components/RelationSelect";
import { Empty, ErrorState, Loading } from "../../components/shared";
import type { GradeRow } from "./Dashboard";

type AssignmentRow = {
  id: string;
  title: string;
  due_at: string;
  status: string;
  marks: string | null;
  max_marks: number;
  feedback: string;
};
type Progress = Page<AssignmentRow> & { summary: GradeRow };
const percent = (value: number | null) =>
  value === null ? "Not recorded" : `${value.toFixed(1)}%`;
export function LearnerProgress({ offering }: { offering: string }) {
  const { user, role } = useAuth();
  const [enrollment, setEnrollment] = useState("");
  const [page, setPage] = useState(1);
  const [missing, setMissing] = useState(false);
  const person = useQuery({
    queryKey: ["progress-enrollment", enrollment],
    queryFn: () => api<{ student: string }>(`enrollments/${enrollment}/`),
    enabled: role !== "student" && !!enrollment,
  });
  const student = role === "student" ? user?.id : person.data?.student;
  const params = new URLSearchParams({
    offering,
    student: student || "",
    page: String(page),
    missing_only: String(missing),
  });
  const query = useQuery({
    queryKey: ["learner-progress", params.toString()],
    queryFn: () => api<Progress>(`analytics/learner-progress/?${params}`),
    enabled: !!student,
  });
  return (
    <section className="panel padded" aria-label="Learner progress">
      <h2>
        {role === "student" ? "My recorded progress" : "Learner progress"}
      </h2>
      <p className="muted">
        Attendance, lesson completion and released results are recorded facts.
        Review missing work and released feedback before planning support.
      </p>
      {role !== "student" && (
        <RelationSelect
          source={`enrollments?offering=${offering}&active=true`}
          label="Enrolled learner"
          value={enrollment}
          onChange={(value) => {
            setEnrollment(String(value));
            setPage(1);
          }}
        />
      )}
      {person.isError && <ErrorState error={person.error} />}
      {!student ? (
        <Empty>Select an enrolled learner to view their progress.</Empty>
      ) : query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} />
      ) : (
        <>
          <h3>{query.data.summary.student_label}</h3>
          <dl className="form-grid">
            <div>
              <dt>Released course score</dt>
              <dd>{percent(query.data.summary.score)}</dd>
            </div>
            <div>
              <dt>Recorded attendance</dt>
              <dd>{percent(query.data.summary.attendance_pct)}</dd>
            </div>
            <div>
              <dt>Lesson completion</dt>
              <dd>{percent(query.data.summary.completion_pct)}</dd>
            </div>
          </dl>
          <p className="muted">
            Course scores are provisional and follow the institute's configured
            assessment weights.
          </p>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={missing}
              onChange={(event) => {
                setMissing(event.target.checked);
                setPage(1);
              }}
            />
            Only overdue missing assignments
          </label>
          {query.data.results.length ? (
            <div className="table-scroll">
              <table>
                <caption>Published assignments and released feedback</caption>
                <thead>
                  <tr>
                    <th scope="col">Assignment</th>
                    <th scope="col">Due</th>
                    <th scope="col">Status</th>
                    <th scope="col">Released grade / feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.results.map((row) => (
                    <tr key={row.id}>
                      <th scope="row">{row.title}</th>
                      <td>{new Date(row.due_at).toLocaleString()}</td>
                      <td>{row.status}</td>
                      <td>
                        {row.marks === null
                          ? "No released grade"
                          : `${row.marks} / ${row.max_marks}`}
                        <p>{row.feedback}</p>
                        {row.status === "missing" && (
                          <span className="muted">
                            Discuss the missed deadline with your teacher.
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>
              {missing
                ? "No overdue missing assignments."
                : "No published assignments yet."}
            </Empty>
          )}
          <Pagination
            data={query.data}
            page={page}
            onChange={setPage}
            label="Learner assignments"
          />
        </>
      )}
    </section>
  );
}
