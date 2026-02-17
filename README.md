<p align="center">
  <img src="src/lib/assets/favicon.svg" alt="astling" width="128" height="128">
</p>

<h1 align="center">astling</h1>

<p align="center">A cute little branch companion. Web-based Git branch manager.</p>

## Features

- View all local branches with author, commit message, and date
- Star important branches for quick access
- One-click checkout with usage tracking
- Add descriptions to branches
- Search across names, messages, and descriptions
- Sort by name, recently used, or last commit date
- Vim-style keyboard navigation (press `?` for shortcuts)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Configure the repo path in the UI if needed.

## How It Works

Branch metadata (stars, descriptions) is stored in `.git/branches.json`. Checkout timestamps are synced from the git reflog on each load.

## Configuration

| Variable        | Default       | Description                                                                      |
| --------------- | ------------- | -------------------------------------------------------------------------------- |
| `GIT_REPO_PATH` | `./test-repo` | Path to the git repository to manage                                             |
| `TARGET_BRANCH` | `main`        | The branch you develop into (used as default start point when creating branches) |

```bash
GIT_REPO_PATH=~/projects/my-app TARGET_BRANCH=develop npm run dev
```

Both values can also be changed at runtime via the UI.

## Stack

Svelte 5, SvelteKit remote functions, TypeScript, Valibot
