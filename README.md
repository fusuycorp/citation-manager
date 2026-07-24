# CiteSphere - Academic Citation Manager

A full-stack, high-performance Academic Citation Management system built with **Bun**, **SQLite (`bun:sqlite`)**, **Hono**, and **Vite + React**.

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Bun](https://img.shields.io/badge/Runtime-Bun%201.3-black)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ⚡ Features

- 🛡️ **Domain-Whitelisted Access**: Registration enforces institutional domain checking (e.g. `@bogazici.edu.tr`, `@gmail.com`).
- 👥 **Many-to-Many Citation Ownership**: Citations can be co-owned by multiple users with strict edit authorization guards.
- 👻 **Unowned / Orphan Record State**: Unlinking a citation preserves the record in an unowned state in the global directory for discovery and claiming.
- 🪄 **Smart Author Surname Auto-Matching**: Automatically detects author surnames and matches registered users for co-authorship.
- ✉️ **In-App & Email Invitations**: Send invites to unregistered authors; citations automatically link to their accounts upon registration.
- 📚 **Dynamic Citation Generator**: Live preview and export for **APA 7th** (default), **IEEE**, **MLA 9th**, **Chicago 17th**, **Harvard**, **BibTeX**, and **RIS**.

---

## 🚀 Quick Start Guide

### Prerequisites
Make sure you have [Bun](https://bun.sh) installed on your system (v1.1+ recommended).

```bash
bun -v
```

### 1. Install Dependencies
```bash
bun install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Seed Database
Seed the SQLite database with 1900+ Boğaziçi faculty citations & default domain whitelist:
```bash
bun run seed
```

### 4. Boot Up the Application

#### Production Mode (Full-stack Bun Server)
Build the frontend and launch the single Bun server:
```bash
bun run build
bun dev:server
```
Open **`http://localhost:3000`** in your browser.

#### Development Mode (With Hot Reloading)
In two separate terminal windows:
```bash
# Terminal 1: Backend Server (Port 3000)
bun dev:server

# Terminal 2: Frontend Vite Dev Server (Port 5173)
bun dev:client
```

---

## 🧪 Running Tests

Run the full suite of unit and integration tests:
```bash
bun test
```

---

## 📚 Developer Documentation

For detailed developer setup, standards, and workflow instructions:
- 📖 [Development & Setup Guide](file:///home/fusuyfusuy/Projects/fusuyfusuy-stuff/citation-manager/docs/DEVELOPMENT.md)
- 📐 [Coding Standards & Conventions](file:///home/fusuyfusuy/Projects/fusuyfusuy-stuff/citation-manager/docs/CODING_STANDARDS.md)
- 💬 [Git Commit & Versioning Standards](file:///home/fusuyfusuy/Projects/fusuyfusuy-stuff/citation-manager/docs/COMMIT_STANDARDS.md)

---

## 🔑 Default Test Accounts

| Role | Email | Password |
|---|---|---|
| **System Admin** | `admin@bogazici.edu.tr` | `password123` |
| **Faculty User** | `mehmet.aydin@bogazici.edu.tr` | `password123` |
| **Faculty User** | `user1@gmail.com` | `password123` |
