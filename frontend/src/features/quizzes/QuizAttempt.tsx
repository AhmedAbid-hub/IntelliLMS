import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3 } from "lucide-react";
import { allPages, api, post, type RecordData } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { PageHeader, Loading, ErrorState } from "../../components/shared";
export function QuizAttempt() {
  const { id } = useParams();
  return <AttemptEditor key={id} id={id!} />;
}
function AttemptEditor({ id }: { id: string }) {
  const client = useQueryClient();
  // Local edits take precedence over background refreshes for this attempt.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const revision = useRef(0);
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState<"save" | "submit" | null>(null);
  const [now, setNow] = useState(Date.now());
  const attempt = useQuery({
    queryKey: ["attempt", id],
    queryFn: () => api<RecordData>(`attempts/${id}/`),
  });
  const questions = useQuery({
    queryKey: ["quiz-questions", attempt.data?.quiz],
    queryFn: () =>
      allPages<RecordData>(`questions/?quiz=${attempt.data?.quiz}`),
    enabled: !!attempt.data,
  });
  const answers = {
    ...(attempt.data?.answers as Record<string, string>),
    ...draft,
  };
  function edit(question: string, value: string) {
    revision.current += 1;
    setDraft((current) => ({ ...current, [question]: value }));
    setSaved("Unsaved changes.");
  }
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = attempt.data
    ? Math.max(
        0,
        Math.floor(
          (new Date(String(attempt.data.deadline)).getTime() - now) / 1000,
        ),
      )
    : 0;
  async function save(submit: boolean) {
    setBusy(submit ? "submit" : "save");
    const savingRevision = revision.current;
    setError(undefined);
    try {
      const result = await post<RecordData>(
        `attempts/${id}/${submit ? "submit" : "save_answers"}/`,
        {
          answers,
        },
      );
      // Cancel an older GET before installing the authoritative save response.
      await client.cancelQueries({ queryKey: ["attempt", id] });
      client.setQueryData(["attempt", id], result);
      setSaved(
        submit
          ? "Attempt submitted."
          : revision.current === savingRevision
            ? "Answers saved."
            : "Earlier answers saved. New changes are unsaved.",
      );
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }
  if (attempt.isError || questions.isError)
    return <ErrorState error={attempt.error || questions.error} />;
  if (attempt.isPending || questions.isPending) return <Loading />;
  if (attempt.data.submitted_at)
    return (
      <div className="panel compact">
        <h1>Attempt submitted</h1>
        <p>Your answers have been recorded.</p>
        <p>
          {attempt.data.released
            ? `Score: ${attempt.data.marks === null ? "Awaiting manual grading" : Number(attempt.data.marks).toFixed(2)}`
            : "Results will be visible after your instructor releases them."}
        </p>
        <Link className="text-link" to="/quizzes">
          Back to quizzes →
        </Link>
      </div>
    );
  return (
    <>
      <PageHeader
        title="Focus on what you know."
        description="Save your answers regularly. Timing is enforced by the server."
      >
        <span className="timer">
          <Clock3 size={18} />
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
        </span>
      </PageHeader>
      {remaining === 0 && (
        <p className="warning-banner">
          Time is up. Submit to finalize your previously saved answers. Unsaved
          answers cannot be accepted after the deadline.
        </p>
      )}
      <div className="quiz-questions">
        {questions.data.results.map((q, i) => (
          <section className="panel quiz-question" key={q.id}>
            <span className="eyebrow">
              QUESTION {i + 1} · {String(q.marks)} MARKS
            </span>
            <h2>{String(q.prompt)}</h2>
            {q.kind === "short" ? (
              <label>
                Your answer
                <textarea
                  disabled={!remaining || busy === "submit"}
                  value={answers[q.id] || ""}
                  onChange={(e) => edit(q.id, e.target.value)}
                />
              </label>
            ) : (
              (q.kind === "boolean"
                ? ["true", "false"]
                : (q.options as string[])
              ).map((option) => (
                <label className="quiz-option" key={option}>
                  <input
                    disabled={!remaining || busy === "submit"}
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === option}
                    onChange={() => edit(q.id, option)}
                  />
                  {option}
                </label>
              ))
            )}
          </section>
        ))}
      </div>
      {!!error && <ErrorState error={error} />}
      <div className="quiz-footer">
        <span role="status">{saved}</span>
        <Button
          variant="outline"
          disabled={!!busy || !remaining}
          onClick={() => save(false)}
        >
          Save answers
        </Button>
        <Button disabled={!!busy} onClick={() => save(true)}>
          Submit attempt
        </Button>
      </div>
    </>
  );
}
