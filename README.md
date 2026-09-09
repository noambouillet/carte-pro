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
