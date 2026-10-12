import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api, post, type Page } from "../../lib/api";
import { Button } from "../../components/ui/button";
import {
  Loading,
  ErrorState,
  Empty,
} from "../../components/shared";
import { notifySaved } from "../../components/ToastProvider";
import { useAuth } from "../auth/Auth";

type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "excused";

type RosterRow = {
  id: string;
  student: string;
  student_label: string;
  status: string | null;
};

type AttendanceRecord = {
  student: string;
  status: AttendanceStatus;
};

type AttendanceRosterProps = {
  session: string;
  readOnly?: boolean;
};

const STATUS_OPTIONS: {
  value: AttendanceStatus;
  label: string;
}[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "excused", label: "Excused" },
];

const SUMMARY_STYLES = {
  present: {
    color: "#176348",
    background: "#e8f3ed",
  },
  absent: {
    color: "#b42318",
    background: "#fff0ee",
  },
  late: {
    color: "#a15c08",
    background: "#fff5e6",
  },
  excused: {
    color: "#175cd3",
    background: "#edf4ff",
  },
  unmarked: {
    color: "#475467",
    background: "#f2f4f7",
  },
};

function isAttendanceStatus(
  value: string | null | undefined,
): value is AttendanceStatus {
  return (
    value === "present" ||
    value === "absent" ||
    value === "late" ||
    value === "excused"
  );
}

function statusLabel(
  status: AttendanceStatus | null,
): string {
  if (!status) return "Not marked";

  return (
    STATUS_OPTIONS.find(
      (option) => option.value === status,
    )?.label ?? "Not marked"
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return "?";

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function AttendanceRoster({
  session,
  readOnly = false,
}: AttendanceRosterProps) {
  const { role } = useAuth();
  const client = useQueryClient();

  /*
   * Only teachers can edit attendance in this version.
   *
   * Institute Admin: read-only.
   * Department Head: read-only until teaching
   * assignment verification is implemented.
   * Student: read-only.
   *
   * The backend must independently verify that
   * the teacher is assigned to the course.
   */
  const canEdit = role === "teacher" && !readOnly;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [edits, setEdits] = useState<
    Record<string, AttendanceStatus>
  >({});

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState("");

  const roster = useQuery({
    queryKey: [
      "attendance-roster",
      session,
      page,
      search,
    ],
    queryFn: () =>
      api<Page<RosterRow>>(
        `attendance-sessions/${session}/roster/?page=${page}&search=${encodeURIComponent(
          search,
        )}`,
      ),
    enabled: Boolean(session),
  });

  const students = useMemo(
    () => roster.data?.results ?? [],
    [roster.data],
  );

  const dirty =
    canEdit && Object.keys(edits).length > 0;

  const locked =
    dirty || busy || roster.isFetching;

  useEffect(() => {
    setPage(1);
    setSearch("");
    setEdits({});
    setSaved("");
    setError(undefined);
  }, [session]);

  useEffect(() => {
    if (!canEdit) {
      setEdits({});
      setSaved("");
    }
  }, [canEdit]);

  function getStatus(
    row: RosterRow,
  ): AttendanceStatus | null {
    if (canEdit && edits[row.student]) {
      return edits[row.student];
    }

    return isAttendanceStatus(row.status)
      ? row.status
      : null;
  }

  const summary = useMemo(() => {
    const counts = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      unmarked: 0,
    };

    for (const student of students) {
      const status =
        canEdit && edits[student.student]
          ? edits[student.student]
          : isAttendanceStatus(student.status)
            ? student.status
            : null;

      if (status) {
        counts[status]++;
      } else {
        counts.unmarked++;
      }
    }

    return counts;
  }, [students, edits, canEdit]);

  const markedCount =
    summary.present +
    summary.absent +
    summary.late +
    summary.excused;

  const summaryItems = [
    {
      label: "Present",
      value: summary.present,
      style: SUMMARY_STYLES.present,
    },
    {
      label: "Absent",
      value: summary.absent,
      style: SUMMARY_STYLES.absent,
    },
    {
      label: "Late",
      value: summary.late,
      style: SUMMARY_STYLES.late,
    },
    {
      label: "Excused",
      value: summary.excused,
      style: SUMMARY_STYLES.excused,
    },
    {
      label: "Not marked",
      value: summary.unmarked,
      style: SUMMARY_STYLES.unmarked,
    },
  ];

  function setStudentStatus(
    student: RosterRow,
    status: AttendanceStatus,
  ) {
    if (!canEdit || busy) return;

    setEdits((current) => {
      const next = { ...current };

      if (student.status === status) {
        delete next[student.student];
      } else {
        next[student.student] = status;
      }

      return next;
    });

    setSaved("");
    setError(undefined);
  }

  function markAllPresent() {
    if (
      !canEdit ||
      busy ||
      roster.isFetching
    ) {
      return;
    }

    setEdits((current) => {
      const next = { ...current };

      for (const student of students) {
        if (student.status === "present") {
          delete next[student.student];
        } else {
          next[student.student] = "present";
        }
      }

      return next;
    });

    setSaved("");
    setError(undefined);
  }

  function clearChanges() {
    setEdits({});
    setError(undefined);
    setSaved("");
  }

  async function saveAttendance(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !canEdit ||
      busy ||
      roster.isFetching ||
      !dirty
    ) {
      return;
    }

    setBusy(true);
    setError(undefined);
    setSaved("");

    try {
      const records: AttendanceRecord[] = students
        .filter(
          (student) =>
            edits[student.student] !== undefined,
        )
        .map((student) => ({
          student: student.student,
          status: edits[student.student],
        }));

      if (!records.length) {
        setEdits({});
        return;
      }

      await post(
        `attendance-sessions/${session}/mark/`,
        { records },
      );

      setEdits({});

      await client.invalidateQueries({
        queryKey: ["attendance-roster", session],
      });

      await client.invalidateQueries({
        queryKey: ["resource", "attendance-sessions"],
      });

      setSaved(
        `${records.length} attendance ${
          records.length === 1
            ? "record"
            : "records"
        } saved successfully.`,
      );

      notifySaved("Attendance saved successfully.");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const table = (
    <div
      style={{
        border: "1px solid #dfe8e1",
        borderRadius: 12,
        overflow: "hidden",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          overflowX: "auto",
          width: "100%",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
            minWidth: 440,
          }}
        >
          <thead>
            <tr
              style={{
                background: "#f5f9f6",
                borderBottom:
                  "1px solid #e0e9e2",
              }}
            >
              <th
                scope="col"
                style={{
                  padding: "15px 18px",
                  fontSize: 12,
                  color: "#587064",
                  fontWeight: 700,
                }}
              >
                Student
              </th>

              <th
                scope="col"
                style={{
                  padding: "15px 18px",
                  fontSize: 12,
                  color: "#587064",
                  fontWeight: 700,
                  width: 190,
                }}
              >
                Attendance status
              </th>
            </tr>
          </thead>

          <tbody>
            {students.map((student, index) => {
              const status = getStatus(student);

              const changed =
                canEdit &&
                edits[student.student] !== undefined;

              const statusStyle = status
                ? SUMMARY_STYLES[status]
                : SUMMARY_STYLES.unmarked;

              return (
                <tr
                  key={student.id}
                  style={{
                    borderBottom:
                      index === students.length - 1
                        ? "none"
                        : "1px solid #edf1ed",
                    background: changed
                      ? "#f6fbf7"
                      : "#ffffff",
                  }}
                >
                  <td
                    style={{
                      padding: "12px 18px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div
                        aria-hidden="true"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "#e7f2eb",
                          color: "#176348",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(
                          student.student_label,
                        )}
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gap: 3,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#1b372b",
                          }}
                        >
                          {student.student_label}
                        </span>

                        {changed && (
                          <span
                            style={{
                              fontSize: 11,
                              color: "#a15c08",
                            }}
                          >
                            Unsaved change
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td
                    style={{
                      padding: "12px 18px",
                    }}
                  >
                    {canEdit ? (
                      <select
                        aria-label={`Attendance status for ${student.student_label}`}
                        disabled={busy}
                        value={status ?? ""}
                        onChange={(event) =>
                          setStudentStatus(
                            student,
                            event.target
                              .value as AttendanceStatus,
                          )
                        }
                        style={{
                          width: "100%",
                          minHeight: 40,
                          border:
                            "1px solid #d5e3d9",
                          borderRadius: 8,
                          padding: "8px 10px",
                          fontSize: 13,
                          fontWeight: 600,
                          background: "#ffffff",
                          color: "#1b372b",
                          cursor: busy
                            ? "not-allowed"
                            : "pointer",
                        }}
                      >
                        <option value="" disabled>
                          Not marked
                        </option>

                        {STATUS_OPTIONS.map(
                          (option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          ),
                        )}
                      </select>
                    ) : (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          borderRadius: 8,
                          padding: "8px 12px",
                          fontSize: 13,
                          fontWeight: 600,
                          color: statusStyle.color,
                          background:
                            statusStyle.background,
                        }}
                      >
                        {statusLabel(status)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <section
      aria-label="Attendance roster"
      style={{
        display: "grid",
        gap: 20,
        width: "100%",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3
            style={{
              margin: "0 0 6px",
              fontSize: "1.25rem",
              fontWeight: 700,
            }}
          >
            Student attendance
          </h3>

          <p
            className="muted"
            style={{
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            {canEdit
              ? "Review attendance and update student statuses. Changes are saved only when you select Save."
              : "Review recorded attendance for this session. These records are read-only."}
          </p>
        </div>

        <span
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            background: "#e8f3ed",
            color: "#176348",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {roster.data?.count ?? 0} students
        </span>
      </div>

      {!canEdit && (
        <div
          role="note"
          style={{
            padding: "12px 15px",
            borderRadius: 10,
            background: "#f2f6f3",
            border: "1px solid #dfe8e1",
            color: "#496456",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <strong>Read-only attendance review.</strong>{" "}
          Attendance statuses can only be changed by
          authorized instructors assigned to the course.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(125px, 1fr))",
          gap: 12,
        }}
      >
        {summaryItems.map((item) => (
          <div
            key={item.label}
            style={{
              border: "1px solid #e1e9e3",
              borderRadius: 12,
              background: "#ffffff",
              padding: 16,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                fontSize: 12,
                fontWeight: 600,
                color: item.style.color,
                background:
                  item.style.background,
                padding: "5px 9px",
                borderRadius: 7,
                marginBottom: 12,
              }}
            >
              {item.label}
            </div>

            <div
              style={{
                fontSize: 26,
                fontWeight: 750,
                lineHeight: 1,
                color: "#193b2e",
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <label
          style={{
            display: "grid",
            gap: 7,
            flex: "1 1 240px",
            maxWidth: 420,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Search students

          <input
            type="search"
            placeholder="Search by student name..."
            value={search}
            disabled={dirty || busy}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
              setSaved("");
              setError(undefined);
            }}
            style={{
              width: "100%",
              minHeight: 42,
              border: "1px solid #d5e3d9",
              borderRadius: 9,
              padding: "9px 12px",
              background: "#fff",
              color: "#193b2e",
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />
        </label>

        {canEdit && (
          <Button
            type="button"
            variant="outline"
            disabled={
              busy ||
              roster.isFetching ||
              !students.length
            }
            onClick={markAllPresent}
          >
            Mark page present
          </Button>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <p
          className="muted"
          style={{
            margin: 0,
            fontSize: 13,
          }}
        >
          Page {page} · {students.length} shown ·{" "}
          {markedCount} marked
        </p>

        {dirty && (
          <span
            role="status"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#a15c08",
              background: "#fff5e6",
              borderRadius: 8,
              padding: "7px 10px",
            }}
          >
            {Object.keys(edits).length} unsaved{" "}
            {Object.keys(edits).length === 1
              ? "change"
              : "changes"}
          </span>
        )}
      </div>

      {roster.isPending ? (
        <Loading />
      ) : roster.isError ? (
        <ErrorState error={roster.error} />
      ) : !students.length ? (
        <Empty />
      ) : canEdit ? (
        <form onSubmit={saveAttendance}>
          {table}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <Button
                type="submit"
                disabled={
                  busy ||
                  roster.isFetching ||
                  !dirty
                }
              >
                {busy
                  ? "Saving..."
                  : `Save attendance${
                      dirty
                        ? ` (${Object.keys(edits).length})`
                        : ""
                    }`}
              </Button>

              {dirty && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={clearChanges}
                >
                  Discard changes
                </Button>
              )}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Button
                type="button"
                variant="outline"
                disabled={
                  locked || !roster.data?.previous
                }
                onClick={() => {
                  setPage((current) =>
                    Math.max(1, current - 1),
                  );
                  setSaved("");
                }}
              >
                Previous
              </Button>

              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "0 6px",
                }}
              >
                {page}
              </span>

              <Button
                type="button"
                variant="outline"
                disabled={
                  locked || !roster.data?.next
                }
                onClick={() => {
                  setPage((current) => current + 1);
                  setSaved("");
                }}
              >
                Next
              </Button>
            </div>
          </div>

          {dirty && (
            <p
              className="muted"
              style={{
                marginTop: 12,
                fontSize: 12,
              }}
            >
              Save or discard your changes before
              searching or switching pages.
            </p>
          )}
        </form>
      ) : (
        <>
          {table}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 8,
              marginTop: 4,
            }}
          >
            <Button
              type="button"
              variant="outline"
              disabled={
                roster.isFetching ||
                !roster.data?.previous
              }
              onClick={() =>
                setPage((current) =>
                  Math.max(1, current - 1),
                )
              }
            >
              Previous
            </Button>

            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: "0 6px",
              }}
            >
              {page}
            </span>

            <Button
              type="button"
              variant="outline"
              disabled={
                roster.isFetching ||
                !roster.data?.next
              }
              onClick={() =>
                setPage((current) => current + 1)
              }
            >
              Next
            </Button>
          </div>
        </>
      )}

      {saved && (
        <div
          role="status"
          style={{
            border: "1px solid #c9e5d2",
            background: "#edf8f0",
            color: "#176348",
            borderRadius: 10,
            padding: "12px 15px",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {saved}
        </div>
      )}

      {!!error && <ErrorState error={error} />}
    </section>
  );
}