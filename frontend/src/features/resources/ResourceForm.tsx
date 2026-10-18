import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useQueryClient } from "@tanstack/react-query";

import { Controller, useForm } from "react-hook-form";

import { z } from "zod";

import { zodResolver } from "@hookform/resolvers/zod";

import {

  ArrowLeft,

  ArrowRight,

  BookOpen,

  CheckCircle2,

  ChevronDown,

  GraduationCap,

  Settings2,

  ShieldCheck,

  UserRound,

  UsersRound,

} from "lucide-react";



import { RelationSelect } from "../../components/RelationSelect";

import { notifySaved } from "../../components/ToastProvider";

import { api, type RecordData } from "../../lib/api";

import { resources, type Field } from "./config";

import { Button } from "../../components/ui/button";

import { ErrorState } from "../../components/shared";

import { useTerminology } from "../../lib/terminology";

import { useInstitution } from "../../lib/institution";

import { useAuth } from "../auth/Auth";



type ResourceFormProps = {

  resource: string;

  initial?: RecordData;

  onDone: () => void;

  defaults?: Record<string, unknown>;

};



type AccountType = "student" | "teacher" | "head";

type SubjectMode = "existing" | "new";

type FormValues = Record<string, any>;



type CreatedSubject = {

  id: string;

  name: string;

  code: string;

};



const personalFieldKeys = new Set([

  "username",

  "email",

  "first_name",

  "last_name",

  "display_name",

]);



const gradingKeys = new Set([

  "assignment_weight",

  "quiz_weight",

  "manual_weight",

]);



const accountTypes: {

  value: AccountType;

  title: string;

  description: string;

}[] = [

  {

    value: "student",

    title: "Student",

    description:

      "Create a learner account and enter academic details.",

  },

  {

    value: "teacher",

    title: "Teacher",

    description:

      "Create a faculty account and authorize eligible teaching departments.",

  },

  {

    value: "head",

    title: "Department Head",

    description:

      "Create an academic leader account for a department.",

  },

];



const responsiveGridStyle = {

  display: "grid",

  gridTemplateColumns:

    "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",

  gap: 18,

  alignItems: "start",

  width: "100%",

} as const;



const inputStyle = {

  display: "block",

  width: "100%",

  minWidth: 0,

  boxSizing: "border-box",

  minHeight: 43,

  padding: "10px 12px",

  border: "1px solid #d7e4db",

  borderRadius: 9,

  background: "#ffffff",

  color: "#173c2d",

  fontSize: 14,

  outlineColor: "#278353",

} as const;



function isAccountType(

  value: unknown

): value is AccountType {

  return (

    value === "student" ||

    value === "teacher" ||

    value === "head"

  );

}



function isRelevantAccountField(

  field: Field,

  accountType: AccountType

) {

  if (field.key === "role") return true;



  if (

    field.key === "student_identifier" ||

    field.key === "section"

  ) {

    return accountType === "student";

  }



  if (field.key === "eligible_units") {

    return accountType === "teacher";

  }



  if (field.key === "unit") {

    return accountType === "head";

  }



  return true;

}



function initialFieldValues(

  fields: Field[],

  initial: RecordData | undefined,

  defaults: Record<string, unknown>

) {

  return Object.fromEntries(

    fields.map((field) => {

      let value: unknown =

        initial?.[field.key] ??

        defaults[field.key] ??

        field.default ??

        (field.type === "checkbox"

          ? false

          : field.type === "multi"

            ? []

            : "");



      if (field.type === "datetime-local" && value) {

        value = new Date(String(value))

          .toLocaleString("sv-SE")

          .replace(" ", "T")

          .slice(0, 16);

      }



      if (

        field.type === "options" &&

        Array.isArray(value)

      ) {

        value = value.join("\n");

      }



      if (field.type === "file") {

        value = undefined;

      }



      if (

        field.type === "checkbox" &&

        typeof value === "string"

      ) {

        value = value === "true";

      }



      return [

        field.key,

        field.type === "checkbox" ||

        field.type === "multi" ||

        field.type === "file"

          ? value

          : String(value),

      ];

    })

  );

}



function buildPayload(

  fields: Field[],

  data: FormValues,

  initial: RecordData | undefined,

  isPeople: boolean,

  useAccountWizard: boolean,

  accountType: AccountType

) {

  const payload: Record<string, unknown> = {};



  for (const field of fields) {

    if (

      initial &&

      isPeople &&

      [

        "username",

        "email",

        "first_name",

        "last_name",

      ].includes(field.key)

    ) {

      continue;

    }



    let value = data[field.key];



    if (

      useAccountWizard &&

      field.key === "role"

    ) {

      value = accountType;

    }



    if (field.type === "file") {

      const files = value as FileList | undefined;



      if (files?.[0]) {

        payload[field.key] = files[0];

      }



      continue;

    }



    if (field.type === "number") {

      value =

        value === "" && !field.required

          ? null

          : Number(value);

    }



    if (field.type === "options") {

      value = String(value || "")

        .split("\n")

        .filter(Boolean);

    }



    if (field.type === "datetime-local") {

      value = value

        ? new Date(String(value)).toISOString()

        : null;

    }



    if (

      field.type === "select" &&

      !value &&

      !field.required

    ) {

      value = null;

    }



    payload[field.key] = value;

  }



  if (useAccountWizard) {

    payload.role = accountType;

  }



  return payload;

}



export function ResourceForm({

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

  const [

    assignmentOverride,

    setAssignmentOverride,

  ] = useState(false);



  const isPeople = resource === "memberships";



  const useAccountWizard =

    isPeople &&

    role === "admin" &&

    !initial;



  const useCourseWizard =

    resource === "offerings" &&

    role === "admin" &&

    !initial;



  const [accountType, setAccountType] =

    useState<AccountType>(

      isAccountType(defaults.role)

        ? defaults.role

        : "student"

    );



  const [accountStep, setAccountStep] = useState(0);

  const [showAdvanced, setShowAdvanced] =

    useState(false);



  const [

    showSubjectDetails,

    setShowSubjectDetails,

  ] = useState(false);



  const [

    courseValidationError,

    setCourseValidationError,

  ] = useState("");



  const [subjectMode, setSubjectMode] =

    useState<SubjectMode>("existing");



  const [newSubjectName, setNewSubjectName] =

    useState("");



  const [newSubjectCode, setNewSubjectCode] =

    useState("");



  const [

    newSubjectDescription,

    setNewSubjectDescription,

  ] = useState("");



  const [newSubjectUnit, setNewSubjectUnit] =

    useState("");



  const [

    newSubjectCredits,

    setNewSubjectCredits,

  ] = useState("");



  const [

    createdSubject,

    setCreatedSubject,

  ] = useState<CreatedSubject | null>(null);



  const fields = config.fields.filter((field) => {

    if (resource === "institutes" && initial && field.key === "kind") return false;

    if (!institution.departments && ["unit", "eligible_units", "head_correction_review"].includes(field.key)) return false;

    if (institution.kind === "school" && field.key === "batch") return false;

    if (resource === "programs" && institution.kind === "school" && ["structure", "duration_terms"].includes(field.key)) return false;

    if (resource === "curriculum" && institution.kind === "school" && field.key === "stage") return false;

    if (

      resource === "offerings" &&

      role === "head"

    ) {

      return field.key === "teachers";

    }



    if (

      isPeople &&

      role === "superadmin" &&

      [

        "unit",

        "section",

        "student_identifier",

        "eligible_units",

      ].includes(field.key)

    ) {

      return false;

    }



    if (

      resource === "offerings" &&

      field.key === "teachers" &&

      role === "admin" &&

      !assignmentOverride && !directAssignment

    ) {

      return false;

    }



    if (field.key === "assignment_reason") {

      return (

        role === "admin" &&

        assignmentOverride && !directAssignment

      );

    }



    if (

      initial &&

      resource === "quizzes" &&

      initial.has_attempts

    ) {

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

      const editableCommon =

        field.key === "display_name";



      const personRole = String(

        initial.role || ""

      );



      if (personRole === "student") {

        return (

          editableCommon ||

          field.key === "student_identifier"

        );

      }



      if (personRole === "teacher") {

        return (

          editableCommon ||

          field.key === "eligible_units"

        );

      }



      if (

        personRole === "head" ||

        personRole === "admin"

      ) {

        return editableCommon;

      }



      return false;

    }



    if (useAccountWizard) {

      return isRelevantAccountField(

        field,

        accountType

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

                      `${field.label} is required`

                    )

                : z.string(),

      ])

    )

  );



  const values = initialFieldValues(

    config.fields,

    initial,

    { ...(resource === "programs" ? { structure: institution.structure, duration_terms: institution.default_duration } : {}), ...defaults }

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



  const personalFields = fields.filter(

    (field) =>

      personalFieldKeys.has(field.key)

  );



  const academicFields = fields.filter(

    (field) =>

      !personalFieldKeys.has(field.key) &&

      field.key !== "role"

  );



  const gradingFields = fields.filter(

    (field) => gradingKeys.has(field.key)

  );



  const advancedCourseFields = fields.filter(

    (field) =>

      ![

        "title",

        "course",

        "term",

        "section",

        ...Array.from(gradingKeys),

      ].includes(field.key)

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

    const valid = await trigger(

      personalFields.map(

        (field) => field.key

      )

    );



    if (valid) {

      setAccountStep(2);

    }

  }



  function validateGradingWeights(

    data: FormValues

  ) {

    if (resource !== "offerings") {

      return true;

    }



    const keys = [

      "assignment_weight",

      "quiz_weight",

      "manual_weight",

    ];



    const present = keys.filter((key) =>

      fields.some(

        (field) => field.key === key

      )

    );



    if (present.length !== 3) {

      return true;

    }



    const weights = present.map((key) =>

      Number(data[key] ?? 0)

    );



    if (

      weights.some(

        (weight) =>

          !Number.isFinite(weight) ||

          weight < 0 ||

          weight > 100

      )

    ) {

      setCourseValidationError(

        "Each grading weight must be between 0% and 100%."

      );



      return false;

    }



    const total = weights.reduce(

      (sum, weight) => sum + weight,

      0

    );



    if (Math.abs(total - 100) > 0.001) {

      setCourseValidationError(

        `Grading weights must total 100%. Current total: ${total}%.`

      );



      return false;

    }



    return true;

  }



  function renderInput(field: Field) {

    const disabled =

      !!initial &&

      isPeople &&

      [

        "username",

        "email",

        "first_name",

        "last_name",

      ].includes(field.key);



    const common = {

      ...register(field.key),

      disabled,

    };



    if (

      field.type === "select" ||

      field.type === "multi"

    ) {

      return (

        <select

          {...common}

          multiple={field.type === "multi"}

          style={{

            ...inputStyle,

            cursor: "pointer",

          }}

        >

          {field.type !== "multi" && (

            <option value="">

              Choose {field.label.toLowerCase()}

            </option>

          )}



          {field.choices

            ?.filter((choice) => {

              if (

                isPeople &&

                field.key === "role"

              ) {

                return role === "superadmin"

                  ? choice === "admin"

                  : choice !== "admin" && (institution.departments || choice !== "head");

              }



              if (field.key === "structure" && institution.kind !== "other") return choice === institution.structure || choice === initial?.structure;

              return true;

            })

            .map((choice) => (

              <option

                key={choice}

                value={choice}

              >

                {choice}

              </option>

            ))}

        </select>

      );

    }



    if (

      field.type === "textarea" ||

      field.type === "options"

    ) {

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

        step={

          field.type === "number"

            ? field.step ?? "1"

            : undefined

        }

        accept={

          field.type === "file"

            ? ".pdf,.txt,.png,.jpg,.jpeg,.docx"

            : undefined

        }

        style={{

          ...inputStyle,

          ...(field.type === "file"

            ? { padding: 9 }

            : {}),

        }}

      />

    );

  }



  function renderField(field: Field) {

    const courseLabels: Record<

      string,

      string

    > = {

      course: "Choose subject",

      term: "Academic term",

      section: "Section",

      title: "Course name",

      assignment_weight: "Assignments (%)",

      quiz_weight: "Quizzes (%)",

      manual_weight: "Other assessments (%)",

    };



    const label = field.key === "stage" ? (institution.structure === "annual" ? "Study year number" : "Semester number") :

      field.key === "duration_terms" ? (institution.structure === "annual" ? "Number of study years" : "Number of semesters") :

      useCourseWizard &&

      courseLabels[field.key]

        ? courseLabels[field.key]

        : terms.field(

            field.key,

            field.label

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

          <Controller

            name={field.key}

            control={control}

            defaultValue={

              values[field.key]

            }

            render={({ field: input }) => (

              <RelationSelect

                source={field.source!}

                label={label}

                value={

                  input.value as

                    | string

                    | string[]

                }

                onChange={input.onChange}

                onBlur={input.onBlur}

                inputRef={input.ref}

                required={field.required}

                multiple={

                  field.type === "multi"

                }

                selectedLabel={

                  initial?.[

                    field.key + "_label"

                  ]

                    ? String(

                        initial[

                          field.key +

                            "_label"

                        ]

                      )

                    : undefined

                }

                compact

              />

            )}

          />



          {errors[field.key] && (

            <small

              className="field-error"

              role="alert"

            >

              {String(

                errors[field.key]?.message

              )}

            </small>

          )}

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

            justifyContent:

              "flex-start",

            gap: 12,

            width: "100%",

            minWidth: 0,

            minHeight: 48,

            padding: "12px 14px",

            border:

              "1px solid #dce8df",

            borderRadius: 10,

            background: "#f7faf7",

            cursor: "pointer",

            boxSizing: "border-box",

          }}

        >

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



          <span

            style={{

              display: "flex",

              flexDirection: "column",

              gap: 4,

              minWidth: 0,

            }}

          >

            <span

              style={{

                fontSize: 14,

                fontWeight: 600,

                color: "#234a35",

              }}

            >

              {label}

            </span>



            {errors[field.key] && (

              <small

                className="field-error"

                role="alert"

              >

                {String(

                  errors[field.key]

                    ?.message

                )}

              </small>

            )}

          </span>

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

        <span

          style={{

            fontSize: 13,

            fontWeight: 600,

            color: "#294b38",

          }}

        >

          {label}



          {field.required && (

            <span aria-hidden="true">

              {" "}*

            </span>

          )}

        </span>



        <div

          className="resource-form-control"

          style={{

            width: "100%",

            minWidth: 0,

          }}

        >

          {renderInput(field)}

        </div>



        {errors[field.key] && (

          <small

            className="field-error"

            role="alert"

          >

            {String(

              errors[field.key]?.message

            )}

          </small>

        )}

      </label>

    );

  }



  function changeSubjectMode(

    mode: SubjectMode

  ) {

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



      if (

        useCourseWizard &&

        subjectMode === "new" &&

        !createdSubject

      ) {

        if (!newSubjectName.trim()) {

          setCourseValidationError(

            "Enter the subject name."

          );

          return;

        }



        if (!newSubjectCode.trim()) {

          setCourseValidationError(

            "Enter the subject code."

          );

          return;

        }



        if (

          newSubjectCredits.trim() &&

          (

            !Number.isFinite(

              Number(newSubjectCredits)

            ) ||

            Number(newSubjectCredits) < 0

          )

        ) {

          setCourseValidationError(

            "Enter valid credit hours."

          );

          return;

        }

      }



      const payload = buildPayload(

        fields,

        data,

        initial,

        isPeople,

        useAccountWizard,

        accountType

      );



      if (

        useCourseWizard &&

        subjectMode === "new"

      ) {

        let subjectId =

          createdSubject?.id;



        if (!subjectId) {

          const subjectPayload: Record<

            string,

            unknown

          > = {

            name: newSubjectName.trim(),

            code: newSubjectCode.trim(),

            description:

              newSubjectDescription.trim(),

            active: true,

          };



          if (newSubjectUnit) {

            subjectPayload.unit =

              newSubjectUnit;

          }



          if (

            newSubjectCredits.trim()

          ) {

            subjectPayload.credit_hours =

              Number(newSubjectCredits);

          }



          const created =

            await api<RecordData>(

              "courses/",

              {

                method: "POST",

                body: JSON.stringify(

                  subjectPayload

                ),

              }

            );



          if (!created?.id) {

            throw new Error(

              "The subject may have been created, but its ID was not returned. Check the course catalog before retrying."

            );

          }



          subjectId = String(

            created.id

          );



          setCreatedSubject({

            id: subjectId,

            name: newSubjectName.trim(),

            code: newSubjectCode.trim(),

          });



          await client.invalidateQueries();

        }



        payload.course = subjectId;

      }



      if (

        useCourseWizard &&

        subjectMode === "existing" &&

        !payload.course

      ) {

        setCourseValidationError(

          "Choose an existing subject."

        );

        return;

      }



      if (

        resource === "offerings" &&

        role === "admin" &&

        !assignmentOverride && !directAssignment

      ) {

        delete payload.teachers;

        delete payload.assignment_reason;

      }



      if (

        resource === "offerings" &&

        role === "admin" &&

        assignmentOverride

      ) {

        const teachers =

          payload.teachers;



        if (

          Array.isArray(teachers) &&

          teachers.length > 0 &&

          String(

            payload.assignment_reason ||

              ""

          ).trim().length < 5

        ) {

          setCourseValidationError(

            "Provide an administrative assignment reason of at least five characters."

          );



          setShowAdvanced(true);

          return;

        }

      }



      let body: BodyInit =

        JSON.stringify(payload);



      if (

        fields.some(

          (field) =>

            field.type === "file"

        )

      ) {

        const form = new FormData();



        Object.entries(payload).forEach(

          ([key, value]) => {

            if (

              value !== null &&

              value !== undefined

            ) {

              form.append(

                key,

                value instanceof File

                  ? value

                  : String(value)

              );

            }

          }

        );



        body = form;

      }



      await api(

        resource +

          "/" +

          (initial

            ? initial.id + "/"

            : ""),

        {

          method: initial

            ? "PATCH"

            : "POST",

          body,

        }

      );



      await client.invalidateQueries();



      notifySaved(

        initial

          ? "Record updated."

          : resource === "offerings"

            ? "Course created successfully."

            : "Record created."

      );



      onDone();

    } catch (err) {

      setError(err);

    }

  }



  // ------------------------------------------
  // COURSE CREATION WIZARD
  // ------------------------------------------
  if (useCourseWizard) {

    const courseField = fields.find(

      (field) =>

        field.key === "course"

    );



    const titleField = fields.find(

      (field) =>

        field.key === "title"

    );



    const termField = fields.find(

      (field) =>

        field.key === "term"

    );



    const sectionField = fields.find(

      (field) =>

        field.key === "section"

    );



    return (

      <form

        className="record-form course-create-wizard"

        onSubmit={handleSubmit(submit)}

        style={{

          width: "100%",

          minWidth: 0,

        }}

      >

        <div

          className="account-wizard-section"

          style={{

            paddingBottom: 12,

          }}

        >

          <div

            className="account-section-heading"

            style={{

              marginBottom: 14,

            }}

          >

            <BookOpen size={21} />



            <div>

              <h3>Create course</h3>

              <p>

                Add a course to your

                institute.

              </p>

            </div>

          </div>



          <div

            style={{

              display: "grid",

              gridTemplateColumns:

                "repeat(2, minmax(0, 1fr))",

              gap: 8,

              marginBottom: 18,

            }}

          >

            <Button

              type="button"

              variant={

                subjectMode === "existing"

                  ? "default"

                  : "outline"

              }

              onClick={() =>

                changeSubjectMode(

                  "existing"

                )

              }

            >

              Existing subject

            </Button>



            <Button

              type="button"

              variant={

                subjectMode === "new"

                  ? "default"

                  : "outline"

              }

              onClick={() =>

                changeSubjectMode("new")

              }

            >

              + New subject

            </Button>

          </div>



          {subjectMode === "existing" ? (

            <div

              style={{

                marginBottom: 16,

              }}

            >

              {courseField &&

                renderField(

                  courseField

                )}

            </div>

          ) : (

            <div

              style={{

                padding: 16,

                border:

                  "1px solid #dce7df",

                borderRadius: 12,

                marginBottom: 16,

                background: "#fbfcfb",

              }}

            >

              {createdSubject ? (

                <div

                  className="account-wizard-note"

                  style={{

                    margin: 0,

                  }}

                >

                  <CheckCircle2

                    size={18}

                  />



                  <span>

                    <strong>

                      {

                        createdSubject.name

                      }

                    </strong>{" "}

                    (

                    {

                      createdSubject.code

                    }

                    ) is saved. It

                    will be reused when

                    creating this course.

                  </span>

                </div>

              ) : (

                <>

                  <div

                    className="account-fields-grid"

                    style={

                      responsiveGridStyle

                    }

                  >

                    <label

                      className="account-form-field"

                      style={{

                        display: "grid",

                        gap: 8,

                        minWidth: 0,

                      }}

                    >

                      <span>

                        Subject name *

                      </span>



                      <input

                        type="text"

                        value={

                          newSubjectName

                        }

                        onChange={(

                          event

                        ) =>

                          setNewSubjectName(

                            event.target

                              .value

                          )

                        }

                        placeholder="e.g. Programming Fundamentals"

                        maxLength={255}

                        style={

                          inputStyle

                        }

                      />

                    </label>



                    <label

                      className="account-form-field"

                      style={{

                        display: "grid",

                        gap: 8,

                        minWidth: 0,

                      }}

                    >

                      <span>

                        Subject code *

                      </span>



                      <input

                        type="text"

                        value={

                          newSubjectCode

                        }

                        onChange={(

                          event

                        ) =>

                          setNewSubjectCode(

                            event.target

                              .value

                          )

                        }

                        placeholder="e.g. CS101"

                        maxLength={100}

                        style={

                          inputStyle

                        }

                      />

                    </label>



                    <label

                      className="account-form-field"

                      style={{

                        display: "grid",

                        gap: 8,

                        minWidth: 0,

                      }}

                    >

                      <span>

                        Credit hours

                      </span>



                      <input

                        type="number"

                        min="0"

                        step="0.25"

                        value={

                          newSubjectCredits

                        }

                        onChange={(

                          event

                        ) =>

                          setNewSubjectCredits(

                            event.target

                              .value

                          )

                        }

                        placeholder="e.g. 3"

                        style={

                          inputStyle

                        }

                      />

                    </label>

                  </div>



                  <button

                    type="button"

                    aria-expanded={

                      showSubjectDetails

                    }

                    onClick={() =>

                      setShowSubjectDetails(

                        (current) =>

                          !current

                      )

                    }

                    style={{

                      display: "flex",

                      alignItems:

                        "center",

                      justifyContent:

                        "space-between",

                      width: "100%",

                      padding:

                        "12px 0",

                      marginTop: 8,

                      border: 0,

                      background:

                        "transparent",

                      color: "inherit",

                      cursor:

                        "pointer",

                      font: "inherit",

                      fontSize: 13,

                    }}

                  >

                    <span>

                      More subject

                      details{" "}

                      <span className="muted">

                        (optional)

                      </span>

                    </span>



                    <ChevronDown

                      size={16}

                      style={{

                        transform:

                          showSubjectDetails

                            ? "rotate(180deg)"

                            : undefined,

                      }}

                    />

                  </button>



                  {showSubjectDetails && (

                    <div

                      style={{

                        display:

                          "grid",

                        gap: 16,

                        paddingTop: 8,

                      }}

                    >

                      <div

                        className="account-fields-grid"

                        style={

                          responsiveGridStyle

                        }

                      >

                        <div

                          className="account-form-field"

                          style={{

                            minWidth: 0,

                          }}

                        >

                          {institution.departments && <RelationSelect

                            source="units"

                            label="Academic unit"

                            value={

                              newSubjectUnit

                            }

                            onChange={(

                              value

                            ) =>

                              setNewSubjectUnit(

                                Array.isArray(

                                  value

                                )

                                  ? value[0] ||

                                      ""

                                  : value

                              )

                            }

                            compact

                          />}

                        </div>

                      </div>



                      <label

                        className="account-form-field"

                        style={{

                          display:

                            "grid",

                          gap: 8,

                          width:

                            "100%",

                        }}

                      >

                        <span>

                          Description

                        </span>



                        <textarea

                          rows={2}

                          value={

                            newSubjectDescription

                          }

                          onChange={(

                            event

                          ) =>

                            setNewSubjectDescription(

                              event

                                .target

                                .value

                            )

                          }

                          placeholder="Optional description"

                          style={{

                            ...inputStyle,

                            resize:

                              "vertical",

                          }}

                        />

                      </label>

                    </div>

                  )}

                </>

              )}

            </div>

          )}



          <div

            style={{

              marginBottom: 16,

            }}

          >

            {titleField &&

              renderField(titleField)}

          </div>



          <div

            className="account-fields-grid"

            style={

              responsiveGridStyle

            }

          >

            {termField &&

              renderField(termField)}



            {sectionField &&

              renderField(

                sectionField

              )}

          </div>



          <p

            className="muted"

            style={{

              fontSize: 12,

              marginTop: 12,

              marginBottom: 0,

            }}

          >

            Teacher assignment can

            be completed later by

            the Department Head.

          </p>

        </div>



        <div className="course-advanced-settings">

          <button

            type="button"

            className="course-advanced-toggle"

            aria-expanded={

              showAdvanced

            }

            onClick={() =>

              setShowAdvanced(

                (current) =>

                  !current

              )

            }

          >

            <span>

              <Settings2

                size={17}

              />

              Advanced settings

            </span>



            <ChevronDown

              size={16}

              style={{

                transform:

                  showAdvanced

                    ? "rotate(180deg)"

                    : undefined,

              }}

            />

          </button>



          {showAdvanced && (

            <div

              className="course-advanced-content"

              style={{

                padding:

                  "16px 0",

                display: "grid",

                gap: 18,

              }}

            >

              {gradingFields.length >

                0 && (

                <div>

                  <h4

                    style={{

                      marginTop: 0,

                      marginBottom:

                        8,

                    }}

                  >

                    Grading weights

                  </h4>



                  <p

                    className="muted"

                    style={{

                      fontSize: 12,

                      marginBottom:

                        12,

                    }}

                  >

                    Default: 60%

                    assignments, 40%

                    quizzes, 0% other.

                  </p>



                  <div

                    className="account-fields-grid"

                    style={

                      responsiveGridStyle

                    }

                  >

                    {gradingFields.map(

                      renderField

                    )}

                  </div>

                </div>

              )}



              {role === "admin" && !directAssignment && (

                <label

                  style={{

                    display:

                      "flex",

                    alignItems:

                      "flex-start",

                    justifyContent:

                      "flex-start",

                    gap: 10,

                    marginTop: 8,

                    cursor:

                      "pointer",

                  }}

                >

                  <input

                    type="checkbox"

                    checked={

                      assignmentOverride

                    }

                    style={{

                      width: 16,

                      height: 16,

                      flex:

                        "0 0 16px",

                      marginTop: 3,

                    }}

                    onChange={(

                      event

                    ) =>

                      setAssignmentOverride(

                        event

                          .target

                          .checked

                      )

                    }

                  />



                  <span>

                    Administrative

                    teacher assignment

                    override



                    <small

                      className="muted"

                      style={{

                        display:

                          "block",

                        marginTop:

                          4,

                      }}

                    >

                      Requires a

                      reason and is

                      audited.

                    </small>

                  </span>

                </label>

              )}



              {advancedCourseFields.length >

                0 && (

                <div

                  className="account-fields-grid"

                  style={

                    responsiveGridStyle

                  }

                >

                  {advancedCourseFields.map(

                    renderField

                  )}

                </div>

              )}

            </div>

          )}

        </div>



        {courseValidationError && (

          <small

            className="field-error"

            role="alert"

          >

            {

              courseValidationError

            }

          </small>

        )}



        {!!error && (

          <ErrorState

            error={error}

          />

        )}



        <div

          className="account-wizard-footer"

          style={{

            display: "flex",

            alignItems:

              "center",

            justifyContent:

              "space-between",

            gap: 12,

            marginTop: 16,

            paddingTop: 14,

            paddingBottom: 12,

            borderTop:

              "1px solid #e2e9e4",

            position: "static",

          }}

        >

          <Button

            type="button"

            variant="outline"

            onClick={onDone}

          >

            Cancel

          </Button>



          <Button

            type="submit"

            disabled={

              isSubmitting

            }

          >

            {isSubmitting

              ? "Creating course…"

              : "Create course"}

          </Button>

        </div>

      </form>

    );

  }



  // ------------------------------------------
  // ACCOUNT CREATION WIZARD
  // ------------------------------------------
  if (useAccountWizard) {

    return (

      <form

        className="record-form account-wizard"

        onSubmit={handleSubmit(submit)}

        style={{

          width: "100%",

          minWidth: 0,

        }}

      >

        <div className="account-wizard-progress">

          {[

            "Account type",

            "Personal details",

            "Academic details",

          ].map(

            (label, index) => (

              <div

                key={label}

                className={

                  index ===

                  accountStep

                    ? "account-progress-step active"

                    : index <

                        accountStep

                      ? "account-progress-step complete"

                      : "account-progress-step"

                }

              >

                <span>

                  {index <

                  accountStep ? (

                    <CheckCircle2

                      size={17}

                    />

                  ) : (

                    index + 1

                  )}

                </span>



                <small>

                  {label}

                </small>

              </div>

            )

          )}

        </div>



        {accountStep === 0 && (

          <div className="account-wizard-section">

            <h3>

              Who are you adding?

            </h3>



            <p className="muted">

              Choose the person's

              role to see only the

              relevant account

              fields.

            </p>



            <div className="account-type-grid">

              {accountTypes.filter((type) => institution.departments || type.value !== "head").map(

                (type) => (

                  <button

                    key={

                      type.value

                    }

                    type="button"

                    className="account-type-card"

                    onClick={() =>

                      chooseAccountType(

                        type.value

                      )

                    }

                  >

                    <span className="account-type-icon">

                      {type.value ===

                      "student" ? (

                        <GraduationCap

                          size={26}

                        />

                      ) : type.value ===

                        "teacher" ? (

                        <BookOpen

                          size={26}

                        />

                      ) : (

                        <UsersRound

                          size={26}

                        />

                      )}

                    </span>



                    <strong>

                      {

                        type.title

                      }

                    </strong>



                    <small>

                      {

                        type.description

                      }

                    </small>



                    <span className="account-type-action">

                      Continue

                      <ArrowRight

                        size={15}

                      />

                    </span>

                  </button>

                )

              )}

            </div>

          </div>

        )}



        {accountStep === 1 && (

          <div className="account-wizard-section">

            <div className="account-section-heading">

              <UserRound

                size={21}

              />



              <div>

                <h3>

                  Personal

                  information

                </h3>



                <p>

                  Enter the basic

                  details for the

                  new{" "}

                  {accountType ===

                  "head"

                    ? "Department Head"

                    : accountType}{" "}

                  account.

                </p>

              </div>

            </div>



            <div

              className="account-fields-grid"

              style={

                responsiveGridStyle

              }

            >

              {personalFields.map(

                renderField

              )}

            </div>

          </div>

        )}



        {accountStep === 2 && (

          <div className="account-wizard-section">

            <div className="account-section-heading">

              <ShieldCheck

                size={21}

              />



              <div>

                <h3>

                  {accountType ===

                  "student"

                    ? "Student academic details"

                    : accountType ===

                        "teacher"

                      ? "Teacher eligibility"

                      : "Department Head details"}

                </h3>



                <p>

                  {accountType ===

                  "student"

                    ? "Complete the learner's academic information."

                    : accountType ===

                        "teacher"

                      ? "Authorize eligible teaching departments. The Department Head appoints teachers separately."

                      : "Select the academic department associated with this Department Head account."}

                </p>

              </div>

            </div>



            <div className="account-review-summary">

              <span>

                Account type

              </span>



              <strong>

                {accountType ===

                "head"

                  ? "Department Head"

                  : accountType ===

                      "student"

                    ? "Student"

                    : "Teacher"}

              </strong>



              <span>

                Username

              </span>



              <strong>

                {String(

                  getValues(

                    "username"

                  ) ||

                    "Not entered"

                )}

              </strong>



              <span>

                Email

              </span>



              <strong>

                {String(

                  getValues(

                    "email"

                  ) ||

                    "Not entered"

                )}

              </strong>

            </div>



            <div

              className="account-fields-grid"

              style={

                responsiveGridStyle

              }

            >

              {academicFields.map(

                renderField

              )}

            </div>



            {accountType ===

              "teacher" && (

              <p className="account-wizard-note">

                <ShieldCheck

                  size={17}

                />

                Creating this

                account does not

                appoint the teacher

                to a department or

                assign courses.

              </p>

            )}



            {accountType ===

              "head" && (

              <p className="account-wizard-note">

                <ShieldCheck

                  size={17}

                />

                This is an

                administrative

                role. Confirm the

                correct academic

                department before

                creating the

                account.

              </p>

            )}

          </div>

        )}



        {!!error && (

          <ErrorState

            error={error}

          />

        )}



        <div className="account-wizard-footer">

          <Button

            type="button"

            variant="outline"

            onClick={() => {

              if (

                accountStep === 0

              ) {

                onDone();

              } else {

                setAccountStep(

                  (current) =>

                    current - 1

                );

              }

            }}

          >

            <ArrowLeft

              size={16}

            />



            {accountStep === 0

              ? "Cancel"

              : "Back"}

          </Button>



          {accountStep === 1 && (

            <Button

              type="button"

              onClick={() =>

                void nextAccountStep()

              }

            >

              Continue

              <ArrowRight

                size={16}

              />

            </Button>

          )}



          {accountStep === 2 && (

            <Button

              type="submit"

              disabled={

                isSubmitting

              }

            >

              {isSubmitting

                ? "Creating account…"

                : `Create ${

                    accountType ===

                    "head"

                      ? "Department Head"

                      : accountType

                  }`}

            </Button>

          )}

        </div>

      </form>

    );

  }



  // ------------------------------------------
  // STANDARD RESOURCE EDITOR
  // ------------------------------------------
  return (

    <form

      onSubmit={handleSubmit(submit)}

      className="record-form"

      style={{

        display: "flex",

        flexDirection: "column",

        gap: 20,

        width: "100%",

        minWidth: 0,

        boxSizing: "border-box",

      }}

    >

      {resource === "offerings" &&

        role === "admin" && !directAssignment && (

          <label

            style={{

              display: "flex",

              alignItems:

                "flex-start",

              justifyContent:

                "flex-start",

              gap: 10,

              cursor: "pointer",

            }}

          >

            <input

              type="checkbox"

              checked={

                assignmentOverride

              }

              style={{

                width: 16,

                height: 16,

                flex: "0 0 16px",

                marginTop: 3,

              }}

              onChange={(event) =>

                setAssignmentOverride(

                  event.target.checked

                )

              }

            />



            <span>

              Use administrative

              teaching-assignment

              override



              <small

                className="muted"

                style={{

                  display: "block",

                  marginTop: 4,

                }}

              >

                Department Heads

                normally assign

                teachers. Override

                changes require a

                reason and are

                audited.

              </small>

            </span>

          </label>

        )}



      {initial && isPeople && (

        <div

          className="account-section-heading"

          style={{

            marginBottom: 4,

          }}

        >

          <UserRound

            size={21}

          />



          <div>

            <h3>

              Edit{" "}

              {initial.role ===

              "admin"

                ? "Institute Admin"

                : initial.role ===

                    "head"

                  ? "Department Head"

                  : initial.role ===

                      "teacher"

                    ? "Teacher"

                    : initial.role ===

                        "student"

                      ? "Student"

                      : "Account"}

            </h3>



            <p>

              Update the details

              relevant to this

              account. Access

              permissions and

              academic placement

              are managed

              separately.

            </p>

          </div>

        </div>

      )}



      {fields.length > 0 ? (

        <div

          className="account-fields-grid"

          style={

            responsiveGridStyle

          }

        >

          {fields.map(

            renderField

          )}

        </div>

      ) : (

        <p className="muted">

          No editable fields are

          available for this

          record.

        </p>

      )}



      {!!error && (

        <ErrorState

          error={error}

        />

      )}



      {courseValidationError && (

        <small

          className="field-error"

          role="alert"

        >

          {

            courseValidationError

          }

        </small>

      )}



      <div

        className="form-footer"

        style={{

          display: "flex",

          alignItems: "center",

          justifyContent:

            "flex-end",

          gap: 12,

          flexWrap: "wrap",

          paddingTop: 18,

          borderTop:

            "1px solid #e4ebe6",

          marginTop: 4,

        }}

      >

        <Button

          type="button"

          variant="outline"

          onClick={onDone}

        >

          Cancel

        </Button>



        <Button

          type="submit"

          disabled={

            isSubmitting ||

            !!(

              initial &&

              isPeople &&

              fields.length === 0

            )

          }

        >

          {isSubmitting

            ? "Saving…"

            : initial

              ? "Save changes"

              : "Create record"}

        </Button>

      </div>

    </form>

  );

}
