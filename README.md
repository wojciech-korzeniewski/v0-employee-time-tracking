# v0-employee-time-tracking

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_wprM7ti2gJjjWgfrYXZd0tUNkG8r)

## Wdrożenie na Railway

1. **Utwórz projekt** w [Railway](https://railway.app) → **New Project** → **Deploy from GitHub** → wybierz to repozytorium.
2. **Dodaj bazę** → w projekcie **+ New** → **Database** → **PostgreSQL**. Railway utworzy bazę i ustawi zmienne.
3. **Podłącz DATABASE_URL** do aplikacji: wejdź w usługę (kafelek) z kodem → **Variables** → **Add variable** → **Add a variable reference** → wybierz zmienną `DATABASE_URL` z usługi PostgreSQL.
4. **Migracja** – po pierwszym deployu uruchom schemat i seed: w usłudze PostgreSQL → **Data** (lub **Connect**) → otwórz konsolę SQL i wklej zawartość pliku `scripts/migrate.sql`, potem wykonaj.
5. **Logowanie**: admin / admin123 (hasło ustawione w seedzie).

Aplikacja używa drivera `postgres` (postgres.js) i działa z PostgreSQL na Railway oraz z Neon (connection string w formacie `postgres://`).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.

<a href="https://v0.app/chat/api/kiro/clone/wojciech-korzeniewski/v0-employee-time-tracking" alt="Open in Kiro"><img src="https://pdgvvgmkdvyeydso.public.blob.vercel-storage.com/open%20in%20kiro.svg?sanitize=true" /></a>
