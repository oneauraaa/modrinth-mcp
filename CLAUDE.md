# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An MCP (Model Context Protocol) server that exposes the Modrinth REST API v2 as tools for AI agents. It speaks stdio transport and is distributed on npm as `modrinth-mcp` (the `bin` runs `dist/index.js`).

## Commands

```bash
npm run build                      # tsc → dist/ (ESM)
npm test                           # vitest run (all tests, no network)
npx vitest run tests/tags.test.ts  # single test file
npx vitest run -t "getLoaders"     # single test by name
npx vitest                         # watch mode

npm run install-agents             # build + run the install wizard locally
node dist/index.js                 # run the MCP server (stdio; needs a client)
node dist/index.js install         # run the install wizard
```

There is no linter configured.

## Architecture

Three independent concerns live in `src/`:

1. **MCP server entry — `src/index.ts`.** Has a `#!/usr/bin/env node` shebang. First dispatches the `install` subcommand (dynamically imports `install.ts` and exits *before* any MCP wiring), otherwise constructs an `McpServer`, calls the eight `register*Tools(server)` functions, and connects a `StdioServerTransport`. Adding a new tool group means adding its `register*` call here.

2. **HTTP layer — `src/client.ts`.** All network access funnels through here.
   - `modrinthFetch(path, options)` — JSON requests against `https://api.modrinth.com/v2`. Returns `null` on 204. On non-2xx it throws an `Error` whose message is `"<status> — <body.description|body.error>"`.
   - `modrinthUpload(path, formData, method)` — multipart uploads. **Never set `Content-Type` manually** — `fetch` adds the boundary for `FormData`.
   - `requireAuth()` — throws if `MODRINTH_TOKEN` is unset.
   - Auth is the raw `MODRINTH_TOKEN` value in the `Authorization` header — **no `Bearer` prefix**. `modrinthFetch` attaches it only when present (so read-only tools work unauthenticated); mutating tools call `requireAuth()` and uploads always require it.

3. **Tool modules — `src/tools/<resource>.ts`** (tags, projects, versions, version-files, users, teams, notifications, reports). Each module follows the same shape:
   - **Standalone async functions** (e.g. `getCategories`, `searchProjects`) that take a plain args object and call `modrinthFetch`/`modrinthUpload`. These contain the actual endpoint/param logic and are what the tests import.
   - A **`register*Tools(server)`** function that wires each standalone function to `server.tool(name, description, zodSchema, handler)`, where the handler wraps the result in `respond()`.
   - A private **`respond(data)`** helper returning `{ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }`. This is intentionally duplicated per module.
   - Tool names are prefixed `modrinth_` (e.g. `modrinth_search_projects`).

`src/install.ts` is a self-contained, dependency-free interactive CLI wizard (raw-mode `readline` multi-select) that writes the MCP server config into AI clients' config files (Claude Code/Desktop, Cursor, Windsurf, Gemini CLI, Antigravity, Codex). It merges into JSON configs or section-replaces TOML, writes a `.bak`, and `launchCommand()` emits `npx -y modrinth-mcp` when running from a node_modules install vs an absolute `node dist/index.js` path when run from a local clone. It does not import the MCP SDK.

## Conventions

- **ESM + Node16 module resolution.** Source is TypeScript but **relative imports must carry the `.js` extension** (e.g. `import { modrinthFetch } from '../client.js'`). `"type": "module"`.
- **Adding an API operation:** add a standalone function in the relevant `src/tools/*.ts`, register it inside that module's `register*Tools` with a zod input schema, and add a test that mocks `../src/client.js`.
- The MCP server `version` string in `index.ts` and the `User-Agent` in `client.ts` are hardcoded (not read from `package.json`).

## Testing

Tests in `tests/` run against the **TypeScript source** (`../src/...`), not `dist/`. Each test `vi.mock('../src/client.js', ...)` to stub `modrinthFetch`/`modrinthUpload`/`requireAuth`, then asserts the standalone tool function calls the right path with the right params. No test hits the real Modrinth API. `tsconfig.json` excludes `tests` from the build.

## Publishing

Releases are automated via **GitHub Actions Trusted Publishing (OIDC)** — `.github/workflows/publish.yml` triggers on any `v*` tag push and runs `npm ci` + `npm publish` with no stored token (provenance is auto-attested). Release routine:

```bash
npm version patch        # bumps package.json + creates the git tag
git push --follow-tags   # the tag push triggers the publish workflow
```

Do **not** run `npm publish` locally (the local npm token is revoked; it will 401/404 — publish through CI). `prepare`/`prepublishOnly` rebuild `dist/`. `package-lock.json` is committed because CI uses `npm ci`. `.npmignore` ships only `dist/`, README, LICENSE, and `package.json`.
