import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type Page } from "../../lib/api";
import { Pagination } from "../../components/ReportControls";
import { Loading, ErrorState } from "../../components/shared";

type Decision = {id: string; operation: string; reason: string; created_at: string; evidence: {
  notice: string; policy: string; required_courses: {stage: number; course: string; offering: string | null; score: number | null; meeting_pass_mark: boolean | null}[];
}};
const labels: Record<string, string> = {progress: "Progression", repeat: "Repetition", correct: "Placement correction", withdraw: "Withdrawal", complete: "Completion", graduate: "Graduation"};

export function AcademicDecisions({member}: {member?: string}) {
  const [page, setPage] = useState(1);
  const query = useQuery({queryKey: ["academic-decisions", member, page], queryFn: () => api<Page<Decision>>(`${member ? `memberships/${member}/progression-history/` : "academic-decisions/"}?page=${page}`)});
  return <section className="panel padded" aria-label="Recorded academic decisions"><h2>Recorded academic decisions</h2>
    {query.isPending ? <Loading /> : query.isError ? <ErrorState error={query.error} /> : <>
      {!query.data.results.length ? <p>No progression decisions have been recorded.</p> : query.data.results.map(decision => <details key={decision.id}>
        <summary>{labels[decision.operation] || decision.operation} · {new Date(decision.created_at).toLocaleDateString()}</summary>
        <p>{decision.reason}</p><p>{decision.evidence.notice}</p>
        <p>Policy at review: {decision.evidence.policy === "all_required_pass" ? "Every required subject must pass" : "Manual academic review"}.</p>
        <ul>{decision.evidence.required_courses.map(row => <li key={`${row.stage}:${row.course}`}>Stage {row.stage} · {row.offering || "No enrollment recorded"}: {row.score === null ? "Result unavailable" : `${row.score}%`} ({row.meeting_pass_mark === null ? "unverified" : row.meeting_pass_mark ? "meets pass mark" : "below pass mark"})</li>)}</ul>
      </details>)}
      <Pagination data={query.data} page={page} onChange={setPage} label="Academic decisions" />
    </>}
  </section>;
}
