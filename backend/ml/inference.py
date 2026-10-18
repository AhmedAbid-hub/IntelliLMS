import hashlib
import json
import joblib
import pandas as pd
import math
import io
from .train import ARTIFACTS, FEATURES
from . import oulad


def status():
    path = ARTIFACTS / "metadata.json"
    if not path.exists():
        return {
            "status": "model_unavailable",
            "detail": "Train the trusted public-data model with python -m ml.train --oulad.",
        }
    try:
        metadata = json.loads(path.read_text(encoding="utf-8"))
        if metadata.get("feature_schema") not in (None, oulad.SCHEMA):
            raise ValueError("Unknown feature schema")
        expected = oulad.FEATURES if metadata.get("feature_schema") == oulad.SCHEMA else FEATURES
        if metadata.get("features") != expected or (metadata.get("mode") == "external_public" and metadata.get("feature_schema") != oulad.SCHEMA):
            raise ValueError("Unsupported feature schema")
        if metadata.get("feature_schema") == oulad.SCHEMA and metadata.get("target") != oulad.TARGET:
            raise ValueError("Unsupported prediction target")
        artifact = (ARTIFACTS / metadata["artifact"]).resolve()
        if artifact.parent != ARTIFACTS.resolve() or not artifact.is_file():
            raise ValueError("Invalid artifact")
        if hashlib.sha256(artifact.read_bytes()).hexdigest() != metadata["sha256"]:
            raise ValueError("Checksum mismatch")
        return {"status": "ready", **metadata}
    except (ValueError, KeyError, OSError, TypeError):
        return {
            "status": "model_unavailable",
            "detail": "Model metadata or checksum is invalid.",
        }


def insufficient(metadata, features, counts):
    if metadata.get("feature_schema") == oulad.SCHEMA:
        if counts.get("eligible_assignments", 0) < 2:
            return "Two released assignments with distinct past deadlines and recorded submissions are required. Quiz scores cannot substitute for assignment scores."
        if not counts.get("future_assignments", 0):
            return "No published, unsubmitted assignment with a future deadline is available to predict."
        if set(features) != set(oulad.FEATURES) or any(value is None or not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= 100 for value in features.values()):
            return "The two recorded assignment percentages must be present and between 0 and 100."
    elif counts.get("attendance_records", 0) < 3 or counts.get("graded_assignments", 0) + counts.get("graded_quizzes", 0) < 2:
        return "At least 3 attendance records and 2 released graded assessments are required."
    return None


def model_info(metadata):
    return {key: metadata[key] for key in ["target", "target_label", "feature_schema", "mode", "selected_model", "source", "test_metrics", "decision_threshold", "thresholds"] if key in metadata}


def infer(features, counts, *, runtime=None):
    # A bounded class chunk shares one verified artifact and loaded model.
    metadata = runtime['metadata'] if runtime is not None else status()
    if metadata["status"] != "ready":
        return metadata
    reason = insufficient(metadata, features, counts)
    if reason:
        return {
            "status": "insufficient_data",
            "detail": reason,
            "counts": counts,
        }
    if runtime is not None and 'model' in runtime:
        model = runtime['model']
    else:
        try:
            payload = (ARTIFACTS / metadata["artifact"]).read_bytes()
            if hashlib.sha256(payload).hexdigest() != metadata["sha256"]:
                raise ValueError("Artifact changed after verification")
            model = joblib.load(io.BytesIO(payload))
        except Exception:
            return {"status": "model_unavailable", "detail": "The trusted model could not be loaded. Ask an administrator to verify the artifact."}
        if runtime is not None:
            runtime['model'] = model
    names = metadata.get("features", FEATURES)
    if list(model.feature_names_in_) != names:
        return {"status": "model_unavailable", "detail": "Model pipeline and declared feature schema disagree."}
    try:
        probability = float(model.predict_proba(pd.DataFrame([features], columns=names))[0, 1])
        if not math.isfinite(probability) or not 0 <= probability <= 1:
            raise ValueError("Invalid probability")
    except Exception:
        return {"status": "model_unavailable", "detail": "The model could not evaluate the recorded inputs."}
    thresholds = metadata.get("thresholds", {"moderate": .35, "high": .65})
    category = (
        "high" if probability >= thresholds["high"] else "moderate" if probability >= thresholds["moderate"] else "low"
    )
    factors = [
        {
            "feature": name,
            "value": features[name],
            "context": "Observed value below 60%; descriptive context, not a causal explanation.",
        }
        for name in names
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
        "model_info": model_info(metadata),
    }
