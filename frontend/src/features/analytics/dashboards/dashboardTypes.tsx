import { BookOpen } from "lucide-react";

export interface GradeRow {
  letter_grade?: string | null;

  grade_points?: number | null;

  student: string;

  student_label: string;

  offering: string;

  offering_label: string;

  score: number | null;

  attendance_pct: number | null;

  assignment_pct: number | null;

  quiz_pct: number | null;

  manual_pct: number | null;

  completion_pct: number | null;

  activity_count: number;
}

export interface Analytics {
  structure_counts?: Record<string, number>;

  active_courses: number;

  students: number;

  teachers: number;

  enrollments: number;

  attendance_pct: number | null;

  submissions: number;

  activity_events: number;

  gradebook: GradeRow[];

  activity_by_kind: {
    kind: string;

    count: number;
  }[];

  institute: string;

  role: string;
}

export type Stat = {
  label: string;

  value: string | number;

  description: string;

  icon: typeof BookOpen;

  color?: string;

  tint?: string;
};
