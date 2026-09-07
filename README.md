# CartePro

CartePro is a digital employee benefit platform that lets employees use employer-provided credits across a network of approved partners.
Employees can discover partners, track their balance and transactions, and pay using a QR code.
Partners manage payments and their financial activity, while the  administers, credits, and featured recommendations.

## Build

### Requirements

* [Bun](https://bun.sh/) `1.4.0`
* [Node.js](https://nodejs.org/) `24`
* [Docker](https://www.docker.com/) with Docker Compose

### Backend

Install dependencies:

```bash
cd backend
bun install
```

Create the environment file:

```bash
cp .env.example .env
```

Change the password in `.env`:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=cartePro_user
DB_PASSWORD=change_this_password
DB_NAME=cartePro
```

Start PostgreSQL:

```bash
docker compose up -d
```

Start the backend:

```bash
bun run dev
```

The API runs on port `3000` by default.

To stop PostgreSQL:

```bash
docker compose down
```

To remove the PostgreSQL data volume as well:

```bash
docker compose down -v
```

### Frontend

Install dependencies:

```bash
cd frontend
npm ci
```

Start the development server:

```bash
npm run dev
```

The frontend runs on port `5173` by default.

### Production build

Build the frontend:

```bash
cd frontend
npm run build
```

Build the backend:

```bash
cd backend
bun build src/index.ts --outdir dist
```

The generated files are placed in:

```text
frontend/dist/
backend/dist/
```

> [!WARNING]
> Never commit `.env` to the repository. It may contain database credentials or other secrets.
