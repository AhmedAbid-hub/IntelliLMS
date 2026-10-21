import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Avatar } from "../../components/Avatar";
import {
  Empty,
  ErrorState,
  Loading,
  PageHeader,
} from "../../components/shared";
import { notifySaved } from "../../components/ToastProvider";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { api, display, post, type Page, type RecordData } from "../../lib/api";
import { useInstitution } from "../../lib/institution";
import { useTerminology } from "../../lib/terminology";
import { useUrlFilters } from "../../lib/useUrlFilters";
import { useAuth } from "../auth/Auth";
import { CourseCard } from "../courses/CourseCard";
import {
  AuditDetailContent,
  auditId,
  auditLabel,
  auditSummary,
  auditText,
} from "./audit/AuditDetails";
import { resources } from "./config";
import { ImportPeople } from "./ImportPeople";
import { LinkAccount } from "./LinkAccount";
import { PeopleActions, peopleRoles, peopleTabs } from "./people/PeopleActions";
import {
  AddInstituteAdministrator,
  PlatformAccountIdentity,
  PlatformAccountSummary,
  platformColors,
  PlatformStatus,
} from "./platform/PlatformAccounts";
import { ResourceFilters } from "./ResourceFilters";
import { ResourceForm } from "./ResourceForm";
import { ResourceRowActions } from "./ResourceRowActions";
import { timetableDay, timetableTime } from "./timetable/timetableFormatting";
import { WorkflowDialog } from "./WorkflowDialog";

export type ResourcePageProps = {
  resource?: string;
  offering?: string;
  initialCreate?: boolean;
};

export function ResourcePage({
  resource: explicit,
  offering,
  initialCreate = false,
}: ResourcePageProps) {
  const params = useParams();

  const resource = explicit || params.resource || "";

  const config = resources[resource];
  const terms = useTerminology();
  const { role, user } = useAuth();
  const institution = useInstitution();

  // Institute administrators browse offerings by academic department first.
  const departmentBrowser =
    resource === "offerings" && role === "admin" && institution.departments;
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(
    null,
  );
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const unitsQuery = useQuery({
    queryKey: ["offering-browser-units"],
    queryFn: () => api<Page<RecordData>>("units/?page_size=1000"),
    enabled: departmentBrowser,
  });
  const catalogQuery = useQuery({
    queryKey: ["offering-browser-catalog"],
    queryFn: () => api<Page<RecordData>>("courses/?page_size=1000"),
    enabled: departmentBrowser,
  });
  const programsQuery = useQuery({
    queryKey: ["offering-browser-programs"],
    queryFn: () => api<Page<RecordData>>("programs/?page_size=1000"),
    enabled: departmentBrowser,
  });
  const sectionsQuery = useQuery({
    queryKey: ["offering-browser-sections"],
    queryFn: () => api<Page<RecordData>>("sections/?page_size=1000"),
    enabled: departmentBrowser,
  });
  const curriculumQuery = useQuery({
    queryKey: ["offering-browser-curriculum"],
    queryFn: () => api<Page<RecordData>>("curriculum/?page_size=1000"),
    enabled: departmentBrowser,
  });

  const isAudit = resource === "audit";

  const isPlatformUsers =
    resource === "platform-users" && role === "superadmin";

  const [auditRecord, setAuditRecord] = useState<RecordData | null>(null);

  const isPeople = resource === "memberships";

  const isAdminPeople = isPeople && role === "admin";

  const isAssignments = resource === "assignments";

  const isQuizzes = resource === "quizzes";

  const isAttendance = resource === "attendance-sessions";

  const isAttendanceOversight =
    isAttendance && (role === "admin" || role === "head");

  const isQuizOversight = isQuizzes && (role === "admin" || role === "head");

  const isAssignmentOversight =
    isAssignments && (role === "admin" || role === "head");

  const isRestrictedAcademicResource =
    isAssignments ||
    isQuizzes ||
    [
      "lessons",
      "materials",
      "modules",
      "questions",
      "manual-grades",
      "question-bank",
    ].includes(resource);

  const writable = isAttendance
    ? role === "teacher"
    : isRestrictedAcademicResource
      ? role === "teacher"
      : (config?.write.includes(role) ?? false);

  const pageTitle = departmentBrowser
    ? "Course offerings"
    : isPlatformUsers
      ? "Institute Administrators"
      : isPeople && role === "superadmin"
        ? "Institute administrators"
        : isPeople && role === "head"
          ? "Department People"
          : isAttendance && role === "admin"
            ? "Attendance oversight"
            : isAttendance && role === "head"
              ? "Department attendance"
              : isAssignments && role === "admin"
                ? "Assignment oversight"
                : isQuizzes && role === "admin"
                  ? "Quiz oversight"
                  : terms.title(resource, config?.title || resource);

  const pageDescription = departmentBrowser
    ? "Browse departments, review academic terms, and manage course delivery."
    : isPlatformUsers
      ? "Manage platform accounts, review access status, and link eligible administrators to their institutions."
      : isPeople && role === "head"
        ? "View teachers and students within your academic department."
        : isAttendance && role === "admin"
          ? "Monitor attendance sessions and student participation across your institution. Assigned instructors manage attendance."
          : isAttendance && role === "head"
            ? "Review attendance across your department. Only assigned instructors can create sessions and mark attendance."
            : isAttendance && role === "teacher"
              ? "Create attendance sessions and record student participation in your assigned courses."
              : isAttendance && role === "student"
                ? "Review your recorded attendance."
                : isAssignments && role === "admin"
                  ? "Monitor assignments, deadlines, publication status, and student submissions across your institute. Assignment creation and grading are handled by assigned instructors."
                  : isAssignments && role === "head"
                    ? "Review department assignments and submissions. Assignment authoring is available to instructors assigned to the course."
                    : isQuizzes && role === "admin"
                      ? "Monitor quizzes, release status, questions, and student results across your institute. Quiz authoring and grading are handled by assigned instructors."
                      : isQuizzes && role === "head"
                        ? "Review department quizzes and results. Quiz authoring is available to instructors assigned to the course."
                        : config?.description || "";

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<RecordData | null | undefined>(
    initialCreate &&
      (!isRestrictedAcademicResource || role === "teacher") &&
      (!isAttendance || role === "teacher")
      ? null
      : undefined,
  );

  const [workflow, setWorkflow] = useState<RecordData>();

  const [deleting, setDeleting] = useState<RecordData>();

  const [error, setError] = useState<unknown>();

  const [searchParams, updateFilter] = useUrlFilters();

  const navigate = useNavigate();
  const client = useQueryClient();

  const filters = new URLSearchParams(searchParams);

  if (offering) {
    filters.set("offering", offering);
  }

  filters.set("page", String(page));

  if (search) {
    filters.set("search", search);
  }

  const query = useQuery({
    queryKey: ["resource", resource, filters.toString()],
    queryFn: () => api<Page<RecordData>>(`${resource}/?${filters.toString()}`),
    enabled: !!config,
  });

  if (!config) {
    return (
      <Empty>
        Page not found. <Link to="/">Return to overview</Link>
      </Empty>
    );
  }

  const canDelete =
    writable &&
    ![
      "institutes",
      "memberships",
      "submissions",
      "attempts",
      "platform-users",
      "offerings",
      "enrollments",
      "manual-grades",
    ].includes(resource);

  async function start(row: RecordData) {
    try {
      const attempt = await post<RecordData>(`quizzes/${row.id}/start/`);

      navigate(`/quiz-attempt/${attempt.id}`);
    } catch (err) {
      setError(err);
    }
  }

  function actions(row: RecordData) {
    return (
      <ResourceRowActions
        row={row}
        {...{
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
        }}
      />
    );
  }

  const allUnits = unitsQuery.data?.results ?? [];
  const catalog = catalogQuery.data?.results ?? [];
  const programs = programsQuery.data?.results ?? [];
  const sections = sectionsQuery.data?.results ?? [];
  const curriculum = curriculumQuery.data?.results ?? [];
  const offeringRows = query.data?.results ?? [];

  const byId = (rows: RecordData[]) =>
    new Map(rows.map((item) => [String(item.id), item]));
  const courseById = byId(catalog);
  const unitById = byId(allUnits);
  const programById = byId(programs);
  const sectionById = byId(sections);

  // Resolve the department through the actual academic relationships.
  // Never turn a missing relationship into a fictitious department.
  const departmentId = (row: RecordData): string | null => {
    const course = courseById.get(String(row.course ?? ""));
    const section = sectionById.get(String(row.section ?? ""));
    const program = programById.get(String(section?.program ?? ""));
    const value = course?.unit ?? row.unit ?? program?.unit;
    return value == null || value === "" ? null : String(value);
  };

  const stageForOffering = (row: RecordData): number | null => {
    const section = sectionById.get(String(row.section ?? ""));
    const programId = section?.program == null ? null : String(section.program);
    const courseId = row.course == null ? null : String(row.course);
    if (!programId || !courseId) return null;
    const matches = curriculum.filter(
      (entry) =>
        String(entry.program ?? "") === programId &&
        String(entry.course ?? "") === courseId &&
        entry.active !== false,
    );
    const stages = Array.from(
      new Set(
        matches
          .map((entry) => Number(entry.stage))
          .filter((stage) => Number.isInteger(stage) && stage > 0),
      ),
    );
    return stages.length === 1 ? stages[0] : null;
  };

  const departmentNames = allUnits
    .filter((unit) => String(unit.kind ?? "department") === "department")
    .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));

  const visibleOfferingRows =
    departmentBrowser && selectedDepartment !== null
      ? offeringRows.filter(
          (row) =>
            departmentId(row) === selectedDepartment &&
            (selectedStage === null || stageForOffering(row) === selectedStage),
        )
      : offeringRows;

  const departmentStages =
    selectedDepartment === null
      ? []
      : Array.from(
          new Set(
            offeringRows
              .filter((row) => departmentId(row) === selectedDepartment)
              .map(stageForOffering)
              .filter((stage): stage is number => stage !== null),
          ),
        ).sort((a, b) => a - b);

  const unassignedCount = offeringRows.filter(
    (row) => departmentId(row) === null,
  ).length;

  const platformRows = isPlatformUsers ? (query.data?.results ?? []) : [];

  return (
    <>
      <PageHeader title={pageTitle} description={pageDescription}>
        {isPlatformUsers && (
          <AddInstituteAdministrator instituteId={user?.institute_id} />
        )}
        {isAdminPeople && writable && <ImportPeople />}

        {writable &&
          resource !== "platform-users" &&
          !(resource === "offerings" && role === "head") && (
            <Button onClick={() => setEditing(null)}>
              <Plus size={17} />
              {isAttendance
                ? "Create session"
                : `Add ${isPeople ? "person" : "new"}`}
            </Button>
          )}
      </PageHeader>

      {isAdminPeople && (
        <nav className="people-tabs" aria-label="People groups">
          {peopleTabs
            .filter((tab) => institution.departments || tab.value !== "head")
            .map((tab) => {
              const activeRole = searchParams.get("role") || "";

              return (
                <Link
                  key={tab.value}
                  to={
                    tab.value
                      ? `/memberships?role=${tab.value}`
                      : "/memberships"
                  }
                  className={
                    activeRole === tab.value
                      ? "people-tab active"
                      : "people-tab"
                  }
                  aria-current={activeRole === tab.value ? "page" : undefined}
                >
                  {tab.label}
                </Link>
              );
            })}
        </nav>
      )}

      {isQuizzes && role !== "student" && !isQuizOversight && (
        <Link className="text-link" to="/question-bank">
          Open question bank →
        </Link>
      )}

      {resource === "enrollments" && (role === "admin" || role === "head") && (
        <Link className="text-link" to="/offerings">
          Manage course enrollments →
        </Link>
      )}

      {isAssignments && role === "student" && (
        <Link className="text-link" to="/submissions">
          View my submissions &amp; feedback →
        </Link>
      )}

      {!!error && <ErrorState error={error} />}

      {isPlatformUsers && (
        <>
          <PlatformAccountSummary
            count={query.data?.count}
            rows={platformRows}
            hasNext={!!query.data?.next}
            isLoading={query.isPending}
          />

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "13px 16px",
              marginBottom: 20,
              border: `1px solid ${platformColors.border}`,
              borderRadius: 11,
              background: platformColors.soft,
              color: platformColors.dark,
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            <ShieldCheck
              size={18}
              style={{
                flexShrink: 0,
                marginTop: 2,
                color: platformColors.green,
              }}
            />

            <div>
              <strong>Platform access management</strong>

              <div
                style={{
                  color: platformColors.muted,
                  marginTop: 3,
                }}
              >
                Platform accounts and institute administrator appointments are
                managed separately. Use the linking action to associate an
                eligible account with the selected institute. Status summaries
                reflect the currently loaded page unless otherwise indicated.
              </div>
            </div>
          </div>
        </>
      )}

      <section
        className={
          isPeople
            ? "panel resource-panel people-resource-panel"
            : "panel resource-panel"
        }
      >
        <div
          className="table-toolbar"
          style={
            isPlatformUsers
              ? {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 16,
                  padding: "20px 24px",
                }
              : undefined
          }
        >
          <div
            style={
              isPlatformUsers
                ? {
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }
                : undefined
            }
          >
            <b>{isPlatformUsers ? "Platform accounts" : pageTitle}</b>

            <span className="count-badge">{query.data?.count ?? "…"}</span>
          </div>

          {config.search && (
            <label
              className="search-box"
              style={
                isPlatformUsers
                  ? {
                      width: "100%",
                      maxWidth: 340,
                      minWidth: 220,
                    }
                  : undefined
              }
            >
              <Search size={17} aria-hidden="true" />

              <input
                aria-label={`Search ${config.title}`}
                placeholder={
                  isPlatformUsers
                    ? "Search platform accounts..."
                    : isPeople
                      ? "Search people..."
                      : "Search records..."
                }
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </label>
          )}
        </div>

        <div
          style={
            isPlatformUsers
              ? {
                  padding: "0 24px 18px",
                }
              : undefined
          }
        >
          <ResourceFilters
            resource={resource}
            value={searchParams}
            onChange={(key, value) => {
              setPage(1);
              updateFilter(key, value);
            }}
          />
        </div>

        {query.isPending ||
        (departmentBrowser &&
          (unitsQuery.isPending ||
            catalogQuery.isPending ||
            programsQuery.isPending ||
            sectionsQuery.isPending ||
            curriculumQuery.isPending)) ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState error={query.error} />
        ) : departmentBrowser && unitsQuery.isError ? (
          <ErrorState error={unitsQuery.error} />
        ) : departmentBrowser && catalogQuery.isError ? (
          <ErrorState error={catalogQuery.error} />
        ) : departmentBrowser && programsQuery.isError ? (
          <ErrorState error={programsQuery.error} />
        ) : departmentBrowser && sectionsQuery.isError ? (
          <ErrorState error={sectionsQuery.error} />
        ) : departmentBrowser && curriculumQuery.isError ? (
          <ErrorState error={curriculumQuery.error} />
        ) : departmentBrowser && selectedDepartment === null ? (
          <div style={{ padding: 24 }}>
            <h2 style={{ fontSize: 19, margin: "0 0 6px" }}>Departments</h2>
            <p className="muted" style={{ margin: "0 0 20px" }}>
              Choose a department to manage its course offerings.
            </p>
            {departmentNames.length === 0 ? (
              <Empty>
                No departments yet. Create one in Departments & Programs.
              </Empty>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 12,
                }}
              >
                {departmentNames.map((unit) => {
                  const id = String(unit.id);
                  const count = offeringRows.filter(
                    (row) => departmentId(row) === id,
                  ).length;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSelectedDepartment(id);
                        setSelectedStage(null);
                      }}
                      style={{
                        padding: 20,
                        border: "1px solid #dce8df",
                        borderRadius: 14,
                        background: "#fff",
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        color: "#173d2e",
                        font: "inherit",
                      }}
                    >
                      <Building2 size={22} aria-hidden="true" />
                      <span style={{ flex: 1, fontWeight: 700 }}>
                        {String(unit.name ?? "Department")}
                      </span>
                      <span className="count-badge">{count}</span>
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            )}
            {unassignedCount > 0 && (
              <p className="muted" style={{ marginTop: 18 }}>
                {unassignedCount} offering{unassignedCount === 1 ? "" : "s"}{" "}
                could not be linked to a department. Assign a department to the
                course definition or link its section to a program with a
                department. These records have not been deleted.
              </p>
            )}
          </div>
        ) : resource === "offerings" ? (
          <div style={{ padding: "20px 24px" }}>
            {departmentBrowser && selectedDepartment !== null && (
              <div style={{ marginBottom: 20 }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDepartment(null);
                    setSelectedStage(null);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    background: "none",
                    border: 0,
                    cursor: "pointer",
                    color: "#176443",
                    fontWeight: 650,
                    padding: "4px 0 12px",
                  }}
                >
                  <ArrowLeft size={16} /> All departments
                </button>
                <h2 style={{ fontSize: 20, margin: "0 0 14px" }}>
                  {String(
                    unitById.get(selectedDepartment)?.name ?? "Department",
                  )}
                </h2>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                  aria-label="Program semester selection"
                >
                  {[null, ...departmentStages].map((stage) => (
                    <button
                      key={stage ?? "all"}
                      type="button"
                      aria-pressed={selectedStage === stage}
                      onClick={() => setSelectedStage(stage)}
                      style={{
                        border: "1px solid #dce8df",
                        borderRadius: 9,
                        padding: "9px 14px",
                        cursor: "pointer",
                        fontWeight: 650,
                        background:
                          selectedStage === stage ? "#176443" : "#fff",
                        color: selectedStage === stage ? "#fff" : "#173d2e",
                      }}
                    >
                      {stage === null ? "All semesters" : `Semester ${stage}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {visibleOfferingRows.length === 0 ? (
              <Empty>No course offerings in this selection.</Empty>
            ) : (
              <div className="course-grid">
                {visibleOfferingRows.map((row, index) => (
                  <CourseCard
                    key={String(row.id)}
                    course={row}
                    index={index}
                    actions={
                      <div className="course-management-actions">
                        {actions(row)}
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        ) : isPlatformUsers ? (
          <div
            className="table-scroll"
            style={{
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  <th scope="col">Account</th>

                  <th scope="col">Email</th>

                  <th scope="col">Account status</th>

                  <th scope="col">Access level</th>

                  <th scope="col">Actions</th>
                </tr>
              </thead>

              <tbody>
                {query.data.results.map((row) => (
                  <tr key={String(row.id)}>
                    <td>
                      <PlatformAccountIdentity row={row} />
                    </td>

                    <td
                      style={{
                        fontSize: 13,
                        color: platformColors.muted,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {display(row.email)}
                    </td>

                    <td>
                      <PlatformStatus active={row.is_active === true} />
                    </td>

                    <td>
                      <PlatformStatus
                        active={row.is_superuser === true}
                        superuser
                      />
                    </td>

                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        {row.is_superuser !== true && <LinkAccount row={row} />}

                        {writable && (
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={`Edit ${String(
                              row.username || "account",
                            )}`}
                            title="Edit account"
                            onClick={() => setEditing(row)}
                          >
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {config.columns.map((column) => (
                    <th key={column} scope="col">
                      {terms.column(column)}
                    </th>
                  ))}

                  <th scope="col">Actions</th>
                </tr>
              </thead>

              <tbody>
                {(resource === "timetable"
                  ? [...query.data.results].sort((a, b) => {
                      const dayA = Number(a.day ?? 99);
                      const dayB = Number(b.day ?? 99);
                      if (dayA !== dayB) return dayA - dayB;
                      return String(
                        a.start ?? a.start_time ?? "",
                      ).localeCompare(String(b.start ?? b.start_time ?? ""));
                    })
                  : query.data.results
                ).map((row) => (
                  <tr key={String(row.id)}>
                    {config.columns.map((column, index) => (
                      <td
                        key={column}
                        className={index === 0 ? "primary-cell" : ""}
                      >
                        {isPeople && column === "username" && (
                          <span aria-hidden="true">
                            <Avatar
                              src={row.avatar_url as string | null}
                              name={String(row.first_name || row.username)}
                            />
                          </span>
                        )}

                        {isAudit && column === "action" ? (
                          <strong>{auditLabel(row[column])}</strong>
                        ) : isAudit && column === "object_id" ? (
                          <span
                            title={String(row[column] ?? "")}
                            style={{
                              fontFamily: "monospace",
                              fontSize: 12,
                            }}
                          >
                            {auditId(row[column])}
                          </span>
                        ) : isAudit && column === "detail" ? (
                          <span
                            title={auditSummary(row[column])}
                            style={{
                              display: "inline-block",
                              maxWidth: 340,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              verticalAlign: "middle",
                            }}
                          >
                            {auditSummary(row[column])}
                          </span>
                        ) : typeof row[column] === "boolean" ? (
                          <span
                            className={
                              row[column]
                                ? "status-badge"
                                : "status-badge neutral"
                            }
                          >
                            {row[column] ? "Yes" : "No"}
                          </span>
                        ) : isPeople && column === "role" ? (
                          <span
                            className={`people-role-badge people-role-${String(
                              row[column] ?? "",
                            )}`}
                          >
                            {peopleRoles[String(row[column] ?? "")] ??
                              display(row[column])}
                          </span>
                        ) : column.endsWith("_at") ? (
                          row[column] ? (
                            new Date(String(row[column])).toLocaleString()
                          ) : (
                            "—"
                          )
                        ) : resource === "timetable" && column === "day" ? (
                          timetableDay(row[column])
                        ) : resource === "timetable" &&
                          ["start", "end", "start_time", "end_time"].includes(
                            column,
                          ) ? (
                          timetableTime(row[column])
                        ) : (
                          display(row[column])
                        )}
                      </td>
                    ))}

                    <td>
                      {isPeople ? (
                        <PeopleActions
                          row={row}
                          writable={writable}
                          role={role}
                          currentUserId={user?.id}
                          onEdit={setEditing}
                        />
                      ) : (
                        actions(row)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination">
          <small>
            Page {page} · {query.data?.count ?? 0} records
          </small>

          <Button
            variant="ghost"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>

          <Button
            variant="ghost"
            disabled={!query.data?.next}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      </section>

      {editing !== undefined && writable && (
        <Dialog
          open
          onOpenChange={() => setEditing(undefined)}
          title={
            resource === "memberships" && !editing && role === "admin"
              ? "Add a person"
              : `${editing ? "Edit" : "Create"} ${
                  resource === "institutes"
                    ? "institute"
                    : isPlatformUsers
                      ? "platform account"
                      : pageTitle.toLowerCase()
                }`
          }
        >
          <ResourceForm
            resource={resource}
            initial={editing || undefined}
            defaults={{
              ...Object.fromEntries(searchParams),
              ...(offering ? { offering } : {}),
            }}
            onDone={() => setEditing(undefined)}
          />
        </Dialog>
      )}

      {isAudit && auditRecord && (
        <Dialog
          open
          title="Audit record details"
          onOpenChange={() => setAuditRecord(null)}
        >
          <div
            style={{
              display: "grid",
              gap: 16,
              maxHeight: "70vh",
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            <div
              style={{
                display: "grid",
                gap: 6,
              }}
            >
              <div>
                <strong>Action: </strong>
                {auditLabel(auditRecord.action)}
              </div>

              <div>
                <strong>Recorded: </strong>
                {auditRecord.created_at
                  ? new Date(String(auditRecord.created_at)).toLocaleString()
                  : "Not specified"}
              </div>

              <div
                style={{
                  overflowWrap: "anywhere",
                }}
              >
                <strong>Record ID: </strong>
                <code>{auditText(auditRecord.object_id)}</code>
              </div>

              {auditRecord.object_id != null && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (
                      typeof navigator !== "undefined" &&
                      navigator.clipboard
                    ) {
                      void navigator.clipboard.writeText(
                        String(auditRecord.object_id),
                      );
                    }
                  }}
                >
                  Copy record ID
                </Button>
              )}
            </div>

            <div>
              <h3
                style={{
                  fontSize: 16,
                  marginBottom: 12,
                }}
              >
                Recorded changes
              </h3>

              <AuditDetailContent detail={auditRecord.detail} />
            </div>
          </div>
        </Dialog>
      )}

      {workflow && (
        <WorkflowDialog
          resource={resource}
          row={workflow}
          onClose={() => setWorkflow(undefined)}
        />
      )}

      {deleting && canDelete && (
        <Dialog
          open
          title="Delete this record?"
          onOpenChange={() => setDeleting(undefined)}
        >
          <p>
            Delete this unused draft record permanently. Published content and
            records with academic history are protected by the server.
          </p>

          <Button
            variant="destructive"
            onClick={async () => {
              try {
                await api(`${resource}/${deleting.id}/`, {
                  method: "DELETE",
                });

                setDeleting(undefined);

                notifySaved("Record deleted.");

                await client.invalidateQueries();
              } catch (err) {
                setError(err);
                setDeleting(undefined);
              }
            }}
          >
            Delete record
          </Button>
        </Dialog>
      )}
    </>
  );
}
