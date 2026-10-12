import { useState, type CSSProperties } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  keepPreviousData,
  useQuery,
} from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Database,
  FlaskConical,
  GraduationCap,
  Layers3,
  Search,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";

import {
  api,
  type Page,
  type RecordData,
} from "../../lib/api";
import { useAuth } from "../auth/Auth";
import {
  Loading,
  ErrorState,
  PageHeader,
  Empty,
} from "../../components/shared";
import { Pagination } from "../../components/ReportControls";
import { Button } from "../../components/ui/button";

type PlatformSummary = {
  institute?: RecordData;
  roles?: Record<string, number>;
  [key: string]: unknown;
};

type StatItem = {
  key: string;
  label: string;
  value: number | string;
  description: string;
  icon: typeof Building2;
  tone?: "green" | "amber" | "neutral";
};

const panelStyle: CSSProperties = {
  border: "1px solid #dce8df",
  borderRadius: 14,
  background: "#ffffff",
  boxShadow: "0 2px 10px rgba(20, 54, 37, 0.025)",
  overflow: "hidden",
};

const mutedStyle: CSSProperties = {
  color: "#718378",
  fontSize: 13,
  lineHeight: 1.6,
};

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim() !== "" &&
    Number.isFinite(Number(value))
  ) {
    return Number(value);
  }

  return undefined;
}

function readNumber(
  source: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const result = numberValue(source[key]);

    if (result !== undefined) {
      return result;
    }
  }

  return undefined;
}

function humanize(value: unknown): string {
  return String(value ?? "")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function readableStatus(value: unknown): string {
  if (value === true) return "Active";
  if (value === false) return "Inactive";

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Unknown";
  }

  return humanize(value);
}

function StatusPill({
  active,
}: {
  active: boolean | null;
}) {
  const unknown = active === null;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 999,
        background: unknown
          ? "#f2f4f2"
          : active
            ? "#eaf7ee"
            : "#fff3e7",
        color: unknown
          ? "#65756b"
          : active
            ? "#176447"
            : "#9a6225",
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {unknown ? (
        <Activity size={13} aria-hidden="true" />
      ) : active ? (
        <CheckCircle2 size={13} aria-hidden="true" />
      ) : (
        <XCircle size={13} aria-hidden="true" />
      )}

      {unknown
        ? "Unknown"
        : active
          ? "Active"
          : "Inactive"}
    </span>
  );
}

function StatCard({
  item,
}: {
  item: StatItem;
}) {
  const Icon = item.icon;
  const tone = item.tone ?? "green";

  const background =
    tone === "amber"
      ? "#fff4e5"
      : tone === "neutral"
        ? "#eef2ef"
        : "#e8f4ec";

  const color =
    tone === "amber"
      ? "#986522"
      : tone === "neutral"
        ? "#526b5d"
        : "#176447";

  return (
    <div
      className="stat-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minWidth: 0,
        minHeight: 150,
        padding: "19px 21px",
        border: "1px solid #dce8df",
        borderRadius: 14,
        background: "#ffffff",
        boxShadow:
          "0 2px 10px rgba(20, 54, 37, 0.025)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#536b5c",
            lineHeight: 1.5,
            textTransform: "none",
          }}
        >
          {item.label}
        </span>

        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 10,
            background,
            color,
            flexShrink: 0,
          }}
        >
          <Icon size={18} aria-hidden="true" />
        </span>
      </div>

      <strong
        style={{
          display: "block",
          fontSize:
            typeof item.value === "string" &&
            item.value.length > 8
              ? 19
              : 30,
          fontWeight: 750,
          lineHeight: 1.15,
          color: "#123e2c",
          fontVariantNumeric: "tabular-nums",
          overflowWrap: "anywhere",
        }}
      >
        {typeof item.value === "number"
          ? item.value.toLocaleString()
          : item.value}
      </strong>

      <span
        style={{
          ...mutedStyle,
          fontSize: 12,
          marginTop: "auto",
        }}
      >
        {item.description}
      </span>
    </div>
  );
}

function buildPlatformStats(
  data: PlatformSummary,
): {
  primary: StatItem[];
  secondary: StatItem[];
} {
  const total = readNumber(data, [
    "institutes",
    "total_institutes",
    "institute_count",
  ]);

  const active = readNumber(data, [
    "active_institutes",
    "institutes_active",
  ]);

  const inactive = readNumber(data, [
    "inactive_institutes",
    "institutes_inactive",
  ]);

  const administrators = readNumber(data, [
    "institute_administrators",
    "institute_admins",
    "admin_accounts",
    "administrators",
  ]);

  const resolvedInactive =
    inactive !== undefined
      ? inactive
      : total !== undefined && active !== undefined
        ? Math.max(0, total - active)
        : undefined;

  const primary: StatItem[] = [
    {
      key: "institutes",
      label: "Total institutions",
      value: total ?? "—",
      description: "Registered institutions",
      icon: Building2,
    },
    {
      key: "active",
      label: "Active institutions",
      value: active ?? "—",
      description: "Institutions currently enabled",
      icon: CheckCircle2,
    },
    {
      key: "inactive",
      label: "Inactive institutions",
      value: resolvedInactive ?? "—",
      description: "Institutions currently disabled",
      icon: XCircle,
      tone: "amber",
    },
    {
      key: "administrators",
      label: "Institute administrators",
      value: administrators ?? "—",
      description:
        administrators === undefined
          ? "Count not available from the platform API"
          : "Administrative accounts across institutions",
      icon: ShieldCheck,
    },
  ];

  const secondary: StatItem[] = [];

  const users = readNumber(data, [
    "users",
    "total_users",
  ]);

  const memberships = readNumber(data, [
    "memberships",
    "total_memberships",
  ]);

  if (users !== undefined) {
    secondary.push({
      key: "users",
      label: "Total user accounts",
      value: users,
      description: "All account types across the platform",
      icon: Users,
      tone: "neutral",
    });
  }

  if (memberships !== undefined) {
    secondary.push({
      key: "memberships",
      label: "Institute memberships",
      value: memberships,
      description: "Recorded institution memberships",
      icon: Layers3,
      tone: "neutral",
    });
  }

  return { primary, secondary };
}

function buildInstituteStats(
  data: PlatformSummary,
): StatItem[] {
  const items: StatItem[] = [];
  const roles = data.roles ?? {};

  const roleIcons: Record<string, typeof Users> = {
    admin: ShieldCheck,
    institute_admin: ShieldCheck,
    teacher: GraduationCap,
    student: Users,
    head: Users,
  };

  const labels: Record<string, string> = {
    admin: "Administrators",
    institute_admin: "Administrators",
    head: "Department heads",
    teacher: "Teachers",
    student: "Students",
  };

  for (const [key, value] of Object.entries(roles)) {
    const count = numberValue(value);

    if (count === undefined) continue;

    items.push({
      key: `role-${key}`,
      label: labels[key] || humanize(key),
      value: count,
      description: "Institute membership total",
      icon: roleIcons[key] || Users,
      tone: "neutral",
    });
  }

  const courses = numberValue(data.courses);

  if (courses !== undefined) {
    items.push({
      key: "courses",
      label: "Courses",
      value: courses,
      description: "Courses recorded for this institution",
      icon: GraduationCap,
    });
  }

  const enrollments = numberValue(data.enrollments);

  if (enrollments !== undefined) {
    items.push({
      key: "enrollments",
      label: "Enrollments",
      value: enrollments,
      description: "Recorded course enrollments",
      icon: Layers3,
    });
  }

  return items;
}

function SecondaryStatistics({
  items,
}: {
  items: StatItem[];
}) {
  if (!items.length) return null;

  return (
    <section
      aria-label="Additional platform statistics"
      style={{
        ...panelStyle,
        padding: "15px 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#536b5c",
            marginRight: 4,
          }}
        >
          Additional platform totals
        </span>

        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.key}
              title={item.description}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                padding: "8px 12px",
                borderRadius: 9,
                border: "1px solid #e3ebe5",
                background: "#f8faf8",
              }}
            >
              <Icon
                size={16}
                color="#52735d"
                aria-hidden="true"
              />

              <span
                style={{
                  fontSize: 12,
                  color: "#536b5c",
                }}
              >
                {item.label}
              </span>

              <strong
                style={{
                  fontSize: 15,
                  color: "#173c2d",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {typeof item.value === "number"
                  ? item.value.toLocaleString()
                  : item.value}
              </strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ModelOperations({
  model,
}: {
  model: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    data?: RecordData;
  };
}) {
  if (model.isPending) {
    return (
      <section style={panelStyle}>
        <div style={{ padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>
            Experimental model operations
          </h2>
          <Loading />
        </div>
      </section>
    );
  }

  if (model.isError) {
    return (
      <section style={panelStyle}>
        <div style={{ padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>
            Experimental model operations
          </h2>
          <ErrorState error={model.error} />
        </div>
      </section>
    );
  }

  const data = model.data;

  const status = readableStatus(data?.status);

  const version = data?.version
    ? String(data.version)
    : "Not available";

  const warning =
    typeof data?.warning === "string" &&
    data.warning.trim()
      ? data.warning
      : "This experimental model has not been validated for real student decisions.";

  return (
    <section style={panelStyle}>
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid #edf1ed",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: 11,
            background: "#eef3ef",
            color: "#37664b",
            flexShrink: 0,
          }}
        >
          <FlaskConical
            size={20}
            aria-hidden="true"
          />
        </div>

        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              color: "#173c2d",
            }}
          >
            Experimental model operations
          </h2>

          <p
            style={{
              ...mutedStyle,
              margin: "5px 0 0",
            }}
          >
            Current status of the platform's experimental
            prediction model.
          </p>
        </div>
      </div>

      <div
        style={{
          padding: 20,
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          gap: 14,
        }}
      >
        <div
          style={{
            padding: 16,
            borderRadius: 11,
            background: "#f6f9f6",
            border: "1px solid #e5eee7",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              marginBottom: 10,
              color: "#52735d",
            }}
          >
            <Activity
              size={18}
              aria-hidden="true"
            />
            <span style={{ fontSize: 13 }}>
              Model status
            </span>
          </div>

          <strong
            style={{
              fontSize: 18,
              color: "#173c2d",
              overflowWrap: "anywhere",
            }}
          >
            {status}
          </strong>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 11,
            background: "#f6f9f6",
            border: "1px solid #e5eee7",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              marginBottom: 10,
              color: "#52735d",
            }}
          >
            <Database
              size={18}
              aria-hidden="true"
            />
            <span style={{ fontSize: 13 }}>
              Model version
            </span>
          </div>

          <strong
            style={{
              fontSize: 18,
              color: "#173c2d",
              overflowWrap: "anywhere",
            }}
          >
            {version}
          </strong>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 11,
          margin: "0 20px 20px",
          padding: "12px 14px",
          borderRadius: 10,
          border: "1px solid #f1dfb8",
          background: "#fff9ed",
          color: "#856123",
          fontSize: 12,
          lineHeight: 1.7,
        }}
      >
        <AlertTriangle
          size={18}
          style={{
            flexShrink: 0,
            marginTop: 1,
          }}
          aria-hidden="true"
        />

        <span>{warning}</span>
      </div>
    </section>
  );
}

export function Platform() {
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
    queryFn: () =>
      api<RecordData>("model-status/"),
    enabled: isSuperAdmin && !isInstituteView,
  });

  const summary = useQuery({
    queryKey: ["platform", id],
    enabled: isSuperAdmin,
    queryFn: () =>
      api<PlatformSummary>(
        id
          ? `institutes/${id}/overview/`
          : "platform/",
      ),
  });

  const records = useQuery({
    queryKey: [
      "platform-list",
      id,
      page,
      isInstituteView ? "" : search,
    ],
    enabled: isSuperAdmin,
    placeholderData: keepPreviousData,
    queryFn: () =>
      api<Page<RecordData>>(
        id
          ? `institutes/${id}/administrators/?page=${page}`
          : `institutes/?page=${page}&search=${encodeURIComponent(
              search,
            )}`,
      ),
  });

  if (!isSuperAdmin) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  const instituteName = id
    ? String(
        summary.data?.institute?.name ||
          "Institute details",
      )
    : "";

  const platformStats =
    !isInstituteView && summary.data
      ? buildPlatformStats(summary.data)
      : null;

  const instituteStats =
    isInstituteView && summary.data
      ? buildInstituteStats(summary.data)
      : [];

  const instituteActive =
    summary.data?.institute?.active === true;

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
        title={
          isInstituteView
            ? instituteName
            : "Platform overview"
        }
        description={
          isInstituteView
            ? "Review institution details, membership totals, and administrator accounts."
            : "Monitor institutions and manage platform administration."
        }
      >
        {isInstituteView && (
          <Button asChild variant="outline">
            <Link to="/platform">
              <ArrowLeft
                size={16}
                aria-hidden="true"
              />
              Platform overview
            </Link>
          </Button>
        )}

        <Button asChild variant="outline">
          <Link to="/institutes">
            <Building2
              size={16}
              aria-hidden="true"
            />
            Manage institutes
          </Link>
        </Button>

        <Button asChild variant="outline">
          <Link to="/platform-users">
            <ShieldCheck
              size={16}
              aria-hidden="true"
            />
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
        {isInstituteView &&
          summary.data?.institute && (
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
              <Building2
                size={19}
                color="#176447"
                aria-hidden="true"
              />

              <strong
                style={{
                  color: "#173c2d",
                  fontSize: 13,
                }}
              >
                {humanize(
                  summary.data.institute.kind ||
                    "Institution",
                )}
              </strong>

              <StatusPill
                active={
                  instituteStatusKnown
                    ? instituteActive
                    : null
                }
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
            isInstituteView
              ? "Institution statistics"
              : "Platform statistics"
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
                  <StatCard
                    key={item.key}
                    item={item}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  ...panelStyle,
                  padding: 20,
                }}
              >
                <p
                  className="muted"
                  style={{ margin: 0 }}
                >
                  No institution statistics are currently
                  available.
                </p>
              </div>
            )
          ) : platformStats ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, minmax(0, 1fr))",
                gap: 15,
              }}
              className="platform-primary-stats"
            >
              {platformStats.primary.map((item) => (
                <StatCard
                  key={item.key}
                  item={item}
                />
              ))}
            </div>
          ) : null}
        </section>

        {!isInstituteView &&
          platformStats &&
          !summary.isError && (
            <SecondaryStatistics
              items={platformStats.secondary}
            />
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
                !instituteActive ||
                summary.isPending ||
                summary.isError
              }
              onClick={() =>
                void manageAdministrators()
              }
            >
              <ShieldCheck
                size={16}
                aria-hidden="true"
              />
              Manage institute administrators
              <ArrowRight
                size={16}
                aria-hidden="true"
              />
            </Button>

            {!instituteActive &&
              !summary.isPending &&
              !summary.isError && (
                <span
                  className="muted"
                  style={{ fontSize: 12 }}
                >
                  Administrator management requires an
                  active institution.
                </span>
              )}
          </div>
        )}

        {!!error && (
          <ErrorState error={error} />
        )}

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
                {isInstituteView
                  ? "Institute administrators"
                  : "Institutions"}
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
                  <ArrowRight
                    size={15}
                    aria-hidden="true"
                  />
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
                        {isInstituteView
                          ? "Administrator"
                          : "Institution"}
                      </th>

                      <th>
                        {isInstituteView
                          ? "Email address"
                          : "Category"}
                      </th>

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
                        typeof row.active === "boolean"
                          ? row.active
                          : null;

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
                                  row.username ||
                                    row.name ||
                                    "Administrator",
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
                                {String(
                                  row.name ||
                                    "Unnamed institution",
                                )}
                              </Link>
                            )}
                          </td>

                          <td>
                            {isInstituteView
                              ? String(row.email || "—")
                              : humanize(
                                  row.kind ||
                                    "Not specified",
                                )}
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
                                <ArrowRight
                                  size={14}
                                  aria-hidden="true"
                                />
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
              label={
                isInstituteView
                  ? "Administrators"
                  : "Institutions"
              }
            />
          </div>
        </section>

        {!isInstituteView && (
          <ModelOperations model={model} />
        )}
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