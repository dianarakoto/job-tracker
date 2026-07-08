import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, "db.json");

function readDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ applications: [], nextId: 1 }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

const app = express();
app.use(cors());
app.use(express.json());

// GET all applications, optional ?status= filter
app.get("/api/applications", (req, res) => {
  const { status } = req.query;
  const db = readDb();
  let rows = db.applications;
  if (status && status !== "all") {
    rows = rows.filter((a) => a.status === status);
  }
  rows = [...rows].sort((a, b) => (a.dateApplied < b.dateApplied ? 1 : -1));
  res.json(rows);
});

// GET single application
app.get("/api/applications/:id", (req, res) => {
  const db = readDb();
  const row = db.applications.find((a) => a.id === Number(req.params.id));
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

// POST create application
app.post("/api/applications", (req, res) => {
  const { company, role, status = "applied", dateApplied, location= "",link = "", notes = "" } = req.body;
  if (!company || !role || !dateApplied) {
    return res.status(400).json({ error: "company, role, and dateApplied are required" });
  }
  const db = readDb();
  const created = { id: db.nextId, company, role, status, dateApplied, location,link, notes };
  db.applications.push(created);
  db.nextId += 1;
  writeDb(db);
  res.status(201).json(created);
});

// PUT update application
app.put("/api/applications/:id", (req, res) => {
  const db = readDb();
  const idx = db.applications.findIndex((a) => a.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  db.applications[idx] = { ...db.applications[idx], ...req.body, id: db.applications[idx].id };
  writeDb(db);
  res.json(db.applications[idx]);
});

// DELETE application
app.delete("/api/applications/:id", (req, res) => {
  const db = readDb();
  const before = db.applications.length;
  db.applications = db.applications.filter((a) => a.id !== Number(req.params.id));
  if (db.applications.length === before) return res.status(404).json({ error: "Not found" });
  writeDb(db);
  res.status(204).end();
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
