# Developer setup guide

How to get IRON CAMPUS GYM running on your own laptop, and how we work on the code together.
It takes about 20 minutes. At the end you will see the admin Dashboard at **http://localhost:5173**.

> **Short version:** install Node.js, PostgreSQL and Git → clone → `npm install` → create `.env` →
> create the database → `npm run db:migrate` → `npm run db:seed` → `npm run dev`.

## Contents

1. [What you are setting up](#1-what-you-are-setting-up)
2. [Install these programs](#2-install-these-programs)
3. [Set up the project](#3-set-up-the-project-step-by-step)
4. [If something goes wrong](#4-if-something-goes-wrong)
5. [Everyday work](#5-everyday-work)
6. [Things that will trip you up](#6-things-that-will-trip-you-up)
7. [Read these next](#7-read-these-next)

## 1. What you are setting up

The system has an **admin website** (React) that talks to a **local API** (Node.js + Express), which
stores everything in a **local PostgreSQL database** on the same computer. That is how the real gym
keeps working when the internet is down.

So **every developer needs their own local database**. Without one the website opens, but the
Dashboard shows an error instead of data. Your database is yours alone: it gets demo data, and
nothing you do in it touches anyone else's data or the gym's.

You don't need a Supabase (cloud) account yet; that comes with the staff login work.

## 2. Install these programs

| Program                           | Version                 | Get it from                | Notes                                                                                                 |
| --------------------------------- | ----------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Node.js** (includes npm)        | 20 or newer (we use 24) | nodejs.org → LTS installer | Runs the API, the website tools and the tests                                                         |
| **PostgreSQL** (includes pgAdmin) | 14 or newer (we use 18) | postgresql.org/download    | The installer asks for a password for the `postgres` user. **Write it down**; you need it in step 3   |
| **Git**                           | any recent              | git-scm.com                | Downloads the code and shares your changes                                                            |
| **VS Code**                       | any recent              | code.visualstudio.com      | When you open the project it offers ESLint, Prettier and Tailwind CSS IntelliSense; click **Install** |

Everything else (React, Vite, Tailwind, Express, Knex, zod, Vitest…) is installed automatically by
`npm install`. The exact versions are in each `package.json`.

Optional: Docker Desktop, if you'd rather run PostgreSQL in a container (`docker compose up -d`,
see `docker-compose.yml`) than install it.

## 3. Set up the project (step by step)

Commands are for Windows (PowerShell or the VS Code terminal). macOS/Linux differences are noted.

### Step 1: check the tools are installed

Open a **new** terminal after installing, then run:

```bash
node -v
```

```bash
git --version
```

`node -v` should print v20 or higher. If a command is "not recognized", close and reopen the
terminal (or restart the PC) and try again.

### Step 2: download the code and install the packages

```bash
git clone https://github.com/klent-devs/iron-campus-gym.git
```

```bash
cd iron-campus-gym
```

```bash
npm install
```

`npm install` takes a few minutes the first time. Warnings are normal; errors are not. If GitHub
says the repository is not found, ask the project owner to add you as a collaborator and accept
the invitation email.

### Step 3: create your own settings file (`.env`)

```bash
copy .env.example .env
```

(macOS/Linux: `cp .env.example .env`.) Open `.env` in VS Code and replace `YOUR_LOCAL_PASSWORD`
with **your own** PostgreSQL password from the installer, in **both** lines where it appears
(`POSTGRES_PASSWORD` and `DATABASE_URL`). Save. Leave everything else as it is, including the empty
`SUPABASE_` lines.

- **Never commit or share `.env`.** Git already ignores it. Each developer has their own, with their
  own password. Don't ask for the owner's.
- Use a PostgreSQL password with letters and numbers only. Characters like `@ # / :` break the
  `DATABASE_URL` line.

### Step 4: create the empty database

**Easiest way, pgAdmin:** open pgAdmin → connect to your server → right-click **Databases** →
**Create** → **Database…** → name it exactly `iron_campus_gym` → **Save**. Don't create any tables.

**Or with a command** (it asks for your PostgreSQL password):

```bash
createdb -U postgres iron_campus_gym
```

On Windows, if `createdb` is "not recognized", use the full path (change `18` to your PostgreSQL
version):

```bash
& "C:\Program Files\PostgreSQL\18\bin\createdb.exe" -U postgres iron_campus_gym
```

### Step 5: create the tables and load the demo data

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

`db:migrate` creates all the tables and the gym rules. `db:seed` loads the plans, payment methods
and gym settings, plus **demo data** (sample members, payments, walk-ins and stock) so the
Dashboard has something to show.

### Step 6: start the app

```bash
npm run dev
```

This starts the API and the admin website together. Wait for both of these lines:

```
[api] IRON CAMPUS GYM API running on http://127.0.0.1:4000
[admin]   ➜  Local:   http://localhost:5173/
```

Keep this terminal open. Closing it, or pressing Ctrl+C, stops the app.

### Step 7: check that everything works

| Check                                 | What you should see                                                          |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| Open http://localhost:5173            | The Dashboard with the demo members and payments, and a clock in the top bar |
| Open http://localhost:4000/api/health | `"status":"ok"` and `"database":"up"`                                        |
| Run `npm test` in a second terminal   | All tests pass; 6 are skipped (see below)                                    |
| Run `npm run lint`                    | No errors                                                                    |

All four pass? You're set up. Read `docs/PROGRESS.md` next: it says what is done and what to build
next.

The 6 skipped tests check real SQL. To run them, create a second database called
`iron_campus_gym_test` and set `TEST_DATABASE_URL` to it before `npm test`. **Never point it at your
main database.**

## 4. If something goes wrong

| Problem                                                                           | What to do                                                                                                                                                                    |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser says "localhost refused to connect"                                       | The app isn't running. Run `npm run dev` and keep that terminal open                                                                                                          |
| "password authentication failed for user postgres"                                | The password in `.env` doesn't match your PostgreSQL password. Fix the `DATABASE_URL` line, save, and run the command again                                                   |
| You forgot your PostgreSQL password                                               | If pgAdmin still connects: **Login/Group Roles** → right-click `postgres` → **Properties** → **Definition** → type a new password → **Save**. Otherwise ask the project owner |
| "database iron_campus_gym does not exist"                                         | Do step 4                                                                                                                                                                     |
| Dashboard says "The database isn't set up yet"                                    | `.env` is missing or has no `DATABASE_URL`. Do step 3, then restart `npm run dev`                                                                                             |
| Dashboard says "Can't reach the gym server"                                       | The API stopped. Look at the terminal for the error, then run `npm run dev` again                                                                                             |
| Dashboard fails with "z.config is not a function" (or similar) after a `git pull` | Packages changed. Stop the app (Ctrl+C), run `npm install`, then `npm run dev`                                                                                                |
| "Port 5173 (or 4000) is already in use"                                           | Another copy of the app is running. Close the other terminal, or restart VS Code, then run `npm run dev` again                                                                |
| PowerShell says "running scripts is disabled on this system" when you run npm     | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, or use Command Prompt instead                                                                                 |
| You want to start over with fresh demo data                                       | `npm run db:reset` (deletes everything in **your** local database and rebuilds it)                                                                                            |

## 5. Everyday work

**Start of the day:**

```bash
git pull
```

```bash
npm install
```

```bash
npm run db:migrate
```

```bash
npm run dev
```

Always run `npm install` after pulling, and **restart** `npm run dev`: a running app keeps the old
packages in memory. `db:migrate` only does something when someone added a new migration.

**When you build something**, work on your own branch and open a pull request. Don't push straight
to `main`.

```bash
git checkout -b feature/my-task
```

Write the code and its tests, then:

```bash
npm test
```

```bash
npm run lint
```

```bash
git add .
```

```bash
git commit -m "Add my task"
```

```bash
git push -u origin feature/my-task
```

Then open a pull request on GitHub. Agree with the project owner who takes which task before
starting, so two people don't build the same page.

**All commands** (run from the project's top folder):

| Command                                 | What it does                                                             |
| --------------------------------------- | ------------------------------------------------------------------------ |
| `npm run dev`                           | Start the API (port 4000) and admin website (port 5173) with auto-reload |
| `npm run dev:api` / `npm run dev:admin` | Start only one of them                                                   |
| `npm run db:migrate`                    | Create or update the database tables                                     |
| `npm run db:seed`                       | Load setup data and demo data                                            |
| `npm run db:reset`                      | Delete everything and rebuild with demo data (development only)          |
| `npm test`                              | Run all tests                                                            |
| `npm run lint` / `npm run format`       | Check the code / tidy the formatting                                     |
| `npm run build:admin`                   | Production build of the admin website                                    |

## 6. Things that will trip you up

- **There is no login yet.** The API treats every request as the owner. That's safe only because the
  API listens on your own computer alone (`API_HOST=127.0.0.1`). Don't change that before login
  exists.
- **The designs are the spec.** Approved screens are in `docs/design/*.dc.html`. Match their layout,
  labels and states. All project rules are in `CLAUDE.md`.
- **Don't use the Tailwind class `text-base`.** Our preset has a colour named `base` (near-black), so
  that class turns text black. Use `text-[16px]`.
- **Spacing is 16 px everywhere** (`gap-4` / `p-4`) between blocks and around the page.
- **Orange means "click this" or "you are here".** Use green for good news and grey for information.
- **Dates from the database are text** like `'2026-11-10'`, not JavaScript `Date` objects. Use the
  shared helpers (`formatDate`, `todayInGym`) from `@icg/shared`; "today" always means Manila time.
- **Never copy a business rule into an app.** Reuse `@icg/shared` (money, dates, statuses, membership
  rules, validation).
- **Database changes go in a new migration file.** Never edit a migration that has already run.
- **Extra options after `npm run db:seed --` don't reach Knex.** Run `npx knex …` inside `apps/api`
  instead.

If you use Claude in VS Code, it reads `CLAUDE.md` and `docs/PROGRESS.md` automatically and follows
these rules.

## 7. Read these next

| File                    | What's in it                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `docs/PROGRESS.md`      | **Start here.** What's done, what's waiting, what's next, and decisions already made |
| `CLAUDE.md`             | All the project rules on one page                                                    |
| `docs/architecture.md`  | How offline work and cloud sync fit together                                         |
| `docs/database.md`      | The tables and what each one is for                                                  |
| `docs/api.md`           | The API endpoints and their responses                                                |
| `docs/design/README.md` | The approved screen designs and where each page gets built                           |
