# Carte Pro

Carte Pro is a digital employee benefit platform. Employers credit their
employees' accounts, employees spend that credit at approved partners by
scanning a QR code, and partners get reimbursed. Admins validate partner
applications and manage accounts.

The project has two parts:

- `backend/`: the API, built with Bun and Elysia. See [backend/README.md](backend/README.md).
- `frontend/`: the web app, built with React and Vite. See [frontend/README.md](frontend/README.md).

## Requirements

- [Bun](https://bun.sh/) 1.4+
- [Node.js](https://nodejs.org/) 20+ (some frontend packages ask for 24, the app runs fine on 20)
- [Docker](https://www.docker.com/) with Docker Compose
- [mkcert](https://mkcert.dev/) (both apps run over local HTTPS in dev)

## Quick start

The `run.sh` script at the repo root sets up local HTTPS certificates,
installs dependencies if needed, starts PostgreSQL in Docker, and runs both
the backend and the frontend.

```bash
./run.sh
```

The first run asks for your password once, to let mkcert register a local
certificate authority. After that:

- Backend: `https://localhost:3000`
- Frontend: `https://localhost:3000`

Press Ctrl+C to stop everything, Postgres included.

## Manual setup

If you prefer to run things by hand, see the setup steps in
[backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md).
Both need a `.env` file, copied from the matching `.env.example`.

## Notes

- The two apps talk to each other over HTTPS in dev, so both need valid
  certificates from `./generate-certs.sh` (run automatically by `run.sh`).
- `backend/.env`'s `FRONTEND_URL` and `frontend/.env`'s `BACKEND_URL` need to
  point at each other with the right scheme (`https://`), or requests will
  fail with a CORS error or a 502 from the Vite proxy.
- Never commit a `.env` file. They hold real secrets and DB credentials.

## Team

Carte Pro was built as a team project at Epitech:

- **Noam Bouillet**: backend lead and infrastructure
- **Gaspard Bry**: frontend foundation, admin dashboard and backend tests
- **Mato Urbanac**: frontend pages and front/back integration
- **Baptiste Jaunais**: project documents and planning

### My part (Noam Bouillet)

Backend:

- Designed the PostgreSQL schema (Drizzle) for payments, with transaction rollbacks and concurrency handling.
- Built most of the REST API for the MVP (Bun + Elysia), with OpenAPI docs.
- Authentication: JWT in `SameSite=Lax` cookies with a 2h lifetime, one login route for every role, and `/auth/me` for role lookup.
- QR code payments signed with a JWT secret.
- Audit logging middleware that records actions on every route.
- `/:id/balance` endpoint for HR system (SIRH) integration.
- Account deletion and archiving for employees and partners.
- Deterministic seeding script (`bun seed`) with its own RNG.

Infrastructure:

- Local HTTPS for both apps with mkcert, and the Vite reverse proxy.
- `run.sh`, which starts the database, the backend and the frontend with one command.
- GitHub Actions workflow.

Frontend:

- Axios API layer for employees and partners.
- Partner registration and the backend side of the partner dashboard.
- Low-connectivity mode that caches the employee balance locally.

Docs: SQL diagram, test and seeding docs, and legal documents (terms of use, accessibility statement, data processing register).
