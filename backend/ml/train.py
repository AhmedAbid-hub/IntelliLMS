"""Reproducible grouped train/validation/test experiment. Run: python -m ml.train --demo."""

import argparse
import hashlib
import json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.model_selection import GroupShuffleSplit
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    brier_score_loss,
    ConfusionMatrixDisplay,
)

FEATURES = [
    "attendance_pct",
    "assignment_pct",
    "quiz_pct",
    "completion_pct",
    "activity_count",
]
WARNING = "DEMO — SYNTHETIC DATA — NOT VALIDATED FOR REAL STUDENT USE"
ARTIFACTS = Path(__file__).resolve().parent / "artifacts"


def synthetic(seed=42, n=1200):
    rng = np.random.default_rng(seed)
    ability = rng.beta(3, 2, n)
    frame = pd.DataFrame(
        {
            name: np.clip(ability * 100 + rng.normal(0, 18, n), 0, 100)
            for name in FEATURES[:4]
        }
    )
    frame["activity_count"] = rng.poisson(ability * 20 + 1)
    probability = 1 / (
        1
        + np.exp(
            (frame.assignment_pct + frame.quiz_pct + frame.attendance_pct - 155) / 28
        )
    )
    frame["risk_of_course_failure"] = rng.binomial(1, probability)
    frame["student_id"] = [f"synthetic-{i//2}" for i in range(n)]
    frame["feature_cutoff"] = "2025-10-01"
    frame["outcome_at"] = "2025-12-20"
    return frame


def validate(frame):
    required = FEATURES + [
        "student_id",
        "risk_of_course_failure",
        "feature_cutoff",
        "outcome_at",
    ]
    if set(required) - set(frame):
        raise ValueError("Missing required columns: " + str(set(required) - set(frame)))
    if len(frame) < 300 or frame.student_id.nunique() < 100:
        raise ValueError("At least 300 rows and 100 distinct students required.")
    if frame.student_id.isna().any():
        raise ValueError("Student group IDs are required.")
    if set(frame.risk_of_course_failure.unique()) != {0, 1}:
        raise ValueError("Binary 0/1 outcome labels required, with both classes.")
    if frame.risk_of_course_failure.value_counts().min() < 30:
        raise ValueError("At least 30 rows per outcome class required.")
    if not (
        pd.to_datetime(frame.feature_cutoff, errors="raise")
        < pd.to_datetime(frame.outcome_at, errors="raise")
    ).all():
        raise ValueError("Every feature snapshot must predate its outcome.")
    for col in FEATURES:
        frame[col] = pd.to_numeric(frame[col], errors="raise")
        valid = frame[col].dropna()
        if (
            not np.isfinite(valid).all()
            or (valid < 0).any()
            or (col != "activity_count" and (valid > 100).any())
        ):
            raise ValueError("Invalid feature range: " + col)
        if frame[col].notna().mean() < 0.5:
            raise ValueError("Insufficient feature coverage: " + col)


def metrics(y, p):
    pred = (p >= 0.5).astype(int)
    return {
        "accuracy": accuracy_score(y, pred),
        "precision": precision_score(y, pred, zero_division=0),
        "recall": recall_score(y, pred, zero_division=0),
        "f1": f1_score(y, pred, zero_division=0),
        "roc_auc": roc_auc_score(y, p),
        "brier_score": brier_score_loss(y, p),
        "confusion_matrix": confusion_matrix(y, pred).tolist(),
    }


def train(frame, demo=True, output=ARTIFACTS):
    validate(frame)
    output.mkdir(parents=True, exist_ok=True)
    trainval, test = next(
        GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42).split(
            frame, groups=frame.student_id
        )
    )
    a, b = next(
        GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=43).split(
            frame.iloc[trainval], groups=frame.iloc[trainval].student_id
        )
    )
    train_idx, val_idx = trainval[a], trainval[b]
    x = frame[FEATURES]
    y = frame.risk_of_course_failure
    for indices in [train_idx, val_idx, test]:
        if y.iloc[indices].nunique() != 2:
            raise ValueError("Each split must contain both outcome classes.")
    candidates = {
        "logistic_regression": make_pipeline(
            SimpleImputer(strategy="median"),
            StandardScaler(),
            LogisticRegression(class_weight="balanced", random_state=42, max_iter=1000),
        ),
        "random_forest": make_pipeline(
            SimpleImputer(strategy="median"),
            RandomForestClassifier(
                n_estimators=150,
                max_depth=6,
                class_weight="balanced",
                random_state=42,
                n_jobs=1,
            ),
        ),
        "gradient_boosting": make_pipeline(
            SimpleImputer(strategy="median"),
            HistGradientBoostingClassifier(
                max_iter=100, max_leaf_nodes=15, random_state=42
            ),
        ),
    }
    validation = {}
    for name, model in candidates.items():
        model.fit(x.iloc[train_idx], y.iloc[train_idx])
        validation[name] = metrics(
            y.iloc[val_idx], model.predict_proba(x.iloc[val_idx])[:, 1]
        )
    best = max(validation, key=lambda name: validation[name]["f1"])
    model = candidates[best]
    # Selection uses validation only; the held-out test is evaluated once.
    model.fit(x.iloc[trainval], y.iloc[trainval])
    test_metrics = metrics(y.iloc[test], model.predict_proba(x.iloc[test])[:, 1])
    version = ("demo-" if demo else "historical-") + hashlib.sha256(
        frame.to_csv(index=False).encode()
    ).hexdigest()[:12]
    metadata = {
        "version": version,
        "target": "risk_of_course_failure",
        "features": FEATURES,
        "mode": "demo" if demo else "historical",
        "warning": (
            WARNING
            if demo
            else "EXPERIMENTAL HISTORICAL MODEL — NOT VALIDATED FOR ACADEMIC DECISIONS"
        ),
        "selected_model": best,
        "seed": 42,
        "rows": len(frame),
        "split_sizes": {
            "train": len(train_idx),
            "validation": len(val_idx),
            "test": len(test),
        },
        "split_strategy": "Student-group-disjoint 60/20/20; validation F1 selection; refit train+validation; test once",
        "validation_metrics": validation,
        "test_metrics": test_metrics,
        "thresholds": {"moderate": 0.35, "high": 0.65},
    }
    artifact = output / (version + ".joblib")
    joblib.dump(model, artifact)
    metadata["artifact"] = artifact.name
    metadata["sha256"] = hashlib.sha256(artifact.read_bytes()).hexdigest()
    (output / "metadata.json").write_text(
        json.dumps(metadata, indent=2), encoding="utf-8"
    )
    (output / (version + ".json")).write_text(
        json.dumps(metadata, indent=2), encoding="utf-8"
    )
    ConfusionMatrixDisplay(
        np.array(test_metrics["confusion_matrix"]), display_labels=["Pass", "Failure"]
    ).plot()
    plt.title(
        "Synthetic demonstration" if demo else "Historical holdout (experimental)"
    )
    plt.savefig(output / "confusion-matrix.png", bbox_inches="tight")
    plt.close()
    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--demo", action="store_true")
    group.add_argument("--historical-csv", type=Path)
    args = parser.parse_args()
    data = synthetic() if args.demo else pd.read_csv(args.historical_csv)
    report = train(data, demo=args.demo)
    print(json.dumps(report, indent=2))
