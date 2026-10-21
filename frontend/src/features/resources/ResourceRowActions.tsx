import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { post, type RecordData } from "../../lib/api";
import { BulkEnrollment } from "../courses/BulkEnrollment";
import { BankCopy } from "../quizzes/BankCopy";
import { QuizAuthoring } from "../quizzes/QuizAuthoring";
import { AcademicControl } from "./AcademicControl";
import { GradeHistory } from "./GradeHistory";
import { LinkAccount } from "./LinkAccount";
type ResourceActionProps = {
  row: RecordData;
  role: string;
  resource: string;
  client: ReturnType<typeof useQueryClient>;
  start: (row: RecordData) => Promise<void>;
  setError: (error: unknown) => void;
  isAudit: boolean;
  isAttendanceOversight: boolean;
  isAttendance: boolean;
  isQuizzes: boolean;
  writable: boolean;
  isPlatformUsers: boolean;
  isAssignments: boolean;
  isAssignmentOversight: boolean;
  isQuizOversight: boolean;
  canDelete: boolean;
  setAuditRecord: (row: RecordData) => void;
  setWorkflow: (row: RecordData) => void;
  setEditing: (row: RecordData) => void;
  setDeleting: (row: RecordData) => void;
};
export function ResourceRowActions({
  row,
  isAudit,
  isAttendanceOversight,
  isAttendance,
  isQuizzes,
  writable,
  isPlatformUsers,
  isAssignments,
  isAssignmentOversight,
  isQuizOversight,
  canDelete,
  setAuditRecord,
  setWorkflow,
  setEditing,
  setDeleting,
  setError,
  start,
  role,
  resource,
  client,
}: ResourceActionProps) {
  if (isAudit) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setAuditRecord(row)}
      >
        View details
        <ArrowUpRight size={14} aria-hidden="true" />
      </Button>
    );
  }

  return (
    <div className="row-actions">
      {isAttendanceOversight && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setWorkflow(row)}
        >
          View attendance
          <ArrowUpRight size={14} aria-hidden="true" />
        </Button>
      )}

      {role !== "student" && !isAttendance && (
        <AcademicControl resource={resource} row={row} />
      )}

      {isQuizzes && writable && <QuizAuthoring quiz={row} />}

      {resource === "offerings" &&
        ["admin", "head", "superadmin"].includes(role) && (
          <BulkEnrollment offering={row} />
        )}

      {isPlatformUsers && row.is_superuser !== true && (
        <LinkAccount row={row} />
      )}

      {role !== "student" &&
        ["submissions", "attempts", "manual-grades"].includes(resource) && (
          <GradeHistory resource={resource} id={row.id} />
        )}

      {resource === "question-bank" && <BankCopy row={row} />}

      {resource === "lessons" && (
        <Button variant="outline" onClick={() => setWorkflow(row)}>
          Read lesson
        </Button>
      )}

      {isAssignments &&
        (role === "student" ? (
          <Button variant="outline" onClick={() => setWorkflow(row)}>
            Submit work
          </Button>
        ) : (
          <Button variant="outline" asChild>
            <Link to={`/submissions?assignment=${row.id}`}>
              {isAssignmentOversight ? "View submissions" : "Submissions"}
            </Link>
          </Button>
        ))}

      {isQuizzes &&
        (role === "student" ? (
          <>
            <Button variant="outline" onClick={() => void start(row)}>
              Start / resume
            </Button>

            <Link className="text-link" to={`/attempts?quiz=${row.id}`}>
              Results
            </Link>
          </>
        ) : (
          <>
            <Button variant="outline" asChild>
              <Link to={`/questions?quiz=${row.id}`}>
                {isQuizOversight ? "View questions" : "Questions"}
              </Link>
            </Button>

            <Button variant="outline" asChild>
              <Link to={`/attempts?quiz=${row.id}`}>Results</Link>
            </Button>
          </>
        ))}

      {(["submissions", "attempts", "manual-grades"].includes(resource) ||
        (isAttendance && role === "teacher")) && (
        <Button variant="outline" onClick={() => setWorkflow(row)}>
          {isAttendance ? "Mark attendance" : "Review"}
        </Button>
      )}

      {(resource === "materials" || isAssignments) && !!row.file && (
        <a className="text-link" href={String(row.file)}>
          Download
        </a>
      )}

      {resource === "notifications" && !row.read && (
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await post(`notifications/${row.id}/read/`);

              await client.invalidateQueries();
            } catch (err) {
              setError(err);
            }
          }}
        >
          Mark read
        </Button>
      )}

      {resource === "notifications" &&
        typeof row.destination === "string" &&
        /^\/(?!\/)/.test(row.destination) &&
        !/[\\\s]/.test(row.destination) && (
          <Link className="text-link" to={row.destination}>
            Open notification
          </Link>
        )}

      {writable && (
        <button
          type="button"
          className="icon-button"
          aria-label={`Edit ${
            row.title || row.name || row.username || "record"
          }`}
          title="Edit record"
          onClick={() => setEditing(row)}
        >
          <Pencil size={16} aria-hidden="true" />
        </button>
      )}

      {canDelete && (
        <button
          type="button"
          className="icon-button danger"
          aria-label="Delete record"
          title="Delete record"
          onClick={() => setDeleting(row)}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
