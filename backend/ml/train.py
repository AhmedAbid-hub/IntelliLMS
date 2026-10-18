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
    average_precision_score,
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


def metrics(y, p, threshold=0.5):
    pred = (p >= threshold).astype(int)
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


def train_oulad(directory=None, output=ARTIFACTS):
    """Extend the trusted artifact experiment with an explicit public-data schema."""
    import sklearn
    from sklearn.dummy import DummyClassifier
    from . import oulad

    frame, source = oulad.prepare(directory or oulad.download())
    groups = frame.student_id
    trainval, test = next(GroupShuffleSplit(n_splits=1, test_size=.2, random_state=42).split(frame, groups=groups))
    a, b = next(GroupShuffleSplit(n_splits=1, test_size=.25, random_state=43).split(frame.iloc[trainval], groups=groups.iloc[trainval]))
    train_idx, val_idx = trainval[a], trainval[b]
    splits = {"train": train_idx, "validation": val_idx, "test": test}
    x, y = frame[oulad.FEATURES], frame.target
    for name, indices in splits.items():
        if y.iloc[indices].nunique() != 2:
            raise ValueError("Both outcome classes required in " + name)
    if any(set(groups.iloc[splits[left]]) & set(groups.iloc[splits[right]])
           for left, right in [("train", "validation"), ("train", "test"), ("validation", "test")]):
        raise ValueError("Student leakage across partitions.")
    # No reweighting/resampling: preserve observed prevalence for probability estimates.
    candidates = {
        "prevalence_baseline": make_pipeline(SimpleImputer(strategy="median"), DummyClassifier(strategy="prior")),
        "logistic_regression": make_pipeline(SimpleImputer(strategy="median"), StandardScaler(), LogisticRegression(max_iter=1000, random_state=42)),
        "random_forest": make_pipeline(SimpleImputer(strategy="median"), RandomForestClassifier(n_estimators=200, max_depth=6, min_samples_leaf=30, random_state=42, n_jobs=1)),
        "gradient_boosting": make_pipeline(SimpleImputer(strategy="median"), HistGradientBoostingClassifier(max_iter=100, max_leaf_nodes=7, min_samples_leaf=40, l2_regularization=1, random_state=42)),
    }
    validation, thresholds = {}, {}
    for name, model in candidates.items():
        model.fit(x.iloc[train_idx], y.iloc[train_idx])
        probabilities = model.predict_proba(x.iloc[val_idx])[:, 1]
        grid = np.arange(.05, .51, .01)
        threshold = float(max(grid, key=lambda t: f1_score(y.iloc[val_idx], probabilities >= t, zero_division=0)))
        thresholds[name] = round(threshold, 2)
        validation[name] = metrics(y.iloc[val_idx], probabilities, thresholds[name])
        validation[name]["average_precision"] = average_precision_score(y.iloc[val_idx], probabilities)
    best = max(validation, key=lambda name: (validation[name]["f1"], -validation[name]["brier_score"]))
    if best == "prevalence_baseline":
        raise ValueError("No candidate improves on the simple baseline; refusing activation.")
    model = candidates[best]
    model.fit(x.iloc[trainval], y.iloc[trainval])
    probabilities = model.predict_proba(x.iloc[test])[:, 1]
    measured = metrics(y.iloc[test], probabilities, thresholds[best])
    measured["average_precision"] = average_precision_score(y.iloc[test], probabilities)
    baseline = candidates["prevalence_baseline"]
    baseline.fit(x.iloc[trainval], y.iloc[trainval])
    baseline_metrics = metrics(y.iloc[test], baseline.predict_proba(x.iloc[test])[:, 1], thresholds["prevalence_baseline"])
    config = {"schema": oulad.SCHEMA, "seed": 42, "validation_seed": 43, "sklearn": sklearn.__version__,
              "selection": "Validation F1, tie break lower Brier; threshold grid 0.05..0.50 step 0.01; refit train+validation; held-out test once",
              "candidate_parameters": {name: {k: str(v) for k, v in candidate.get_params().items()} for name, candidate in candidates.items()},
              "code_sha256": hashlib.sha256(Path(__file__).read_bytes() + Path(oulad.__file__).read_bytes()).hexdigest()}
    version = "oulad-" + hashlib.sha256((frame.to_csv(index=False) + json.dumps(config, sort_keys=True)).encode()).hexdigest()[:16]
    metadata = {"version": version, "target": oulad.TARGET, "target_label": oulad.TARGET_LABEL,
        "features": oulad.FEATURES, "feature_schema": oulad.SCHEMA, "mode": "external_public", "warning": oulad.WARNING,
        "selected_model": best, "seed": 42, "rows": len(frame), "source": source, "training_configuration": config,
        "preprocessing": "Complete observed score pairs only; train-fitted median imputer (defensive) and StandardScaler for logistic regression; live missing scores rejected, never imputed.",
        "feature_units": {name: "Recorded assignment marks / maximum marks * 100" for name in oulad.FEATURES},
        "split_sizes": {name: len(indices) for name, indices in splits.items()},
        "split_students": {name: groups.iloc[indices].nunique() for name, indices in splits.items()},
        "split_positive_rows": {name: int(y.iloc[indices].sum()) for name, indices in splits.items()},
        "split_hashes": {name: hashlib.sha256('\n'.join(sorted(set(groups.iloc[indices]))).encode()).hexdigest() for name, indices in splits.items()},
        "split_strategy": "Student-group-disjoint seeded 60/20/20; repeated students across courses remain in one partition. No temporal/institution holdout claim.",
        "validation_metrics": validation, "validation_thresholds": thresholds, "test_metrics": measured,
        "test_baseline_metrics": baseline_metrics, "decision_threshold": thresholds[best],
        "test_majority_metrics": metrics(y.iloc[test], baseline.predict_proba(x.iloc[test])[:, 1], .5),
        "thresholds": {"moderate": thresholds[best], "high": round(min(.95, thresholds[best] + .2), 2)},
        "category_note": "Exploratory support bands, not validated intervention cutoffs; classification threshold selected only on validation data.",
    }
    output.mkdir(parents=True, exist_ok=True)
    artifact = output / (version + ".joblib")
    joblib.dump(model, artifact)
    metadata.update(artifact=artifact.name, sha256=hashlib.sha256(artifact.read_bytes()).hexdigest())
    encoded = json.dumps(metadata, indent=2)
    (output / (version + ".json")).write_text(encoded, encoding="utf-8")
    # Activate only after the full artifact and immutable metadata are saved.
    temporary = output / "metadata.pending.json"
    temporary.write_text(encoded, encoding="utf-8")
    temporary.replace(output / "metadata.json")
    ConfusionMatrixDisplay(np.array(measured["confusion_matrix"]), display_labels=["At least 40%", "Below 40%"]).plot()
    plt.title("OULAD student-disjoint holdout: next submitted assignment")
    plt.savefig(output / (version + "-confusion-matrix.png"), bbox_inches="tight")
    plt.close()
    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--demo", action="store_true")
    group.add_argument("--historical-csv", type=Path)
    group.add_argument("--oulad", action="store_true")
    parser.add_argument("--output", type=Path, default=ARTIFACTS)
    args = parser.parse_args()
    if args.oulad:
        report = train_oulad(output=args.output)
    else:
        data = synthetic() if args.demo else pd.read_csv(args.historical_csv)
        report = train(data, demo=args.demo, output=args.output)
    print(json.dumps(report, indent=2))
