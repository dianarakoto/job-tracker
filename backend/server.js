import express from "express";
import cors from "cors";
import pg from "pg";

const { Pool } = pg;

const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL environment variable. Set it to your Postgres connection string.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'applied',
      date_applied DATE NOT NULL,
      location TEXT DEFAULT '',
      link TEXT DEFAULT '',
      notes TEXT DEFAULT ''
    )
  `);
}

function toApiShape(row) {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    status: row.status,
    dateApplied:
      row.date_applied instanceof Date
        ? row.date_applied.toISOString().slice(0, 10)
        : row.date_applied,
    location: row.location ?? "",
    link: row.link ?? "",
    notes: row.notes ?? "",
  };
}

app.get("/api/applications", async (req, res) => {
  try {
    const { status } = req.query;
    let result;
    if (status && status !== "all") {
      result = await pool.query(
        "SELECT * FROM applications WHERE status = $1 ORDER BY date_applied DESC",
        [status]
      );
    } else {
      result = await pool.query("SELECT * FROM applications ORDER BY date_applied DESC");
    }
    res.json(result.rows.map(toApiShape));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/applications/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM applications WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(toApiShape(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/applications", async (req, res) => {
  const { company, role, status = "applied", dateApplied, location = "", link = "", notes = "" } = req.body;
  if (!company || !role || !dateApplied) {
    return res.status(400).json({ error: "company, role, and dateApplied are required" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO applications (company, role, status, date_applied, location, link, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [company, role, status, dateApplied, location, link, notes]
    );
    res.status(201).json(toApiShape(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.put("/api/applications/:id", async (req, res) => {
  try {
    const existing = await pool.query("SELECT * FROM applications WHERE id = $1", [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: "Not found" });

    const current = existing.rows[0];
    const { company, role, status, dateApplied, location, link, notes } = req.body;

    const result = await pool.query(
      `UPDATE applications
       SET company = $1, role = $2, status = $3, date_applied = $4, location = $5, link = $6, notes = $7
       WHERE id = $8
       RETURNING *`,
      [
        company ?? current.company,
        role ?? current.role,
        status ?? current.status,
        dateApplied ?? current.date_applied,
        location ?? current.location,
        link ?? current.link,
        notes ?? current.notes,
        req.params.id,
      ]
    );
    res.json(toApiShape(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete("/api/applications/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM applications WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

const PORT = process.env.PORT || 3001;

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });