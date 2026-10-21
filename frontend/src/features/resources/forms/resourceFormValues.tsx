import { type RecordData } from "../../../lib/api";
import { type Field } from "../config";

export type AccountType = "student" | "teacher" | "head";

export type SubjectMode = "existing" | "new";

export type FormValues = Record<string, any>;

export type CreatedSubject = {
  id: string;

  name: string;

  code: string;
};

export function isAccountType(value: unknown): value is AccountType {
  return value === "student" || value === "teacher" || value === "head";
}

export function isRelevantAccountField(
  field: Field,

  accountType: AccountType,
) {
  if (field.key === "role") return true;

  if (field.key === "student_identifier" || field.key === "section") {
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

export function initialFieldValues(
  fields: Field[],

  initial: RecordData | undefined,

  defaults: Record<string, unknown>,
) {
  return Object.fromEntries(
    fields.map((field) => {
      let value: unknown =
        initial?.[field.key] ??
        defaults[field.key] ??
        field.default ??
        (field.type === "checkbox" ? false : field.type === "multi" ? [] : "");

      if (field.type === "datetime-local" && value) {
        value = new Date(String(value))

          .toLocaleString("sv-SE")

          .replace(" ", "T")

          .slice(0, 16);
      }

      if (field.type === "options" && Array.isArray(value)) {
        value = value.join("\n");
      }

      if (field.type === "file") {
        value = undefined;
      }

      if (field.type === "checkbox" && typeof value === "string") {
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
    }),
  );
}

export function buildPayload(
  fields: Field[],

  data: FormValues,

  initial: RecordData | undefined,

  isPeople: boolean,

  useAccountWizard: boolean,

  accountType: AccountType,
) {
  const payload: Record<string, unknown> = {};

  for (const field of fields) {
    if (
      initial &&
      isPeople &&
      ["username", "email", "first_name", "last_name"].includes(field.key)
    ) {
      continue;
    }

    let value = data[field.key];

    if (useAccountWizard && field.key === "role") {
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
      value = value === "" && !field.required ? null : Number(value);
    }

    if (field.type === "options") {
      value = String(value || "")
        .split("\n")

        .filter(Boolean);
    }

    if (field.type === "datetime-local") {
      value = value ? new Date(String(value)).toISOString() : null;
    }

    if (field.type === "select" && !value && !field.required) {
      value = null;
    }

    payload[field.key] = value;
  }

  if (useAccountWizard) {
    payload.role = accountType;
  }

  return payload;
}
