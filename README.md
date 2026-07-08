# Job Application Tracker

A small full-stack app to log job applications: company, role, status, date applied, and notes.
Built as a portfolio project — TypeScript + React frontend, Node/Express backend.

## Stack
- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Express, JSON file storage (no external DB needed to run it)

## Running it locally

**Backend:**
```
cd backend
npm install
npm start
```
Runs on http://localhost:3001

**Frontend (in a second terminal):**
```
cd frontend
npm install
npm run dev
```
Runs on http://localhost:5173 and proxies /api calls to the backend.

## Features
- Add, edit, and delete job applications
- Filter by status: applied / interview / offer / rejected
- Track posting links and free-text notes per application

## Built with AI coding tools
This project was scaffolded and built with an AI coding agent directing most of the typing,
with me reviewing, testing, and fixing what it produced. Two concrete examples from building this:

- **What it got right:** scaffolding the CRUD API routes and the React form state handling
  quickly and correctly on the first pass, including sensible defaults (e.g. today's date
  pre-filled on new entries).
- **What it got wrong and I caught:** the first version used `better-sqlite3` for storage,
  which requires native compilation and fails to install cleanly on several machines/CI
  environments without build tools set up. I tested the install, saw it fail, and had the
  agent switch to a dependency-free JSON file store instead — same functionality, zero
  native-build friction. I verified the fix by running both the backend API (via curl) and
  a full frontend type-check + production build before considering it done.

## Possible next steps
- Swap the JSON file store for a real database (PostgreSQL) if this needs to scale
- Add authentication if used by more than one person
- Add simple stats (response rate, time-to-interview) across logged applications
