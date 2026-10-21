import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Search } from "lucide-react";
import { useState } from "react";
import { Pagination } from "../../../components/ReportControls";
import { ErrorState, Loading, PageHeader } from "../../../components/shared";
import { Button } from "../../../components/ui/button";
import { api, type Page, type RecordData } from "../../../lib/api";
import { Decision } from "./CorrectionDecision";
import {
  humanize,
  readable,
  StatusBadge,
  statusOptions,
} from "./CorrectionPresentation";

export function AcademicReviews() {
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<RecordData>();
  const query = useQuery({
    queryKey: ["academic-reviews", status, page],
    queryFn: () =>
      api<Page<RecordData>>(
        `corrections/?status=${encodeURIComponent(status)}&page=${page}`,
      ),
  });
  const count = query.data?.count ?? 0;
  return (
    <>
      <PageHeader
        title="Grade & Attendance Corrections"
        description="Review and track requests to correct recorded grades and attendance. Teachers can follow requests for their assigned courses."
      />
      <section
        className="panel padded"
        style={{
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 19,
                color: "#173e2d",
              }}
            >
              Correction requests
            </h2>
            <p
              className="muted"
              style={{
                margin: "7px 0 0",
                fontSize: 13,
              }}
            >
              Review requests and track their decisions.
            </p>
          </div>
          {!query.isPending && !query.isError && (
            <span className="count-badge">
              {count.toLocaleString()} {count === 1 ? "request" : "requests"}
            </span>
          )}
        </div>
        <div
          style={{
            display: "flex",
            gap: 9,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
          role="group"
          aria-label="Filter correction requests by status"
        >
          {statusOptions.map((option) => {
            const active = status === option.value;
            return (
              <Button
                key={option.value}
                variant={active ? "default" : "outline"}
                onClick={() => {
                  setStatus(option.value);
                  setPage(1);
                }}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState error={query.error} />
        ) : !query.data.results.length ? (
          <div
            style={{
              padding: "35px 18px",
              textAlign: "center",
              border: "1px dashed #d9e6dc",
              borderRadius: 12,
              background: "#fbfdfb",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "#eaf6ee",
                color: "#176348",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 15px",
              }}
            >
              {status === "pending" ? (
                <CheckCircle2 size={23} />
              ) : (
                <Search size={23} />
              )}
            </div>
            <h3
              style={{
                margin: "0 0 8px",
                color: "#173e2d",
                fontSize: 16,
              }}
            >
              {status === "pending"
                ? "No pending corrections"
                : status === "approved"
                  ? "No approved corrections"
                  : status === "rejected"
                    ? "No rejected corrections"
                    : "No correction requests yet"}
            </h3>
            <p
              className="muted"
              style={{
                margin: "0 auto",
                maxWidth: 440,
                lineHeight: 1.7,
                fontSize: 13,
              }}
            >
              {status === "pending"
                ? "There are currently no correction requests awaiting review in your authorized scope."
                : status === "approved"
                  ? "Approved correction requests will appear here."
                  : status === "rejected"
                    ? "Rejected correction requests will appear here."
                    : "Requests created through academic record controls will appear here."}
            </p>
            {status !== "" && (
              <div style={{ marginTop: 17 }}>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatus("");
                    setPage(1);
                  }}
                >
                  View all requests
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Record</th>
                  <th>Requester</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {query.data.results.map((row) => (
                  <tr key={String(row.id)}>
                    <td>
                      <strong>{readable(row.offering_label)}</strong>
                    </td>
                    <td>{humanize(row.kind)}</td>
                    <td>{readable(row.requester_label)}</td>
                    <td
                      style={{
                        maxWidth: 320,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {readable(row.reason)}
                    </td>
                    <td>
                      <StatusBadge
                        status={row.status}
                        emergency={!!row.emergency}
                      />
                    </td>
                    <td>
                      <Button
                        variant="outline"
                        onClick={() => setSelected(row)}
                      >
                        {row.status === "pending"
                          ? "Review request"
                          : "View details"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!query.isPending && !query.isError && (
          <div style={{ marginTop: 20 }}>
            <Pagination
              data={query.data}
              page={page}
              onChange={setPage}
              label="Correction requests"
            />
          </div>
        )}
      </section>
      {selected && (
        <Decision
          key={String(selected.id)}
          row={selected}
          onClose={() => setSelected(undefined)}
        />
      )}
    </>
  );
}
