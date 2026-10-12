import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, post, type Page, type RecordData } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { ErrorState, Loading } from "../../components/shared";
import { notifySaved } from "../../components/ToastProvider";

export function BulkEnrollment({ offering }: { offering: RecordData }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [operation, setOperation] = useState("enroll");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["enrollment-candidates", offering.id, page, search], queryFn: () => api<Page<RecordData>>(`offerings/${offering.id}/enrollment-candidates/?page=${page}&search=${encodeURIComponent(search)}`), enabled: open });
  return <>
    <Button variant="outline" onClick={() => setOpen(true)}>Enroll students</Button>
    <Dialog open={open} onOpenChange={setOpen} title={`Enrollment · ${offering.title}`}>
      <p>Choose up to 100 students across pages. Withdrawals preserve academic history; reactivation restores course access.</p>
      <label>Find students<input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Name, username or student ID" /></label>
      {query.isPending ? <Loading /> : query.isError ? <ErrorState error={query.error} /> : <>
        <div className="table-wrap"><table><thead><tr><th>Select</th><th>Student</th><th>Student ID</th><th>Enrollment</th></tr></thead><tbody>{query.data.results.map(row => <tr key={row.id}>
          <td><input type="checkbox" aria-label={`Select ${row.username}`} checked={selected.includes(String(row.user))} disabled={busy || !selected.includes(String(row.user)) && selected.length >= 100} onChange={e => setSelected(current => e.target.checked ? [...current, String(row.user)] : current.filter(id => id !== row.user))} /></td>
          <td>{String(row.display_name || row.first_name || row.username)}<small className="muted"> · {String(row.username)}</small></td><td>{String(row.student_identifier || "—")}</td><td>{row.enrollment_active === true ? "Enrolled" : row.enrollment_active === false ? "Withdrawn" : "Not enrolled"}</td>
        </tr>)}</tbody></table></div>
        {!query.data.count && <p>No students match. Add students in Students & Staff first.</p>}
        <div className="pagination"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous students</Button><span>Page {page} · {query.data.count} students</span><Button variant="outline" disabled={!query.data.next} onClick={() => setPage(page + 1)}>Next students</Button></div>
      </>}
      <form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(undefined); try {
        const result = await post<{ changed: number; unchanged: number }>(`offerings/${offering.id}/bulk-enrollment/`, { students: selected, operation, reason });
        setSelected([]); await client.invalidateQueries(); notifySaved(`${result.changed} enrollments updated; ${result.unchanged} already in the requested state.`);
      } catch (err) { setError(err); } finally { setBusy(false); } }}>
        <p role="status">{selected.length} students selected</p>
        <label>Enrollment action<select value={operation} onChange={e => setOperation(e.target.value)}><option value="enroll">Enroll selected students</option><option value="withdraw">Withdraw selected students</option><option value="reactivate">Reactivate existing enrollments</option></select></label>
        <label>Reason<textarea required minLength={5} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
        {!!error && <ErrorState error={error} />}
        <Button disabled={busy || !selected.length}>{busy ? "Updating enrollments…" : "Confirm enrollment changes"}</Button>
      </form>
    </Dialog>
  </>;
}
