import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

import { api, post, type Page } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { RelationSelect } from "../../components/RelationSelect";
import { Pagination } from "../../components/ReportControls";
import {
  ErrorState,
  Loading,
  Empty,
} from "../../components/shared";

type Run = {
  id: string;
  offering: string;
  status: string;
  total: number;
  processed: number;
  counts: Record<string, number>;
  created_at: string;
  finished_at: string | null;
  warning: string;
};

type AcademicIndicators = Record<string, number | null>;

type AnalysisResult = {
  detail?: string;
  probability?: number;
  category?: string;
  version?: string;
  created_at?: string;
  reused?: boolean;
  academic?: AcademicIndicators;
};

type Item = {
  student: string;
  student_label: string;
  status: string;
  result: AnalysisResult;
};

type RiskLevel = "high" | "moderate" | "low";

const riskStyles = {
  high: {
    label: "High",
    color: "#b42318",
    background: "#fff1f0",
    border: "#f3c2bc",
    Icon: AlertTriangle,
  },
  moderate: {
    label: "Moderate",
    color: "#946200",
    background: "#fff8e5",
    border: "#f1dca0",
    Icon: ShieldAlert,
  },
  low: {
    label: "Low",
    color: "#176348",
    background: "#eaf6ee",
    border: "#c7e5d0",
    Icon: CheckCircle2,
  },
} as const;

function percent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "Not recorded";
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "Not recorded";
  }

  return `${numeric.toFixed(1)}%`;
}

function getRiskLevel(category: unknown): RiskLevel | null {
  const value = String(category ?? "").trim().toLowerCase();

  if (value === "high") {
    return "high";
  }

  if (value === "moderate" || value === "medium") {
    return "moderate";
  }

  if (value === "low") {
    return "low";
  }

  return null;
}

function getRiskPriority(item: Item): number {
  if (item.status !== "ready") {
    return 3;
  }

  const level = getRiskLevel(item.result?.category);

  switch (level) {
    case "high":
      return 0;
    case "moderate":
      return 1;
    case "low":
      return 2;
    default:
      return 3;
  }
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}

function RiskEstimate({ item }: { item: Item }) {
  if (item.status !== "ready") {
    return (
      <span className="muted">
        {item.result?.detail ||
          item.status.replaceAll("_", " ")}
      </span>
    );
  }

  const level = getRiskLevel(item.result?.category);

  const probability = item.result?.probability;

  const probabilityLabel =
    probability === null ||
    probability === undefined ||
    !Number.isFinite(Number(probability))
      ? "—"
      : percent(Number(probability) * 100);

  if (!level) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <strong>{probabilityLabel}</strong>
        <span className="muted">
          {String(item.result?.category ?? "Unknown")}
        </span>
        {item.result?.reused && (
          <small className="muted">Previously calculated</small>
        )}
      </div>
    );
  }

  const style = riskStyles[level];
  const Icon = style.Icon;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 9,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 9px",
          borderRadius: 8,
          border: `1px solid ${style.border}`,
          background: style.background,
          color: style.color,
          fontSize: 12,
          fontWeight: 750,
          whiteSpace: "nowrap",
        }}
      >
        <Icon size={14} aria-hidden="true" />
        {style.label}
      </span>

      <strong
        style={{
          color: style.color,
          fontSize: 13,
          whiteSpace: "nowrap",
        }}
      >
        {probabilityLabel}
      </strong>

      {item.result?.reused && (
        <small
          className="muted"
          title="This estimate was reused because its inputs were unchanged."
        >
          Previously calculated
        </small>
      )}
    </div>
  );
}

export function ClassAnalysis({
  offering,
}: {
  offering?: string;
}) {
  const client = useQueryClient();

  const [course, setCourse] = useState(offering || "");
  const [run, setRun] = useState<Run>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const stop = useRef(false);
  const mounted = useRef(true);
  const running = useRef(false);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      stop.current = true;
    };
  }, []);

  useEffect(() => {
    if (offering) {
      setCourse(offering);
      setRun(undefined);
      setPage(1);
      setSearch("");
      setError(undefined);
    }
  }, [offering]);

  const items = useQuery({
    queryKey: [
      "analysis-items",
      run?.id,
      run?.processed,
      page,
      search,
    ],
    queryFn: () =>
      api<Page<Item>>(
        `class-analysis/${run!.id}/items/?page=${page}&search=${encodeURIComponent(
          search,
        )}`,
      ),
    enabled: !!run,
  });

  const sortedItems = useMemo(() => {
    const results = items.data?.results ?? [];

    return [...results].sort((a, b) => {
      const priorityDifference =
        getRiskPriority(a) - getRiskPriority(b);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      if (
        a.status === "ready" &&
        b.status === "ready"
      ) {
        const aProbability = Number(
          a.result?.probability ?? -1,
        );

        const bProbability = Number(
          b.result?.probability ?? -1,
        );

        if (
          Number.isFinite(aProbability) &&
          Number.isFinite(bProbability) &&
          aProbability !== bProbability
        ) {
          return bProbability - aProbability;
        }
      }

      return a.student_label.localeCompare(
        b.student_label,
      );
    });
  }, [items.data?.results]);

  async function analyze() {
    if (running.current || !course) {
      return;
    }

    running.current = true;
    setBusy(true);
    setError(undefined);
    stop.current = false;

    try {
      let next = await post<Run>("class-analysis/", {
        offering: course,
      });

      if (!mounted.current) {
        return;
      }

      setPage(1);
      setRun(next);

      while (
        next.status === "active" &&
        !stop.current
      ) {
        next = await post<Run>(
          `class-analysis/${next.id}/advance/`,
        );

        if (!mounted.current) {
          return;
        }

        setRun(next);
      }

      if (mounted.current) {
        await client.invalidateQueries({
          queryKey: ["predictions"],
        });
      }
    } catch (err) {
      if (mounted.current) {
        setError(err);
      }
    } finally {
      running.current = false;

      if (mounted.current) {
        setBusy(false);
      }
    }
  }

  function selectCourse(value: string) {
    if (running.current) {
      return;
    }

    stop.current = true;

    setCourse(value);
    setRun(undefined);
    setError(undefined);
    setPage(1);
    setSearch("");
  }

  const processed = run?.processed ?? 0;
  const total = run?.total ?? 0;

  const ready = run?.counts?.ready ?? 0;

  const insufficient =
    run?.counts?.insufficient_data ?? 0;

  const unsuccessful =
    (run?.counts?.failed ?? 0) +
    (run?.counts?.model_unavailable ?? 0);

  const withdrawn =
    run?.counts?.withdrawn ?? 0;

  const isCompleted = run?.status === "completed";

  const progressPercent =
    total > 0
      ? Math.min(
          100,
          Math.max(0, (processed / total) * 100),
        )
      : 0;

  return (
    <section
      className="panel class-analysis"
      aria-label="Class analysis"
    >
      <h2>Analyze a class</h2>

      <p className="muted">
        Review academic indicators and generate risk estimates
        for learners in this class. Each request processes up
        to ten students. You can pause and resume an analysis,
        and completed results are saved. Grades, enrollments,
        and student alerts are not changed.
      </p>

      {!offering && (
        <fieldset
          disabled={busy}
          style={{
            border: 0,
            padding: 0,
            margin: "18px 0",
            minWidth: 0,
          }}
        >
          <RelationSelect
            source="offerings?archived=false"
            label="Class to analyze"
            value={course}
            onChange={(value) =>
              selectCourse(String(value))
            }
          />
        </fieldset>
      )}

      <div
        className="form-actions"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          marginTop: 14,
        }}
      >
        <Button
          disabled={busy || !course}
          onClick={analyze}
        >
          {busy
            ? "Analyzing class…"
            : run?.status === "active"
              ? "Resume analysis"
              : "Analyze class"}
        </Button>

        {busy && (
          <Button
            variant="outline"
            onClick={() => {
              stop.current = true;
            }}
          >
            Pause after current batch
          </Button>
        )}
      </div>

      {!!error && (
        <div style={{ marginTop: 14 }}>
          <ErrorState error={error} />
        </div>
      )}

      {run && (
        <>
          <div
            style={{
              marginTop: 20,
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <p
              role="status"
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 650,
              }}
            >
              {processed.toLocaleString()} of{" "}
              {total.toLocaleString()} students processed
              {" · "}
              {isCompleted
                ? "Completed"
                : busy
                  ? "In progress"
                  : "Paused; resume when ready"}
            </p>

            <strong
              style={{
                color: "#176348",
                fontSize: 13,
              }}
            >
              {progressPercent.toFixed(0)}%
            </strong>
          </div>

          <progress
            aria-label="Class analysis progress"
            max={Math.max(total, 1)}
            value={processed}
            style={{
              width: "100%",
              height: 10,
              accentColor: "#176348",
            }}
          />

          <p
            className="muted"
            style={{
              marginTop: 10,
              lineHeight: 1.7,
              fontSize: 12,
            }}
          >
            {ready.toLocaleString()} eligible students analyzed
            {" · "}
            {insufficient.toLocaleString()} need more observations
            {" · "}
            {unsuccessful.toLocaleString()} unsuccessful
            {" · "}
            {withdrawn.toLocaleString()} no longer enrolled.
            {" "}
            Started {formatDateTime(run.created_at)}
            {run.finished_at &&
              ` · Finished ${formatDateTime(run.finished_at)}`}.
            {" "}
            Unchanged inputs reuse their original prediction timestamp.
          </p>

          <label
            style={{
              display: "block",
              marginTop: 20,
              marginBottom: 15,
              maxWidth: 460,
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
              Search class analysis
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search learner..."
            />
          </label>

          {items.isPending ? (
            <Loading />
          ) : items.isError ? (
            <ErrorState error={items.error} />
          ) : !items.data.results.length ? (
            <Empty>No matching students.</Empty>
          ) : (
            <div className="table-scroll">
              <table>
                <caption>
                  Academic indicators and risk estimates
                </caption>

                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Attendance</th>
                    <th>Assignments submitted</th>
                    <th>Quiz score</th>
                    <th>Released grade</th>
                    <th>Course progress</th>
                    <th>Risk estimate</th>
                    <th>Model / timestamp</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedItems.map((item) => {
                    const academic =
                      item.result?.academic;

                    return (
                      <tr key={item.student}>
                        <td>
                          <strong>
                            {item.student_label}
                          </strong>
                        </td>

                        {[
                          "attendance_pct",
                          "assignment_completion_pct",
                          "quiz_pct",
                          "score",
                          "completion_pct",
                        ].map((key) => (
                          <td key={key}>
                            {percent(
                              academic?.[key],
                            )}
                          </td>
                        ))}

                        <td>
                          <RiskEstimate item={item} />
                        </td>

                        <td>
                          <span>
                            {item.result?.version || "—"}
                          </span>

                          {item.result?.created_at && (
                            <small
                              className="muted"
                              style={{
                                display: "block",
                                marginTop: 5,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {formatDateTime(
                                item.result.created_at,
                              )}
                            </small>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <Pagination
              label="Analysis students"
              data={items.data}
              page={page}
              onChange={setPage}
            />
          </div>
        </>
      )}
    </section>
  );
}