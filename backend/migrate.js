import fs from "fs";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const raw = fs.readFileSync("./db.json", "utf-8");
  const data = JSON.parse(raw);

  for (const app of data.applications) {
    await pool.query(
      `INSERT INTO applications (company, role, status, date_applied, location, link, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [app.company, app.role, app.status, app.dateApplied, app.location || "", app.link || "", app.notes || ""]
    );
  }

  console.log(`Migrated ${data.applications.length} applications.`);
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});