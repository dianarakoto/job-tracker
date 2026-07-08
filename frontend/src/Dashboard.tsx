import type { JobApplication, Status } from "./types";

interface DashboardProps {
  apps: JobApplication[];
  statuses: { value: Status; label: string }[];
}

function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  // Find the Monday of that week
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // shift Sunday back to previous Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

export default function Dashboard({ apps, statuses }: DashboardProps) {
  const total = apps.length;

  const counts = statuses.reduce<Record<string, number>>((acc, s) => {
    acc[s.value] = apps.filter((a) => a.status === s.value).length;
    return acc;
  }, {});

  const responded = apps.filter((a) => a.status !== "applied").length;
  const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

  const weekMap = new Map<string, number>();
  for (const app of apps) {
    if (!app.dateApplied) continue;
    const week = getWeekLabel(app.dateApplied);
    weekMap.set(week, (weekMap.get(week) ?? 0) + 1);
  }
  const weeks = [...weekMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8);
  const maxWeekCount = Math.max(1, ...weeks.map(([, count]) => count));

  if (total === 0) {
    return (
      <div className="empty">
        <p>No data yet.</p>
        <p className="muted">Add or import some applications to see stats here.</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-number">{total}</span>
          <span className="stat-label">Total applications</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{responseRate}%</span>
          <span className="stat-label">Response rate</span>
        </div>
        {statuses.map((s) => (
          <div className="stat-card" key={s.value}>
            <span className={`stat-number status-${s.value}`}>{counts[s.value] ?? 0}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <h2 className="dashboard-subheading">Applications per week</h2>
      <div className="bar-chart">
        {weeks.map(([week, count]) => (
          <div className="bar-column" key={week}>
            <div
              className="bar"
              style={{ height: `${(count / maxWeekCount) * 100}%` }}
              title={`${count} application(s)`}
            />
            <span className="bar-value">{count}</span>
            <span className="bar-label">{week.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}