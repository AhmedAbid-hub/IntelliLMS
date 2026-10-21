import { type Analytics } from "./dashboardTypes";
import {
  AnnouncementsPreview,
  LearningProgress,
  UpcomingAssignments,
} from "./LearningOverview";
export function TeacherDashboard({ data }: { data: Analytics }) {
  return (
    <div
      className="dashboard-grid"

      style={{ marginTop: 20 }}
    >
      <LearningProgress
        rows={data.gradebook}

        isStudent={false}
      />

      <UpcomingAssignments />

      <AnnouncementsPreview />
    </div>
  );
}
