# CORE Platform

> **ADMITra Core Systems Private Limited**

Integrated web platform for educational services, student lifecycle management, Ivy League preparation, CRM, payments, and partner operations.

**Production:** https://core.admitra.io

---

## Documentation

**Full platform documentation:** [docs/README.md](docs/README.md)

| Quick link | Description |
|---|---|
| [Product Overview](docs/02-platform/product-overview.md) | What CORE does |
| [Quick Start — Local Dev](docs/08-operations/local-development.md) | Get running locally |
| [User Roles](docs/02-platform/user-roles-and-permissions.md) | All 15 roles |
| [System Architecture](docs/03-architecture/system-architecture.md) | How it's built |
| [Module Index](docs/README.md#06--modules) | All 23+ business modules |

---

## Quick start

### Backend
```bash
cd backend
npm install
npm run seed:forms
npm run dev          # http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

See [Local Development](docs/08-operations/local-development.md) for environment variables and full setup.

---

## Platform overview

| Component | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Backend | Node.js, Express 5, TypeScript |
| Database | MongoDB (Mongoose) |
| Payments | Razorpay |
| Mobile | Capacitor (Android) |

### Key capabilities

- 15 user roles with dedicated portals
- Student services: Study Abroad, Education Planning, Coaching Classes, Ivy League
- Dynamic forms, document management, program selection
- CRM: leads, follow-ups, referrers, B2B pipeline
- Payments: Razorpay, invoices, ledger, GST
- Ivy League: 6-pointer coaching, aptitude test, expert workflow
- Service provider marketplace
- AI tools: portfolio generation, activity suggestions, grammar check

---

## Repository structure

```
CORE/
├── backend/         # Express API
├── frontend/        # Next.js web app + Capacitor Android
├── docs/            # Platform documentation
└── nginx-*.conf     # Production nginx configs
```

---

## Environments

| Environment | Web | API |
|---|---|---|
| Local | http://localhost:3000 | http://localhost:5000/api |
| Production | https://core.admitra.io | https://api.core.admitra.io/api |

---

**ADMITra Core Systems Private Limited** — All rights reserved.
