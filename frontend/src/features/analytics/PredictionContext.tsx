function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

/** Stored prediction metadata is used for history, never the currently active model. */
export function PredictionContext({ info, warning, observations }: { info?: unknown; warning?: unknown; observations?: unknown }) {
  const model = object(info);
  const source = object(model.source);
  const metrics = object(model.test_metrics);
  const evidence = object(observations);
  const next = object(evidence.next_assignment);
  const assignments = Array.isArray(evidence.assignments) ? evidence.assignments.map(object) : [];
  return <div className="info-strip" style={{ display: "block", lineHeight: 1.6 }}>
    <strong>{String(model.target_label ?? "Historical experimental course-risk estimate")}</strong>
    <p>{String(warning ?? "Experimental prediction; not validated for academic decisions.")}</p>
    {model.mode === "external_public" && <>
      <p>Training source: {String(source.name)} · {String(source.license)}. Uses two preceding released assignment percentages. Attendance, quizzes and learning activity are recorded context, not model inputs.</p>
      <p>External holdout: precision {Number(metrics.precision).toFixed(3)}, recall {Number(metrics.recall).toFixed(3)}, F1 {Number(metrics.f1).toFixed(3)}. These results do not measure accuracy for this learner or institute.</p>
      <p>40% is the dataset outcome threshold, not this institute’s pass mark. Support bands are experimental. A low estimate does not guarantee success.</p>
    </>}
    {assignments.length > 0 && <ul>{assignments.map((assignment, index) => <li key={String(assignment.id ?? index)}>{String(assignment.title)}: {Number(assignment.percentage).toFixed(1)}% · deadline {new Date(String(assignment.due_at)).toLocaleString()}</li>)}</ul>}
    {Boolean(next.title) && <p>Upcoming assignment at prediction time: {String(next.title)}. The model estimates the next submitted assignment; it cannot predict whether work will be submitted.</p>}
  </div>;
}
