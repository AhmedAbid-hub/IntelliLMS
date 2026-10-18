import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { post, type RecordData } from "../../lib/api";
import { Dialog } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/shared";
import { useInstitution } from "../../lib/institution";
import type { Placement } from "./StudentAdmission";

type Review = { evidence_token: string; evidence: { policy: string; notice: string; all_required_pass: boolean; required_courses: {stage: number; course: string; offering: string | null; score: number | null; meeting_pass_mark: boolean | null}[] } };

export function StudentProgression({ member, current, renderPlacement }: {
  member: RecordData; current?: RecordData;
  renderPlacement: (value: Placement, onChange: (value: Placement) => void) => ReactNode;
}) {
  const institution = useInstitution();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [operation, setOperation] = useState("progress");
  const [target, setTarget] = useState<Placement>({program: "", batch: "", year: "", section: "", term: "", stage: "1", offerings: []});
  const [reason, setReason] = useState("");
  const [review, setReview] = useState<Review>();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState("");
  const moving = ["progress", "repeat", "correct"].includes(operation);
  const invalidateReview = () => { setReview(undefined); setConfirmed(false); };
  const openDialog = () => {
    setTarget({ program: String(current?.program || ""), batch: String(current?.batch || ""), year: "", section: "", term: "", stage: String(institution.kind === "school" ? 1 : Number(current?.stage || 0) + 1), offerings: [] });
    setOperation("progress"); setReason(""); invalidateReview(); setError(undefined); setOpen(true);
  };
  async function submit(preview: boolean) {
    setBusy(true); setError(undefined);
    try {
      const result = await post<Review>(`memberships/${member.id}/progress/`, {
        operation, expected_placement: current?.id, reason, preview,
        confirm_review: confirmed, evidence_token: review?.evidence_token,
        ...(moving ? {target: {...target, stage: Number(target.stage), batch: target.batch || null, section: target.section || null, term: target.term || null}} : {}),
      });
      if (preview) { setReview(result); setConfirmed(false); }
      else { setOpen(false); setSaved("Academic decision saved. Previous placements and academic records were retained."); await client.invalidateQueries(); }
    } catch (failure) { setError(failure); }
    finally { setBusy(false); }
  }
  return <section className="panel padded">
    <h2>Academic progression</h2>
    <p>Review results before promotion, repetition, withdrawal, completion or graduation. Each decision retains the previous placement and records the reviewing administrator and reason.</p>
    {saved && <p role="status">{saved}</p>}
    {!current ? <p>No active placement. Record an initial placement using the placement form before making a progression decision.</p> : <Button onClick={openDialog} disabled={!member.active}>Review academic decision</Button>}
    <Dialog open={open} onOpenChange={setOpen} title="Review academic decision">
      <form onSubmit={event => {event.preventDefault(); void submit(!review);}}>
        <label>Academic decision<select value={operation} onChange={event => {setOperation(event.target.value); invalidateReview();}}>
          <option value="progress">{institution.kind === "school" ? "Promote to next class" : "Progress to next stage"}</option>
          <option value="repeat">Repeat current class / stage</option>
          <option value="correct">Correct placement details</option>
          <option value="withdraw">Withdraw from studies</option>
          <option value="complete">Record completion</option>
          <option value="graduate">Record graduation</option>
        </select></label>
        {moving && renderPlacement(target, next => {setTarget(next); invalidateReview();})}
        <label>Decision reason<textarea value={reason} minLength={5} maxLength={1000} required onChange={event => {setReason(event.target.value); invalidateReview();}} /></label>
        {review && <section aria-label="Academic decision evidence">
          <p>{review.evidence.notice}</p>
          <p>Policy: {review.evidence.policy === "all_required_pass" ? "Every required subject must pass" : "Manual academic review"}.</p>
          {!review.evidence.required_courses.length ? <p>No required curriculum results available. Review the institution's academic records before deciding.</p> : <ul>{review.evidence.required_courses.map(row => <li key={`${row.stage}:${row.course}`}>Stage {row.stage}: {row.offering || "No enrollment recorded"} — {row.score === null ? "Result unavailable" : `${row.score}%`} ({row.meeting_pass_mark === null ? "unverified" : row.meeting_pass_mark ? "meets pass mark" : "below pass mark"})</li>)}</ul>}
          <p>{operation === "correct" ? "The corrected placement will become current. Enrollments in the previous placement's period will end; courses outside it remain enrolled." : moving ? "The selected placement and enrollments will become current. Previous course enrollments will be withdrawn." : "The current placement and active enrollments will end. Academic history remains available."}</p>
          <label className="checkbox-label"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I reviewed the academic evidence and authorize this decision.</label>
        </section>}
        {!!error && <ErrorState error={error} />}
        <Button type="submit" disabled={busy || !!review && !confirmed}>{busy ? "Saving…" : review ? "Confirm academic decision" : "Preview academic decision"}</Button>
      </form>
    </Dialog>
  </section>;
}
