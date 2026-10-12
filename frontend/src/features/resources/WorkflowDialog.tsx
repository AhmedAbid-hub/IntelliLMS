import { AttendanceRoster } from "./AttendanceRoster";
import { notifySaved } from "../../components/ToastProvider";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  allPages,
  post,
  display,
  type RecordData,
} from "../../lib/api";

import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { ErrorState, Loading } from "../../components/shared";
import { useAuth } from "../auth/Auth";

export function WorkflowDialog({
  resource,
  row,
  onClose,
}: {
  resource: string;
  row: RecordData;
  onClose: () => void;
}) {
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

  const [manual, setManual] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        Object.entries(
          (row.manual_marks ?? {}) as Record<string, unknown>,
        ).map(([key, value]) => [key, String(value)]),
      ),
  );

  /*
   * Assignment submission permissions:
   *
   * Student:
   *   Can view their own released feedback.
   *
   * Institute Admin:
   *   Can inspect submissions and grades but cannot grade.
   *
   * Department Head:
   *   Read-only here until course instructor assignment
   *   can be verified in the frontend.
   *
   * Teacher:
   *   Can use the grading form.
   *
   * The backend independently enforces assigned-instructor
   * permissions for grading.
   */
  const canGradeSubmission =
    resource === "submissions" && role === "teacher";

  const isSubmissionOversight =
    resource === "submissions" &&
    (role === "admin" ||
      role === "head" ||
      role === "superadmin");

  const questions = useQuery({
    queryKey: ["attempt-questions", row.quiz],
    queryFn: () =>
      allPages<RecordData>(
        `questions/?quiz=${row.quiz}`,
      ),
    enabled: resource === "attempts",
  });

  async function execute(
    action: () => Promise<unknown>,
  ) {
    setBusy(true);
    setError(undefined);

    try {
      await action();
      await client.invalidateQueries();

      setDone(true);
      notifySaved("Work saved successfully.");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={onClose}
      title={String(
        row.title ||
          row.student_label ||
          "Review record",
      )}
    >
      {done ? (
        <div
          className="success-message"
          role="status"
        >
          <h3>Saved successfully</h3>
          <p>Your workspace is up to date.</p>

          <Button onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <>
          {resource === "lessons" && (
            <>
              <div className="lesson-body">
                {String(row.body || "")}
              </div>

              {typeof row.video_url === "string" &&
                /^https?:\/\//.test(row.video_url) && (
                  <a
                    className="text-link"
                    href={row.video_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open video resource ↗
                  </a>
                )}

              {role === "student" && (
                <Button
                  onClick={() =>
                    execute(() =>
                      post(
                        `lessons/${row.id}/complete/`,
                      ),
                    )
                  }
                  disabled={busy}
                >
                  Mark lesson complete
                </Button>
              )}
            </>
          )}

          {resource === "assignments" && (
            <>
              <p className="lesson-body">
                {String(
                  row.description || "",
                )}
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
                Due{" "}
                {new Date(
                  String(row.due_at),
                ).toLocaleString()}{" "}
                · {display(row.max_marks)} marks
              </div>

              {role === "student" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();

                    execute(() => {
                      const data = new FormData();

                      data.append("text", text);

                      if (file) {
                        data.append("file", file);
                      }

                      return post(
                        `assignments/${row.id}/submit/`,
                        data,
                      );
                    });
                  }}
                >
                  <label>
                    Your answer

                    <textarea
                      rows={7}
                      value={text}
                      onChange={(e) =>
                        setText(e.target.value)
                      }
                    />
                  </label>

                  <label>
                    Attach work

                    <input
                      type="file"
                      accept=".pdf,.txt,.png,.jpg,.jpeg,.docx"
                      onChange={(e) =>
                        setFile(
                          e.target.files?.[0],
                        )
                      }
                    />
                  </label>

                  <Button disabled={busy}>
                    Submit assignment
                  </Button>
                </form>
              )}
            </>
          )}

          {resource === "submissions" && (
            <>
              <div className="lesson-body">
                {String(
                  row.text ||
                    "No written answer.",
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

              {role === "student" ? (
                <div className="info-strip">
                  {row.released
                    ? `${display(row.marks)} marks · ${display(row.feedback)}`
                    : "Your work is submitted. Feedback will appear after release."}
                </div>
              ) : canGradeSubmission ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();

                    execute(() =>
                      post(
                        `submissions/${row.id}/grade/`,
                        {
                          marks,
                          feedback: text,
                          released,
                        },
                      ),
                    );
                  }}
                >
                  <label>
                    Marks

                    <input
                      type="number"
                      required
                      min="0"
                      step=".01"
                      value={marks}
                      onChange={(e) =>
                        setMarks(
                          e.target.value,
                        )
                      }
                    />
                  </label>

                  <label>
                    Feedback

                    <textarea
                      value={text}
                      onChange={(e) =>
                        setText(
                          e.target.value,
                        )
                      }
                      placeholder={String(
                        row.feedback ||
                          "Constructive feedback",
                      )}
                    />
                  </label>

                  <label className="checkbox-label">
                    Release grade to student

                    <input
                      type="checkbox"
                      checked={released}
                      onChange={(e) =>
                        setReleased(
                          e.target.checked,
                        )
                      }
                    />
                  </label>

                  <Button disabled={busy}>
                    Save grade
                  </Button>
                </form>
              ) : isSubmissionOversight ? (
                <>
                  <div className="info-strip">
                    <strong>
                      Submission review — read only
                    </strong>

                    <p>
                      Grading and grade release are
                      managed by assigned instructors.
                    </p>
                  </div>

                  <p>
                    <strong>Marks:</strong>{" "}
                    {row.marks == null
                      ? "Not graded"
                      : display(row.marks)}
                  </p>

                  <p>
                    <strong>Grade released:</strong>{" "}
                    {row.released
                      ? "Yes"
                      : "No"}
                  </p>

                  <h3>Feedback</h3>

                  <p className="lesson-body">
                    {String(
                      row.feedback ||
                        "No feedback provided.",
                    )}
                  </p>
                </>
              ) : null}
            </>
          )}

          {resource === "manual-grades" && (
            <>
              <p>
                {display(
                  row.offering_label,
                )}
              </p>

              {role !== "student" ||
              row.released ? (
                <>
                  <p>
                    {display(row.marks)} /{" "}
                    {display(
                      row.max_marks,
                    )}{" "}
                    marks
                  </p>

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
                  Feedback will appear
                  after release.
                </p>
              )}
            </>
          )}

          {resource === "attendance-sessions" && (
            <AttendanceRoster
              session={row.id}
            />
          )}

          {resource === "attempts" && (
            <>
              {questions.isPending ? (
                <Loading />
              ) : questions.isError ? (
                <ErrorState
                  error={questions.error}
                />
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();

                    execute(() =>
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
                    );
                  }}
                >
                  {questions.data.results.map(
                    (q) => (
                      <div
                        className="question-review"
                        key={String(q.id)}
                      >
                        <b>
                          {String(
                            q.prompt,
                          )}
                        </b>

                        <p>
                          {display(
                            (
                              row.answers as Record<
                                string,
                                unknown
                              >
                            )?.[
                              String(q.id)
                            ],
                          )}
                        </p>

                        {role !== "student" &&
                          q.kind === "short" && (
                            <label>
                              Marks (maximum{" "}
                              {display(
                                q.marks,
                              )}
                              )

                              <input
                                type="number"
                                min="0"
                                max={Number(
                                  q.marks,
                                )}
                                step=".01"
                                value={
                                  manual[
                                    String(
                                      q.id,
                                    )
                                  ] ?? ""
                                }
                                onChange={(e) =>
                                  setManual({
                                    ...manual,
                                    [String(
                                      q.id,
                                    )]:
                                      e.target.value,
                                  })
                                }
                              />
                            </label>
                          )}
                      </div>
                    ),
                  )}

                  {role !== "student" && (
                    <Button disabled={busy}>
                      Save manual grades
                    </Button>
                  )}
                </form>
              )}
            </>
          )}

          {!!error && (
            <ErrorState error={error} />
          )}
        </>
      )}
    </Dialog>
  );
}