# frontend_sc

React + Vite + TypeScript frontend project.

## Tech Stack

- React 18
- Vite 5
- TypeScript
- Tailwind CSS
- shadcn/ui

## Prerequisites

- Git
- Node.js 20 LTS (recommended)
- npm (comes with Node.js)

## Install Node.js (Recommended via nvm)

If `nvm` is not installed yet:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Reload your shell, then install and use Node 20:

```bash
nvm install 20
nvm use 20
node -v
npm -v
```

## Local Setup

```bash
# 1) Clone repo
git clone <YOUR_GITHUB_REPO_URL>

# 2) Open project folder
cd frontend_sc

# 3) Install dependencies
npm install

# 4) Start dev server
npm run dev
```

App runs on the Vite dev server (typically `http://localhost:8080` in this project setup).

## Environment Variables

Create a local env file from the template:

```bash
cp .env.example .env
```

Then update values if needed:

- `VITE_BACKEND_URL`
- `VITE_API_BASE_URL`

## Available Scripts

```bash
npm run dev       # start development server
npm run build     # production build
npm run build:dev # development-mode build
npm run preview   # preview production build
npm run lint      # run ESLint
```

## Prepare for First Push (if this is a new repo)

```bash
git init
git branch -m main
git add .
git commit -m "chore: initial commit"
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```
