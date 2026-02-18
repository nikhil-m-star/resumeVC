# Server Setup (Postgres / Neon)

## 1) Configure environment

Copy `.env.example` to `.env` and set:

```bash
DATABASE_URL="postgresql://<user>:<password>@<host>/<db>?sslmode=require&pgbouncer=true&connect_timeout=15"
JWT_SECRET="<random-long-secret>"
JWT_REFRESH_SECRET="<random-long-secret>"
CLERK_SECRET_KEY="sk_test_..."
PORT=3001
```

For Neon pooled connections, use the pooled host URL and keep `sslmode=require`.

## 2) Install and generate client

```bash
npm install
npm run prisma:generate
```

## 3) Apply migrations

```bash
npm run prisma:migrate:deploy
```

## 4) Run server

```bash
npm run dev
```

## Optional: migrate existing local SQLite data into Neon

If you already have data in `server/prisma/dev.db`, run:

```bash
npm run data:migrate:sqlite-to-postgres
```

This copies rows from SQLite tables into Postgres in foreign-key-safe order.
