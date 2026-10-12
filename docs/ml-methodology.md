# Machine learning methodology

Target: `risk_of_course_failure`, a binary future outcome. The model does not assign grades, make academic decisions, or label a student's permanent ability.

Inputs currently collected by the LMS:

- Attendance percentage; late counts as attended, excused excluded.
- Average percentage across released graded assignments.
- Average percentage across released graded quiz attempts.
- Completion percentage among visible published lessons.
- Count of recorded lesson completions, assignment submissions and quiz submissions.

Unrecorded dwell time, login frequency and final course grades are not invented as inputs. Manual assessment scores contribute to the gradebook but are not part of the current ML feature contract. Repeated quiz attempts are averaged; a best-attempt policy is not implemented.

## Synthetic experiment

`python -m ml.train --demo` generates 1,200 non-personal rows representing 600 synthetic student groups. The deterministic seed is 42. Feature values and binary outcomes are simulated, not learned from real students. Every inference and report uses the warning:

**DEMO — SYNTHETIC DATA — NOT VALIDATED FOR REAL STUDENT USE.**

The split is student-group-disjoint: 60% training, 20% validation, 20% test. Preprocessing is fitted inside pipelines. Median imputation is used for missing values; Logistic Regression additionally scales numeric features. Logistic Regression and Random Forest use balanced class weights. HistGradientBoosting is an unweighted comparison baseline.

Models are selected by validation F1 at threshold 0.5. The selected configuration is refit on train+validation and evaluated once on the held-out test. Reports include accuracy, precision, recall, F1, ROC-AUC, confusion matrix and Brier score. Brier score is a calibration-sensitive measure; explicit probability recalibration is not implemented.

## Historical mode

Only a trusted deployment administrator with filesystem access runs:

```bash
cd backend
python -m ml.train --historical-csv /path/to/approved-snapshots.csv
```

Required columns: `student_id,attendance_pct,assignment_pct,quiz_pct,completion_pct,activity_count,risk_of_course_failure,feature_cutoff,outcome_at`.

Validation requires at least 300 rows, 100 distinct student groups, both 0/1 classes with at least 30 rows each, at least 50% observed values per feature, valid numeric ranges and feature_cutoff strictly before outcome_at. Each split must contain both classes. These thresholds are engineering checks, not proof of statistical sufficiency or lawful collection. The administrator must establish provenance, consent/legal authority as appropriate, and accurate pre-outcome snapshots; date columns alone cannot prove leakage absence.

Historical mode remains experimental. No real dataset was available or trained in this execution. A model currently has global trusted deployment scope; separate institute-specific model registries, drift monitoring and governance approvals are future work. Do not install a real institute's model globally without reviewing data sharing and applicability.

## Inference and transparency

Artifacts live only in `backend/ml/artifacts`; there is no artifact upload API. Metadata names a file inside that directory and its SHA-256 checksum. The service verifies both before joblib loading. This detects corruption and path traversal, not malicious artifacts created by someone who already controls that trusted directory.

Inference requires at least three non-excused attendance records and two released graded assessments. Otherwise it returns `insufficient_data`. No artifact gives `model_unavailable`. Low/moderate/high categories use thresholds 0.35/0.65. Thresholds are documented defaults, not clinically or educationally validated cutoffs.

Saved estimates include student/course scope, features, probability, category, timestamp, model version and warning. The API includes descriptive low-feature context; this is not a causal explanation or SHAP attribution. Students see supportive course progress rather than risk labels.

## Adapting an external dataset

Start from the [Open University's OU Analyse dataset entry point](https://research.stem.open.ac.uk/ouanalyse/). No external dataset is automatically downloaded by this project.

Before adapting OULAD or another source, inspect its current license, documentation and feature semantics. Choose a pre-outcome cutoff per course presentation; compute only observations available by that cutoff; map outcomes explicitly; retain student IDs only as split groups. Do not map activity clicks to attendance or lesson completion unless that interpretation is justified. Missing incompatible features should remain missing, and the existing completeness validator may reject that adaptation. In that case build and validate a separately versioned feature contract rather than fabricating fields to satisfy the current model. Compare performance across course/institute contexts before considering any real use.
