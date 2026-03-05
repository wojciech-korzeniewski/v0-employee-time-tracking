# Deploy na Railway – co jest w repozytorium i dlaczego mógł być błąd

## Zmiany w commicie 1.0.1 (Railway)

- **lib/db.ts** – driver `postgres` (postgres.js) zamiast Neon, SSL `require` dla URL zawierającego `"railway"` (działa z `postgres.railway.internal`).
- **package.json** – zależności `pg` (migracja) i `postgres` (aplikacja), skrypt start: najpierw migracja, potem `next start`.
- **railway.toml** – konfiguracja builda (nixpacks).
- **scripts/run-migrate.mjs** – uruchamia `migrate.sql` na bazie z `DATABASE_URL` (używa `pg`).
- **scripts/start-with-migrate.mjs** – przy starcie: jeśli jest `DATABASE_URL`, uruchamia migrację, potem Next.js (nawet przy błędzie migracji).
- **scripts/migrate.sql** – seed admina z hasłem SHA-256 (admin / admin123).

## Wymagane tabele w bazie

Migracja tworzy i uzupełnia:

| Tabela              | Opis                          |
|---------------------|-------------------------------|
| users               | Użytkownicy (admin w seedzie) |
| contracts           | Umowy                         |
| leave_types         | Typy urlopów                  |
| leave_allowances    | Przydziały urlopów            |
| leave_requests      | Wnioski urlopowe              |
| schedule_entries    | Grafik                        |
| settings            | Ustawienia (Slack itd.)       |

Sprawdzenie tabel (np. po deployu):

```bash
railway run node scripts/check-db-tables.mjs
```

## Możliwe przyczyny błędu przy deployu

1. **Brak SSL do Postgres**  
   Adres wewnętrzny Railway to `postgres.railway.internal` (bez `railway.app`). Wcześniej SSL włączane było tylko przy `url.includes("railway.app")`, więc połączenie mogło się nie udać. Obecnie używane jest `url.includes("railway")`, więc SSL jest włączone także dla hosta wewnętrznego.

2. **Błąd przy starcie (migracja)**  
   Start to: `node scripts/start-with-migrate.mjs` → migracja → `next start`.  
   Jeśli migracja się wywali (np. brak `DATABASE_URL`, timeout, błąd SSL w `run-migrate.mjs`), w logach pojawi się „Migration failed, starting anyway.” i aplikacja i tak wystartuje, ale **tabele mogą być puste** → 500 przy logowaniu (np. brak tabeli `users` lub brak admina).

3. **DATABASE_URL przy buildzie**  
   `next build` importuje `lib/db.ts`; przy braku `DATABASE_URL` przy buildzie build się wywala. Na Railway zmienne z usługi Postgres muszą być dostępne dla usługi aplikacji także w fazie build (linkowanie zmiennych do serwisu z kodem).

4. **500 na /api/auth/login**  
   Typowe przyczyny: brak połączenia z bazą (SSL/host), brak tabeli `users` (migracja nie przebiegła), brak użytkownika admin (seed nie wykonany). Po poprawce SSL i udanej migracji przy starcie logowanie admin / admin123 powinno działać.

## Co zrobić po deployu

1. W Railway: **Variables** – upewnij się, że jest `DATABASE_URL` (referencja do Postgres).
2. W logach deployu sprawdź, czy migracja się wykonała (logi z `run-migrate.mjs`).
3. Lokalnie (z ustawionym `DATABASE_URL`): `railway run node scripts/check-db-tables.mjs` – sprawdzenie tabel i użytkownika admin.
