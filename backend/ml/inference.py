import hashlib
import json
import joblib
import pandas as pd
from .train import ARTIFACTS, FEATURES


def status():
    path = ARTIFACTS / "metadata.json"
    if not path.exists():
        return {
            "status": "model_unavailable",
            "detail": "Train a trusted local model with python -m ml.train --demo.",
        }
    try:
        metadata = json.loads(path.read_text(encoding="utf-8"))
        artifact = (ARTIFACTS / metadata["artifact"]).resolve()
        if artifact.parent != ARTIFACTS.resolve() or not artifact.is_file():
            raise ValueError("Invalid artifact")
        if hashlib.sha256(artifact.read_bytes()).hexdigest() != metadata["sha256"]:
            raise ValueError("Checksum mismatch")
        return {"status": "ready", **metadata}
    except (ValueError, KeyError, OSError):
        return {
            "status": "model_unavailable",
            "detail": "Model metadata or checksum is invalid.",
        }


def infer(features, counts, *, runtime=None):
    # A bounded class chunk shares one verified artifact and loaded model.
    metadata = runtime['metadata'] if runtime is not None else status()
    if metadata["status"] != "ready":
        return metadata
    if (
        counts["attendance_records"] < 3
        or counts["graded_assignments"] + counts["graded_quizzes"] < 2
    ):
        return {
            "status": "insufficient_data",
            "detail": "At least 3 attendance records and 2 released graded assessments are required.",
            "counts": counts,
        }
    if runtime is not None and 'model' in runtime:
        model = runtime['model']
    else:
        model = joblib.load(ARTIFACTS / metadata["artifact"])
        if runtime is not None:
            runtime['model'] = model
    probability = float(
        model.predict_proba(pd.DataFrame([features], columns=FEATURES))[0, 1]
    )
    category = (
        "high" if probability >= 0.65 else "moderate" if probability >= 0.35 else "low"
    )
    factors = [
        {
            "feature": name,
            "value": features[name],
            "context": "Observed value below 60%; descriptive context, not a causal explanation.",
        }
        for name in FEATURES[:4]
        if features[name] is not None and features[name] < 60
    ]
    return {
        "status": "ready",
        "probability": probability,
        "category": category,
        "version": metadata["version"],
        "warning": metadata["warning"],
        "features": features,
        "factors": factors,
    }
