import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useInstitution } from "../../lib/institution";
import { Loading, ErrorState } from "../../components/shared";

type Result = {status: string; notice: string; policy: {repeat: string} | null; programs: {
  program: string; label: string; cgpa: number | null; credits: number; attempts: number;
  periods: {term: string; label: string; gpa: number | null; credits: number; attempts: number}[];
}[]; excluded: {offering: string; label: string; reason: string}[]};

export function AcademicResults({member}: {member?: string}) {
  const institution = useInstitution();
  const query = useQuery({queryKey: ["academic-results", member], queryFn: () => api<Result>(member ? `memberships/${member}/academic-results/` : "academic-results/"), enabled: institution.kind === "university"});
  if (institution.kind !== "university") return null;
  return <section className="panel padded" aria-label="Provisional GPA and CGPA">
    <h2>GPA and CGPA</h2>
    {query.isPending ? <Loading /> : query.isError ? <ErrorState error={query.error} /> : query.data.status !== "ready" ? <p>Your institute has not enabled a GPA policy. Released percentage results remain available.</p> : <>
      <p className="info-strip">{query.data.notice}</p>
      <p>Repeated subjects: {query.data.policy?.repeat === "all" ? "every released attempt" : query.data.policy?.repeat === "best" ? "best released grade points" : "latest released attempt"}. Failed released results count towards included credits.</p>
      {!query.data.programs.length && <p>No results with both configured credits and an identified program are available.</p>}
      {query.data.programs.map(program => <div key={program.program}>
        <h3>{program.label} · CGPA {program.cgpa?.toFixed(2) ?? "Unavailable"}</h3>
        <p>{program.credits} included credits · {program.attempts} counted attempts</p>
        <div className="table-scroll"><table><caption>Semester results for {program.label}</caption><thead><tr><th>Semester</th><th>GPA</th><th>Included credits</th><th>Counted attempts</th></tr></thead><tbody>{program.periods.map(period => <tr key={period.term}><td>{period.label}</td><td>{period.gpa?.toFixed(2) ?? "Unavailable"}</td><td>{period.credits}</td><td>{period.attempts}</td></tr>)}</tbody></table></div>
      </div>)}
      {!!query.data.excluded.length && <details><summary>{query.data.excluded.length} results excluded from GPA</summary><ul>{query.data.excluded.map(row => <li key={row.offering}>{row.label}: {row.reason}</li>)}</ul></details>}
    </>}
  </section>;
}
