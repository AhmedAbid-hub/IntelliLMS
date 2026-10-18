

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

      <section
        className="panel appointment-panel"
        style={{ padding: "20px 24px", marginBottom: "20px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              aria-hidden="true"
              style={{
                display: "grid",
                placeItems: "center",
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "#e7f3eb",
                color: "#176348",
                flexShrink: 0,
              }}
            >
              <UserRoundCheck size={21} />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: "19px", lineHeight: 1.3 }}>
                {isHead ? "Manage teacher appointments" : "Teaching staff management"}
              </h2>
              <p style={{ margin: "5px 0 0", fontSize: "13px", lineHeight: 1.5 }}>
                {isHead
                  ? "Appoint eligible teachers to your department or end existing appointments."
                  : "Provision eligible accounts and review departmental teaching appointments."}
              </p>
            </div>
          </div>
        </div>

        <div
          aria-label="Teacher appointment workflow"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px 12px",
            padding: "11px 14px",
            borderRadius: "12px",
            background: "#f3f8f4",
            border: "1px solid #e0ebe2",
            color: "#345d4d",
            fontSize: "12px",
            marginBottom: "16px",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Users size={15} aria-hidden="true" /> Account provisioning
          </span>
          <ArrowRight size={14} aria-hidden="true" />
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <UserRoundCheck size={15} aria-hidden="true" /> Department appointment
          </span>
          <ArrowRight size={14} aria-hidden="true" />
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <BookOpen size={15} aria-hidden="true" /> Course assignment
          </span>
        </div>

        <div
          className="appointment-actions"
          style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "end" }}
        >
          {isHead ? (
            <div className="appointment-create" style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: "10px" }}>
              <div className="appointment-create-field" style={{ minWidth: "220px", flex: "1 1 220px" }}>
                <RelationSelect
                  source="teacher-appointments/candidates"
                  valueKey="id"
                  label="Eligible teacher"
                  value={member}
                  onChange={(value) => setMember(String(value))}
                />
              </div>
              <Button disabled={!member || !unit} onClick={openAppointmentReview}>
                <UserRoundCheck size={17} /> Review appointment
              </Button>
            </div>
          ) : (
            <Button asChild variant="outline">
              <Link to="/memberships">
                <Users size={17} /> Manage accounts and eligibility <ArrowRight size={15} />
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/offerings">
              <BookOpen size={17} /> Course teaching assignments <ArrowRight size={15} />
            </Link>
          </Button>
        </div>

        {message && (
          <div className="appointment-success" role="status" style={{ marginTop: "14px" }}>
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>{message}</span>
          </div>
        )}
      </section>

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
