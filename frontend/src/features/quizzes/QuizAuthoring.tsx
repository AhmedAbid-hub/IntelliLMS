import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { allPages, api, post, type Page, type RecordData } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { ErrorState, Loading } from "../../components/shared";
import { notifySaved } from "../../components/ToastProvider";

type Draft = { prompt: string; kind: string; options: string[]; answer: string; marks: number };
type Batch = { created: number; questions: Draft[] };
const blank = (): Draft => ({ prompt: "", kind: "mcq", options: [], answer: "", marks: 1 });
export function QuizAuthoring({ quiz }: { quiz: RecordData }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("editor");
  const [rows, setRows] = useState<Draft[]>([blank()]);
  const [file, setFile] = useState<File>();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState<RecordData[] | null>(null);
  const [title, setTitle] = useState(`${quiz.title} (copy)`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [message, setMessage] = useState("");
  const client = useQueryClient();
  const bank = useQuery({ queryKey: ["authoring-bank", search, kind, page], queryFn: () => api<Page<RecordData>>(`question-bank/?search=${encodeURIComponent(search)}&kind=${kind}&page=${page}`), enabled: open && mode === "bank" });
  const existing = useQuery({ queryKey: ["authoring-order", quiz.id], queryFn: () => allPages<RecordData>(`questions/?quiz=${quiz.id}`), enabled: open && mode === "order" });
  const locked = Boolean(quiz.has_attempts);
  const ordered = order || existing.data?.results || [];
  async function execute(work: () => Promise<void>) {
    setBusy(true); setError(undefined); setMessage("");
    try { await work(); } catch (err) { setError(err); } finally { setBusy(false); }
  }
  async function saved(message: string) { await client.invalidateQueries(); setMessage(message); notifySaved(message); }
  function update(index: number, change: Partial<Draft>) { setRows(current => current.map((row, i) => i === index ? { ...row, ...change } : row)); }
  function move(index: number, delta: number) {
    const result = [...ordered]; [result[index], result[index + delta]] = [result[index + delta], result[index]]; setOrder(result);
  }
  function moveDraft(index: number, delta: number) {
    setRows(current => { const next = [...current]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; return next; });
  }
  return <>
    <Button variant="outline" onClick={() => { setError(undefined); setMessage(""); setMode(locked ? "duplicate" : "editor"); setOpen(true); }}>Quiz authoring</Button>
    <Dialog wide open={open} onOpenChange={value => { if (!busy) setOpen(value); }} title={`Author quiz · ${quiz.title}`}>
      {locked && <p className="warning-banner">Attempts have started. Questions are locked; duplicate this quiz to create a new draft.</p>}
      <div className="row-actions" aria-label="Authoring tools">{["editor", "bank", "order", "duplicate"].map(value => <Button key={value} variant={mode === value ? "default" : "outline"} disabled={busy || locked && value !== "duplicate"} aria-pressed={mode === value} onClick={() => { setMode(value); setError(undefined); setMessage(""); }}>{({ editor: "Bulk editor & CSV", bank: "Question bank", order: "Question order", duplicate: "Duplicate quiz" } as Record<string, string>)[value]}</Button>)}</div>
      {!!error && <ErrorState error={error} />}
      {message && <p role="status">{message}</p>}
      <fieldset disabled={busy} className="authoring-fields">
        {mode === "editor" && <>
          <h3>Add multiple questions</h3>
          <p>Add up to 100 questions per batch. All rows are validated together. Short answers are graded manually. Draft rows can be duplicated or moved before saving.</p>
          <details><summary>Import questions from CSV</summary>
            <p>Use JSON arrays for options, for example ["First", "Second"]. Row numbers in validation errors exclude the header. Preview loads editable rows without saving.</p>
            <a className="text-link" href={`/api/v1/quizzes/${quiz.id}/question-template/`} download>Download question template</a>
            <label>Question CSV<input type="file" accept=".csv" onChange={e => setFile(e.target.files?.[0])} /></label>
            <Button variant="outline" disabled={!file} onClick={() => execute(async () => { const body = new FormData(); body.append("file", file!); body.append("preview", "true"); const result = await post<Batch>(`quizzes/${quiz.id}/import-questions/`, body); setRows(result.questions); setMessage(`Preview ready: ${result.questions.length} questions. Review and save below.`); })}>Preview CSV</Button>
          </details>
          <form onSubmit={e => { e.preventDefault(); void execute(async () => { const result = await post<Batch>(`quizzes/${quiz.id}/bulk-questions/`, { questions: rows }); setRows([blank()]); await saved(`${result.created} questions added.`); }); }}>
            {rows.map((row, index) => <fieldset key={index} className="question-draft"><legend>Question {index + 1}</legend>
              <label>Prompt<textarea required maxLength={10000} value={row.prompt} onChange={e => update(index, { prompt: e.target.value })} /></label>
              <div className="form-grid"><label>Type<select value={row.kind} onChange={e => update(index, { kind: e.target.value, answer: "", options: [] })}><option value="mcq">Multiple choice</option><option value="boolean">True / false</option><option value="short">Short answer</option></select></label>
              <label>Marks<input type="number" required min={1} value={row.marks} onChange={e => update(index, { marks: Number(e.target.value) })} /></label></div>
              {row.kind === "mcq" && <label>Choices (one per line)<textarea required value={row.options.join("\n")} onChange={e => update(index, { options: e.target.value.split("\n") })} /></label>}
              {row.kind === "boolean" ? <label>Correct answer<select required value={row.answer} onChange={e => update(index, { answer: e.target.value })}><option value="">Choose answer</option><option value="true">True</option><option value="false">False</option></select></label> : <label>{row.kind === "short" ? "Reference answer (optional)" : "Correct answer (exact choice text)"}<input required={row.kind === "mcq"} value={row.answer} onChange={e => update(index, { answer: e.target.value })} /></label>}
              <div className="row-actions">
                <Button type="button" variant="outline" disabled={rows.length >= 100} onClick={() => setRows(current => [...current.slice(0,index+1), {...row, options:[...row.options]}, ...current.slice(index+1)])}>Duplicate question {index + 1}</Button>
                <Button type="button" variant="outline" disabled={index === 0} onClick={() => moveDraft(index,-1)} aria-label={`Move draft question ${index + 1} up`}>Move up</Button>
                <Button type="button" variant="outline" disabled={index === rows.length-1} onClick={() => moveDraft(index,1)} aria-label={`Move draft question ${index + 1} down`}>Move down</Button>
                <Button type="button" variant="outline" disabled={rows.length === 1} onClick={() => setRows(current => current.filter((_, i) => i !== index))}>Remove question {index + 1}</Button>
              </div>
            </fieldset>)}
            <div className="row-actions"><Button type="button" variant="outline" disabled={rows.length >= 100} onClick={() => setRows([...rows, blank()])}>Add another question</Button><Button type="submit">Save question batch</Button></div>
          </form>
        </>}
        {mode === "bank" && <>
          <p>Select up to 100 authorized bank questions across pages. Copies remain independent of the bank.</p>
          <label>Search bank<input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label>
          <label>Question type<select value={kind} onChange={e => { setKind(e.target.value); setPage(1); }}><option value="">All types</option><option value="mcq">Multiple choice</option><option value="boolean">True / false</option><option value="short">Short answer</option></select></label>
          {bank.isPending ? <Loading /> : bank.isError ? <ErrorState error={bank.error} /> : <>
            {bank.data.results.map(row => <label className="checkbox-label" key={row.id}><input type="checkbox" checked={selected.includes(row.id)} disabled={!selected.includes(row.id) && selected.length >= 100} onChange={e => setSelected(current => e.target.checked ? [...current, row.id] : current.filter(id => id !== row.id))} />{String(row.prompt)} · {String(row.marks)} marks</label>)}
            {!bank.data.count && <p>No questions found. Add reusable questions from the Question bank page.</p>}
            <div className="pagination"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous questions</Button><span>Page {page} · {bank.data.count} questions</span><Button variant="outline" disabled={!bank.data.next} onClick={() => setPage(page + 1)}>Next questions</Button></div>
          </>}
          <Button disabled={!selected.length} onClick={() => execute(async () => { const result = await post<Batch>(`quizzes/${quiz.id}/add-bank-questions/`, { questions: selected }); setSelected([]); await saved(`${result.created} bank questions added.`); })}>Add selected questions ({selected.length})</Button>
        </>}
        {mode === "order" && <>
          {existing.isPending ? <Loading /> : existing.isError ? <ErrorState error={existing.error} /> : <>
            <p>Use the move buttons to set the order shown to students. Saving is blocked if attempts start or the question list changes.</p>
            <ol>{ordered.map((row, index) => <li key={row.id} className="question-order"><span>{String(row.prompt)}</span><Button variant="outline" aria-label={`Move question ${index + 1} up`} disabled={!index} onClick={() => move(index, -1)}>↑</Button><Button variant="outline" aria-label={`Move question ${index + 1} down`} disabled={index === ordered.length - 1} onClick={() => move(index, 1)}>↓</Button></li>)}</ol>
            {!ordered.length && <p>No questions yet. Add questions with the bulk editor or question bank.</p>}
            <Button disabled={!ordered.length || ordered.length > 500} onClick={() => execute(async () => { await post(`quizzes/${quiz.id}/order-questions/`, { questions: ordered.map(row => row.id) }); setOrder(null); await saved("Question order saved."); })}>Save question order</Button>
          </>}
        </>}
        {mode === "duplicate" && <form onSubmit={e => { e.preventDefault(); void execute(async () => { await post(`quizzes/${quiz.id}/duplicate/`, { title }); await saved("Draft quiz created. Review its dates and questions before publishing. Student attempts and grades were not copied."); }); }}>
          <p>Copies the questions and settings into an unpublished, unreleased draft in this course. The original quiz and attempts are preserved.</p>
          <label>New quiz title<input required maxLength={180} value={title} onChange={e => setTitle(e.target.value)} /></label><Button>Create draft copy</Button>
        </form>}
      </fieldset>
      {busy && <p role="status">Saving changes…</p>}
    </Dialog>
  </>;
}
