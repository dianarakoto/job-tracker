import { useEffect, useMemo, useState, useRef } from "react";
import Papa from "papaparse";
import type { JobApplication, NewJobApplication, Status } from "./types";
import { fetchApplications, createApplication, updateApplication, deleteApplication } from "./api";
import Dashboard from "./Dashboard";

const STATUSES: { value: Status; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
];

const emptyForm: NewJobApplication = {
  company: "",
  role: "",
  status: "applied",
  dateApplied: new Date().toISOString().slice(0, 10),
  location: "",
  link: "",
  notes: "",
};

export default function App() {
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [searchCompany, setSearchCompany] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [searchRole, setSearchRole] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [form, setForm] = useState<NewJobApplication>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"applications" | "dashboard">("applications");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refreshRoleOptions() {
    try {
      const all = await fetchApplications("all");
      const roles = [...new Set(all.map((a) => a.role))].sort((a, b) => a.localeCompare(b));
      setRoleOptions(roles);
    } catch {
    }
  }

  async function refreshLocationOptions() {
    try {
      const all = await fetchApplications("all");
      const locations = [...new Set(all.map((a) => a.location).filter((l): l is string => !!l && l.trim() !== ""))]
        .sort((a, b) => a.localeCompare(b));
      setLocationOptions(locations);
    } catch {
    }
  }

  async function load() {
    setLoading(true);
    try {
      const data = await fetchApplications(filter);
      setApps(data);
      setError(null);
    } catch (e) {
      setError("Couldn't reach the server. Is the backend running on port 3001?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  useEffect(() => {
    refreshRoleOptions();
    refreshLocationOptions();
  }, []);

  function startEdit(app: JobApplication) {
    setEditingId(app.id);
    setForm({
      company: app.company,
      role: app.role,
      status: app.status,
      dateApplied: app.dateApplied,
      location: app.location ?? "",
      link: app.link ?? "",
      notes: app.notes ?? "",
    });
    setShowForm(true);
  }

  function startNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company.trim() || !form.role.trim()) return;
    try {
      if (editingId !== null) {
        await updateApplication(editingId, form);
      } else {
        await createApplication(form);
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      await load();
      await refreshRoleOptions();
      await refreshLocationOptions();
    } catch {
      setError("Couldn't save that application. Try again.");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this application?")) return;
    await deleteApplication(id);
    await load();
    await refreshRoleOptions();
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
  
    function cleanValue(v?: string): string {
      return (v?.trim() || "").replace(/^"+|"+$/g, "");
    }
  
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[];
        console.log("Parsed rows:", rows);
  
        if (rows.length === 0) {
          alert("That CSV didn't have any rows to import.");
          e.target.value = "";
          return;
        }
  
        const validStatuses = new Set(STATUSES.map((s) => s.value));
        let success = 0;
        let failed = 0;
  
        for (const row of rows) {
          const company = cleanValue(row.company);
          const role = cleanValue(row.role);
          const dateApplied = cleanValue(row.dateApplied);
          const location = cleanValue(row.location);
          const link = cleanValue(row.link);
          const notes = cleanValue(row.notes);
  
          if (!company || !role || !dateApplied) {
            failed++;
            continue;
          }
  
          const rawStatus = cleanValue(row.status).toLowerCase();
          const status: Status = validStatuses.has(rawStatus as Status)
            ? (rawStatus as Status)
            : "applied";
  
          try {
            const created = await createApplication({
              company,
              role,
              status,
              dateApplied,
              location,
              link,
              notes,
            });
            console.log("Created:", created);
            success++;
          } catch (err) {
            console.error("Failed to create row:", row, err);
            failed++;
          }
        }
  
        alert(`Imported ${success} application(s). ${failed} row(s) skipped (missing or invalid data).`);
        e.target.value = "";
        await load();
        await refreshRoleOptions();
        await refreshLocationOptions();
      },
      error: () => {
        alert("Couldn't read that CSV file.");
        e.target.value = "";
      },
    });
  }

  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s.value] = apps.filter((a) => a.status === s.value).length;
    return acc;
  }, {});

  const companyQuery = searchCompany.trim().toLowerCase();

  const filteredApps = useMemo(
    () =>
      apps.filter((app) => {
        if (companyQuery && !app.company.toLowerCase().includes(companyQuery)) return false;
        if (searchRole && app.role !== searchRole) return false;
        if (searchLocation && app.location !== searchLocation) return false;
        return true;
      }),
    [apps, companyQuery, searchRole, searchLocation, sortOrder]
  );

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1>Application Log</h1>
          <p className="subtitle">Every company you've reached out to, in one place.</p>
        </div>
        <div className="topbar-actions">
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileSelected}
            style={{ display: "none" }}
          />
          <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
            Import CSV
          </button>
          <button className="btn-primary" onClick={startNew}>
            + New application
          </button>
        </div>
      </header>

      <nav className="navbar">
        <button
          className={view === "applications" ? "nav-tab nav-tab-active" : "nav-tab"}
          onClick={() => setView("applications")}
        >
          Applications
        </button>
        <button
          className={view === "dashboard" ? "nav-tab nav-tab-active" : "nav-tab"}
          onClick={() => setView("dashboard")}
        >
          Dashboard
        </button>
      </nav>

      {view === "applications" ? (
        <>
          <div className="search-bar">
            <label className="search-field">
              <span className="search-label">Company</span>
              <input
                type="search"
                className="search-input"
                placeholder="Filter by company…"
                value={searchCompany}
                onChange={(e) => setSearchCompany(e.target.value)}
              />
            </label>

            <label className="search-field">
              <span className="search-label">Sort by date</span>
              <select
                className="search-input"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>

            <label className="search-field">
              <span className="search-label">Role</span>
              <select
                className="search-input"
                value={searchRole}
                onChange={(e) => setSearchRole(e.target.value)}
              >
                <option value="">All roles</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            <label className="search-field">
              <span className="search-label">Location</span>
              <select
                className="search-input"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
              >
                <option value="">All locations</option>
                {locationOptions.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <nav className="filters">
        <button
          className={filter === "all" ? "chip chip-active" : "chip"}
          onClick={() => setFilter("all")}
        >
          All ({apps.length})
        </button>
        {STATUSES.map((s) => (
          <button
            key={s.value}
            className={filter === s.value ? `chip chip-active status-${s.value}` : "chip"}
            onClick={() => setFilter(s.value)}
          >
            {s.label} ({counts[s.value] ?? 0})
          </button>
        ))}
      </nav>

      {error && <div className="banner-error">{error}</div>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : apps.length === 0 ? (
        <div className="empty">
          <p>Nothing logged yet.</p>
          <p className="muted">Add the first company you applied to — it takes ten seconds.</p>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="empty">
          <p>No applications match your filters.</p>
          <p className="muted">Try adjusting company, date, or role.</p>
        </div>
      ) : (
        <ul className="list">
          {filteredApps.map((app) => (
            <li key={app.id} className="row">
              <span className={`dot status-${app.status}`} />
              <div className="row-main">
                <div className="row-title">
                  <strong>{app.company}</strong>
                  <span className="muted"> — {app.role}</span>
                </div>
                <div className="row-meta">
                  <span>{app.dateApplied}</span>
                  {app.location && <span>{app.location}</span>}
                  {app.link && (
                    <a href={app.link} target="_blank" rel="noreferrer">
                      posting ↗
                    </a>
                  )}
                </div>
                {app.notes && <p className="notes">{app.notes}</p>}
              </div>
              <span className={`badge status-${app.status}`}>
                {STATUSES.find((s) => s.value === app.status)?.label}
              </span>
              <div className="row-actions">
                <button onClick={() => startEdit(app)}>Edit</button>
                <button onClick={() => handleDelete(app.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
        </>
      ) : (
        <Dashboard apps={apps} statuses={STATUSES}/>
      )}

      {showForm && (
        <div className="overlay" onClick={() => setShowForm(false)}>
          <form className="panel" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <h2>{editingId !== null ? "Edit application" : "New application"}</h2>

            <label>
              Company
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="e.g. Personio"
                required
              />
            </label>

            <label>
              Role
              <input
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="e.g. Junior Software Engineer"
                required
              />
            </label>

            <div className="field-row">
              <label>
                Status
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Date applied
                <input
                  type="date"
                  value={form.dateApplied}
                  onChange={(e) => setForm({ ...form, dateApplied: e.target.value })}
                  required
                />
              </label>
            </div>

            <label>
              Location
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. Berlin, Germany"
              />
            </label>

            <label>
              Posting link
              <input
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="https://..."
              />
            </label>

            <label>
              Notes
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Recruiter contact, interview notes, follow-up date…"
                rows={3}
              />
            </label>

            <div className="panel-actions">
              <button type="button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editingId !== null ? "Save changes" : "Add application"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
