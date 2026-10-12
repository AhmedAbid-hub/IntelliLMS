import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Loading, ErrorState, Empty } from '../../components/shared';
import type { GradeRow } from './Dashboard';

type Agenda = { pending_assignments: number; overdue_assignments: number; pending_quizzes: number; missed_quizzes: number; preview_limit: number; tasks: { id: string; kind: string; title: string; course: string; deadline: string; opens_at: string | null; overdue: boolean; action: string; url: string }[] };
export function StudentPriorities({ progress = [] }: { progress?: GradeRow[] }) {
  const query = useQuery({ queryKey: ['student-agenda'], queryFn: () => api<Agenda>('my-agenda/') });
  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorState error={query.error} />;
  const data = query.data;
  return <section className="panel padded student-priorities" aria-label="My priorities">
    <h2>What needs my attention?</h2>
    <p>{data.pending_assignments} unsubmitted assignments · {data.overdue_assignments} overdue · {data.pending_quizzes} upcoming or open quizzes · {data.missed_quizzes} missed quizzes</p>
    <p className="muted">Based on your own submissions and published course deadlines. Overdue work may need a conversation with your teacher.</p>
    {data.tasks.length ? <ul className="agenda-list">{data.tasks.map(task => <li key={task.kind + task.id}>
      <div><span className={`status-badge${task.overdue ? ' neutral' : ''}`}>{task.overdue ? 'Overdue' : task.kind === 'quiz' ? 'Quiz' : 'Assignment'}</span><b>{task.title}</b><small>{task.course} · Due {new Date(task.deadline).toLocaleString()}{task.opens_at && ` · Opens ${new Date(task.opens_at).toLocaleString()}`}</small></div>
      <Link to={task.url}>{task.action}</Link>
    </li>)}</ul> : <Empty>No pending published assignments or quizzes in your active courses.</Empty>}
    <p className="muted">Showing up to {data.preview_limit} nearest upcoming and recent overdue tasks. <Link to="/assignments">All assignments</Link> · <Link to="/quizzes">All quizzes</Link></p>
    {progress.length > 0 && <><h3>Suggested next steps</h3><ul className="agenda-list">{progress.map(row => <li key={row.offering}><div><b>{row.offering_label}</b>
      <small>{row.attendance_pct == null ? 'Attendance has not been recorded yet.' : `Recorded attendance: ${row.attendance_pct.toFixed(1)}%.`}{row.score == null ? ' No released assessment summary yet.' : ` Released assessment summary: ${row.score.toFixed(1)}%.`}</small>
      <p>{row.completion_pct != null && row.completion_pct < 100 ? `${row.completion_pct.toFixed(1)}% of available lessons completed. Continue the next unfinished lesson.` : row.score != null ? 'Review your released feedback and note questions to discuss with your teacher.' : 'Check your course workspace for published lessons and upcoming work.'}</p>
    </div><Link to={`/course/${row.offering}`}>Open course</Link></li>)}</ul><p className="muted">These suggestions use recorded activity, not experimental risk labels. <Link to="/grades">Review all course results</Link></p></>}
  </section>;
}
