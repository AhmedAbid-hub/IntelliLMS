export interface Field {
  key: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "datetime-local"
    | "time"
    | "checkbox"
    | "select"
    | "multi"
    | "file"
    | "options";
  source?: string;
  choices?: string[];
  required?: boolean;
  step?: string;
  default?: unknown;
}

export interface Resource {
  title: string;
  description: string;
  fields: Field[];
  columns: string[];
  write: string[];
  search?: boolean;
}

const admins = ["superadmin", "admin"];
const staff = [...admins, "head", "teacher"];
const academic = [...admins, "head"];

// Quiz authoring belongs to assigned instructors.
// The frontend currently enables teacher authoring;
// course-specific Head permissions require separate verification.
// The backend must enforce instructor assignment.
const quizInstructors = ["teacher"];

const name: Field = {
  key: "name",
  label: "Name",
  required: true,
};

const offering: Field = {
  key: "offering",
  label: "Course offering",
  type: "select",
  source: "offerings",
  required: true,
};

const title: Field = {
  key: "title",
  label: "Title",
  required: true,
};

const published: Field = {
  key: "published",
  label: "Published",
  type: "checkbox",
};

const unit: Field = {
  key: "unit",
  label: "Academic unit",
  type: "select",
  source: "units",
};

export const resources: Record<string, Resource> = {
  "platform-audit": {
    title: "Platform audit",
    description:
      "Global account and configuration changes. Institute activity remains in the selected institute's audit history.",
    fields: [],
    columns: [
      "action_time",
      "actor",
      "action",
      "model",
      "object_repr",
      "change_message",
    ],
    write: [],
    search: true,
  },

  "platform-users": {
    title: "Institute Administrators & Platform Access",
    description:
      "Manage administrative accounts and Institute Admin appointments. Ordinary academic accounts are managed inside their institute.",
    fields: [
      {
        key: "is_active",
        label: "Active account",
        type: "checkbox",
      },
    ],
    columns: [
      "username",
      "email",
      "first_name",
      "is_active",
      "is_superuser",
    ],
    write: ["superadmin"],
    search: true,
  },

  institutes: {
    title: "Institutes",
    description:
      "Independent communities, connected through one platform.",
    fields: [
      name,
      {
        key: "code",
        label: "Unique code",
        required: true,
      },
      {
        key: "kind",
        label: "Type",
        type: "select",
        choices: [
          "university",
          "college",
          "school",
        ],
        required: true,
      },
      {
        key: "active",
        label: "Active",
        type: "checkbox",
        default: true,
      },
    ],
    columns: [
      "name",
      "kind",
      "code",
      "active",
    ],
    write: ["superadmin"],
    search: true,
  },

  units: {
    title: "Academic units",
    description:
      "Departments, faculties, and flexible academic units.",
    fields: [
      name,
      {
        key: "kind",
        label: "Unit type",
        default: "department",
      },
      {
        key: "parent",
        label: "Parent unit",
        type: "select",
        source: "units",
      },
    ],
    columns: ["name", "kind"],
    write: admins,
    search: true,
  },

  years: {
    title: "Academic years",
    description:
      "Define the academic calendar for your institute.",
    fields: [
      name,
      {
        key: "start",
        label: "Start date",
        type: "date",
        required: true,
      },
      {
        key: "end",
        label: "End date",
        type: "date",
        required: true,
      },
    ],
    columns: [
      "name",
      "start",
      "end",
    ],
    write: admins,
  },

  terms: {
    title: "Terms & semesters",
    description:
      "Keep course delivery aligned with your academic year.",
    fields: [
      name,
      {
        key: "status",
        label: "Term status",
        type: "select",
        choices: [
          "planned",
          "active",
          "closed",
        ],
        default: "planned",
        required: true,
      },
      {
        key: "year",
        label: "Academic year",
        type: "select",
        source: "years",
        required: true,
      },
      {
        key: "start",
        label: "Start date",
        type: "date",
        required: true,
      },
      {
        key: "end",
        label: "End date",
        type: "date",
        required: true,
      },
    ],
    columns: [
      "name",
      "year_label",
      "start",
      "end",
    ],
    write: admins,
  },

  programs: {
    title: "Programs & grades",
    description:
      "Configure degree programs, school grades, or college streams.",
    fields: [
      name,
      unit,
      {
        key: "duration_terms",
        label: "Number of semesters / years",
        type: "number",
        default: 8,
        required: true,
      },
      {
        key: "structure",
        label: "Academic structure",
        type: "select",
        choices: [
          "semester",
          "annual",
        ],
        default: "semester",
        required: true,
      },
      {
        key: "active",
        label: "Active",
        type: "checkbox",
        default: true,
      },
    ],
    columns: [
      "name",
      "unit_label",
      "duration_terms",
      "structure",
      "active",
    ],
    write: admins,
  },

  batches: {
    title: "Admission batches",
    description:
      "Group admissions by program and entry year. Archive completed cohorts without deleting history.",
    fields: [
      name,
      {
        key: "program",
        label: "Program / grade",
        type: "select",
        source: "programs",
        required: true,
      },
      {
        key: "year",
        label: "Entry academic year",
        type: "select",
        source: "years",
        required: true,
      },
      {
        key: "active",
        label: "Active",
        type: "checkbox",
        default: true,
      },
    ],
    columns: [
      "name",
      "program_label",
      "year_label",
      "active",
    ],
    write: ["admin"],
    search: true,
  },

  curriculum: {
    title: "Curriculum",
    description:
      "Map reusable subjects to a program semester or year. Required and elective subjects can be shared across programs.",
    fields: [
      {
        key: "program",
        label: "Program / grade",
        type: "select",
        source: "programs",
        required: true,
      },
      {
        key: "course",
        label: "Subject",
        type: "select",
        source: "courses",
        required: true,
      },
      {
        key: "stage",
        label: "Semester / year number",
        type: "number",
        default: 1,
        required: true,
      },
      {
        key: "required",
        label: "Required subject (uncheck for elective)",
        type: "checkbox",
        default: true,
      },
      {
        key: "active",
        label: "Active",
        type: "checkbox",
        default: true,
      },
    ],
    columns: [
      "program_label",
      "course_label",
      "stage",
      "required",
      "active",
    ],
    write: ["admin"],
    search: true,
  },

  sections: {
    title: "Class sections",
    description:
      "Organize learners into classes within a program.",
    fields: [
      name,
      {
        key: "batch",
        label: "Admission batch (optional)",
        type: "select",
        source: "batches",
      },
      {
        key: "active",
        label: "Active",
        type: "checkbox",
        default: true,
      },
      {
        key: "program",
        label: "Program / grade",
        type: "select",
        source: "programs",
        required: true,
      },
    ],
    columns: [
      "name",
      "program_label",
      "batch_label",
      "active",
    ],
    write: admins,
  },

  courses: {
    title: "Course catalog",
    description:
      "Reusable subject definitions for your academic offerings.",
    fields: [
      name,
      {
        key: "code",
        label: "Course code",
        required: true,
      },
      unit,
      {
        key: "description",
        label: "Description",
        type: "textarea",
      },
      {
        key: "credit_hours",
        label: "Credit hours (optional)",
        type: "number",
        step: "0.25",
      },
      {
        key: "active",
        label: "Active",
        type: "checkbox",
        default: true,
      },
    ],
    columns: [
      "code",
      "name",
      "unit_label",
      "credit_hours",
      "active",
    ],
    write: admins,
    search: true,
  },

  offerings: {
    title: "My courses",
    description:
      "A home for your lessons, assessments, and learning community.",
    fields: [
      title,
      {
        key: "course",
        label: "Course definition",
        type: "select",
        source: "courses",
        required: true,
      },
      {
        key: "term",
        label: "Academic term",
        type: "select",
        source: "terms",
        required: true,
      },
      {
        key: "section",
        label: "Class section",
        type: "select",
        source: "sections",
      },
      {
        key: "teachers",
        label: "Instructors (Ctrl/Cmd to select multiple)",
        type: "multi",
        source: "memberships?role=teacher",
      },
      {
        key: "head_correction_review",
        label: "Delegate grade and attendance correction review to this course's Department Head",
        type: "checkbox",
        default: false,
      },
      {
        key: "assignment_reason",
        label: "Administrative assignment override reason",
        type: "textarea",
        required: true,
      },
      {
        key: "assignment_weight",
        label: "Assignment weight (%)",
        type: "number",
        default: 60,
        required: true,
      },
      {
        key: "quiz_weight",
        label: "Quiz weight (%)",
        type: "number",
        default: 40,
        required: true,
      },
      {
        key: "manual_weight",
        label: "Manual assessment weight (%)",
        type: "number",
        default: 0,
      },
      {
        key: "archived",
        label: "Archived",
        type: "checkbox",
      },
    ],
    columns: [
      "title",
      "course_label",
      "term_label",
      "archived",
    ],
    write: academic,
    search: true,
  },

  memberships: {
    title: "People",
    description:
      "Manage institute memberships and invite learners and educators.",
    fields: [
      {
        key: "username",
        label: "Username",
        required: true,
      },
      {
        key: "email",
        label: "Email",
        required: true,
      },
      {
        key: "first_name",
        label: "First name",
      },
      {
        key: "last_name",
        label: "Last name",
      },
      {
        key: "display_name",
        label: "Institute display name",
      },
      {
        key: "eligible_units",
        label: "Eligible teaching departments (teachers only)",
        type: "multi",
        source: "units",
      },
      {
        key: "student_identifier",
        label: "Student ID (students only)",
      },
      {
        key: "section",
        label: "Class / section",
        type: "select",
        source: "sections",
      },
      {
        key: "role",
        label: "Role",
        type: "select",
        choices: [
          "admin",
          "head",
          "teacher",
          "student",
        ],
        required: true,
      },
      unit,
      {
        key: "active",
        label: "Active membership",
        type: "checkbox",
        default: true,
      },
    ],
    columns: [
      "username",
      "first_name",
      "role",
      "active",
    ],
    write: admins,
    search: true,
  },

  enrollments: {
    title: "Enrollments",
    description:
      "Review enrollment history. Manage student enrollment and withdrawals from each course.",
    fields: [
      offering,
      {
        key: "student",
        label: "Student",
        type: "select",
        source: "memberships?role=student",
        required: true,
      },
      {
        key: "active",
        label: "Active",
        type: "checkbox",
        default: true,
      },
    ],
    columns: [
      "student_label",
      "offering_label",
      "active",
    ],
    write: [],
  },

  modules: {
    title: "Learning modules",
    description:
      "Group course content into a clear learning sequence.",
    fields: [
      offering,
      title,
      {
        key: "position",
        label: "Position",
        type: "number",
        default: 0,
      },
    ],
    columns: [
      "title",
      "offering_label",
      "position",
    ],
    write: staff,
  },

  lessons: {
    title: "Lessons",
    description:
      "Read, reflect, and take the next step in your course.",
    fields: [
      offering,
      {
        key: "module",
        label: "Module",
        type: "select",
        source: "modules",
      },
      title,
      {
        key: "body",
        label: "Lesson text",
        type: "textarea",
      },
      {
        key: "video_url",
        label: "External video URL",
      },
      {
        key: "position",
        label: "Position",
        type: "number",
        default: 0,
      },
      published,
      {
        key: "visible_at",
        label: "Visible from",
        type: "datetime-local",
      },
    ],
    columns: [
      "title",
      "offering_label",
      "position",
      "published",
    ],
    write: staff,
  },

  materials: {
    title: "Learning materials",
    description:
      "Secure resources available to your course community.",
    fields: [
      offering,
      {
        key: "lesson",
        label: "Lesson",
        type: "select",
        source: "lessons",
        required: true,
      },
      title,
      {
        key: "file",
        label: "File (PDF, TXT, PNG, JPG, DOCX; 10 MB max)",
        type: "file",
        required: true,
      },
    ],
    columns: [
      "title",
      "offering_label",
    ],
    write: staff,
  },

  assignments: {
    title: "Assignments",
    description:
      "Put your learning into practice. Every submission is a step forward.",
    fields: [
      offering,
      title,
      {
        key: "description",
        label: "Instructions",
        type: "textarea",
      },
      {
        key: "file",
        label: "Supporting resource (optional)",
        type: "file",
      },
      {
        key: "max_marks",
        label: "Maximum marks",
        type: "number",
        default: 100,
        required: true,
      },
      {
        key: "due_at",
        label: "Deadline",
        type: "datetime-local",
        required: true,
      },
      published,
      {
        key: "allow_late",
        label: "Allow late submissions",
        type: "checkbox",
      },
      {
        key: "allow_resubmit",
        label: "Allow resubmission before grading",
        type: "checkbox",
      },
    ],
    columns: [
      "title",
      "offering_label",
      "due_at",
      "max_marks",
      "published",
    ],
    // Only instructors can author assignments.
    // The backend additionally checks assigned course instructors.
    // Institute Admin and Super Admin remain read-only.
    write: ["teacher", "head"],
    search: true,
  },

  quizzes: {
    title: "Quizzes",
    description:
      "Check your understanding and build confidence through practice.",
    fields: [
      offering,
      title,
      {
        key: "opens_at",
        label: "Opens at",
        type: "datetime-local",
        required: true,
      },
      {
        key: "closes_at",
        label: "Closes at",
        type: "datetime-local",
        required: true,
      },
      {
        key: "minutes",
        label: "Time limit (minutes)",
        type: "number",
        default: 30,
      },
      {
        key: "attempt_limit",
        label: "Attempt limit",
        type: "number",
        default: 1,
      },
      published,
      {
        key: "released",
        label: "Release results",
        type: "checkbox",
      },
    ],
    columns: [
      "title",
      "offering_label",
      "minutes",
      "opens_at",
      "released",
    ],
    write: quizInstructors,
    search: true,
  },

  questions: {
    title: "Quiz questions",
    description:
      "Create multiple choice, true/false, and short answer questions.",
    fields: [
      {
        key: "quiz",
        label: "Quiz",
        type: "select",
        source: "quizzes",
        required: true,
      },
      {
        key: "prompt",
        label: "Question",
        type: "textarea",
        required: true,
      },
      {
        key: "kind",
        label: "Type",
        type: "select",
        choices: [
          "mcq",
          "boolean",
          "short",
        ],
        required: true,
      },
      {
        key: "options",
        label: "Choices (one per line, MCQ only)",
        type: "options",
      },
      {
        key: "answer",
        label: "Correct answer (exact choice, or true/false)",
      },
      {
        key: "marks",
        label: "Marks",
        type: "number",
        default: 1,
      },
    ],
    columns: [
      "prompt",
      "kind",
      "marks",
    ],
    write: quizInstructors,
  },

  "manual-grades": {
    title: "Manual assessment grades",
    description:
      "Released marks for practical, oral, and other instructor-assessed work.",
    fields: [
      offering,
      {
        key: "student",
        label: "Student",
        type: "select",
        source: "memberships?role=student",
        required: true,
      },
      title,
      {
        key: "marks",
        label: "Marks",
        type: "number",
        step: "0.01",
        required: true,
      },
      {
        key: "max_marks",
        label: "Maximum marks",
        type: "number",
        default: 100,
      },
      {
        key: "feedback",
        label: "Feedback",
        type: "textarea",
      },
      {
        key: "released",
        label: "Release grade",
        type: "checkbox",
      },
    ],
    columns: [
      "title",
      "student_label",
      "offering_label",
      "marks",
      "max_marks",
      "released",
    ],
    write: ["head", "teacher"],
  },

  "question-bank": {
    title: "Question bank",
    description:
      "Reusable questions for your teaching. Copy a question into a quiz before attempts begin.",
    fields: [
      {
        key: "prompt",
        label: "Question",
        type: "textarea",
        required: true,
      },
      {
        key: "kind",
        label: "Type",
        type: "select",
        choices: [
          "mcq",
          "boolean",
          "short",
        ],
        required: true,
      },
      {
        key: "options",
        label: "Choices (one per line)",
        type: "options",
      },
      {
        key: "answer",
        label: "Correct answer",
      },
      {
        key: "marks",
        label: "Marks",
        type: "number",
        default: 1,
      },
      unit,
    ],
    columns: [
      "prompt",
      "kind",
      "marks",
    ],
    write: quizInstructors,
    search: true,
  },

  submissions: {
    title: "Submissions",
    description:
      "Review work, give constructive feedback, and release grades.",
    fields: [],
    columns: [
      "student_label",
      "submitted_at",
      "late",
      "marks",
      "released",
    ],
    write: [],
  },

  attempts: {
    title: "Quiz attempts",
    description:
      "Review quiz answers and grade short answer questions.",
    fields: [],
    columns: [
      "student_label",
      "started_at",
      "submitted_at",
      "marks",
      "released",
    ],
    write: [],
  },

  "attendance-sessions": {
    title: "Attendance",
    description:
      "Record attendance and recognize consistent participation.",
    fields: [
      offering,
      {
        key: "date",
        label: "Date",
        type: "date",
        required: true,
      },
      {
        ...title,
        default: "Class meeting",
      },
    ],
    columns: [
      "title",
      "offering_label",
      "date",
    ],
    write: staff,
  },

  attendance: {
    title: "My attendance",
    description:
      "Your attendance history across enrolled courses.",
    fields: [],
    columns: [
      "offering_label",
      "session_label",
      "session_date",
      "status",
    ],
    write: [],
  },

  timetable: {
    title: "Timetable",
    description:
      "Your week, with space for learning.",
    fields: [
      offering,
      {
        key: "day",
        label: "Day (Monday = 0, Sunday = 6)",
        type: "number",
        required: true,
      },
      {
        key: "start",
        label: "Start time",
        type: "time",
        required: true,
      },
      {
        key: "end",
        label: "End time",
        type: "time",
        required: true,
      },
      {
        key: "location",
        label: "Room / location",
        required: true,
      },
    ],
    columns: [
      "offering_label",
      "day",
      "start",
      "end",
      "location",
    ],
    write: admins,
  },

  announcements: {
    title: "Announcements",
    description:
      "Stay connected to what’s happening in your academic community.",
    fields: [
      title,
      {
        key: "body",
        label: "Message",
        type: "textarea",
        required: true,
      },
      unit,
      {
        ...offering,
        required: false,
      },
      published,
    ],
    columns: [
      "title",
      "body",
      "published",
      "created_at",
    ],
    write: staff,
    search: true,
  },

  notifications: {
    title: "Notifications",
    description:
      "Updates on your assignments, feedback, and community.",
    fields: [],
    columns: [
      "title",
      "body",
      "read",
      "created_at",
    ],
    write: [],
  },

  audit: {
    title: "Audit history",
    description:
      "A record of sensitive changes within this institute.",
    fields: [],
    columns: [
      "action",
      "object_id",
      "detail",
      "created_at",
    ],
    write: [],
  },
};
