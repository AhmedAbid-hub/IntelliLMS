import { display } from "../../../lib/api";

export const timetableDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function timetableDay(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const day = Number(value);
  return Number.isInteger(day) && day >= 0 && day < 7
    ? timetableDays[day]
    : display(value);
}

export function timetableTime(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const match = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(String(value));
  if (!match) return display(value);
  const hour = Number(match[1]);
  if (hour > 23) return display(value);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
}
