# Analytics and experimental machine learning

The detailed code map and methodology remain in [AI_ML_CODE_MAP.md](AI_ML_CODE_MAP.md), [ml-methodology.md](ml-methodology.md) and [model-evaluation.md](model-evaluation.md). This guide identifies current implementation entry points.

| Feature | Frontend | Backend |
|---|---|---|
| Role dashboards | [Dashboard dispatcher](../frontend/src/features/analytics/Dashboard.tsx), [role bodies](../frontend/src/features/analytics/dashboards), [PlatformDashboard](../frontend/src/features/analytics/PlatformDashboard.tsx) | [dashboards.py](../backend/apps/insights/views/dashboards.py) |
| Gradebook / CSV | [Gradebook](../frontend/src/features/analytics/Gradebook.tsx) | [grade_reports.py](../backend/apps/insights/views/grade_reports.py), [gradebook.py](../backend/apps/insights/gradebook.py) |
| Progress / comparisons / workload | [Trends](../frontend/src/features/analytics/Trends.tsx) and its existing focused components | [reporting.py](../backend/apps/insights/reporting.py), [course_reports.py](../backend/apps/insights/course_reports.py), [workload.py](../backend/apps/insights/workload.py) |
| Saved risk estimates | [Predictions](../frontend/src/features/analytics/Predictions.tsx), [PredictionAvailability](../frontend/src/features/analytics/PredictionAvailability.tsx) | [prediction views](../backend/apps/insights/views/predictions.py), [readiness.py](../backend/apps/insights/readiness.py) |
| Class analysis | [ClassAnalysis](../frontend/src/features/analytics/ClassAnalysis.tsx) | [batch.py](../backend/apps/insights/batch.py), [prediction_inputs.py](../backend/apps/insights/prediction_inputs.py) |
| Model loading and inference | UI reads status; no browser model upload | [inference.py](../backend/ml/inference.py), preserved local artifacts |

The active OULAD model uses two preceding eligible released assignment percentages to estimate whether the **next submitted assignment scores below 40%**. It does not predict final course failure, dropout or attendance. Attendance, quiz and activity indicators are separate academic context.

Held-out OULAD evaluation is not validation on IntelliLMS students. Preserve version labels, feature schema, thresholds, warnings, unavailable states and older synthetic-model history. The refactor does not retrain, replace or alter the artifact. Arbitrary pickle uploads remain forbidden.

Institute Admin and department-management views read authorized results. Generation requires an assigned teacher or an authorized Head's teaching workspace. Zero current estimates is not evidence of zero risk: [the Learning Insights investigation](learning-insights-20261019.md) distinguishes active-model coverage, eligibility and older-model records.
