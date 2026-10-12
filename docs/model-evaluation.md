# Model evaluation report

**DEMO — SYNTHETIC DATA — NOT VALIDATED FOR REAL STUDENT USE.**

Executed locally on 10 October 2026 with Python 3.12 and the pinned dependency environment. Reproduce using `python -m ml.train --demo` from backend. Machine-readable output is `backend/ml/artifacts/demo-1ebe68e4d646.json` and the chart is `backend/ml/artifacts/confusion-matrix.png`.

Dataset: 1,200 simulated rows, 600 synthetic groups; 720 training / 240 validation / 240 test rows. Student groups are disjoint across subsets.

| Model | Validation F1 | Validation ROC-AUC | Validation Brier |
|---|---:|---:|---:|
| Logistic Regression | 0.8023 | 0.9141 | 0.1137 |
| Random Forest | 0.7674 | 0.9085 | 0.1183 |
| HistGradientBoosting | 0.6951 | 0.8728 | 0.1473 |

Logistic Regression was selected using validation F1, then refit on training+validation. Held-out test results:

| Metric | Value |
|---|---:|
| Accuracy | 0.8292 |
| Precision | 0.7327 |
| Recall | 0.8409 |
| F1 | 0.7831 |
| ROC-AUC | 0.9211 |
| Brier score | 0.1180 |

Confusion matrix at 0.5: true negatives 125, false positives 27, false negatives 14, true positives 74. Operational display categories use different thresholds (0.35 and 0.65), so these binary test metrics do not validate those categories.

These values measure how well models recover the synthetic generator's relationships. They provide no evidence of real-world educational predictive validity. No fairness assessment, external validation, confidence intervals, or institution-specific calibration was performed. Demographic attributes are absent; that alone does not establish fairness.
