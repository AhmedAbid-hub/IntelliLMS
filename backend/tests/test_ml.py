import pytest
from ml.train import synthetic, validate, train
from ml.inference import infer


def test_dataset_validation():
    frame = synthetic(n=400)
    validate(frame)
    frame.loc[0, "feature_cutoff"] = "2026-01-01"
    with pytest.raises(ValueError, match="predate"):
        validate(frame)
    with pytest.raises(ValueError, match="300"):
        validate(synthetic(n=50))


def test_reproducible_model_pipeline(tmp_path):
    report = train(synthetic(n=400), output=tmp_path)
    assert set(report["validation_metrics"]) == {
        "logistic_regression",
        "random_forest",
        "gradient_boosting",
    }
    assert 0 <= report["test_metrics"]["roc_auc"] <= 1
    assert report["warning"].startswith("DEMO")
    assert (tmp_path / report["artifact"]).exists()
