import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ErrorState, PageHeader } from "../../components/shared";
import { Button } from "../../components/ui/button";
import { api, post, type RecordData } from "../../lib/api";
import { InvitationReview } from "./InvitationReview";
import {
  empty,
  fieldGridStyle,
  PlacementFields,
  placementPayload,
} from "./admission/PlacementFields";

export type Review = {
  preview: boolean;
  membership: string | null;
  replayed: boolean;
  identity: Record<string, string>;
  placement: Record<string, string | null>;
  offerings: { id: string; title: string }[];
  invitation: string;
};

export function StudentAdmission() {
  const [details, setDetails] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    student_identifier: "",
  });

  const [placement, setPlacement] = useState(empty);
  const [step, setStep] = useState(0);
  const [key] = useState(() => crypto.randomUUID());
  const [review, setReview] = useState<Review>();
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);

  const client = useQueryClient();

  const saved = useQuery({
    queryKey: ["admitted-member", review?.membership],
    queryFn: () => api<RecordData>(`memberships/${review?.membership}/`),
    enabled: step === 3 && !!review?.membership,
  });

  async function submit(preview: boolean) {
    setBusy(true);
    setError(undefined);

    try {
      const data = await post<Review>("admissions/", {
        ...details,
        ...placementPayload(placement),
        key,
        preview,
      });

      setReview(data);
      setStep(preview ? 2 : 3);

      if (!preview) {
        await client.invalidateQueries();
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Add Student"
        description="Admit a learner, review their placement and enroll them in one guided workflow."
      />

      <ol className="admission-progress" aria-label="Admission progress">
        {["Student details", "Academic placement", "Review", "Created"].map(
          (label, index) => (
            <li aria-current={step === index ? "step" : undefined} key={label}>
              {index + 1}. {label}
            </li>
          ),
        )}
      </ol>

      <section className="panel padded admission-panel">
        {!!error && <ErrorState error={error} />}

        {step === 0 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(undefined);
              setStep(1);
            }}
          >
            <h2>Student details</h2>

            <div className="admission-fields" style={fieldGridStyle}>
              {Object.entries({
                first_name: "First name",
                last_name: "Last name",
                email: "Email",
                student_identifier: "Student ID / roll number",
                username: "Username",
              }).map(([field, label]) => (
                <label key={field}>
                  {label}
                  <input
                    required
                    type={field === "email" ? "email" : "text"}
                    maxLength={
                      field === "student_identifier"
                        ? 64
                        : field === "email"
                          ? 254
                          : 150
                    }
                    value={details[field as keyof typeof details]}
                    onChange={(e) =>
                      setDetails({
                        ...details,
                        [field]: e.target.value,
                      })
                    }
                  />
                </label>
              ))}
            </div>

            <p className="muted">
              The student sets their own password using a private invitation.
              Existing accounts are never overwritten.
            </p>

            <Button>Continue to placement</Button>
          </form>
        )}

        {step === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit(true);
            }}
          >
            <h2>Academic placement</h2>

            <PlacementFields value={placement} onChange={setPlacement} />

            <div className="heading-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(0)}
              >
                Back to details
              </Button>

              <Button disabled={busy}>
                {busy ? "Validating…" : "Review admission"}
              </Button>
            </div>
          </form>
        )}

        {step === 2 && review && (
          <>
            <h2>Review admission</h2>

            <dl className="admission-review">
              {Object.entries({
                ...review.identity,
                ...review.placement,
              }).map(([field, value]) => (
                <div key={field}>
                  <dt>{field.replaceAll("_", " ")}</dt>
                  <dd>{value || "Not selected"}</dd>
                </div>
              ))}
            </dl>

            <h3>{review.offerings.length} selected course enrollments</h3>

            {review.offerings.length ? (
              <ul>
                {review.offerings.map((course) => (
                  <li key={course.id}>{course.title}</li>
                ))}
              </ul>
            ) : (
              <p>
                Enrollment deferred. The student will have no course access
                until enrolled.
              </p>
            )}

            <p>{review.invitation}</p>

            <div className="heading-actions">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setStep(1)}
              >
                Edit placement
              </Button>

              <Button disabled={busy} onClick={() => void submit(false)}>
                {busy ? "Creating…" : "Create student and invite"}
              </Button>
            </div>
          </>
        )}

        {step === 3 && review && (
          <>
            <h2 role="status">Student admitted successfully</h2>

            <p>
              {details.first_name} {details.last_name} ·{" "}
              {details.student_identifier}
            </p>

            <p>
              {review.offerings.length} course enrollments saved. Placement and
              invitation are linked to the institute membership.
            </p>

            {saved.isError && <ErrorState error={saved.error} />}

            {saved.data && <InvitationReview row={saved.data} />}

            <div className="heading-actions">
              <Link
                className="text-link"
                to={`/student-placement/${review.membership}`}
              >
                View placement and history
              </Link>

              <Link className="text-link" to="/memberships?role=student">
                Return to students
              </Link>
            </div>
          </>
        )}
      </section>
    </>
  );
}

export { StudentPlacement } from "./StudentPlacement";
export { type Placement } from "./admission/PlacementFields";
