import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Pagination } from "../../components/ReportControls";
import { ErrorState, Loading, PageHeader } from "../../components/shared";
import { Button } from "../../components/ui/button";
import { api, post, type Page, type RecordData } from "../../lib/api";
import { useInstitution } from "../../lib/institution";
import { useTerminology } from "../../lib/terminology";
import { AcademicDecisions } from "../analytics/AcademicDecisions";
import { AcademicResults } from "../analytics/AcademicResults";
import { StudentProgression } from "./StudentProgression";
import {
  empty,
  PlacementFields,
  placementPayload,
  sectionHeadingStyle,
} from "./admission/PlacementFields";

export function StudentPlacement() {
  const { id } = useParams();

  const member = useQuery({
    queryKey: ["placement-member", id],
    queryFn: () => api<RecordData>(`memberships/${id}/`),
  });

  if (member.isPending) {
    return <Loading />;
  }

  if (member.isError) {
    return <ErrorState error={member.error} />;
  }

  return <PlacementEditor key={id} member={member.data} />;
}

export function PlacementEditor({ member }: { member: RecordData }) {
  const terms = useTerminology();
  const institution = useInstitution();
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

  const firstPlacements = useQuery({
    queryKey: ["placements", member.id, 1],
    queryFn: () =>
      api<Page<RecordData>>(`memberships/${member.id}/placements/?page=1`),
  });

  const history = useQuery({
    queryKey: ["placements", member.id, historyPage],
    queryFn: () =>
      api<Page<RecordData>>(
        `memberships/${member.id}/placements/?page=${historyPage}`,
      ),
  });

  const enrollments = useQuery({
    queryKey: ["placement-enrollments", member.user, page],
    queryFn: () =>
      api<Page<RecordData>>(
        `enrollments/?student=${member.user}&active=true&page=${page}`,
      ),
  });

  const currentPlacement = firstPlacements.data?.results.find(
    (row) => !row.ended_at,
  );

  return (
    <>
      <PageHeader
        title={`Student placement: ${member.username}`}
        description="Transfer academic placement with an audited reason. Choose explicitly which enrollments to withdraw; prior marks and attendance are retained."
      >
        <Button variant="outline" asChild>
          <Link to="/memberships?role=student">Back to students</Link>
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
            <h2 style={sectionHeadingStyle}>Current student status</h2>
            <p className="muted" style={{ margin: 0 }}>
              Academic membership and recorded placement
            </p>
          </div>

          <span
            className={member.active ? "status-badge" : "status-badge neutral"}
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
              <strong>{String(member.display_name || member.username)}</strong>
            </p>
          </div>

          <div>
            <small className="muted">{terms.label("program")}</small>
            <p style={{ marginTop: 4 }}>
              <strong>
                {String(currentPlacement?.program_label || "Not recorded")}
              </strong>
            </p>
          </div>

          {institution.kind !== "school" && (
            <div>
              <small className="muted">Batch</small>
              <p style={{ marginTop: 4 }}>
                <strong>{String(currentPlacement?.batch_label || "—")}</strong>
              </p>
            </div>
          )}

          <div>
            <small className="muted">{terms.label("section")}</small>
            <p style={{ marginTop: 4 }}>
              <strong>{String(currentPlacement?.section_label || "—")}</strong>
            </p>
          </div>
        </div>
      </section>

      <StudentProgression
        member={member}
        current={currentPlacement}
        renderPlacement={(value, onChange) => (
          <PlacementFields value={value} onChange={onChange} />
        )}
      />
      <AcademicResults member={String(member.id)} />
      <AcademicDecisions member={String(member.id)} />
      {!member.active ? (
        <section className="panel padded">
          <h2>Placement changes unavailable</h2>

          <p className="info-strip">
            This student account is inactive. Placement history remains
            available; reactivate the account before transferring placement.
          </p>

          <Link className="text-link" to="/memberships?role=student">
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
              await post(`memberships/${member.id}/transfer/`, {
                ...placementPayload(placement),
                withdraw,
                reason,
              });

              setReview(false);
              setWithdraw([]);
              setReason("");

              await client.invalidateQueries();

              setStatus(
                "Placement updated. Previous placement and enrollment history preserved.",
              );
            } catch (err) {
              setError(err);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ marginBottom: 6 }}>New academic placement</h2>

            <p className="muted" style={{ margin: 0 }}>
              Choose the student's new academic placement. Course changes are
              optional and must be selected explicitly.
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
            <h3 style={{ marginBottom: 6 }}>Current enrollments</h3>

            <p className="muted">
              Select only the courses to withdraw. Unchecked courses remain
              enrolled. Grades, attendance, and enrollment history are
              preserved.
            </p>

            {enrollments.isPending ? (
              <Loading />
            ) : enrollments.isError ? (
              <ErrorState error={enrollments.error} />
            ) : (
              <>
                {enrollments.data.results.length === 0 ? (
                  <p className="muted">
                    No active course enrollments found on this page.
                  </p>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: 8,
                      marginTop: 14,
                    }}
                  >
                    {enrollments.data.results.map((row) => {
                      const offeringId = String(row.offering);

                      return (
                        <label
                          key={String(row.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            gap: 12,
                            padding: "12px 14px",
                            border: "1px solid #dce8df",
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
                            checked={withdraw.includes(offeringId)}
                            onChange={(event) => {
                              setReview(false);

                              setWithdraw(
                                event.target.checked
                                  ? [...withdraw, offeringId]
                                  : withdraw.filter((id) => id !== offeringId),
                              );
                            }}
                          />

                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            <strong>{String(row.offering_label)}</strong>

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
                    })}
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
            <h3 style={{ marginBottom: 8 }}>Transfer reason</h3>

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
            <div className="info-strip" style={{ marginTop: 20 }}>
              <strong>Review transfer:</strong> {withdraw.length} course
              withdrawals and {placement.offerings.length} new course
              enrollments. The previous placement remains in history.
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
          <h2 style={{ marginBottom: 6 }}>Placement history</h2>

          <p className="muted" style={{ margin: 0 }}>
            Previous academic placements and their recorded reasons are
            preserved for reference.
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
                      <th>{terms.label("program")}</th>
                      {institution.kind !== "school" && <th>Batch</th>}
                      <th>{terms.label("section")}</th>
                      <th>
                        {terms.label("year")} / {terms.label("term")}
                      </th>
                      {institution.kind !== "school" && (
                        <th>
                          {institution.structure === "annual"
                            ? "Study year"
                            : "Semester number"}
                        </th>
                      )}
                      <th>From</th>
                      <th>Status</th>
                      <th>Reason</th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.data.results.map((row) => (
                      <tr key={String(row.id)}>
                        <td>{String(row.program_label || "—")}</td>

                        {institution.kind !== "school" && (
                          <td>{String(row.batch_label || "—")}</td>
                        )}

                        <td>{String(row.section_label || "—")}</td>
                        <td>
                          {String(row.year_label || "Unknown legacy year")} /{" "}
                          {String(row.term_label || "No period recorded")}
                        </td>
                        {institution.kind !== "school" && (
                          <td>{String(row.stage || "Not recorded")}</td>
                        )}

                        <td>
                          {new Date(
                            String(row.created_at),
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
                            {row.ended_at ? "Previous" : "Current"}
                          </span>
                        </td>

                        <td>{String(row.reason)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">
                No recorded placement history yet. Existing section placement
                will be preserved when the first transfer is saved.
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
