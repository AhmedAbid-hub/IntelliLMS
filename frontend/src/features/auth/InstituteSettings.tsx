import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { notifySaved } from "../../components/ToastProvider";
import { useAuth } from "./Auth";
import { api, type RecordData } from "../../lib/api";
import {
  academicTerms,
  termLabel,
  terminologyPreset,
} from "../../lib/terminology";
import {
  PageHeader,
  Loading,
  ErrorState,
} from "../../components/shared";
import { Button } from "../../components/ui/button";

type Band = {
  label: string;
  minimum: number;
  points: number;
};

type Rules = {
  gpa_policy?: {method: string; repeat: string} | null;
  pass_mark?: number;
  progression_policy?: string;
  bands?: Band[];
  quiz_attempt_policy?: string;
  missing_category_policy?: string;
  lock_released_grades?: boolean;
  attendance_edit_window_days?: number | null;
};

type GradingPreset =
  | "custom"
  | "university"
  | "college"
  | "school";

const GRADING_PRESETS: Record<
  Exclude<GradingPreset, "custom">,
  {
    name: string;
    description: string;
    bands: Band[];
  }
> = {
  university: {
    name: "University — 4.0 scale",
    description:
      "Example letter-grade thresholds using a 4.0 point scale. Adjust them to match your institution's official policy.",
    bands: [
      { label: "A+", minimum: 90, points: 4.0 },
      { label: "A", minimum: 85, points: 4.0 },
      { label: "A-", minimum: 80, points: 3.7 },
      { label: "B+", minimum: 75, points: 3.3 },
      { label: "B", minimum: 70, points: 3.0 },
      { label: "B-", minimum: 65, points: 2.7 },
      { label: "C+", minimum: 60, points: 2.3 },
      { label: "C", minimum: 55, points: 2.0 },
      { label: "D", minimum: 50, points: 1.0 },
      { label: "F", minimum: 0, points: 0 },
    ],
  },

  college: {
    name: "College — simple letter grades",
    description:
      "Example A–F grading bands with points. Suitable as a starting point for institutions using a simpler grading structure.",
    bands: [
      { label: "A", minimum: 80, points: 4.0 },
      { label: "B", minimum: 70, points: 3.0 },
      { label: "C", minimum: 60, points: 2.0 },
      { label: "D", minimum: 50, points: 1.0 },
      { label: "F", minimum: 0, points: 0 },
    ],
  },

  school: {
    name: "School — percentage bands",
    description:
      "Example school grading bands. Points are configurable and do not imply that the school awards a GPA.",
    bands: [
      { label: "A+", minimum: 90, points: 4.0 },
      { label: "A", minimum: 80, points: 3.5 },
      { label: "B", minimum: 70, points: 3.0 },
      { label: "C", minimum: 60, points: 2.0 },
      { label: "D", minimum: 50, points: 1.0 },
      { label: "F", minimum: 0, points: 0 },
    ],
  },
};

function copyBands(bands: Band[]): Band[] {
  return bands.map((band) => ({ ...band }));
}

function validateBands(bands: Band[]): string | null {
  if (bands.length === 0) {
    return null;
  }

  if (bands.length > 20) {
    return "A grading scale cannot contain more than 20 bands.";
  }

  const seenLabels = new Set<string>();
  const seenMinimums = new Set<number>();

  for (let index = 0; index < bands.length; index += 1) {
    const band = bands[index];
    const label = band.label.trim();

    if (!label) {
      return `Grade band ${index + 1} needs a label.`;
    }

    if (label.length > 12) {
      return `Grade band ${index + 1} has a label longer than 12 characters.`;
    }

    const normalizedLabel = label.toLowerCase();

    if (seenLabels.has(normalizedLabel)) {
      return `The grade label "${label}" is repeated.`;
    }

    seenLabels.add(normalizedLabel);

    if (
      !Number.isFinite(band.minimum) ||
      band.minimum < 0 ||
      band.minimum > 100
    ) {
      return `Grade band ${index + 1} needs a minimum between 0 and 100%.`;
    }

    if (
      !Number.isFinite(band.points) ||
      band.points < 0 ||
      band.points > 10
    ) {
      return `Grade band ${index + 1} needs points between 0 and 10.`;
    }

    if (seenMinimums.has(band.minimum)) {
      return `Two grade bands cannot have the same minimum percentage (${band.minimum}%).`;
    }

    seenMinimums.add(band.minimum);

    if (
      index > 0 &&
      bands[index - 1].minimum <= band.minimum
    ) {
      return "Arrange grade bands from the highest minimum percentage to the lowest.";
    }
  }

  if (bands[bands.length - 1].minimum !== 0) {
    return "The final grade band must start at 0% so every score has a matching grade.";
  }

  return null;
}

export function InstituteSettings() {
  const { user, role } = useAuth();

  const query = useQuery({
    queryKey: ["institute-settings", user?.institute_id],
    queryFn: () =>
      api<RecordData>(`institutes/${user?.institute_id}/`),
    enabled:
      !!user?.institute_id &&
      ["admin", "superadmin"].includes(role),
  });

  if (!["admin", "superadmin"].includes(role)) {
    return (
      <ErrorState
        error={
          new Error(
            "Institute administrator access is required.",
          )
        }
      />
    );
  }

  if (!user?.institute_id) {
    return <p>Select an institute in the sidebar.</p>;
  }

  if (query.isPending) {
    return <Loading />;
  }

  if (query.isError) {
    return <ErrorState error={query.error} />;
  }

  return (
    <SettingsForm
      key={String(query.data.id)}
      institute={query.data}
    />
  );
}

function SettingsForm({
  institute,
}: {
  institute: RecordData;
}) {
  const client = useQueryClient();

  const rules = (institute.grading_rules || {}) as Rules;

  const [labels, setLabels] = useState<Record<string, string>>(
    { ...(institute.kind && institute.kind !== "other" ? terminologyPreset(String(institute.kind)) : {}), ...((institute.terminology || {}) as Record<string, string>) },
  );

  const [terminologyChoice, setTerminologyChoice] = useState(
    String(institute.kind || "university"),
  );

  const [bands, setBands] = useState<Band[]>(
    copyBands(rules.bands || []),
  );

  const [gradingPreset, setGradingPreset] =
    useState<GradingPreset>("custom");

  const [error, setError] = useState<unknown>();
  const [validationError, setValidationError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const gradeValidation = validateBands(bands);

  function applyTerminologyPreset() {
    setLabels(terminologyPreset(terminologyChoice));
    setSaved(false);
  }

  function applyGradingPreset() {
    if (gradingPreset === "custom") {
      return;
    }

    setBands(
      copyBands(GRADING_PRESETS[gradingPreset].bands),
    );

    setValidationError("");
    setSaved(false);
  }

  function updateBand(
    index: number,
    key: keyof Band,
    value: string,
  ) {
    setBands((current) =>
      current.map((band, bandIndex) => {
        if (bandIndex !== index) {
          return band;
        }

        return {
          ...band,
          [key]:
            key === "label"
              ? value
              : value.trim() === ""
                ? Number.NaN
                : Number(value),
        };
      }),
    );

    setGradingPreset("custom");
    setValidationError("");
    setSaved(false);
  }

  function removeBand(index: number) {
    setBands((current) =>
      current.filter((_, bandIndex) => bandIndex !== index),
    );

    setGradingPreset("custom");
    setValidationError("");
    setSaved(false);
  }

  function addBand() {
    if (bands.length >= 20) {
      return;
    }

    setBands((current) => [
      ...current,
      {
        label: "",
        minimum: 0,
        points: 0,
      },
    ]);

    setGradingPreset("custom");
    setValidationError("");
    setSaved(false);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (busy) {
      return;
    }

    setError(undefined);
    setValidationError("");
    setSaved(false);

    const bandError = validateBands(bands);

    if (bandError) {
      setValidationError(bandError);
      return;
    }

    const form = new FormData(event.currentTarget);

    const passMark = Number(form.get("pass_mark"));

    if (
      !Number.isFinite(passMark) ||
      passMark < 0 ||
      passMark > 100
    ) {
      setValidationError(
        "The pass threshold must be between 0 and 100%.",
      );
      return;
    }

    const terminology = Object.fromEntries(
      academicTerms.flatMap((key) => [
        [
          key,
          form.get(key),
        ],
        [
          `${key}_plural`,
          form.get(`${key}_plural`),
        ],
      ]),
    );

    setBusy(true);

    try {
      await api(`institutes/${institute.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.get("name"),
          terminology,
          policy_change_reason: form.get("policy_change_reason"),
          grading_rules: {
            ...rules,
            ...(institute.kind === "university" ? {gpa_policy: form.get("gpa_repeat") ? {method: "credit_weighted", repeat: form.get("gpa_repeat")} : null} : {}),
            progression_policy: form.get("progression_policy"),
            lock_released_grades: form.get("lock_released_grades") === "on",
            attendance_edit_window_days: String(form.get("attendance_edit_window_days") || "").trim() === "" ? null : Number(form.get("attendance_edit_window_days")),
            pass_mark: passMark,
            bands: bands.map((band) => ({
              label: band.label.trim(),
              minimum: band.minimum,
              points: band.points,
            })),
            quiz_attempt_policy: form.get(
              "quiz_attempt_policy",
            ),
            missing_category_policy: form.get(
              "missing_category_policy",
            ),
          },
        }),
      });

      await client.invalidateQueries();

      setSaved(true);
      notifySaved("Institute settings updated.");
    } catch (saveError) {
      setError(saveError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Institute settings"
        description="Configure academic names, released-score policies and grading bands for your institute."
      />

      <form
        className="panel padded"
        onSubmit={handleSubmit}
      >
        <label>
          Institute name

          <input
            name="name"
            required
            maxLength={180}
            defaultValue={String(institute.name)}
            onChange={() => setSaved(false)}
          />
        </label>

        <h2>Academic terminology</h2>
        <label>Progression approval policy
          <select name="progression_policy" defaultValue={rules.progression_policy || "manual_review"}>
            <option value="manual_review">Administrator reviews academic evidence</option>
            <option value="all_required_pass">Require passing results for every required subject</option>
          </select>
        </label>

        <p className="muted">
          These names appear in academic pages, forms and
          table headings. Singular and plural labels are
          independent.
        </p>

        <label>
          Terminology preset

          <select
            value={terminologyChoice}
            onChange={(event) =>
              setTerminologyChoice(event.target.value)
            }
          >
            <option value="university">
              University
            </option>

            <option value="college">
              College
            </option>

            <option value="school">
              School
            </option>
          </select>
        </label>

        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={applyTerminologyPreset}
        >
          Apply terminology preset
        </Button>

        <p className="muted">
          Presets change the labels in this form.
          Review them before saving; academic records
          and institute type stay intact.
        </p>

        <details>
          <summary>
            Advanced terminology settings
          </summary>

          <div className="settings-grid">
            {academicTerms.map((key) => (
              <fieldset key={key}>
                <legend>
                  {key.charAt(0).toUpperCase() +
                    key.slice(1)}
                </legend>

                <label>
                  Singular {key}

                  <input
                    name={key}
                    required
                    maxLength={50}
                    value={
                      labels[key] ??
                      termLabel(labels, key)
                    }
                    onChange={(event) => {
                      setLabels((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }));
                      setSaved(false);
                    }}
                  />
                </label>

                <label>
                  Plural {key}

                  <input
                    name={`${key}_plural`}
                    required
                    maxLength={50}
                    value={
                      labels[`${key}_plural`] ??
                      termLabel(labels, key, true)
                    }
                    onChange={(event) => {
                      setLabels((current) => ({
                        ...current,
                        [`${key}_plural`]:
                          event.target.value,
                      }));
                      setSaved(false);
                    }}
                  />
                </label>
              </fieldset>
            ))}
          </div>
        </details>

        <h2>Released-score policies</h2>

        <div className="settings-grid">
          <label>
            Pass threshold (%)

            <input
              name="pass_mark"
              type="number"
              min="0"
              max="100"
              step="0.01"
              required
              defaultValue={rules.pass_mark ?? 50}
              onChange={() => setSaved(false)}
            />
          </label>

          <label>
            Repeated quiz attempts

            <select
              name="quiz_attempt_policy"
              defaultValue={
                rules.quiz_attempt_policy || "mean"
              }
              onChange={() => setSaved(false)}
            >
              <option value="mean">
                Mean for each quiz
              </option>

              <option value="best">
                Best score for each quiz
              </option>

              <option value="latest">
                Latest graded attempt for each quiz
              </option>
            </select>
          </label>

          <label>
            Missing assessment categories

            <select
              name="missing_category_policy"
              defaultValue={
                rules.missing_category_policy ||
                "normalize"
              }
              onChange={() => setSaved(false)}
            >
              <option value="normalize">
                Normalize available category weights
              </option>

              <option value="zero">
                Count missing categories as zero after
                a first released grade
              </option>
            </select>
          </label>
        </div>

        <h2>Academic protection policies</h2>
        <p className="muted">These policies protect future edits. Existing marks, attendance and finalization history are retained. Independent corrections and reasoned emergency overrides remain available.</p>
        <div className="form-grid">
          <label className="checkbox-label"><input type="checkbox" name="lock_released_grades" defaultChecked={rules.lock_released_grades ?? false} onChange={() => setSaved(false)} />Require an audited correction for released grades</label>
          <label>Attendance editing window (days)<input type="number" name="attendance_edit_window_days" min="0" max="365" step="1" defaultValue={rules.attendance_edit_window_days ?? ""} onChange={() => setSaved(false)} /><span className="muted">Blank: no time limit. Zero: same-day edits only. Older records require corrections.</span></label>
          <label>Reason for protection policy change<textarea name="policy_change_reason" maxLength={1000} placeholder="Required when changing protection or GPA policy" onChange={() => setSaved(false)} /></label>
        </div>

        {institute.kind === "university" && <section aria-label="Configured GPA policy">
          <h2>GPA and CGPA policy</h2>
          <p>Enable only when your institution uses credit-weighted grade points. The calculation divides the sum of credits × configured grade points by included credits. Failed released results are included. Missing credits and unreleased results are excluded and listed. These remain provisional calculations using current settings.</p>
          <label>Repeated courses in GPA / CGPA<select name="gpa_repeat" defaultValue={rules.gpa_policy?.repeat || ""} onChange={() => setSaved(false)}>
            <option value="">Disabled — no GPA policy configured</option>
            <option value="all">Credit weighted — include every released attempt</option>
            <option value="latest">Credit weighted — latest released attempt per subject</option>
            <option value="best">Credit weighted — best released grade points per subject</option>
          </select></label>
          <p className="muted">Configure the letter-grade points and each subject's credit hours below before enabling this policy. Record the reason for changing it above. Program totals remain separate.</p>
        </section>}

        <h2>Letter grades and points</h2>

        <p className="muted">
          Configure how released course scores are
          displayed as letter grades and points.
          Grade points are not a finalized GPA.
        </p>

        <div
          className="panel padded"
          style={{
            marginBottom: "1.25rem",
            background: "var(--surface, #f8faf8)",
          }}
        >
          <h3>Grading-scale presets</h3>

          <p className="muted">
            Start with an example scale or build your
            own. Presets are editable and are not
            automatically applied when you change
            the terminology preset.
          </p>

          <div className="settings-grid">
            <label>
              Grading scale

              <select
                value={gradingPreset}
                onChange={(event) => {
                  setGradingPreset(
                    event.target.value as GradingPreset,
                  );
                  setSaved(false);
                }}
              >
                <option value="custom">
                  Custom / current grading scale
                </option>

                <option value="university">
                  University — 4.0 scale
                </option>

                <option value="college">
                  College — simple letter grades
                </option>

                <option value="school">
                  School — percentage bands
                </option>
              </select>
            </label>
          </div>

          {gradingPreset !== "custom" && (
            <p className="muted">
              {
                GRADING_PRESETS[gradingPreset]
                  .description
              }
            </p>
          )}

          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              disabled={
                busy ||
                gradingPreset === "custom"
              }
              onClick={applyGradingPreset}
            >
              Apply grading preset
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={
                busy ||
                bands.length === 0
              }
              onClick={() => {
                setBands([]);
                setGradingPreset("custom");
                setValidationError("");
                setSaved(false);
              }}
            >
              Clear grading bands
            </Button>
          </div>

          <p className="muted">
            Applying a preset replaces the grading
            bands currently shown in this form.
            It does not change saved settings until
            you save.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "0.75rem",
          }}
        >
          <div>
            <strong>
              Current grading bands
            </strong>

            <p className="muted">
              {bands.length === 0
                ? "No letter-grade bands configured."
                : `${bands.length} grading bands configured.`}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={busy || bands.length >= 20}
            onClick={addBand}
          >
            Add grade band
          </Button>
        </div>

        {bands.length === 0 ? (
          <div
            className="panel padded"
            style={{
              textAlign: "center",
              marginBottom: "1rem",
            }}
          >
            <h3>No grading bands yet</h3>

            <p className="muted">
              Choose a grading preset above or add
              your own bands. You can also leave
              grading bands empty if your institution
              does not use letter grades.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Grade</th>
                  <th>Minimum (%)</th>
                  <th>Points</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {bands.map((band, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        aria-label={`Band ${index + 1} label`}
                        type="text"
                        maxLength={12}
                        required
                        value={band.label}
                        onChange={(event) =>
                          updateBand(
                            index,
                            "label",
                            event.target.value,
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        aria-label={`Band ${index + 1} minimum`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        required
                        value={
                          Number.isNaN(band.minimum)
                            ? ""
                            : band.minimum
                        }
                        onChange={(event) =>
                          updateBand(
                            index,
                            "minimum",
                            event.target.value,
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        aria-label={`Band ${index + 1} points`}
                        type="number"
                        min="0"
                        max="10"
                        step="0.01"
                        required
                        value={
                          Number.isNaN(band.points)
                            ? ""
                            : band.points
                        }
                        onChange={(event) =>
                          updateBand(
                            index,
                            "points",
                            event.target.value,
                          )
                        }
                      />
                    </td>

                    <td>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => removeBand(index)}
                      >
                        Remove band {index + 1}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {bands.length > 0 && (
          <p className="muted">
            Keep the bands in descending order,
            with the final band starting at 0%.
            Scores are matched against the highest
            applicable minimum.
          </p>
        )}

        {gradeValidation && (
          <p
            className="muted"
            style={{
              color: "#b42318",
              marginTop: "0.75rem",
            }}
          >
            {gradeValidation}
          </p>
        )}

        <p className="info-strip">
          Only released marks contribute.
          Changing these rules recalculates
          provisional gradebooks and future exports;
          stored predictions retain their original
          observations.
        </p>

        {validationError && (
          <p
            role="alert"
            style={{
              color: "#b42318",
              marginBottom: "0.75rem",
            }}
          >
            {validationError}
          </p>
        )}

        {!!error && (
          <ErrorState error={error} />
        )}

        {saved && (
          <p role="status">
            Settings saved.
          </p>
        )}

        <Button
          disabled={busy || !!gradeValidation}
        >
          {busy
            ? "Saving…"
            : "Save institute settings"}
        </Button>
      </form>
    </>
  );
}
