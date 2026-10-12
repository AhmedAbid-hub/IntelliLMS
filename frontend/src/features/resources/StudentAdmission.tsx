
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, post, type Page, type RecordData } from "../../lib/api";
import { RelationSelect } from "../../components/RelationSelect";
import { Pagination } from "../../components/ReportControls";
import { Button } from "../../components/ui/button";
import { PageHeader, Loading, ErrorState } from "../../components/shared";
import { useTerminology } from "../../lib/terminology";
import { InvitationReview } from "./InvitationReview";

type Placement = {
  program: string;
  batch: string;
  year: string;
  section: string;
  term: string;
  stage: string;
  offerings: string[];
};

const empty: Placement = {
  program: "",
  batch: "",
  year: "",
  section: "",
  term: "",
  stage: "1",
  offerings: [],
};

const placementPayload = (value: Placement) => ({
  program: value.program,
  batch: value.batch || null,
  year: value.year,
  section: value.section || null,
  offerings: value.offerings,
});

const fieldGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
  gap: "16px 20px",
  alignItems: "start",
} as const;

const sectionHeadingStyle = {
  marginBottom: 8,
} as const;

function PlacementFields({
  value,
  onChange,
}: {
  value: Placement;
  onChange: (value: Placement) => void;
}) {
  const terms = useTerminology();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const params = new URLSearchParams({
    program: value.program,
    year: value.year,
    stage: value.stage,
    page: String(page),
    search,
  });

  for (const key of ["batch", "section", "term"] as const) {
    if (value[key]) {
      params.set(key, value[key]);
    }
  }

  const choices = useQuery({
    queryKey: ["admission-suggestions", params.toString()],
    queryFn: () =>
      api<Page<RecordData>>(
        `admissions/offerings/?${params}`
      ),
    enabled: !!value.program && !!value.year,
  });

  const field = (
    key: keyof Omit<Placement, "offerings">,
    next: string
  ) => {
    setPage(1);

    onChange({
      ...value,
      [key]: next,
      offerings: [],
      ...(key === "program"
        ? { batch: "", section: "" }
        : {}),
      ...(key === "batch" ? { section: "" } : {}),
      ...(key === "year" ? { term: "" } : {}),
    });
  };

  return (
    <>
      <div className="admission-fields" style={fieldGridStyle}>
        <RelationSelect
          label={terms.field("program", "Program / grade")}
          source="programs?active=true"
          value={value.program}
          onChange={(v) => field("program", String(v))}
          required
        />

        <RelationSelect
          label={terms.field("year", "Academic year")}
          source="years"
          value={value.year}
          onChange={(v) => field("year", String(v))}
          required
        />

        <RelationSelect
          label="Admission batch (optional)"
          source={`batches?active=true${
            value.program ? `&program=${value.program}` : ""
          }`}
          value={value.batch}
          onChange={(v) => field("batch", String(v))}
        />

        <RelationSelect
          label={terms.field(
            "section",
            "Class section (optional)"
          )}
          source={`sections?active=true${
            value.program ? `&program=${value.program}` : ""
          }${
            value.batch ? `&batch=${value.batch}` : ""
          }`}
          value={value.section}
          onChange={(v) => field("section", String(v))}
        />
      </div>

      <details
        className="admission-suggestions"
        style={{
          marginTop: 20,
          border: "1px solid #dce8df",
          borderRadius: 12,
          padding: "14px 16px",
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Suggested course enrollments
          {value.offerings.length > 0
            ? ` (${value.offerings.length} selected)`
            : " (optional)"}
        </summary>

        <p className="muted">
          Suggestions follow the program curriculum,
          semester/year number, calendar and section.
          Select up to 100 offerings, or leave empty and
          enroll later. Changing placement clears these
          selections.
        </p>

        <div
          className="admission-fields"
          style={fieldGridStyle}
        >
          <RelationSelect
            label={terms.field(
              "term",
              "Academic term (optional)"
            )}
            source={`terms${
              value.year ? `?year=${value.year}` : ""
            }`}
            value={value.term}
            onChange={(v) =>
              field("term", String(v))
            }
          />

          <label>
            Semester / year number
            <input
              type="number"
              min="1"
              max="40"
              value={value.stage}
              onChange={(e) =>
                field("stage", e.target.value)
              }
            />
          </label>
        </div>

        <label>
          Find suggested courses
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>

        <p>{value.offerings.length} selected</p>

        {!value.program || !value.year ? (
          <p>
            Select a program and academic year to see
            suggestions.
          </p>
        ) : choices.isPending ? (
          <Loading />
        ) : choices.isError ? (
          <ErrorState error={choices.error} />
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Offering</th>
                    <th>Curriculum</th>
                  </tr>
                </thead>

                <tbody>
                  {choices.data.results.map((row) => {
                    const offeringId = String(row.id);

                    return (
                      <tr key={offeringId}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Enroll in ${row.title}`}
                            checked={value.offerings.includes(
                              offeringId
                            )}
                            disabled={
                              !value.offerings.includes(
                                offeringId
                              ) &&
                              value.offerings.length >= 100
                            }
                            onChange={(e) =>
                              onChange({
                                ...value,
                                offerings: e.target.checked
                                  ? [
                                      ...value.offerings,
                                      offeringId,
                                    ]
                                  : value.offerings.filter(
                                      (id) =>
                                        id !== offeringId
                                    ),
                              })
                            }
                          />
                        </td>
                        <td>{String(row.title)}</td>
                        <td>
                          {row.required_subject
                            ? "Required"
                            : "Elective"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!choices.data.count && (
              <p>
                No matching curriculum offerings. You can
                enroll later from Courses &amp; Enrollments.
              </p>
            )}

            <Pagination
              data={choices.data}
              page={page}
              onChange={setPage}
              label="Suggested courses"
            />
          </>
        )}
      </details>
    </>
  );
}

type Review = {
  preview: boolean;
  membership: string | null;
  replayed: boolean;
  identity: Record<string, string>;
  placement: Record<string, string | null>;
  offerings: { id: string; title: string }[];
  invitation: string;
};

export function StudentAdmission() {
  const [details, setDetails] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    student_identifier: "",
  });

  const [placement, setPlacement] = useState(empty);
  const [step, setStep] = useState(0);
  const [key] = useState(() => crypto.randomUUID());
  const [review, setReview] = useState<Review>();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);

  const client = useQueryClient();

  const saved = useQuery({
    queryKey: ["admitted-member", review?.membership],
    queryFn: () =>
      api<RecordData>(
        `memberships/${review?.membership}/`
      ),
    enabled: step === 3 && !!review?.membership,
  });

  async function submit(preview: boolean) {
    setBusy(true);
    setError(undefined);

    try {
      const data = await post<Review>("admissions/", {
        ...details,
        ...placementPayload(placement),
        key,
        preview,
      });

      setReview(data);
      setStep(preview ? 2 : 3);

      if (!preview) {
        await client.invalidateQueries();
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Add Student"
        description="Admit a learner, review their placement and enroll them in one guided workflow."
      />

      <ol
        className="admission-progress"
        aria-label="Admission progress"
      >
        {[
          "Student details",
          "Academic placement",
          "Review",
          "Created",
        ].map((label, index) => (
          <li
            aria-current={
              step === index ? "step" : undefined
            }
            key={label}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      <section className="panel padded admission-panel">
        {!!error && <ErrorState error={error} />}

        {step === 0 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(undefined);
              setStep(1);
            }}
          >
            <h2>Student details</h2>

            <div
              className="admission-fields"
              style={fieldGridStyle}
            >
              {Object.entries({
                first_name: "First name",
                last_name: "Last name",
                email: "Email",
                student_identifier:
                  "Student ID / roll number",
                username: "Username",
              }).map(([field, label]) => (
                <label key={field}>
                  {label}
                  <input
                    required
                    type={
                      field === "email" ? "email" : "text"
                    }
                    maxLength={
                      field === "student_identifier"
                        ? 64
                        : field === "email"
                          ? 254
                          : 150
                    }
                    value={
                      details[
                        field as keyof typeof details
                      ]
                    }
                    onChange={(e) =>
                      setDetails({
                        ...details,
                        [field]: e.target.value,
                      })
                    }
                  />
                </label>
              ))}
            </div>

            <p className="muted">
              The student sets their own password using a
              private invitation. Existing accounts are
              never overwritten.
            </p>

            <Button>Continue to placement</Button>
          </form>
        )}

        {step === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit(true);
            }}
          >
            <h2>Academic placement</h2>

            <PlacementFields
              value={placement}
              onChange={setPlacement}
            />

            <div className="heading-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(0)}
              >
                Back to details
              </Button>

              <Button disabled={busy}>
                {busy
                  ? "Validating…"
                  : "Review admission"}
              </Button>
            </div>
          </form>
        )}

        {step === 2 && review && (
          <>
            <h2>Review admission</h2>

            <dl className="admission-review">
              {Object.entries({
                ...review.identity,
                ...review.placement,
              }).map(([field, value]) => (
                <div key={field}>
                  <dt>
                    {field.replaceAll("_", " ")}
                  </dt>
                  <dd>{value || "Not selected"}</dd>
                </div>
              ))}
            </dl>

            <h3>
              {review.offerings.length} selected course
              enrollments
            </h3>

            {review.offerings.length ? (
              <ul>
                {review.offerings.map((course) => (
                  <li key={course.id}>
                    {course.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                Enrollment deferred. The student will have
                no course access until enrolled.
              </p>
            )}

            <p>{review.invitation}</p>

            <div className="heading-actions">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setStep(1)}
              >
                Edit placement
              </Button>

              <Button
                disabled={busy}
                onClick={() => void submit(false)}
              >
                {busy
                  ? "Creating…"
                  : "Create student and invite"}
              </Button>
            </div>
          </>
        )}

        {step === 3 && review && (
          <>
            <h2 role="status">
              Student admitted successfully
            </h2>

            <p>
              {details.first_name} {details.last_name} ·{" "}
              {details.student_identifier}
            </p>

            <p>
              {review.offerings.length} course enrollments
              saved. Placement and invitation are linked
              to the institute membership.
            </p>

            {saved.isError && (
              <ErrorState error={saved.error} />
            )}

            {saved.data && (
              <InvitationReview row={saved.data} />
            )}

            <div className="heading-actions">
              <Link
                className="text-link"
                to={`/student-placement/${review.membership}`}
              >
                View placement and history
              </Link>

              <Link
                className="text-link"
                to="/memberships?role=student"
              >
                Return to students
              </Link>
            </div>
          </>
        )}
      </section>
    </>
  );
}

export function StudentPlacement() {
  const { id } = useParams();

  const member = useQuery({
    queryKey: ["placement-member", id],
    queryFn: () =>
      api<RecordData>(`memberships/${id}/`),
  });

  if (member.isPending) {
    return <Loading />;
  }

  if (member.isError) {
    return <ErrorState error={member.error} />;
  }

  return (
    <PlacementEditor
      key={id}
      member={member.data}
    />
  );
}

function PlacementEditor({
  member,
}: {
  member: RecordData;
}) {
  const [placement, setPlacement] = useState(empty);
  const [reason, setReason] = useState("");
  const [withdraw, setWithdraw] = useState<string[]>([]);
  const [review, setReview] = useState(false);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const client = useQueryClient();

  const history = useQuery({
    queryKey: [
      "placements",
      member.id,
      historyPage,
    ],
    queryFn: () =>
      api<Page<RecordData>>(
        `memberships/${member.id}/placements/?page=${historyPage}`
      ),
  });

  const enrollments = useQuery({
    queryKey: [
      "placement-enrollments",
      member.user,
      page,
    ],
    queryFn: () =>
      api<Page<RecordData>>(
        `enrollments/?student=${member.user}&active=true&page=${page}`
      ),
  });

  const currentPlacement = history.data?.results.find(
    (row) => !row.ended_at
  );

  return (
    <>
      <PageHeader
        title={`Student placement: ${member.username}`}
        description="Transfer academic placement with an audited reason. Choose explicitly which enrollments to withdraw; prior marks and attendance are retained."
      >
        <Button variant="outline" asChild>
          <Link to="/memberships?role=student">
            Back to students
          </Link>
        </Button>
      </PageHeader>

      {status && (
        <p role="status" className="info-strip">
          {status}
        </p>
      )}

      <section className="panel padded">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={sectionHeadingStyle}>
              Current student status
            </h2>
            <p className="muted" style={{ margin: 0 }}>
              Academic membership and recorded placement
            </p>
          </div>

          <span
            className={
              member.active
                ? "status-badge"
                : "status-badge neutral"
            }
          >
            {member.active ? "Active" : "Inactive"}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
            gap: 12,
            marginTop: 20,
          }}
        >
          <div>
            <small className="muted">Student</small>
            <p style={{ marginTop: 4 }}>
              <strong>
                {String(
                  member.display_name ||
                    member.username
                )}
              </strong>
            </p>
          </div>

          <div>
            <small className="muted">Program</small>
            <p style={{ marginTop: 4 }}>
              <strong>
                {String(
                  currentPlacement?.program_label ||
                    "Not recorded"
                )}
              </strong>
            </p>
          </div>

          <div>
            <small className="muted">Batch</small>
            <p style={{ marginTop: 4 }}>
              <strong>
                {String(
                  currentPlacement?.batch_label || "—"
                )}
              </strong>
            </p>
          </div>

          <div>
            <small className="muted">Section</small>
            <p style={{ marginTop: 4 }}>
              <strong>
                {String(
                  currentPlacement?.section_label || "—"
                )}
              </strong>
            </p>
          </div>
        </div>
      </section>

      {!member.active ? (
        <section className="panel padded">
          <h2>Placement changes unavailable</h2>

          <p className="info-strip">
            This student account is inactive. Placement
            history remains available; reactivate the
            account before transferring placement.
          </p>

          <Link
            className="text-link"
            to="/memberships?role=student"
          >
            Return to People to manage access
          </Link>
        </section>
      ) : (
        <form
          className="panel padded admission-panel"
          onSubmit={async (e) => {
            e.preventDefault();

            if (!review) {
              setReview(true);
              return;
            }

            setBusy(true);
            setError(undefined);

            try {
              await post(
                `memberships/${member.id}/transfer/`,
                {
                  ...placementPayload(placement),
                  withdraw,
                  reason,
                }
              );

              setReview(false);
              setWithdraw([]);
              setReason("");

              await client.invalidateQueries();

              setStatus(
                "Placement updated. Previous placement and enrollment history preserved."
              );
            } catch (err) {
              setError(err);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ marginBottom: 6 }}>
              New academic placement
            </h2>

            <p className="muted" style={{ margin: 0 }}>
              Choose the student's new academic placement.
              Course changes are optional and must be
              selected explicitly.
            </p>
          </div>

          <PlacementFields
            value={placement}
            onChange={(value) => {
              setPlacement(value);
              setReview(false);
            }}
          />

          <div
            style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: "1px solid #e5ebe6",
            }}
          >
            <h3 style={{ marginBottom: 6 }}>
              Current enrollments
            </h3>

            <p className="muted">
              Select only the courses to withdraw. Unchecked
              courses remain enrolled. Grades, attendance,
              and enrollment history are preserved.
            </p>

            {enrollments.isPending ? (
              <Loading />
            ) : enrollments.isError ? (
              <ErrorState error={enrollments.error} />
            ) : (
              <>
                {enrollments.data.results.length === 0 ? (
                  <p className="muted">
                    No active course enrollments found on
                    this page.
                  </p>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: 8,
                      marginTop: 14,
                    }}
                  >
                    {enrollments.data.results.map(
                      (row) => {
                        const offeringId = String(
                          row.offering
                        );

                        return (
                          <label
                            key={String(row.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent:
                                "flex-start",
                              gap: 12,
                              padding: "12px 14px",
                              border:
                                "1px solid #dce8df",
                              borderRadius: 10,
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              style={{
                                width: 18,
                                height: 18,
                                flexShrink: 0,
                                margin: 0,
                              }}
                              checked={withdraw.includes(
                                offeringId
                              )}
                              onChange={(event) => {
                                setReview(false);

                                setWithdraw(
                                  event.target.checked
                                    ? [
                                        ...withdraw,
                                        offeringId,
                                      ]
                                    : withdraw.filter(
                                        (id) =>
                                          id !==
                                          offeringId
                                      )
                                );
                              }}
                            />

                            <span
                              style={{
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              <strong>
                                {String(
                                  row.offering_label
                                )}
                              </strong>

                              <span
                                className="muted"
                                style={{
                                  display: "block",
                                  fontSize: 12,
                                  marginTop: 3,
                                }}
                              >
                                Withdraw from this course
                              </span>
                            </span>
                          </label>
                        );
                      }
                    )}
                  </div>
                )}

                <Pagination
                  data={enrollments.data}
                  page={page}
                  onChange={setPage}
                  label="Current enrollments"
                />
              </>
            )}
          </div>

          <div
            style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: "1px solid #e5ebe6",
            }}
          >
            <h3 style={{ marginBottom: 8 }}>
              Transfer reason
            </h3>

            <label>
              Reason for placement change
              <textarea
                required
                minLength={5}
                maxLength={1000}
                rows={3}
                placeholder="Explain why this student's academic placement is changing..."
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setReview(false);
                }}
              />
            </label>
          </div>

          {review && (
            <div
              className="info-strip"
              style={{ marginTop: 20 }}
            >
              <strong>Review transfer:</strong>{" "}
              {withdraw.length} course withdrawals and{" "}
              {placement.offerings.length} new course
              enrollments. The previous placement remains
              in history.
            </div>
          )}

          {!!error && <ErrorState error={error} />}

          <div
            className="heading-actions"
            style={{
              marginTop: 20,
              justifyContent: "flex-end",
            }}
          >
            <Button disabled={busy}>
              {busy
                ? "Saving…"
                : review
                  ? "Confirm placement transfer"
                  : "Review placement transfer"}
            </Button>
          </div>
        </form>
      )}

      <section className="panel padded">
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ marginBottom: 6 }}>
            Placement history
          </h2>

          <p className="muted" style={{ margin: 0 }}>
            Previous academic placements and their recorded
            reasons are preserved for reference.
          </p>
        </div>

        {history.isPending ? (
          <Loading />
        ) : history.isError ? (
          <ErrorState error={history.error} />
        ) : (
          <>
            {history.data.results.length > 0 ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Program</th>
                      <th>Batch</th>
                      <th>Section</th>
                      <th>From</th>
                      <th>Status</th>
                      <th>Reason</th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.data.results.map(
                      (row) => (
                        <tr key={String(row.id)}>
                          <td>
                            {String(
                              row.program_label || "—"
                            )}
                          </td>

                          <td>
                            {String(
                              row.batch_label || "—"
                            )}
                          </td>

                          <td>
                            {String(
                              row.section_label || "—"
                            )}
                          </td>

                          <td>
                            {new Date(
                              String(row.created_at)
                            ).toLocaleDateString()}
                          </td>

                          <td>
                            <span
                              className={
                                row.ended_at
                                  ? "status-badge neutral"
                                  : "status-badge"
                              }
                            >
                              {row.ended_at
                                ? "Previous"
                                : "Current"}
                            </span>
                          </td>

                          <td>
                            {String(row.reason)}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">
                No recorded placement history yet.
                Existing section placement will be
                preserved when the first transfer is saved.
              </p>
            )}

            <Pagination
              data={history.data}
              page={historyPage}
              onChange={setHistoryPage}
              label="Placement history"
            />
          </>
        )}
      </section>
    </>
  );
}
