# Real public-data prediction methodology

The active model is an extension of the existing trusted IntelliLMS ML pipeline. It estimates **the probability that the next submitted assignment scores below 40%**, conditional on another assignment being submitted. It does not estimate course failure, dropout, permanent ability, attendance or whether a student will submit work. Predictions never change marks, enrollment or progression decisions.

## Source and choice

Selected: **Open University Learning Analytics Dataset (OULAD), version 1**, by Jakub Kuzilek, Martin Hlosta and Zdenek Zdrahal (2017). [Publisher dataset and DOI](https://doi.org/10.6084/m9.figshare.5081998.v1), [Open University dataset page](https://research.stem.open.ac.uk/ouanalyse/dataset/), [data descriptor](https://doi.org/10.1038/sdata.2017.171). Dataset license: [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). Attribution applies to the downloaded data and this derived score-sequence experiment; no authors endorse IntelliLMS.

The pinned publisher archive is `https://ndownloader.figshare.com/files/8606371` (46,750,706 bytes); publisher MD5 `7412686fd77cf0e0ee1e8c3e9b354308`, observed SHA256 `90dda45037939953f979072fa70a809ebe07e90ec783c408762af7698a3825ec`. The downloader verifies the archive and reads only the two named assessment CSVs; it does not extract arbitrary archive paths. Downloads remain ignored local training data, outside the LMS database and production image context.

OULAD provides dated tutor-marked assessment (TMA) submissions and 0–100 marks; below 40 is its documented assessment failure outcome. These match the LMS assignment/teacher-marking workflow more directly than UCI Student Performance's first/second-period grades, or UCI Dropout/Academic Success's admissions, financial and semester-summary variables. Neither alternative's period aggregates should be relabeled as individual assignment marks. OULAD VLE clicks are not LMS Activity events; no attendance, quiz, completion or click values are synthesized or substituted.

## Actual records and transformation

The downloaded tables contain **206 assessment rows and 173,912 student-assessment rows**. Retaining non-banked TMA rows with genuine scores and submission/deadline dates yields **96,916 usable scores**. Rolling three-score sequences within each student/module/presentation yield **50,815 eligible prediction examples from 18,136 distinct students**, including **3,098 positive outcomes**. Examples are not independent people; a student may contribute several sequences.

For each target assignment, only its two preceding scored TMA assignments, ordered by deadline, become inputs. Prior deadlines must be strictly increasing and precede the target deadline. The latest of the two prior submission dates and deadlines must strictly precede the target submission date. Same-day/future-known lookahead examples are rejected. Missing scores/dates, banked credits, exams and computer-marked assessments are excluded, not converted into pass/fail labels. Missing/non-submitted outcomes are not assumed to be failures. Only `score < 40` on the target submission creates the label; no final-result/demographic field is read.

The preparation permits late-submission windows: **37 of 50,815 examples** have an input cutoff on or after the target deadline, while still strictly before its actual submission. Live inference has a more conservative future-deadline gate and excludes those operational situations. This is a training/deployment eligibility difference; the reported evaluation includes those 37 examples. This post-training audit corrected the description without changing the selected model or tuning on test outcomes.

**Important timing limitation:** OULAD does not provide score-release timestamps. Historical score availability after its submission and deadline is an assumption, not a proven fact. The implementation prevents known future-score leakage, but cannot reconstruct unknown historical marking delays. Live inference is stricter: both input marks must actually be released. A dataset with grade-publication timestamps would be needed to remove this limitation.

## Versioned training/inference contract

Schema: `oulad-tma-sequence-v1`.

| Input | Training | IntelliLMS inference |
|---|---|---|
| `previous_assignment_pct` | Earlier of the two preceding valid TMA scores | Earlier of the two most recent released assignment marks, divided by assignment maximum ×100 |
| `latest_assignment_pct` | More recent preceding valid TMA score | More recent released assignment marks, divided by assignment maximum ×100 |

The LMS requires two published assignments with distinct past deadlines, recorded submissions no later than now, valid released marks and an upcoming published unsubmitted assignment. It refuses insufficient or out-of-range inputs instead of imputing missing student records. Upcoming assignment details are contextual, not model features. The target remains the next submitted assignment, which could differ from the next scheduled assignment if the student skips work. Previously submitted but ungraded work is not predicted retrospectively.

Attendance, released quiz grades, completion and course grades remain actual academic indicators in Analyze Class; they are not public-model inputs. Their absence does not block an otherwise eligible estimate. Low indicators are descriptive context, not causal explanations.

## Experiment and selection

Student-group-disjoint splits use seeds 42 and 43: 30,485 training / 10,176 validation / 10,154 test examples, from 10,881 / 3,627 / 3,628 students. A student appearing in multiple courses stays in one partition. All partitions contain both outcomes. No random row split, cross-partition duplicate student, oversampling or outcome-derived feature is used. This is a same-source student holdout, not an institution or chronological holdout.

Compared prevalence baseline, logistic regression, Random Forest and HistGradientBoosting. Each pipeline fits preprocessing on training only: defensive median imputation and, for logistic regression, StandardScaler. Eligible score pairs are complete, and live missing inputs are refused. Models are unweighted to preserve observed prevalence. Candidate/threshold selection uses validation F1 only (lower Brier breaks ties); probability thresholds are searched on a fixed 0.05–0.50 grid in steps of 0.01. The selected configuration is refit on training+validation and measured on the held-out test. Test outcomes are not used to tune it. A second identical-data execution added the majority-baseline report; it did not tune candidates or thresholds using test results.

See [measured evaluation](model-evaluation.md) for all values and the confusion matrix. Histogram gradient boosting was selected; its limited precision and recall require caution. Probability outputs have not undergone local calibration or a fairness/utility study. No demographic inputs is not proof of fairness.

## Artifacts, security and history

`python -m ml.train --oulad` uses the existing artifact folder, model-status endpoint and inference service. It saves the preprocessing pipeline in a trusted local joblib file, immutable version-named JSON, and an atomic active `metadata.json` pointer. Metadata includes feature units/schema, dataset DOI/license/checksums, row counts, package version, full candidate parameters, code hash, group-split hashes/sizes, validation and test metrics, threshold and warning. Joblib files are ignored build artifacts, reproduced by the command; no model upload or remote pickle-loading API exists. File confinement and SHA256 are checked before deserialization; control of the trusted model directory remains an administrative trust boundary.

The global model contains only public training data. Inference reads only the selected institute/course/student's authorized records. Individual and class generation require a personally assigned instructor; a Head must enter the capability-checked teaching workspace. Admin/Head oversight can read within existing scope. Authorization is checked again on each batch. Student, foreign-tenant, withdrawn membership and revoked instructor denial are tested. Class runs advance ten learners at a time and reuse identical inputs/model/assessment context. Individual generation stores a new dated estimate as before.

Additive `insights.0003_prediction_context` saves model/target/source/metrics and input assignment evidence per prediction. Existing synthetic predictions remain unchanged with their own warnings; changing the active model cannot relabel them as real-data results. Summary counts include only the active public model's estimates, while history retains older versions and targets. No academic records are sent to the public dataset host.

## Reproduce training and the demonstration

From the repository root with the existing locked environment:

```powershell
$env:PYTHONUTF8='1'
cd backend
..\.venv\Scripts\python.exe -m ml.train --oulad
# Optional non-activating output directory:
# ..\.venv\Scripts\python.exe -m ml.train --oulad --output test-results/public-model-reproduction
```

The command downloads only if the archive is absent and always verifies it. Reproduction requires network access for that first 47 MB download, the pinned dependencies and local disk access. The model does not require a dataset download to perform inference. CI configuration now trains the public model before backend/browser verification; hosted CI was not executed locally.

```powershell
cd frontend
npx.cmd playwright test e2e/real-data-ml.spec.ts
```

Playwright starts a fresh isolated SQLite browser database; it never resets or reseeds the real PostgreSQL database. The guarded fixture uses existing fictional `university.teacher` and student accounts with their seeded marks, setting two assignment deadlines/submission dates into the past **only in that disposable fixture**. The teacher opens the course, selects AI insights, runs Analyze Class, reviews the source/inputs, generates an individual estimate and checks saved history. Screenshots are retained in `backend/test-results/real-data-ml/`. Outside this fixture, existing live demo assignments with future deadlines may correctly produce insufficient-data messages; no live dates or grades are silently adjusted.

Legacy `--demo` and authorized `--historical-csv` commands remain for compatibility and use their original five-feature schema/warnings. They activate that schema explicitly; do not run them expecting to preserve the active OULAD model. No legacy synthetic result is evidence of real-data performance.
