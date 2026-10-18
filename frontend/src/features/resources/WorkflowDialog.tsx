
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  allPages,
  post,
  display,
  type RecordData,
} from "../../lib/api";

import { AttendanceRoster } from "./AttendanceRoster";
import { AcademicControl } from "./AcademicControl";

import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import {
  ErrorState,
  Loading,
} from "../../components/shared";

import { notifySaved } from "../../components/ToastProvider";
import { useAuth } from "../auth/Auth";

type WorkflowDialogProps = {
  resource: string;
  row: RecordData;
  onClose: () => void;
};

export function WorkflowDialog({
  resource,
  row,
  onClose,
}: WorkflowDialogProps) {
  const { role } = useAuth();
  const client = useQueryClient();

  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const [text, setText] = useState(
    resource === "submissions"
      ? String(row.feedback || "")
      : "",
  );

  const [marks, setMarks] = useState(
    String(row.marks ?? ""),
  );

  const [released, setReleased] = useState(
    Boolean(row.released),
  );

  const [file, setFile] = useState<File>();

  const [manual, setManual] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      Object.entries(
        (row.manual_marks ?? {}) as Record<string, unknown>,
      ).map(([key, value]) => [key, String(value)]),
    ),
  );

  const isTeacher = role === "teacher";
  const isStudent = role === "student";

  const isSubmission = resource === "submissions";
  const isReleasedSubmission =
    isSubmission && row.released === true;

  const canGradeSubmission =
    isSubmission && isTeacher;

  const isSubmissionOversight =
    isSubmission &&
    ["admin", "head", "superadmin"].includes(role);

  const canRequestCorrection =
    !isStudent &&
    ["submissions", "attempts", "manual-grades"].includes(
      resource,
    );

  const hasExistingGrade =
    row.marks !== null &&
    row.marks !== undefined &&
    row.marks !== "";

  const questions = useQuery({
    queryKey: ["attempt-questions", row.quiz],
    queryFn: () =>
      allPages<RecordData>(
        `questions/?quiz=${encodeURIComponent(String(row.quiz))}`,
      ),
    enabled:
      resource === "attempts" &&
      row.quiz !== null &&
      row.quiz !== undefined,
  });

  async function execute(
    action: () => Promise<unknown>,
    successMessage = "Work saved successfully.",
  ) {
    if (busy) return;

    setBusy(true);
    setError(undefined);

    try {
      await action();
      await client.invalidateQueries();
      setDone(true);
      notifySaved(successMessage);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  function formatDate(value: unknown) {
    if (!value) return "Not specified";

    const date = new Date(String(value));

    return Number.isNaN(date.getTime())
      ? display(value)
      : date.toLocaleString();
  }

  const title = String(
    row.title ||
      row.student_label ||
      row.offering_label ||
      "Review record",
  );

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
      title={title}
    >
      <style>{`
        .workflow-content {
          display: grid;
          gap: 18px;
          min-width: 0;
        }

        .workflow-section {
          display: grid;
          gap: 14px;
          min-width: 0;
        }

        .workflow-field {
          display: grid;
          gap: 7px;
          min-width: 0;
          font-size: 13px;
          font-weight: 600;
        }

        .workflow-field input,
        .workflow-field textarea {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
        }

        .workflow-field textarea {
          min-height: 110px;
          resize: vertical;
        }

        .workflow-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 10px;
          padding-top: 14px;
          border-top: 1px solid var(--border, #dce8df);
        }

        .workflow-record-summary {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(130px, 1fr));
          gap: 12px;
          padding: 15px;
          border: 1px solid #dce8df;
          border-radius: 12px;
          background: #f8faf8;
        }

        .workflow-summary-item {
          display: grid;
          gap: 5px;
          min-width: 0;
        }

        .workflow-summary-label {
          font-size: 12px;
          color: #6b8275;
        }

        .workflow-summary-value {
          font-size: 14px;
          font-weight: 650;
          overflow-wrap: anywhere;
        }

        .workflow-correction {
          display: grid;
          gap: 10px;
          padding: 15px;
          border: 1px solid #dce8df;
          border-radius: 12px;
          background: #f8faf8;
        }

        .workflow-correction h3 {
          margin: 0;
          font-size: 14px;
        }

        .workflow-correction p {
          margin: 0;
          font-size: 13px;
          line-height: 1.6;
          color: #647568;
        }

        .workflow-correction-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .workflow-readonly {
          display: grid;
          gap: 12px;
        }

        .workflow-readonly p {
          margin: 0;
        }

        .workflow-question-list {
          display: grid;
          gap: 15px;
        }

        .workflow-question-list .question-review {
          display: grid;
          gap: 10px;
          min-width: 0;
        }

        @media (max-width: 600px) {
          .workflow-actions {
            justify-content: stretch;
          }

          .workflow-actions > button {
            flex: 1;
          }
        }
      `}</style>

      {done ? (
        <div
          className="success-message"
          role="status"
        >
          <h3>Saved successfully</h3>
          <p>Your changes have been recorded.</p>

          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <div className="workflow-content">
          {resource === "lessons" && (
            <div className="workflow-section">
              <div className="lesson-body">
                {String(row.body || "")}
              </div>

              {typeof row.video_url === "string" &&
                /^https?:\/\//i.test(row.video_url) && (
                  <a
                    className="text-link"
                    href={row.video_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open video resource ↗
                  </a>
                )}

              {isStudent && (
                <div className="workflow-actions">
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void execute(
                        () =>
                          post(
                            `lessons/${row.id}/complete/`,
                          ),
                        "Lesson marked complete.",
                      )
                    }
                  >
                    Mark lesson complete
                  </Button>
                </div>
              )}
            </div>
          )}

          {resource === "assignments" && (
            <div className="workflow-section">
              <p className="lesson-body">
                {String(row.description || "")}
              </p>

              {typeof row.file === "string" && (
                <a
                  className="text-link"
                  href={row.file}
                >
                  Download supporting resource
                </a>
              )}

              <div className="info-strip">
                Due {formatDate(row.due_at)} ·{" "}
                {display(row.max_marks)} marks
              </div>

              {isStudent && (
                <form
                  className="workflow-section"
                  onSubmit={(event) => {
                    event.preventDefault();

                    void execute(
                      () => {
                        const data = new FormData();

                        data.append("text", text);

                        if (file) {
                          data.append("file", file);
                        }

                        return post(
                          `assignments/${row.id}/submit/`,
                          data,
                        );
                      },
                      "Assignment submitted.",
                    );
                  }}
                >
                  <label className="workflow-field">
                    Your answer

                    <textarea
                      rows={7}
                      value={text}
                      onChange={(event) =>
                        setText(event.target.value)
                      }
                    />
                  </label>

                  <label className="workflow-field">
                    Attach work

                    <input
                      type="file"
                      accept=".pdf,.txt,.png,.jpg,.jpeg,.docx"
                      onChange={(event) =>
                        setFile(event.target.files?.[0])
                      }
                    />
                  </label>

                  <div className="workflow-actions">
                    <Button
                      type="submit"
                      disabled={busy}
                    >
                      {busy
                        ? "Submitting..."
                        : "Submit assignment"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {isSubmission && (
            <div className="workflow-section">
              <div className="lesson-body">
                {String(
                  row.text || "No written answer.",
                )}
              </div>

              {typeof row.file === "string" && (
                <a
                  className="text-link"
                  href={row.file}
                >
                  Download submitted file
                </a>
              )}

              <div className="workflow-record-summary">
                <div className="workflow-summary-item">
                  <span className="workflow-summary-label">
                    Recorded marks
                  </span>
                  <span className="workflow-summary-value">
                    {hasExistingGrade
                      ? display(row.marks)
                      : "Not graded"}
                  </span>
                </div>

                <div className="workflow-summary-item">
                  <span className="workflow-summary-label">
                    Grade status
                  </span>
                  <span className="workflow-summary-value">
                    {row.released
                      ? "Released"
                      : "Not released"}
                  </span>
                </div>
              </div>

              {isStudent ? (
                <div className="info-strip">
                  {row.released
                    ? `${display(row.marks)} marks · ${display(
                        row.feedback,
                      )}`
                    : "Your work is submitted. Feedback will appear after release."}
                </div>
              ) : canGradeSubmission ? (
                <>
                  {isReleasedSubmission && (
                    <div className="info-strip">
                      This grade has already been released.
                      Use the formal correction workflow for
                      changes that require approval.
                    </div>
                  )}

                  <form
                    className="workflow-section"
                    onSubmit={(event) => {
                      event.preventDefault();

                      if (
                        !Number.isFinite(Number(marks)) ||
                        Number(marks) < 0
                      ) {
                        setError(
                          new Error(
                            "Enter valid non-negative marks.",
                          ),
                        );
                        return;
                      }

                      void execute(
                        () =>
                          post(
                            `submissions/${row.id}/grade/`,
                            {
                              marks,
                              feedback: text,
                              released,
                            },
                          ),
                        "Grade saved successfully.",
                      );
                    }}
                  >
                    <label className="workflow-field">
                      Marks

                      <input
                        type="number"
                        required
                        min="0"
                        step=".01"
                        value={marks}
                        disabled={busy || isReleasedSubmission}
                        onChange={(event) =>
                          setMarks(event.target.value)
                        }
                      />
                    </label>

                    <label className="workflow-field">
                      Feedback

                      <textarea
                        value={text}
                        disabled={busy || isReleasedSubmission}
                        onChange={(event) =>
                          setText(event.target.value)
                        }
                        placeholder="Constructive feedback"
                      />
                    </label>

                    <label className="checkbox-label">
                      Release grade to student

                      <input
                        type="checkbox"
                        checked={released}
                        disabled={busy || isReleasedSubmission}
                        onChange={(event) =>
                          setReleased(event.target.checked)
                        }
                      />
                    </label>

                    {!isReleasedSubmission && (
                      <div className="workflow-actions">
                        <Button
                          type="submit"
                          disabled={busy}
                        >
                          {busy ? "Saving..." : "Save grade"}
                        </Button>
                      </div>
                    )}
                  </form>
                </>
              ) : isSubmissionOversight ? (
                <div className="workflow-readonly">
                  <div className="info-strip">
                    <strong>
                      Submission review — read only
                    </strong>

                    <p>
                      Grading and grade release are managed
                      by assigned instructors.
                    </p>
                  </div>

                  <p>
                    <strong>Marks:</strong>{" "}
                    {hasExistingGrade
                      ? display(row.marks)
                      : "Not graded"}
                  </p>

                  <p>
                    <strong>Grade released:</strong>{" "}
                    {row.released ? "Yes" : "No"}
                  </p>

                  <h3>Feedback</h3>

                  <p className="lesson-body">
                    {String(
                      row.feedback ||
                        "No feedback provided.",
                    )}
                  </p>
                </div>
              ) : null}

              {canRequestCorrection &&
                isReleasedSubmission && (
                  <div className="workflow-correction">
                    <h3>Grade correction</h3>

                    <p>
                      This is a released assessment grade.
                      Authorized staff can request a
                      correction with a reason and proposed
                      value. The request must be reviewed
                      before an approved change is applied.
                    </p>

                    <div className="workflow-correction-actions">
                      <AcademicControl
                        resource="submissions"
                        row={row}
                      />
                    </div>
                  </div>
                )}
            </div>
          )}

          {resource === "manual-grades" && (
            <div className="workflow-section">
              <p>
                {display(row.offering_label)}
              </p>

              {role !== "student" || row.released ? (
                <>
                  <div className="workflow-record-summary">
                    <div className="workflow-summary-item">
                      <span className="workflow-summary-label">
                        Recorded marks
                      </span>

                      <span className="workflow-summary-value">
                        {display(row.marks)} /{" "}
                        {display(row.max_marks)}
                      </span>
                    </div>

                    <div className="workflow-summary-item">
                      <span className="workflow-summary-label">
                        Status
                      </span>

                      <span className="workflow-summary-value">
                        {row.released
                          ? "Released"
                          : "Not released"}
                      </span>
                    </div>
                  </div>

                  <h3>Feedback</h3>

                  <p className="lesson-body">
                    {String(
                      row.feedback ||
                        "No feedback provided.",
                    )}
                  </p>
                </>
              ) : (
                <p>
                  Feedback will appear after release.
                </p>
              )}

              {canRequestCorrection &&
                row.released === true && (
                  <div className="workflow-correction">
                    <h3>Manual grade correction</h3>

                    <p>
                      Request a correction to this released
                      grade using the existing approval
                      workflow.
                    </p>

                    <AcademicControl
                      resource="manual-grades"
                      row={row}
                    />
                  </div>
                )}
            </div>
          )}

          {resource === "attendance-sessions" && (
            <div className="workflow-section">
              <AttendanceRoster session={row.id} />
            </div>
          )}

          {resource === "attempts" && (
            <div className="workflow-section">
              {questions.isPending ? (
                <Loading />
              ) : questions.isError ? (
                <ErrorState error={questions.error} />
              ) : (
                <form
                  className="workflow-section"
                  onSubmit={(event) => {
                    event.preventDefault();

                    if (!isTeacher) return;

                    void execute(
                      () =>
                        post(
                          `attempts/${row.id}/grade/`,
                          {
                            manual_marks:
                              Object.fromEntries(
                                Object.entries(
                                  manual,
                                ).filter(
                                  ([, value]) =>
                                    value !== "",
                                ),
                              ),
                          },
                        ),
                      "Quiz grades saved.",
                    );
                  }}
                >
                  <div className="workflow-question-list">
                    {questions.data.results.map((q) => (
                      <div
                        className="question-review"
                        key={String(q.id)}
                      >
                        <b>{String(q.prompt)}</b>

                        <p>
                          {display(
                            (
                              row.answers as
                                | Record<string, unknown>
                                | undefined
                            )?.[String(q.id)],
                          )}
                        </p>

                        {isTeacher &&
                          q.kind === "short" && (
                            <label className="workflow-field">
                              Marks (maximum{" "}
                              {display(q.marks)})

                              <input
                                type="number"
                                min="0"
                                max={Number(q.marks)}
                                step=".01"
                                value={
                                  manual[String(q.id)] ??
                                  ""
                                }
                                disabled={busy}
                                onChange={(event) =>
                                  setManual(
                                    (current) => ({
                                      ...current,
                                      [String(q.id)]:
                                        event.target.value,
                                    }),
                                  )
                                }
                              />
                            </label>
                          )}
                      </div>
                    ))}
                  </div>

                  {isTeacher && (
                    <div className="workflow-actions">
                      <Button
                        type="submit"
                        disabled={busy}
                      >
                        {busy
                          ? "Saving..."
                          : "Save manual grades"}
                      </Button>
                    </div>
                  )}
                </form>
              )}

              {canRequestCorrection &&
                row.released === true && (
                  <div className="workflow-correction">
                    <h3>Quiz grade correction</h3>

                    <p>
                      Request a correction to the released
                      quiz result.
                    </p>

                    <AcademicControl
                      resource="attempts"
                      row={row}
                    />
                  </div>
                )}
            </div>
          )}

          {!!error && (
            <ErrorState error={error} />
          )}
        </div>
      )}
    </Dialog>
  );
}
