import type { JobApplication, NewJobApplication, Status } from "./types";

const API_ROOT = import.meta.env.VITE_API_URL || "";
const BASE = "/api/applications";

export async function fetchApplications(status?: Status | "all"): Promise<JobApplication[]> {
  const url = status && status !== "all" ? `${BASE}?status=${status}` : BASE;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch applications");
  return res.json();
}

export async function createApplication(data: NewJobApplication): Promise<JobApplication> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create application");
  return res.json();
}

export async function updateApplication(
  id: number,
  data: Partial<NewJobApplication>
): Promise<JobApplication> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update application");
  return res.json();
}

export async function deleteApplication(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error("Failed to delete application");
}
