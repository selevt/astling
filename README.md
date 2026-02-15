# astling

A cute little branch companion. Web-based Git branch manager built with SvelteKit remote functions.

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

## Stack

Svelte 5, SvelteKit remote functions, TypeScript, Valibot
