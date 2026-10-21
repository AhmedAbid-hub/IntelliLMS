import { StudentPriorities } from "../StudentPriorities";
import { type Analytics } from "./dashboardTypes";
import {
  AnnouncementsPreview,
  LearningProgress,
  UpcomingAssignments,
} from "./LearningOverview";
export function StudentDashboard({ data }: { data: Analytics }) {
  return (
    <>
      <StudentPriorities progress={data.gradebook} />

      <div
        className="dashboard-grid"

        style={{ marginTop: 20 }}
      >
        <LearningProgress
          rows={data.gradebook}

          isStudent
        />

        <UpcomingAssignments />

        <AnnouncementsPreview />
      </div>
    </>
  );
}
