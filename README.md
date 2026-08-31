## Deployment

Go to the `deployments` folder, copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

Change the password in `.env`:

```
DATABASE_URL=postgres://cartepro_user:change_this_password@localhost:5432/cartepro
POSTGRES_USER=cartepro_user
POSTGRES_PASSWORD=change_this_password
POSTGRES_DB=cartepro
```

Then launch **PostgreSQL** with Docker:

```bash
docker compose up
```

If you need to delete the volume, do:

```bash
docker compose down -v
```

> [!WARNING]  
> Do not push `.env` online, it contains your credentials !
