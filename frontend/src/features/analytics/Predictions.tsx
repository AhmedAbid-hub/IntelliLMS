import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Search,
  ShieldAlert,
} from "lucide-react";

import { Pagination } from "../../components/ReportControls";
import { ClassAnalysis } from "./ClassAnalysis";
import { useAuth } from "../auth/Auth";
import {
  api,
  post,
  type RecordData,
  type Page,
} from "../../lib/api";
import type { GradeRow } from "./Dashboard";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import {
  PageHeader,
  Loading,
  ErrorState,
  Empty,
} from "../../components/shared";

type RiskCategory = "high" | "moderate" | "low";

type SelectedClass = {
  id: string;
  title: string;
  subtitle: string;
};

interface PredictionSummary {
  distribution: Record<string, number>;
  learner_course_pairs: number;
  basis: string;
}

interface PredictionsProps {
  offering?: string;
}

const riskStyles: Record<
  RiskCategory,
  {
    label: string;
    color: string;
    background: string;
    border: string;
    icon: typeof AlertTriangle;
  }
> = {
  high: {
    label: "High",
    color: "#b42318",
    background: "#fff1f0",
    border: "#f3c2bc",
    icon: AlertTriangle,
  },
  moderate: {
    label: "Moderate",
    color: "#946200",
    background: "#fff8e5",
    border: "#f1dca0",
    icon: ShieldAlert,
  },
  low: {
    label: "Low",
    color: "#176348",
    background: "#eaf6ee",
    border: "#c7e5d0",
    icon: CheckCircle2,
  },
};

const riskOrder: RiskCategory[] = [
  "high",
  "moderate",
  "low",
];

const borderColor = "#dfe9e2";

function getRiskCategory(value: unknown): RiskCategory | null {
  const category = String(value ?? "").toLowerCase();

  if (category === "high") return "high";

  if (category === "moderate" || category === "medium") {
    return "moderate";
  }

  if (category === "low") return "low";

  return null;
}

function RiskBadge({ value }: { value: unknown }) {
  const category = getRiskCategory(value);

  if (!category) {
    return (
      <span className="pill">
        {String(value ?? "Unknown")}
      </span>
    );
  }

  const style = riskStyles[category];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 8,
        background: style.background,
        color: style.color,
        border: `1px solid ${style.border}`,
        fontSize: 12,
        fontWeight: 750,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: style.color,
        }}
      />
      {style.label}
    </span>
  );
}

function RiskSummary({
  data,
}: {
  data: PredictionSummary;
}) {
  const distribution = data.distribution ?? {};

  return (
    <section style={{ marginBottom: 22 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 15,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              color: "#173e2d",
            }}
          >
            Risk overview
          </h2>

          <p
            className="muted"
            style={{
              margin: "7px 0 0",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            Latest stored risk estimate for each learner-course pair.
          </p>
        </div>

        <span className="count-badge">
          {data.learner_course_pairs.toLocaleString()} estimates
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 15,
        }}
      >
        {riskOrder.map((category) => {
          const style = riskStyles[category];
          const Icon = style.icon;

          const count =
            distribution[category] ??
            (category === "moderate"
              ? distribution.medium
              : undefined) ??
            0;

          return (
            <article
              key={category}
              style={{
                background: "#fff",
                border: `1px solid ${style.border}`,
                borderRadius: 14,
                padding: "20px 22px",
                minHeight: 155,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: ".04em",
                    color: style.color,
                  }}
                >
                  {style.label.toUpperCase()} RISK
                </span>

                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    background: style.background,
                    color: style.color,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Icon size={19} aria-hidden="true" />
                </div>
              </div>

              <div>
                <strong
                  style={{
                    display: "block",
                    fontSize: 33,
                    lineHeight: 1.2,
                    color: style.color,
                  }}
                >
                  {count.toLocaleString()}
                </strong>

                <small
                  style={{
                    display: "block",
                    marginTop: 7,
                    color: "#718078",
                    fontSize: 12,
                  }}
                >
                  Learner-course pairs
                </small>
              </div>
            </article>
          );
        })}
      </div>

      <p
        className="muted"
        style={{
          margin: "12px 0 0",
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        Counts represent learner-course pairs, not necessarily
        unique learners.
      </p>
    </section>
  );
}

function getOfferingTitle(row: RecordData): string {
  const candidates = [
    row.display_name,
    row.label,
    row.offering_label,
    row.title,
    row.name,
    row.course_label,
    row.subject_label,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate === "string" &&
      candidate.trim()
    ) {
      return candidate.trim();
    }
  }

  const course = row.course;

  if (
    course &&
    typeof course === "object" &&
    !Array.isArray(course)
  ) {
    const nested = course as Record<string, unknown>;

    for (const candidate of [
      nested.title,
      nested.name,
      nested.code,
    ]) {
      if (
        typeof candidate === "string" &&
        candidate.trim()
      ) {
        return candidate.trim();
      }
    }
  }

  return `Class ${String(row.id).slice(0, 8)}`;
}

function getOfferingSubtitle(row: RecordData): string {
  const parts: string[] = [];

  for (const value of [
    row.course_code ?? row.code,
    row.section_label ?? row.section_name ?? row.section,
    row.semester_label ?? row.term_label,
  ]) {
    if (
      value !== null &&
      value !== undefined &&
      typeof value !== "object" &&
      String(value).trim()
    ) {
      parts.push(String(value));
    }
  }

  return parts.join(" · ");
}

function ClassBrowser({
  onSelect,
}: {
  onSelect: (selected: SelectedClass) => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({
    page: String(page),
  });

  if (search.trim()) {
    params.set("search", search.trim());
  }

  const query = useQuery({
    queryKey: [
      "prediction-classes",
      page,
      search.trim(),
    ],
    queryFn: () =>
      api<Page<RecordData>>(
        `offerings/?${params.toString()}`,
      ),
  });

  return (
    <section
      className="panel"
      style={{ padding: "22px 24px" }}
    >
      <div className="panel-heading">
        <div>
          <h2>Browse classes</h2>
          <p className="muted">
            Select a class to review its risk estimates
            and available analysis.
          </p>
        </div>

        {query.data && (
          <span className="count-badge">
            {query.data.count.toLocaleString()} classes
          </span>
        )}
      </div>

      <label
        style={{
          display: "block",
          maxWidth: 520,
          margin: "20px 0",
        }}
      >
        <span
          style={{
            display: "block",
            fontWeight: 650,
            fontSize: 13,
            marginBottom: 9,
          }}
        >
          Find a course or class
        </span>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            border: `1px solid ${borderColor}`,
            borderRadius: 10,
            padding: "0 13px",
          }}
        >
          <Search
            size={18}
            color="#718078"
            aria-hidden="true"
          />

          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search classes..."
            style={{
              width: "100%",
              height: 44,
              border: 0,
              outline: 0,
              background: "transparent",
              font: "inherit",
              fontSize: 13,
            }}
          />
        </div>
      </label>

      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} />
      ) : !query.data.results.length ? (
        <Empty>No matching classes found.</Empty>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 350px), 1fr))",
            gap: 12,
          }}
        >
          {query.data.results.map((row) => {
            const title = getOfferingTitle(row);
            const subtitle = getOfferingSubtitle(row);

            return (
              <button
                key={String(row.id)}
                type="button"
                onClick={() =>
                  onSelect({
                    id: String(row.id),
                    title,
                    subtitle,
                  })
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  gap: 15,
                  padding: "18px 20px",
                  border: `1px solid ${borderColor}`,
                  borderRadius: 13,
                  background: "#fff",
                  textAlign: "left",
                  font: "inherit",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 11,
                      background: "#e8f3ec",
                      color: "#176348",
                      flexShrink: 0,
                    }}
                  >
                    <BookOpen size={21} />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <strong
                      style={{
                        display: "block",
                        color: "#173e2d",
                        fontSize: 14,
                      }}
                    >
                      {title}
                    </strong>

                    <small
                      style={{
                        display: "block",
                        marginTop: 5,
                        color: "#718078",
                      }}
                    >
                      {subtitle || "Course offering"}
                    </small>
                  </div>
                </div>

                <ArrowRight
                  size={18}
                  color="#176348"
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <Pagination
          label="Classes"
          data={query.data}
          page={page}
          onChange={setPage}
        />
      </div>
    </section>
  );
}

function EstimateHistory({
  offering,
  allowDetails,
}: {
  offering?: string;
  allowDetails: boolean;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<RecordData>();

  const params = new URLSearchParams({
    page: String(page),
    search,
  });

  if (offering) {
    params.set("offering", offering);
  }

  const query = useQuery({
    queryKey: [
      "predictions",
      "history",
      page,
      search,
      offering,
    ],
    queryFn: () =>
      api<Page<RecordData>>(
        `predictions/?${params.toString()}`,
      ),
  });

  return (
    <>
      <section
        className="panel"
        style={{ padding: "22px 24px" }}
      >
        <div className="panel-heading">
          <div>
            <h2>Recent estimates</h2>
            <p className="muted">
              Latest recorded risk estimates for the selected scope.
              Higher-risk categories are shown first.
            </p>
          </div>
        </div>

        <label
          style={{
            display: "block",
            maxWidth: 480,
            margin: "20px 0",
          }}
        >
          <span
            style={{
              display: "block",
              fontWeight: 650,
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            Search estimates
          </span>

          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search learner or course..."
          />
        </label>

        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState error={query.error} />
        ) : !query.data.results.length ? (
          <Empty>No estimates recorded yet.</Empty>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Course</th>
                  <th>Probability</th>
                  <th>Risk</th>
                  <th>Model</th>
                  <th>Generated</th>
                  {allowDetails && <th>Context</th>}
                </tr>
              </thead>

              <tbody>
                {query.data.results.map((row) => {
                  const probability = Number(
                    row.probability,
                  );

                  return (
                    <tr key={String(row.id)}>
                      <td>
                        {String(
                          row.student_label ?? "—",
                        )}
                      </td>

                      <td>
                        {String(
                          row.offering_label ?? "—",
                        )}
                      </td>

                      <td>
                        {Number.isFinite(probability)
                          ? `${(
                              probability * 100
                            ).toFixed(1)}%`
                          : "—"}
                      </td>

                      <td>
                        <RiskBadge value={row.category} />
                      </td>

                      <td>
                        {String(row.version ?? "—")}
                      </td>

                      <td>
                        {row.created_at
                          ? new Date(
                              String(row.created_at),
                            ).toLocaleString()
                          : "—"}
                      </td>

                      {allowDetails && (
                        <td>
                          <Button
                            variant="outline"
                            onClick={() =>
                              setDetail(row)
                            }
                          >
                            Details
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <Pagination
            label="Estimates"
            data={query.data}
            page={page}
            onChange={setPage}
          />
        </div>
      </section>

      {detail && (
        <Dialog
          open
          onOpenChange={() =>
            setDetail(undefined)
          }
          title="Estimate details"
        >
          <p className="info-strip">
            Model {String(detail.version ?? "—")}
            {" · "}
            Probability{" "}
            {Number.isFinite(
              Number(detail.probability),
            )
              ? `${(
                  Number(detail.probability) *
                  100
                ).toFixed(1)}%`
              : "—"}
          </p>

          <div style={{ marginBottom: 16 }}>
            <RiskBadge value={detail.category} />
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Observed feature</th>
                  <th>Value</th>
                </tr>
              </thead>

              <tbody>
                {Object.entries(
                  detail.features &&
                    typeof detail.features === "object" &&
                    !Array.isArray(detail.features)
                    ? (
                        detail.features as Record<
                          string,
                          unknown
                        >
                      )
                    : {},
                ).map(([key, value]) => (
                  <tr key={key}>
                    <td>
                      {key.replaceAll("_", " ")}
                    </td>

                    <td>
                      {value === null
                        ? "Not recorded"
                        : typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="muted">
            These values provide context for reviewing
            the estimate. They do not establish causation.
          </p>
        </Dialog>
      )}
    </>
  );
}

function GenerateEstimate({
  offering,
  model,
  canGenerate,
}: {
  offering: string;
  model: RecordData | undefined;
  canGenerate: boolean;
}) {
  const client = useQueryClient();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<unknown>();

  const params = new URLSearchParams({
    page: String(page),
    search,
    offering,
  });

  const students = useQuery({
    queryKey: [
      "prediction-learners",
      offering,
      page,
      search,
    ],
    queryFn: () =>
      api<Page<GradeRow>>(
        `grades/?${params.toString()}`,
      ),
    enabled: canGenerate,
  });

  if (!canGenerate) {
    return null;
  }

  return (
    <section
      className="panel prediction-controls"
      style={{ padding: "22px 24px" }}
    >
      <div className="panel-heading">
        <div>
          <h2>Generate a risk estimate</h2>

          <p className="muted">
            Generate an estimate for an enrolled learner
            in this class.
          </p>
        </div>
      </div>

      <p
        className="muted"
        style={{ marginTop: 12 }}
      >
        Model:{" "}
        {String(
          model?.selected_model ?? "Unavailable",
        )}
        {" · "}
        Version: {String(model?.version ?? "—")}
      </p>

      <label
        style={{
          display: "block",
          marginTop: 20,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            display: "block",
            marginBottom: 8,
            fontWeight: 650,
            fontSize: 13,
          }}
        >
          Find learner
        </span>

        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
            setSelection("");
          }}
          placeholder="Search enrolled learners..."
        />
      </label>

      {students.isError && (
        <ErrorState error={students.error} />
      )}

      {students.isPending ? (
        <Loading />
      ) : (
        <Pagination
          label="Learners"
          data={students.data}
          page={page}
          onChange={(next) => {
            setPage(next);
            setSelection("");
          }}
        />
      )}

      <form
        onSubmit={async (event) => {
          event.preventDefault();

          if (
            busy ||
            model?.status !== "ready" ||
            !selection
          ) {
            return;
          }

          const row =
            students.data?.results.find(
              (candidate) =>
                `${candidate.student}:${candidate.offering}` ===
                selection,
            );

          if (!row) return;

          setBusy(true);
          setError(undefined);
          setStatus("");

          try {
            const result =
              await post<RecordData>(
                "predictions/",
                {
                  student: row.student,
                  offering: row.offering,
                },
              );

            setStatus(
              String(
                result.detail ??
                  `${String(
                    result.category ??
                      "Unknown",
                  )} risk estimate generated.`,
              ),
            );

            await client.invalidateQueries({
              queryKey: ["predictions"],
            });
          } catch (err) {
            setError(err);
          } finally {
            setBusy(false);
          }
        }}
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(220px, 1fr) auto",
          alignItems: "end",
          gap: 14,
          marginTop: 18,
        }}
      >
        <label>
          <span
            style={{
              display: "block",
              marginBottom: 8,
              fontWeight: 650,
              fontSize: 13,
            }}
          >
            Enrolled learner
          </span>

          <select
            required
            value={selection}
            onChange={(event) =>
              setSelection(
                event.target.value,
              )
            }
          >
            <option value="">
              Choose an enrolled learner
            </option>

            {students.data?.results.map(
              (row) => (
                <option
                  key={`${row.student}:${row.offering}`}
                  value={`${row.student}:${row.offering}`}
                >
                  {row.student_label}
                  {" · "}
                  {row.offering_label}
                </option>
              ),
            )}
          </select>
        </label>

        <Button
          disabled={
            busy ||
            !selection ||
            model?.status !== "ready"
          }
        >
          {busy
            ? "Generating…"
            : "Generate estimate"}
        </Button>
      </form>

      {model?.status !== "ready" && (
        <p
          className="muted"
          style={{ marginTop: 12 }}
        >
          Estimate generation is unavailable
          until the configured model is ready.
        </p>
      )}

      {status && (
        <p
          role="status"
          className="info-strip"
        >
          {status}
        </p>
      )}

      {!!error && (
        <ErrorState error={error} />
      )}
    </section>
  );
}

function ClassInsights({
  selected,
  model,
  canGenerate,
  onBack,
}: {
  selected: SelectedClass;
  model: RecordData | undefined;
  canGenerate: boolean;
  onBack?: () => void;
}) {
  const summary = useQuery({
    queryKey: [
      "predictions",
      "summary",
      selected.id,
    ],
    queryFn: () =>
      api<PredictionSummary>(
        `predictions/summary/?offering=${encodeURIComponent(
          selected.id,
        )}`,
      ),
  });

  return (
    <>
      {onBack && (
        <div style={{ marginBottom: 18 }}>
          <Button
            variant="outline"
            onClick={onBack}
          >
            <ArrowLeft
              size={16}
              aria-hidden="true"
            />
            All classes
          </Button>
        </div>
      )}

      <section
        className="panel"
        style={{
          padding: "22px 24px",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#e8f3ec",
              color: "#176348",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <BookOpen size={23} />
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                color: "#173e2d",
                fontSize: 20,
              }}
            >
              {selected.title}
            </h2>

            <p
              className="muted"
              style={{
                margin: "6px 0 0",
              }}
            >
              {selected.subtitle ||
                "Class learning insights"}
            </p>
          </div>
        </div>
      </section>

      {summary.isPending ? (
        <Loading />
      ) : summary.isError ? (
        <ErrorState
          error={summary.error}
        />
      ) : (
        <RiskSummary data={summary.data} />
      )}

      <div style={{ marginBottom: 20 }}>
        <ClassAnalysis
          key={selected.id}
          offering={selected.id}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <GenerateEstimate
          key={selected.id}
          offering={selected.id}
          model={model}
          canGenerate={canGenerate}
        />
      </div>

      <EstimateHistory
        key={selected.id}
        offering={selected.id}
        allowDetails
      />
    </>
  );
}

export function Predictions({
  offering,
}: PredictionsProps = {}) {
  const { role } = useAuth();

  const isAdmin = role === "admin";
  const isHead = role === "head";
  const isTeacher = role === "teacher";
  const isStudent = role === "student";

  const canGenerate =
    isTeacher || isHead;

  const [view, setView] = useState<
    "overview" | "classes"
  >("overview");

  const [
    selectedClass,
    setSelectedClass,
  ] = useState<SelectedClass | null>(
    null,
  );

  const model = useQuery({
    queryKey: ["model-status"],
    queryFn: () =>
      api<RecordData>(
        "model-status/",
      ),
    enabled: !isStudent,
  });

  const summary = useQuery({
    queryKey: [
      "predictions",
      "summary",
      "all",
    ],
    queryFn: () =>
      api<PredictionSummary>(
        "predictions/summary/",
      ),
    enabled:
      !offering &&
      !selectedClass &&
      !isStudent,
  });

  const activeClass: SelectedClass | null =
    offering
      ? {
          id: String(offering),
          title: "Selected class",
          subtitle: "",
        }
      : selectedClass;

  const title = isStudent
    ? "My learning insights"
    : isAdmin
      ? "Learning insights"
      : isHead
        ? "Department learning insights"
        : isTeacher
          ? "Teaching insights"
          : "Learning insights";

  const description = isStudent
    ? "Review learning information for your courses."
    : isAdmin
      ? "Review learning risk estimates across your institution and its classes."
      : isHead
        ? "Review learning risk estimates within your department."
        : isTeacher
          ? "Review learning risk estimates for your assigned classes."
          : "Review learning risk estimates.";

  return (
    <>
      <PageHeader
        title={title}
        description={description}
      />

      {!offering && !isStudent && (
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <Button
            variant={
              view === "overview"
                ? "default"
                : "outline"
            }
            onClick={() => {
              setView("overview");
              setSelectedClass(null);
            }}
          >
            <Brain
              size={16}
              aria-hidden="true"
            />
            {isAdmin
              ? "Institution overview"
              : isHead
                ? "Department overview"
                : "Insights overview"}
          </Button>

          <Button
            variant={
              view === "classes"
                ? "default"
                : "outline"
            }
            onClick={() => {
              setView("classes");
              setSelectedClass(null);
            }}
          >
            <BookOpen
              size={16}
              aria-hidden="true"
            />
            Browse classes
          </Button>
        </div>
      )}

      {activeClass ? (
        <ClassInsights
          key={activeClass.id}
          selected={activeClass}
          model={model.data}
          canGenerate={canGenerate}
          onBack={
            offering
              ? undefined
              : () =>
                  setSelectedClass(null)
          }
        />
      ) : isStudent ? (
        <section
          className="panel padded"
        >
          <h2>My learning insights</h2>
          <p className="muted">
            Your course progress and released
            results are available in
            Academic Progress and Gradebook.
          </p>
        </section>
      ) : view === "overview" ? (
        <>
          {summary.isPending ? (
            <Loading />
          ) : summary.isError ? (
            <ErrorState
              error={summary.error}
            />
          ) : (
            <RiskSummary
              data={summary.data}
            />
          )}

          <EstimateHistory
            allowDetails
          />
        </>
      ) : (
        <ClassBrowser
          onSelect={
            setSelectedClass
          }
        />
      )}
    </>
  );
}