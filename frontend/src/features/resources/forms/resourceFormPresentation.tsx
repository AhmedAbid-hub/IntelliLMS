import { AccountType } from "./resourceFormValues";

export const personalFieldKeys = new Set([
  "username",

  "email",

  "first_name",

  "last_name",

  "display_name",
]);

export const gradingKeys = new Set([
  "assignment_weight",

  "quiz_weight",

  "manual_weight",
]);

export const accountTypes: {
  value: AccountType;

  title: string;

  description: string;
}[] = [
  {
    value: "student",

    title: "Student",

    description: "Create a learner account and enter academic details.",
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

    description: "Create an academic leader account for a department.",
  },
];

export const responsiveGridStyle = {
  display: "grid",

  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",

  gap: 18,

  alignItems: "start",

  width: "100%",
} as const;

export const inputStyle = {
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
