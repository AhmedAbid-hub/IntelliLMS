
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Search,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from "lucide-react";

import {
  api,
  post,
  type Page,
  type RecordData,
} from "../../lib/api";

import { useAuth } from "../auth/Auth";
import {
  PageHeader,
  Loading,
  ErrorState,
  Empty,
} from "../../components/shared";

import { RelationSelect } from "../../components/RelationSelect";
import { Pagination } from "../../components/ReportControls";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";

export function TeacherAppointments() {
  const { user, role } = useAuth();

  const unit = user?.memberships.find(
    (membership) =>
      membership.institute_id === user.institute_id
  )?.unit_id;

  const [member, setMember] = useState("");
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);

  const [review, setReview] = useState<
    RecordData | "appoint"
  >();

  const [message, setMessage] = useState("");

  const client = useQueryClient();

  const isHead = role === "head";

  const query = useQuery({
    queryKey: [
      "teacher-appointments",
      page,
      search,
    ],
    queryFn: () =>
      api<Page<RecordData>>(
        `teacher-appointments/?page=${page}&search=${encodeURIComponent(
          search
        )}`
      ),
  });

  const openAppointmentReview = () => {
    setReason("");
    setError(undefined);
    setMessage("");
    setReview("appoint");
  };

  const openWithdrawalReview = (row: RecordData) => {
    setReason("");
    setError(undefined);
    setMessage("");
    setReview(row);
  };

  const closeReview = () => {
    if (busy) return;

    setReview(undefined);
    setError(undefined);
  };

  const submitAppointment = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!review || busy) return;

    setBusy(true);
    setError(undefined);

    try {
      if (review === "appoint") {
        await post("teacher-appointments/", {
          membership: member,
          unit,
          reason,
        });
      } else {
        await post(
          `teacher-appointments/${review.id}/withdraw/`,
          { reason }
        );
      }

      await client.invalidateQueries();

      setReview(undefined);
      setMember("");
      setReason("");

      setMessage(
        "Departmental appointment updated. Historical records preserved."
      );
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Teacher appointments"
        description="Manage departmental teaching appointments while keeping account provisioning and course assignments separate."
      />

      {/* ==================================================
          APPOINTMENT MANAGEMENT
          ================================================== */}

      <section className="panel appointment-panel">
        <div className="appointment-intro">
          <div className="appointment-intro-icon">
            <UserRoundCheck
              size={24}
              aria-hidden="true"
            />
          </div>

          <div className="appointment-intro-content">
            <span className="appointment-eyebrow">
              ACADEMIC STAFF MANAGEMENT
            </span>

            <h2>
              {isHead
                ? "Appoint an eligible teacher"
                : "Departmental teaching appointments"}
            </h2>

            <p>
              Institute Admin provisions accounts and
              authorizes eligible departments. The
              Department Head appoints teachers and then
              assigns their courses. Ending an appointment
              preserves the account and academic history.
            </p>
          </div>
        </div>

        {/* WORKFLOW */}

        <div className="appointment-workflow">
          <div className="appointment-workflow-step">
            <div className="appointment-step-icon">
              <Users
                size={19}
                aria-hidden="true"
              />
            </div>

            <div>
              <span>STEP 01</span>
              <strong>Account provisioning</strong>
              <small>
                Institute administrator
              </small>
            </div>
          </div>

          <ArrowRight
            className="appointment-workflow-arrow"
            size={17}
            aria-hidden="true"
          />

          <div className="appointment-workflow-step">
            <div className="appointment-step-icon">
              <UserRoundCheck
                size={19}
                aria-hidden="true"
              />
            </div>

            <div>
              <span>STEP 02</span>
              <strong>
                Department appointment
              </strong>
              <small>
                Department head
              </small>
            </div>
          </div>

          <ArrowRight
            className="appointment-workflow-arrow"
            size={17}
            aria-hidden="true"
          />

          <div className="appointment-workflow-step">
            <div className="appointment-step-icon">
              <BookOpen
                size={19}
                aria-hidden="true"
              />
            </div>

            <div>
              <span>STEP 03</span>
              <strong>Course assignment</strong>
              <small>
                Department head
              </small>
            </div>
          </div>
        </div>

        {/* ROLE-SPECIFIC ACTIONS */}

        <div className="appointment-actions">
          {isHead ? (
            <div className="appointment-create">
              <div className="appointment-create-field">
                <RelationSelect
                  source="teacher-appointments/candidates"
                  valueKey="id"
                  label="Eligible teacher"
                  value={member}
                  onChange={(value) =>
                    setMember(String(value))
                  }
                />
              </div>

              <Button
                disabled={!member || !unit}
                onClick={openAppointmentReview}
              >
                <UserRoundCheck size={17} />
                Review appointment
              </Button>
            </div>
          ) : (
            <Button asChild variant="outline">
              <Link to="/memberships">
                <Users size={17} />
                Manage accounts and eligibility
                <ArrowRight size={15} />
              </Link>
            </Button>
          )}

          <Button asChild variant="outline">
            <Link to="/offerings">
              <BookOpen size={17} />
              Course teaching assignments
              <ArrowRight size={15} />
            </Link>
          </Button>
        </div>

        {message && (
          <div
            className="appointment-success"
            role="status"
          >
            <CheckCircle2
              size={18}
              aria-hidden="true"
            />

            <span>{message}</span>
          </div>
        )}
      </section>

      {/* ==================================================
          APPOINTMENTS TABLE
          ================================================== */}

      <section className="panel appointment-list-panel">
        <div className="appointment-list-header">
          <div>
            <h2>Appointment records</h2>

            <p>
              Review current and historical departmental
              teaching appointments.
            </p>
          </div>

          <span className="appointment-record-label">
            <ClipboardCheck
              size={16}
              aria-hidden="true"
            />
            Department records
          </span>
        </div>

        {/* SEARCH */}

        <div className="appointment-toolbar">
          <label className="appointment-search">
            <span>
              <Search
                size={15}
                aria-hidden="true"
              />
              Search appointed teachers
            </span>

            <input
              type="search"
              placeholder="Search by teacher name"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>

        {/* DATA */}

        {query.isPending ? (
          <div className="appointment-state">
            <Loading />
          </div>
        ) : query.isError ? (
          <div className="appointment-state">
            <ErrorState error={query.error} />
          </div>
        ) : (
          <>
            {!query.data.results.length ? (
              <div className="appointment-state">
                <Empty>
                  No departmental appointments match
                  the current search.
                </Empty>
              </div>
            ) : (
              <div className="table-scroll appointment-table">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">
                        Teacher
                      </th>
                      <th scope="col">
                        Department
                      </th>
                      <th scope="col">
                        Status
                      </th>
                      <th scope="col">
                        Reason
                      </th>
                      {isHead && (
                        <th scope="col">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {query.data.results.map((row) => (
                      <tr key={String(row.id)}>
                        <td className="primary-cell">
                          {String(row.teacher ?? "—")}
                        </td>

                        <td>
                          {String(
                            row.unit_label ?? "—"
                          )}
                        </td>

                        <td>
                          <span
                            className={
                              row.active
                                ? "appointment-status appointment-status-active"
                                : "appointment-status appointment-status-ended"
                            }
                          >
                            <span
                              className="appointment-status-dot"
                              aria-hidden="true"
                            />

                            {row.active
                              ? "Appointed"
                              : "Ended"}
                          </span>
                        </td>

                        <td className="appointment-reason">
                          {row.reason
                            ? String(row.reason)
                            : "—"}
                        </td>

                        {isHead && (
                          <td>
                            {!!row.active && (
                              <Button
                                variant="outline"
                                onClick={() =>
                                  openWithdrawalReview(row)
                                }
                              >
                                End appointment
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="appointment-pagination">
              <Pagination
                label="Appointments"
                data={query.data}
                page={page}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </section>

      {/* ==================================================
          CONFIRMATION DIALOG
          ================================================== */}

      <Dialog
        open={!!review}
        onOpenChange={(open) => {
          if (!open) closeReview();
        }}
        title={
          review === "appoint"
            ? "Review teacher appointment"
            : "End departmental appointment"
        }
      >
        <div className="appointment-dialog-info">
          <ShieldCheck
            size={19}
            aria-hidden="true"
          />

          <p>
            {review === "appoint"
              ? "This appoints the eligible account to your department. Course assignments are made separately; login credentials and other memberships remain unchanged."
              : "Reassign or unassign this teacher’s active departmental courses first. The account, past grades and attendance are retained."}
          </p>
        </div>

        <form
          className="appointment-dialog-form"
          onSubmit={submitAppointment}
        >
          <label>
            Appointment reason

            <textarea
              required
              minLength={5}
              maxLength={1000}
              rows={4}
              placeholder="Enter the reason for this appointment change..."
              value={reason}
              onChange={(event) =>
                setReason(event.target.value)
              }
              disabled={busy}
            />
          </label>

          {!!error && (
            <ErrorState error={error} />
          )}

          <div className="appointment-dialog-actions">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={closeReview}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={busy}
            >
              {busy
                ? "Saving appointment…"
                : "Confirm appointment change"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
