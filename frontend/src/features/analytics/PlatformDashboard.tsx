import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Pagination } from "../../components/ReportControls";
import {
  Empty,
  ErrorState,
  Loading,
  PageHeader,
} from "../../components/shared";
import { Button } from "../../components/ui/button";
import { api, type Page, type RecordData } from "../../lib/api";
import { useAuth } from "../auth/Auth";
import { ModelOperations } from "./platform/ModelOperations";
import {
  buildInstituteStats,
  buildPlatformStats,
  humanize,
  mutedStyle,
  panelStyle,
  SecondaryStatistics,
  StatCard,
  StatusPill,
} from "./platform/PlatformPresentation";

export type PlatformSummary = {
  institute?: RecordData;
  roles?: Record<string, number>;
  [key: string]: unknown;
};

export function PlatformDashboard() {
  const { id } = useParams();
  const { role, select } = useAuth();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<unknown>();

  const isSuperAdmin = role === "superadmin";
  const isInstituteView = Boolean(id);

  const model = useQuery({
    queryKey: ["platform-model-status"],
    queryFn: () => api<RecordData>("model-status/"),
    enabled: isSuperAdmin && !isInstituteView,
  });

  const summary = useQuery({
    queryKey: ["platform", id],
    enabled: isSuperAdmin,
    queryFn: () =>
      api<PlatformSummary>(id ? `institutes/${id}/overview/` : "platform/"),
  });

  const records = useQuery({
    queryKey: ["platform-list", id, page, isInstituteView ? "" : search],
    enabled: isSuperAdmin,
    placeholderData: keepPreviousData,
    queryFn: () =>
      api<Page<RecordData>>(
        id
          ? `institutes/${id}/administrators/?page=${page}`
          : `institutes/?page=${page}&search=${encodeURIComponent(search)}`,
      ),
  });

  if (!isSuperAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  const instituteName = id
    ? String(summary.data?.institute?.name || "Institute details")
    : "";

  const platformStats =
    !isInstituteView && summary.data ? buildPlatformStats(summary.data) : null;

  const instituteStats =
    isInstituteView && summary.data ? buildInstituteStats(summary.data) : [];

  const instituteActive = summary.data?.institute?.active === true;

  const instituteStatusKnown =
    typeof summary.data?.institute?.active === "boolean";

  async function manageAdministrators() {
    if (!id || !instituteActive) return;

    setError(undefined);

    try {
      await select(id);
      navigate("/memberships");
    } catch (err) {
      setError(err);
    }
  }

  return (
    <>
      <PageHeader
        title={isInstituteView ? instituteName : "Platform overview"}
        description={
          isInstituteView
            ? "Review institution details, membership totals, and administrator accounts."
            : "Monitor institutions and manage platform administration."
        }
      >
        {isInstituteView && (
          <Button asChild variant="outline">
            <Link to="/platform">
              <ArrowLeft size={16} aria-hidden="true" />
              Platform overview
            </Link>
          </Button>
        )}

        <Button asChild variant="outline">
          <Link to="/institutes">
            <Building2 size={16} aria-hidden="true" />
            Manage institutes
          </Link>
        </Button>

        <Button asChild variant="outline">
          <Link to="/platform-users">
            <ShieldCheck size={16} aria-hidden="true" />
            Institute administrators
          </Link>
        </Button>
      </PageHeader>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          paddingBottom: 30,
        }}
      >
        {isInstituteView && summary.data?.institute && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              padding: "14px 18px",
              border: "1px solid #dce8df",
              borderRadius: 12,
              background: "#f7faf7",
            }}
          >
            <Building2 size={19} color="#176447" aria-hidden="true" />

            <strong
              style={{
                color: "#173c2d",
                fontSize: 13,
              }}
            >
              {humanize(summary.data.institute.kind || "Institution")}
            </strong>

            <StatusPill
              active={instituteStatusKnown ? instituteActive : null}
            />

            <span
              style={{
                ...mutedStyle,
                marginLeft: "auto",
              }}
            >
              Institution status
            </span>
          </div>
        )}

        <section
          aria-label={
            isInstituteView ? "Institution statistics" : "Platform statistics"
          }
        >
          {summary.isPending ? (
            <Loading />
          ) : summary.isError ? (
            <ErrorState error={summary.error} />
          ) : isInstituteView ? (
            instituteStats.length ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
                  gap: 15,
                }}
              >
                {instituteStats.map((item) => (
                  <StatCard key={item.key} item={item} />
                ))}
              </div>
            ) : (
              <div
                style={{
                  ...panelStyle,
                  padding: 20,
                }}
              >
                <p className="muted" style={{ margin: 0 }}>
                  No institution statistics are currently available.
                </p>
              </div>
            )
          ) : platformStats ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 15,
              }}
              className="platform-primary-stats"
            >
              {platformStats.primary.map((item) => (
                <StatCard key={item.key} item={item} />
              ))}
            </div>
          ) : null}
        </section>

        {!isInstituteView && platformStats && !summary.isError && (
          <SecondaryStatistics items={platformStats.secondary} />
        )}

        {isInstituteView && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Button
              disabled={
                !instituteActive || summary.isPending || summary.isError
              }
              onClick={() => void manageAdministrators()}
            >
              <ShieldCheck size={16} aria-hidden="true" />
              Manage institute administrators
              <ArrowRight size={16} aria-hidden="true" />
            </Button>

            {!instituteActive && !summary.isPending && !summary.isError && (
              <span className="muted" style={{ fontSize: 12 }}>
                Administrator management requires an active institution.
              </span>
            )}
          </div>
        )}

        {!!error && <ErrorState error={error} />}

        <section style={panelStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
              padding: "20px 24px",
              borderBottom: "1px solid #edf1ed",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  color: "#173c2d",
                }}
              >
                {isInstituteView ? "Institute administrators" : "Institutions"}
              </h2>

              <p
                style={{
                  ...mutedStyle,
                  margin: "6px 0 0",
                }}
              >
                {isInstituteView
                  ? "Administrative accounts associated with this institution."
                  : "Browse and review registered institutions."}
              </p>
            </div>

            {!isInstituteView && (
              <Button asChild variant="outline">
                <Link to="/institutes">
                  Manage institutes
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </Button>
            )}
          </div>

          {!isInstituteView && (
            <div
              style={{
                padding: "15px 24px",
                borderBottom: "1px solid #edf1ed",
              }}
            >
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  maxWidth: 420,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#29483a",
                }}
              >
                Search institutions
                <div
                  style={{
                    position: "relative",
                  }}
                >
                  <Search
                    size={17}
                    color="#718378"
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: 13,
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                    }}
                  />

                  <input
                    type="search"
                    value={search}
                    placeholder="Search by institution name..."
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      height: 44,
                      padding: "10px 12px 10px 40px",
                      boxSizing: "border-box",
                      border: "1px solid #d3e2d7",
                      borderRadius: 10,
                      background: "#ffffff",
                      color: "#173c2d",
                      fontSize: 13,
                    }}
                  />
                </div>
              </label>
            </div>
          )}

          <div style={{ padding: "0 24px" }}>
            {records.isPending ? (
              <div style={{ padding: "24px 0" }}>
                <Loading />
              </div>
            ) : records.isError ? (
              <div style={{ padding: "24px 0" }}>
                <ErrorState error={records.error} />
              </div>
            ) : !records.data.results.length ? (
              <div style={{ padding: "24px 0" }}>
                <Empty />
              </div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>
                        {isInstituteView ? "Administrator" : "Institution"}
                      </th>

                      <th>{isInstituteView ? "Email address" : "Category"}</th>

                      <th>Status</th>

                      {!isInstituteView && (
                        <th
                          style={{
                            textAlign: "right",
                          }}
                        >
                          Details
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {records.data.results.map((row) => {
                      const active =
                        typeof row.active === "boolean" ? row.active : null;

                      return (
                        <tr key={String(row.id)}>
                          <td>
                            {isInstituteView ? (
                              <strong
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                }}
                              >
                                {String(
                                  row.username || row.name || "Administrator",
                                )}
                              </strong>
                            ) : (
                              <Link
                                className="text-link"
                                to={`/institutes/${row.id}`}
                                style={{
                                  fontWeight: 600,
                                }}
                              >
                                {String(row.name || "Unnamed institution")}
                              </Link>
                            )}
                          </td>

                          <td>
                            {isInstituteView
                              ? String(row.email || "—")
                              : humanize(row.kind || "Not specified")}
                          </td>

                          <td>
                            <StatusPill active={active} />
                          </td>

                          {!isInstituteView && (
                            <td
                              style={{
                                textAlign: "right",
                              }}
                            >
                              <Link
                                className="text-link"
                                to={`/institutes/${row.id}`}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                View
                                <ArrowRight size={14} aria-hidden="true" />
                              </Link>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div
            style={{
              padding: "14px 24px",
              borderTop: "1px solid #edf1ed",
            }}
          >
            <Pagination
              data={records.data}
              page={page}
              onChange={setPage}
              label={isInstituteView ? "Administrators" : "Institutions"}
            />
          </div>
        </section>

        {!isInstituteView && <ModelOperations model={model} />}
      </div>

      <style>
        {`
          @media (max-width: 1150px) {
            .platform-primary-stats {
              grid-template-columns:
                repeat(2, minmax(0, 1fr)) !important;
            }
          }

          @media (max-width: 620px) {
            .platform-primary-stats {
              grid-template-columns:
                minmax(0, 1fr) !important;
            }
          }
        `}
      </style>
    </>
  );
}
