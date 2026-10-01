# Migration: Neon Azure Frankfurt → Neon AWS Frankfurt (+ Vercel functions to `fra1`)

Status: **in progress** · Written 2026-10-01

**Why:** Neon is deprecating its Azure regions ([bulletin](https://neon.com/docs/import/azure-regions-deprecation)).
From **2026-10-05**, free-plan projects that have been inactive for 90+ days can be deleted.

| | From | To |
|---|---|---|
| Database | Neon Free, `azure-gwc`, Postgres 17.11 | Neon Free, `aws-eu-central-1`, Postgres 17 |
| Vercel functions | `iad1` (US East, the default) | `fra1` (Frankfurt), pinned in `vercel.json` |

Code changes are on branch `chore/neon-aws-frankfurt`:
- `vercel.json` sets the function region.
- `directUrl` added in `prisma/schema.prisma`.
- `scripts/db-row-counts.sql` added for verification.
- README env docs updated.
- `*.dump` added to `.gitignore`.

All commands below are **PowerShell**, run from the repo root. They use the Docker `postgres:17` image,
so there's no local Postgres install. Connection strings are passed as environment variables,
so passwords stay out of command lines.

---

## Step 0: Prep (5 min)

1. Start Docker Desktop, then run:
   ```powershell
   docker pull postgres:17
   New-Item -ItemType Directory -Force "$HOME\raidout-backup"
   ```
2. In the **Neon console**, open the **old** project → **Connect** → turn **Connection pooling OFF** → copy the string.
   The host must **not** contain `-pooler`, because `pg_dump` needs a direct connection.
3. Store it in the current PowerShell session only:
   ```powershell
   $env:OLD_DB = Read-Host "Old Neon direct URL"
   ```

## Step 1: Safety backup and baseline (do today)

```powershell
docker run --rm -e OLD_DB -v "$HOME\raidout-backup:/backup" postgres:17 `
  sh -c 'pg_dump -Fc -v -d "$OLD_DB" -f /backup/raidout-neon-azure.dump'

docker run --rm -e OLD_DB -v "${PWD}\scripts:/scripts" postgres:17 `
  sh -c 'psql "$OLD_DB" -f /scripts/db-row-counts.sql'
```
- Save the row-count output. It's your baseline.
- Optional check that the dump is readable:
  ```powershell
  docker run --rm -v "$HOME\raidout-backup:/backup" postgres:17 pg_restore --list /backup/raidout-neon-azure.dump
  ```

After this you're protected even if the old project gets deleted.

## Step 2: Create the new Neon project (5 min)

1. Neon console → **New project**:
   - Name: `raidout`
   - Postgres version: **17**
   - Cloud provider: **AWS**
   - Region: **Europe (Frankfurt), `aws-eu-central-1`**
   - Database name: `neondb` (the default is fine)

   If the free plan refuses because of a project limit, **don't delete the old project yet**. Stop and resolve the limit first.
2. **Connect** → copy **two** strings:
   - pooling **OFF** → the direct URL. The host looks like `ep-xxx.eu-central-1.aws.neon.tech`.
   - pooling **ON** → the pooled URL. The host looks like `ep-xxx-pooler.eu-central-1.aws.neon.tech`.
3. Store the direct one:
   ```powershell
   $env:NEW_DB = Read-Host "New Neon direct URL"
   ```

## Step 3: Restore into the new project (rehearsal)

```powershell
docker run --rm -e NEW_DB -v "$HOME\raidout-backup:/backup" postgres:17 `
  sh -c 'pg_restore -v --no-owner --no-acl -d "$NEW_DB" /backup/raidout-neon-azure.dump'

docker run --rm -e NEW_DB -v "${PWD}\scripts:/scripts" postgres:17 `
  sh -c 'psql "$NEW_DB" -f /scripts/db-row-counts.sql'
```
- `--no-owner --no-acl` skips Neon role ownership. Objects get owned by the role you connect as.
- If pg_restore reports an error like `schema "public" already exists`, ignore it. Stop on any other error.
- The row counts must match Step 1 exactly.

## Step 4: Build the app connection strings

Start from the Neon strings and **append** parameters. Remove `channel_binding=require` if it's present, to keep Prisma 5 happy.

| Var | Value |
|---|---|
| `DATABASE_URL` | pooled URL + `?sslmode=require&pgbouncer=true&connect_timeout=15` |
| `DIRECT_URL` | direct URL + `?sslmode=require&connect_timeout=15` |

What the parameters do:
- `pgbouncer=true` makes Prisma safe behind Neon's pooler.
- `connect_timeout=15` covers the cold start after Neon scales to zero (after 5 min idle on the free plan).

## Step 5: Test locally

1. In `.env`, set the new `DATABASE_URL` **and** `DIRECT_URL`. Prisma needs both now that the schema declares `directUrl`.
   Check `.env.local` too, if it overrides either.
2. Check the migration state:
   ```powershell
   npx prisma generate
   npx prisma migrate status   # expect: "Database schema is up to date!"
   ```
3. Run `npm run dev` and test:
   - open an event, edit something, and wait for the auto-save indicator
   - reload the page and confirm the edit persisted
   - open the share link
   - export a PDF
   - open an artist intake link

## Step 6: Vercel environment variables

Vercel → project → **Settings → Environment Variables**:
1. If `DATABASE_URL` is managed by a **Neon integration** (it shows as integration-managed, or the Neon integration is listed under
   **Integrations**), disconnect the integration first. Otherwise it may overwrite your values.
2. Set `DATABASE_URL` to the new pooled value from Step 4, for Production, Preview and Development.
3. **Add** `DIRECT_URL` to the same environments.

Set these **before** deploying the branch. The new schema expects `DIRECT_URL` to exist.

## Step 7: Deploy

1. Commit and push branch `chore/neon-aws-frankfurt`. Vercel builds a **Preview**.
2. On the preview:
   - Repeat the smoke test from Step 5.
   - In the deployment summary, confirm the functions run in **`fra1`**.
3. **Freeze edits.** Don't edit events or send intake links until Step 8 is done.
   Rerun the Step 1 row-count script against `OLD_DB`. If anything changed since the backup, refresh the data:
   ```powershell
   docker run --rm -e OLD_DB -v "$HOME\raidout-backup:/backup" postgres:17 `
     sh -c 'pg_dump -Fc -d "$OLD_DB" -f /backup/raidout-neon-azure-final.dump'
   docker run --rm -e NEW_DB -v "$HOME\raidout-backup:/backup" postgres:17 `
     sh -c 'pg_restore -v --clean --if-exists --no-owner --no-acl -d "$NEW_DB" /backup/raidout-neon-azure-final.dump'
   ```
   Then recount against `NEW_DB`.
4. Merge to `master`. Vercel deploys Production.

## Step 8: Verify production

- Smoke test on the prod URL. Expect the first request after idle to take about a second (Neon cold start).
- Neon console (new project) → **Monitoring**: you should see connections arriving.
- Neon console (old project): there should be no new activity.

## Rollback

The old project keeps working with this code, and `fra1` is fine for it too (also Frankfurt).
1. Put the old URLs back into Vercel: `DATABASE_URL` = old pooled + params, `DIRECT_URL` = old direct.
2. Redeploy.
3. Any writes made on the new database after cutover would need copying back with dump/restore.

## Step 9: Clean-up (after ~2 weeks stable)

- Take a final archive dump of the old project, then delete the old Azure project in the Neon console.
- Clear the session variables: `Remove-Item Env:OLD_DB, Env:NEW_DB`.
- Keep `$HOME\raidout-backup` somewhere safe, or delete it. It contains all app data.
- Update `.env.example` with the two-var format from the README.
