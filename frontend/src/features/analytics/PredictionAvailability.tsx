import { useState } from "react";
import { useAuth } from "../auth/Auth";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/shared";

export interface PredictionReadiness {
  courses: number;
  open_courses: number;
  learner_course_pairs: number;
  eligible_pairs: number | null;
  insufficient_history_pairs: number | null;
  no_upcoming_pairs: number | null;
  historical_estimates: number;
  model_status: string;
  can_generate: boolean;
  generation_reason: string;
}

export function PredictionAvailability({ data, estimates }: { data: PredictionReadiness; estimates: number }) {
  const { role, user, selectWorkspace } = useAuth();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const member = user?.memberships.find(m => m.institute_id === user.institute_id);
  return <section className="panel padded" aria-label="Prediction availability" style={{ marginBottom: 20 }}>
    <h2>{data.model_status !== "ready" ? "Model unavailable" : estimates ? "Estimate coverage" : "No saved estimates from the current model"}</h2>
    {data.historical_estimates > 0 && <p>{data.historical_estimates} older-model estimates are preserved in Recent estimates. They are excluded from the current model's risk counts because their targets or versions differ.</p>}
    {!data.courses ? <p>No courses are available in this scope. Check the selected academic period and your course assignments.</p>
      : !data.open_courses ? <p>These courses are archived or their academic periods are closed. Review saved estimates in history.</p>
      : !data.learner_course_pairs ? <p>No active learners are enrolled in the selected open courses.</p>
      : <>
        {data.eligible_pairs !== null && <p>{data.eligible_pairs} of {data.learner_course_pairs} active learner-course pairs have eligible assessment history and upcoming work. This is data coverage, not a risk classification.</p>}
        {!!data.insufficient_history_pairs && <p>{data.insufficient_history_pairs} learner-course pairs need two released assignment scores with distinct past deadlines and recorded submissions. Quiz and attendance records cannot replace those scores.</p>}
        {!!data.no_upcoming_pairs && <p>{data.no_upcoming_pairs} learner-course pairs have prior scores but no published, unsubmitted assignment with a future deadline.</p>}
        {data.can_generate && <p>Select a class and use Analyze class. Learners without eligible data receive an explanation, never an invented estimate.</p>}
      </>}
    {data.generation_reason && <p>{data.generation_reason}</p>}
    {role === "head" && member?.can_teach && <Button disabled={busy} onClick={async () => {
      setBusy(true); setError(undefined);
      try { await selectWorkspace("teaching"); } catch (e) { setError(e); } finally { setBusy(false); }
    }}>Switch to My Teaching</Button>}
    {!!error && <ErrorState error={error} />}
  </section>;
}
