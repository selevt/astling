**Agent Guide**

- Repo: `astling` — SvelteKit (Svelte 5) app. Keep changes minimal and follow existing conventions.
- Primary entrypoints: `src/routes`, `src/lib` — prefer non-invasive edits when possible.
- **When in doubt:** read `package.json` and `tsconfig.json` before making changes.

Build / Lint / Test

- **Static type & tooling check:**
  - `npm run check` runs `svelte-kit sync && svelte-check --tsconfig ./tsconfig.json`
  - `npm run lint` runs `prettier --check .`
  - `npm run check-all` runs `check` and `lint`
  - `npm run format` runs `prettier --write .`

Code Style Guidelines

- Formatting: Use Prettier defaults for Svelte + TypeScript; otherwise 2-space indentation, single blank line between top-level blocks, trailing semicolons in TS. Keep Svelte markup tidy: script first, then markup, then styles.

- Imports: Use absolute imports from `src` only if path mapping exists; otherwise relative. Order: external packages, then `src/lib`/absolute app imports, then relative. Use named imports; prefer `import type` for types.

- TypeScript / Types: Explicit types on exported functions and public APIs. Use `unknown` over `any`. Prefer `type` for unions/mapped types, `interface` for object shapes that may extend. Narrow return types for public utilities.

- Svelte: Use `<script lang="ts">`. Put props and exported items at top. Keep components small; break into `src/lib/components/*` if large. Prefer `bind:value` and Svelte attachments over manual DOM queries.

- Naming: Components: `PascalCase.svelte`. Utilities: follow existing `src/lib` style. Types: `PascalCase`, no `T`/`I` prefix. Functions/variables: `camelCase`. Constants: `UPPER_SNAKE_CASE` for build-time only.

- Error handling: Return Result-like values or throw documented errors. Avoid silent `null` returns. Server-side: throw `Error` and let caller map to HTTP response. Validate external input with `valibot`.

- Async: Use `async/await` with `try/catch`. Bubble up errors unless you can handle them. Use `Promise.all` for parallel tasks, sequential awaits for dependent steps.

Commits and PRs

- One logical change per branch/PR. Don't amend pushed commits. Don't force-push `main`. Include description and testing steps in PRs.

Agent Behavior

- Default to non-destructive edits. Never add secrets/credentials; ask if required.
