import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { RelationSelect } from "../../../components/RelationSelect";
import { notifySaved } from "../../../components/ToastProvider";
import { api, type RecordData } from "../../../lib/api";
import { useInstitution } from "../../../lib/institution";
import { useTerminology } from "../../../lib/terminology";
import { useAuth } from "../../auth/Auth";
import { resources, type Field } from "../config";
import {
  gradingKeys,
  inputStyle,
  personalFieldKeys,
} from "./resourceFormPresentation";
import {
  AccountType,
  buildPayload,
  CreatedSubject,
  FormValues,
  initialFieldValues,
  isAccountType,
  isRelevantAccountField,
  SubjectMode,
} from "./resourceFormValues";
export type ResourceFormProps = {
  resource: string;

  initial?: RecordData;

  onDone: () => void;

  defaults?: Record<string, unknown>;
};
export function useResourceFormController({
  resource,

  initial,

  onDone,

  defaults = {},
}: ResourceFormProps) {
  const config = resources[resource];
  const terms = useTerminology();
  const { role } = useAuth();
  const institution = useInstitution();
  const directAssignment = institution.direct_teacher_assignment;
  const client = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>();
  const [assignmentOverride, setAssignmentOverride] = useState(false);
  const isPeople = resource === "memberships";
  const useAccountWizard = isPeople && role === "admin" && !initial;
  const useCourseWizard =
    resource === "offerings" && role === "admin" && !initial;
  const [accountType, setAccountType] = useState<AccountType>(
    isAccountType(defaults.role) ? defaults.role : "student",
  );
  const [accountStep, setAccountStep] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSubjectDetails, setShowSubjectDetails] = useState(false);
  const [courseValidationError, setCourseValidationError] = useState("");
  const [subjectMode, setSubjectMode] = useState<SubjectMode>("existing");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectDescription, setNewSubjectDescription] = useState("");
  const [newSubjectUnit, setNewSubjectUnit] = useState("");
  const [newSubjectCredits, setNewSubjectCredits] = useState("");
  const [createdSubject, setCreatedSubject] = useState<CreatedSubject | null>(
    null,
  );
  const fields = config.fields.filter((field) => {
    if (resource === "institutes" && initial && field.key === "kind")
      return false;

    if (
      !institution.departments &&
      ["unit", "eligible_units", "head_correction_review"].includes(field.key)
    )
      return false;

    if (institution.kind === "school" && field.key === "batch") return false;

    if (
      resource === "programs" &&
      institution.kind === "school" &&
      ["structure", "duration_terms"].includes(field.key)
    )
      return false;

    if (
      resource === "curriculum" &&
      institution.kind === "school" &&
      field.key === "stage"
    )
      return false;

    if (resource === "offerings" && role === "head") {
      return field.key === "teachers";
    }

    if (
      isPeople &&
      role === "superadmin" &&
      ["unit", "section", "student_identifier", "eligible_units"].includes(
        field.key,
      )
    ) {
      return false;
    }

    if (
      resource === "offerings" &&
      field.key === "teachers" &&
      role === "admin" &&
      !assignmentOverride &&
      !directAssignment
    ) {
      return false;
    }

    if (field.key === "assignment_reason") {
      return role === "admin" && assignmentOverride && !directAssignment;
    }

    if (initial && resource === "quizzes" && initial.has_attempts) {
      return field.key === "released";
    }

    if (
      initial &&
      isPeople &&
      initial.role === "student" &&
      field.key === "section"
    ) {
      return false;
    }

    if (initial && isPeople) {
      const editableCommon = field.key === "display_name";

      const personRole = String(initial.role || "");

      if (personRole === "student") {
        return editableCommon || field.key === "student_identifier";
      }

      if (personRole === "teacher") {
        return editableCommon || field.key === "eligible_units";
      }

      if (personRole === "head" || personRole === "admin") {
        return editableCommon;
      }

      return false;
    }

    if (useAccountWizard) {
      return isRelevantAccountField(
        field,

        accountType,
      );
    }

    return true;
  });
  const schema = z.object(
    Object.fromEntries(
      fields.map((field) => [
        field.key,

        field.type === "checkbox"
          ? z.boolean()
          : field.type === "multi"
            ? z.array(z.string())
            : field.type === "file"
              ? z.any()
              : field.required &&
                  !(
                    useCourseWizard &&
                    field.key === "course" &&
                    subjectMode === "new"
                  )
                ? z

                    .string()

                    .min(
                      1,

                      `${field.label} is required`,
                    )
                : z.string(),
      ]),
    ),
  );
  const values = initialFieldValues(
    config.fields,

    initial,

    {
      ...(resource === "programs"
        ? {
            structure: institution.structure,
            duration_terms: institution.default_duration,
          }
        : {}),
      ...defaults,
    },
  );
  const {
    register,

    control,

    handleSubmit,

    setValue,

    getValues,

    trigger,

    formState: {
      errors,

      isSubmitting,
    },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),

    defaultValues: values,

    shouldUnregister: false,
  });
  const personalFields = fields.filter((field) =>
    personalFieldKeys.has(field.key),
  );
  const academicFields = fields.filter(
    (field) => !personalFieldKeys.has(field.key) && field.key !== "role",
  );
  const gradingFields = fields.filter((field) => gradingKeys.has(field.key));
  const advancedCourseFields = fields.filter(
    (field) =>
      ![
        "title",

        "course",

        "term",

        "section",

        ...Array.from(gradingKeys),
      ].includes(field.key),
  );
  function chooseAccountType(type: AccountType) {
    if (type === "student" && useAccountWizard) {
      onDone();
      navigate("/student-admission");
      return;
    }

    setAccountType(type);

    setValue("role", type, {
      shouldDirty: true,
    });

    setError(undefined);

    setAccountStep(1);
  }
  async function nextAccountStep() {
    const valid = await trigger(personalFields.map((field) => field.key));

    if (valid) {
      setAccountStep(2);
    }
  }
  function validateGradingWeights(data: FormValues) {
    if (resource !== "offerings") {
      return true;
    }

    const keys = ["assignment_weight", "quiz_weight", "manual_weight"];

    const present = keys.filter((key) =>
      fields.some((field) => field.key === key),
    );

    if (present.length !== 3) {
      return true;
    }

    const weights = present.map((key) => Number(data[key] ?? 0));

    if (
      weights.some(
        (weight) => !Number.isFinite(weight) || weight < 0 || weight > 100,
      )
    ) {
      setCourseValidationError(
        "Each grading weight must be between 0% and 100%.",
      );

      return false;
    }

    const total = weights.reduce(
      (sum, weight) => sum + weight,

      0,
    );

    if (Math.abs(total - 100) > 0.001) {
      setCourseValidationError(
        `Grading weights must total 100%. Current total: ${total}%.`,
      );

      return false;
    }

    return true;
  }
  function renderInput(field: Field) {
    const disabled =
      !!initial &&
      isPeople &&
      ["username", "email", "first_name", "last_name"].includes(field.key);

    const common = {
      ...register(field.key),

      disabled,
    };

    if (field.type === "select" || field.type === "multi") {
      return (
        <select
          {...common}

          multiple={field.type === "multi"}

          style={{
            ...inputStyle,

            cursor: "pointer",
          }}
        >
                   {" "}
          {field.type !== "multi" && (
            <option value="">
                            Choose {field.label.toLowerCase()}           {" "}
            </option>
          )}
                   {" "}
          {field.choices

            ?.filter((choice) => {
              if (isPeople && field.key === "role") {
                return role === "superadmin"
                  ? choice === "admin"
                  : choice !== "admin" &&
                      (institution.departments || choice !== "head");
              }

              if (field.key === "structure" && institution.kind !== "other")
                return (
                  choice === institution.structure ||
                  choice === initial?.structure
                );

              return true;
            })

            .map((choice) => (
              <option
                key={choice}

                value={choice}
              >
                                {choice}             {" "}
              </option>
            ))}
                 {" "}
        </select>
      );
    }

    if (field.type === "textarea" || field.type === "options") {
      return (
        <textarea
          {...common}

          rows={4}

          style={{
            ...inputStyle,

            minHeight: 105,

            resize: "vertical",
          }}
        />
      );
    }

    return (
      <input
        {...common}

        type={field.type || "text"}

        step={field.type === "number" ? (field.step ?? "1") : undefined}

        accept={
          field.type === "file" ? ".pdf,.txt,.png,.jpg,.jpeg,.docx" : undefined
        }

        style={{
          ...inputStyle,

          ...(field.type === "file" ? { padding: 9 } : {}),
        }}
      />
    );
  }
  function renderField(field: Field) {
    const courseLabels: Record<string, string> = {
      course: "Choose subject",

      term: "Academic term",

      section: "Section",

      title: "Course name",

      assignment_weight: "Assignments (%)",

      quiz_weight: "Quizzes (%)",

      manual_weight: "Other assessments (%)",
    };

    const label =
      field.key === "stage"
        ? institution.structure === "annual"
          ? "Study year number"
          : "Semester number"
        : field.key === "duration_terms"
          ? institution.structure === "annual"
            ? "Number of study years"
            : "Number of semesters"
          : useCourseWizard && courseLabels[field.key]
            ? courseLabels[field.key]
            : terms.field(
                field.key,

                field.label,
              );

    if (field.source) {
      return (
        <div
          key={field.key}

          className="account-form-field"

          style={{
            width: "100%",

            minWidth: 0,
          }}
        >
                   {" "}
          <Controller
            name={field.key}

            control={control}

            defaultValue={values[field.key]}

            render={({ field: input }) => (
              <RelationSelect
                source={field.source!}

                label={label}

                value={input.value as string | string[]}

                onChange={input.onChange}

                onBlur={input.onBlur}

                inputRef={input.ref}

                required={field.required}

                multiple={field.type === "multi"}

                selectedLabel={
                  initial?.[field.key + "_label"]
                    ? String(initial[field.key + "_label"])
                    : undefined
                }

                compact
              />
            )}
          />
                   {" "}
          {errors[field.key] && (
            <small
              className="field-error"

              role="alert"
            >
                            {String(errors[field.key]?.message)}           {" "}
            </small>
          )}
                 {" "}
        </div>
      );
    }

    if (field.type === "checkbox") {
      return (
        <label
          key={field.key}

          className="account-form-checkbox"

          style={{
            display: "flex",

            alignItems: "center",

            justifyContent: "flex-start",

            gap: 12,

            width: "100%",

            minWidth: 0,

            minHeight: 48,

            padding: "12px 14px",

            border: "1px solid #dce8df",

            borderRadius: 10,

            background: "#f7faf7",

            cursor: "pointer",

            boxSizing: "border-box",
          }}
        >
                   {" "}
          <input
            {...register(field.key)}

            type="checkbox"

            style={{
              width: 18,

              height: 18,

              flex: "0 0 18px",

              margin: 0,

              accentColor: "#237a4b",

              cursor: "pointer",
            }}
          />
                   {" "}
          <span
            style={{
              display: "flex",

              flexDirection: "column",

              gap: 4,

              minWidth: 0,
            }}
          >
                       {" "}
            <span
              style={{
                fontSize: 14,

                fontWeight: 600,

                color: "#234a35",
              }}
            >
                            {label}           {" "}
            </span>
                       {" "}
            {errors[field.key] && (
              <small
                className="field-error"

                role="alert"
              >
                                {String(errors[field.key]?.message)}           
                 {" "}
              </small>
            )}
                     {" "}
          </span>
                 {" "}
        </label>
      );
    }

    return (
      <label
        key={field.key}

        className="account-form-field"

        style={{
          display: "flex",

          flexDirection: "column",

          gap: 8,

          width: "100%",

          minWidth: 0,

          boxSizing: "border-box",
        }}
      >
               {" "}
        <span
          style={{
            fontSize: 13,

            fontWeight: 600,

            color: "#294b38",
          }}
        >
                    {label}         {" "}
          {field.required && (
            <span aria-hidden="true">              *             </span>
          )}
                 {" "}
        </span>
               {" "}
        <div
          className="resource-form-control"

          style={{
            width: "100%",

            minWidth: 0,
          }}
        >
                    {renderInput(field)}       {" "}
        </div>
               {" "}
        {errors[field.key] && (
          <small
            className="field-error"

            role="alert"
          >
                        {String(errors[field.key]?.message)}         {" "}
          </small>
        )}
             {" "}
      </label>
    );
  }
  function changeSubjectMode(mode: SubjectMode) {
    if (mode === subjectMode) {
      return;
    }

    setSubjectMode(mode);

    setError(undefined);

    setCourseValidationError("");

    if (mode === "new") {
      setValue("course", "", {
        shouldDirty: true,

        shouldValidate: false,
      });
    }
  }
  async function submit(data: FormValues) {
    try {
      setError(undefined);

      setCourseValidationError("");

      if (!validateGradingWeights(data)) {
        setShowAdvanced(true);

        return;
      }

      if (useCourseWizard && subjectMode === "new" && !createdSubject) {
        if (!newSubjectName.trim()) {
          setCourseValidationError("Enter the subject name.");

          return;
        }

        if (!newSubjectCode.trim()) {
          setCourseValidationError("Enter the subject code.");

          return;
        }

        if (
          newSubjectCredits.trim() &&
          (!Number.isFinite(Number(newSubjectCredits)) ||
            Number(newSubjectCredits) < 0)
        ) {
          setCourseValidationError("Enter valid credit hours.");

          return;
        }
      }

      const payload = buildPayload(
        fields,

        data,

        initial,

        isPeople,

        useAccountWizard,

        accountType,
      );

      if (useCourseWizard && subjectMode === "new") {
        let subjectId = createdSubject?.id;

        if (!subjectId) {
          const subjectPayload: Record<string, unknown> = {
            name: newSubjectName.trim(),

            code: newSubjectCode.trim(),

            description: newSubjectDescription.trim(),

            active: true,
          };

          if (newSubjectUnit) {
            subjectPayload.unit = newSubjectUnit;
          }

          if (newSubjectCredits.trim()) {
            subjectPayload.credit_hours = Number(newSubjectCredits);
          }

          const created = await api<RecordData>(
            "courses/",

            {
              method: "POST",

              body: JSON.stringify(subjectPayload),
            },
          );

          if (!created?.id) {
            throw new Error(
              "The subject may have been created, but its ID was not returned. Check the course catalog before retrying.",
            );
          }

          subjectId = String(created.id);

          setCreatedSubject({
            id: subjectId,

            name: newSubjectName.trim(),

            code: newSubjectCode.trim(),
          });

          await client.invalidateQueries();
        }

        payload.course = subjectId;
      }

      if (useCourseWizard && subjectMode === "existing" && !payload.course) {
        setCourseValidationError("Choose an existing subject.");

        return;
      }

      if (
        resource === "offerings" &&
        role === "admin" &&
        !assignmentOverride &&
        !directAssignment
      ) {
        delete payload.teachers;

        delete payload.assignment_reason;
      }

      if (resource === "offerings" && role === "admin" && assignmentOverride) {
        const teachers = payload.teachers;

        if (
          Array.isArray(teachers) &&
          teachers.length > 0 &&
          String(payload.assignment_reason || "").trim().length < 5
        ) {
          setCourseValidationError(
            "Provide an administrative assignment reason of at least five characters.",
          );

          setShowAdvanced(true);

          return;
        }
      }

      let body: BodyInit = JSON.stringify(payload);

      if (fields.some((field) => field.type === "file")) {
        const form = new FormData();

        Object.entries(payload).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            form.append(
              key,

              value instanceof File ? value : String(value),
            );
          }
        });

        body = form;
      }

      await api(
        resource + "/" + (initial ? initial.id + "/" : ""),

        {
          method: initial ? "PATCH" : "POST",

          body,
        },
      );

      await client.invalidateQueries();

      notifySaved(
        initial
          ? "Record updated."
          : resource === "offerings"
            ? "Course created successfully."
            : "Record created.",
      );

      onDone();
    } catch (err) {
      setError(err);
    }
  }
  return {
    useCourseWizard,
    fields,
    handleSubmit,
    submit,
    subjectMode,
    changeSubjectMode,
    renderField,
    createdSubject,
    newSubjectName,
    setNewSubjectName,
    newSubjectCode,
    setNewSubjectCode,
    newSubjectCredits,
    setNewSubjectCredits,
    showSubjectDetails,
    setShowSubjectDetails,
    institution,
    newSubjectUnit,
    setNewSubjectUnit,
    Array,
    newSubjectDescription,
    setNewSubjectDescription,
    showAdvanced,
    setShowAdvanced,
    gradingFields,
    role,
    directAssignment,
    assignmentOverride,
    setAssignmentOverride,
    advancedCourseFields,
    courseValidationError,
    error,
    onDone,
    isSubmitting,
    useAccountWizard,
    accountStep,
    chooseAccountType,
    accountType,
    personalFields,
    String,
    getValues,
    academicFields,
    setAccountStep,
    nextAccountStep,
    resource,
    initial,
    isPeople,
  };
}
