import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type Page } from "../../lib/api";
import { Pagination } from "../../components/ReportControls";
import { PageHeader, Loading, ErrorState, Empty } from "../../components/shared";
import { useTerminology } from "../../lib/terminology";
import { AcademicResults } from "./AcademicResults";
import { AcademicDecisions } from "./AcademicDecisions";
type Result = {offering: string; offering_label: string; term: string; active: boolean; score: number | null; grade_label?: string | null; attendance_pct: number | null};
export function AcademicHistory() {
  const [page, setPage] = useState(1);
  const terms = useTerminology();
  const query = useQuery({queryKey: ["academic-history", page], queryFn: () => api<Page<Result>>(`academic-history/?page=${page}`)});
  return <><PageHeader title="My academic history" description="Released results from current and previous enrollments. Calculations remain provisional; this is not a finalized transcript." />
    <AcademicResults />
    <AcademicDecisions />
    {query.isPending ? <Loading /> : query.isError ? <ErrorState error={query.error} /> : !query.data.results.length ? <Empty>No academic records yet</Empty> : <>
      <div className="table-wrap"><table><thead><tr><th>{terms.label("offering")}</th><th>{terms.label("term")}</th><th>Enrollment</th><th>Released score</th><th>Attendance</th></tr></thead><tbody>{query.data.results.map(row => <tr key={row.offering}><td>{row.offering_label}</td><td>{row.term}</td><td>{row.active ? "Current" : "Historical"}</td><td>{row.score === null ? "Not released" : `${row.score}%`}</td><td>{row.attendance_pct === null ? "No records" : `${row.attendance_pct}%`}</td></tr>)}</tbody></table></div>
      <Pagination data={query.data} page={page} onChange={setPage} label="Academic history" />
    </>}
  </>;
}
