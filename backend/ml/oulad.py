"""Public OULAD acquisition and time-ordered assignment snapshots (no LMS data)."""
import hashlib
import json
from pathlib import Path
import urllib.request
import zipfile

import pandas as pd

SOURCE = "https://doi.org/10.6084/m9.figshare.5081998.v1"
DOWNLOAD = "https://ndownloader.figshare.com/files/8606371"
MD5 = "7412686fd77cf0e0ee1e8c3e9b354308"
DATA = Path(__file__).resolve().parent / "data" / "oulad"
FEATURES = ["previous_assignment_pct", "latest_assignment_pct"]
SCHEMA = "oulad-tma-sequence-v1"
TARGET = "next_submitted_assignment_below_40"
TARGET_LABEL = "Next submitted assignment score below 40%"
WARNING = ("EXPERIMENTAL — evaluated on external public OULAD data, not validated on "
           "IntelliLMS students. Conditional on submitting another assignment; not course failure or dropout.")


def download(directory=DATA):
    """Download publisher's pinned archive; verify before reading allowlisted files."""
    directory.mkdir(parents=True, exist_ok=True)
    archive = directory / "anonymisedData.zip"
    if not archive.exists():
        temporary = directory / "download.part"
        with urllib.request.urlopen(DOWNLOAD, timeout=120) as source, temporary.open("wb") as out:
            while block := source.read(1024 * 1024):
                out.write(block)
        temporary.replace(archive)
    if hashlib.md5(archive.read_bytes()).hexdigest() != MD5:
        raise ValueError("OULAD archive checksum mismatch; refusing unverified data.")
    with zipfile.ZipFile(archive) as zipped:
        for name in ["assessments.csv", "studentAssessment.csv"]:
            candidates = [n for n in zipped.namelist() if Path(n).name == name]
            if len(candidates) != 1:
                raise ValueError("Expected exactly one " + name)
            (directory / name).write_bytes(zipped.read(candidates[0]))
    return directory


def prepare(directory=DATA):
    assessments = pd.read_csv(directory / "assessments.csv")
    submissions = pd.read_csv(directory / "studentAssessment.csv")
    if assessments.id_assessment.duplicated().any() or submissions.duplicated(["id_student", "id_assessment"]).any():
        raise ValueError("Duplicate assessment or student-assessment keys.")
    merged = submissions.merge(assessments, on="id_assessment", validate="many_to_one")
    # Only genuine, current-presentation, tutor-marked scores. Missing scores are
    # excluded, never filled with success/failure labels or fabricated observations.
    valid = merged.loc[(merged.assessment_type == "TMA") & (merged.is_banked == 0)
        & merged.score.between(0, 100) & merged.date.notna() & merged.date_submitted.notna()].copy()
    rows = []
    for (student, module, presentation), group in valid.groupby(["id_student", "code_module", "code_presentation"], sort=True):
        sequence = list(group.sort_values(["date", "id_assessment"]).itertuples())
        for index in range(2, len(sequence)):
            previous, latest, outcome = sequence[index-2:index+1]
            cutoff = max(previous.date, previous.date_submitted, latest.date, latest.date_submitted)
            # Previous deadlines precede the outcome deadline; both previous
            # submissions/deadlines precede the outcome submission. This can
            # include late-submission windows (disclosed in the methodology).
            if not (previous.date < latest.date < outcome.date and cutoff < outcome.date_submitted):
                continue
            rows.append({
                "student_id": str(student), "module": module, "presentation": presentation,
                "previous_assignment_pct": float(previous.score), "latest_assignment_pct": float(latest.score),
                "target": int(outcome.score < 40), "feature_cutoff_day": int(cutoff),
                "outcome_day": int(outcome.date_submitted), "outcome_assessment": int(outcome.id_assessment),
            })
    frame = pd.DataFrame(rows)
    if frame.empty or not (frame.feature_cutoff_day < frame.outcome_day).all():
        raise ValueError("No valid chronological OULAD snapshots.")
    provenance = {
        "name": "Open University Learning Analytics Dataset (OULAD)", "source_url": SOURCE,
        "download_url": DOWNLOAD, "license": "CC BY 4.0", "license_url": "https://creativecommons.org/licenses/by/4.0/",
        "citation": "Kuzilek, Hlosta & Zdrahal (2017), Scientific Data 4:170171, doi:10.1038/sdata.2017.171",
        "archive_md5": MD5, "archive_sha256": hashlib.sha256((directory / "anonymisedData.zip").read_bytes()).hexdigest(),
        "raw_assessment_rows": len(assessments), "raw_student_assessment_rows": len(submissions),
        "usable_tma_scores": len(valid), "snapshot_rows": len(frame), "unique_students": frame.student_id.nunique(),
        "positive_rows": int(frame.target.sum()),
        "transformation": "Two preceding non-banked TMA scores ordered by deadline; target next submitted TMA score <40. Strict earlier submission/deadline cutoff; no demographics, final results, exams, CMA, clicks or attendance.",
        "limitations": "Score release timestamps are absent in OULAD; historical availability after submission/deadline is an assumption. Live inference requires released scores. Non-submitters/withdrawal are not negative outcomes. Same-source holdout is not local, temporal or institution-external validation.",
    }
    return frame, provenance


if __name__ == "__main__":
    frame, provenance = prepare(download())
    print(json.dumps(provenance, indent=2))
