# Modrinth MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish an MCP server that exposes the full Modrinth REST API v2 as ~35 typed tools for AI coding assistants, authenticated via `MODRINTH_TOKEN` env var.

**Architecture:** Resource-module pattern — each Modrinth resource lives in its own `src/tools/*.ts` file exporting pure async handler functions and a `register*Tools(server)` function. A thin `src/index.ts` wires all modules to the MCP server over stdio. A shared `src/client.ts` injects auth headers and normalises errors.

**Tech Stack:** TypeScript 5, `@modelcontextprotocol/sdk` ^1.12, `zod` ^3, native `fetch` (Node 18+), `vitest` ^3 for tests, `tsc` for build.

---

## File Map

| File | Responsibility |
|------|---------------|
| `package.json` | Package metadata, bin entry, scripts |
| `tsconfig.json` | TS config targeting Node16 ESM |
| `src/client.ts` | `modrinthFetch`, `modrinthUpload`, `requireAuth` |
| `src/index.ts` | Create McpServer, register all tools, connect stdio transport |
| `src/tools/tags.ts` | `modrinth_get_categories/loaders/game_versions/licenses` |
| `src/tools/projects.ts` | 10 project tools (search, get, create, update, delete, follow…) |
| `src/tools/versions.ts` | 7 version tools (list, get, hash lookup, create, update, delete, schedule) |
| `src/tools/version-files.ts` | 2 version file tools (add files, delete file) |
| `src/tools/users.ts` | 4 user tools (get, get-authenticated, update, get-projects) |
| `src/tools/teams.ts` | 5 team tools (get, add, update, remove member, transfer ownership) |
| `src/tools/notifications.ts` | 3 notification tools (list, mark read, delete) |
| `src/tools/reports.ts` | 3 report tools (submit, list, update) |
| `tests/client.test.ts` | Unit tests for client helpers |
| `tests/tags.test.ts` | Unit tests for tag handlers |
| `tests/projects.test.ts` | Unit tests for project handlers |
| `tests/versions.test.ts` | Unit tests for version handlers |
| `tests/users.test.ts` | Unit tests for user handlers |
| `tests/teams.test.ts` | Unit tests for team handlers |
| `tests/notifications.test.ts` | Unit tests for notification handlers |
| `tests/reports.test.ts` | Unit tests for report handlers |
| `README.md` | Usage, config, tool reference |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/` directory structure

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "modrinth-mcp",
  "version": "1.0.0",
  "description": "MCP server for the Modrinth API",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "modrinth-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["mcp", "modrinth", "minecraft"],
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.8.0",
    "vitest": "^3.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create directory structure and install dependencies**

```bash
mkdir -p src/tools tests
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json tsconfig.json
git commit -m "chore: project scaffold"
```

---

## Task 2: HTTP Client

**Files:**
- Create: `src/client.ts`
- Create: `tests/client.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/client.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Must import after stubbing so module sees env
describe('requireAuth', () => {
  afterEach(() => { delete process.env.MODRINTH_TOKEN; });

  it('throws when MODRINTH_TOKEN is not set', async () => {
    const { requireAuth } = await import('../src/client.js');
    expect(() => requireAuth()).toThrow('MODRINTH_TOKEN is not set');
  });

  it('does not throw when MODRINTH_TOKEN is set', async () => {
    process.env.MODRINTH_TOKEN = 'test-token';
    const { requireAuth } = await import('../src/client.js');
    expect(() => requireAuth()).not.toThrow();
  });
});

describe('modrinthFetch', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); delete process.env.MODRINTH_TOKEN; });

  it('sends User-Agent header', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: '1' }), { status: 200 })
    );
    const { modrinthFetch } = await import('../src/client.js');
    await modrinthFetch('/project/test');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.modrinth.com/v2/project/test',
      expect.objectContaining({
        headers: expect.objectContaining({ 'User-Agent': 'modrinth-mcp/1.0.0' }),
      })
    );
  });

  it('includes Authorization header when token is set', async () => {
    process.env.MODRINTH_TOKEN = 'my-pat';
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 })
    );
    const { modrinthFetch } = await import('../src/client.js');
    await modrinthFetch('/project/test');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'my-pat' }),
      })
    );
  });

  it('does not include Authorization header when token is absent', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 })
    );
    const { modrinthFetch } = await import('../src/client.js');
    await modrinthFetch('/project/test');
    const call = mockFetch.mock.calls[0][1] as RequestInit & { headers: Record<string, string> };
    expect(call.headers).not.toHaveProperty('Authorization');
  });

  it('throws readable error with description on non-2xx', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: 'not_found', description: 'Project not found' }),
        { status: 404 }
      )
    );
    const { modrinthFetch } = await import('../src/client.js');
    await expect(modrinthFetch('/project/missing')).rejects.toThrow('404 — Project not found');
  });

  it('throws status-only error when body is not parseable', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(new Response('bad gateway', { status: 502 }));
    const { modrinthFetch } = await import('../src/client.js');
    await expect(modrinthFetch('/project/test')).rejects.toThrow('502');
  });

  it('returns null for 204 responses', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const { modrinthFetch } = await import('../src/client.js');
    const result = await modrinthFetch('/project/test', { method: 'DELETE' });
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/client.test.ts
```

Expected: FAIL — `Cannot find module '../src/client.js'`

- [ ] **Step 3: Write `src/client.ts`**

```typescript
const BASE_URL = 'https://api.modrinth.com/v2';

export function requireAuth(): void {
  if (!process.env.MODRINTH_TOKEN) {
    throw new Error('MODRINTH_TOKEN is not set — this tool requires authentication');
  }
}

export async function modrinthFetch(
  path: string,
  options: RequestInit & { headers?: Record<string, string> } = {}
): Promise<unknown> {
  const headers: Record<string, string> = {
    'User-Agent': 'modrinth-mcp/1.0.0',
    ...options.headers,
  };
  if (process.env.MODRINTH_TOKEN) {
    headers['Authorization'] = process.env.MODRINTH_TOKEN;
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    let message = `${response.status}`;
    try {
      const body = await response.json() as { error?: string; description?: string };
      if (body.description) message += ` — ${body.description}`;
      else if (body.error) message += ` — ${body.error}`;
    } catch { /* ignore parse errors */ }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function modrinthUpload(
  path: string,
  formData: FormData,
  method = 'POST'
): Promise<unknown> {
  requireAuth();
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'User-Agent': 'modrinth-mcp/1.0.0',
      'Authorization': process.env.MODRINTH_TOKEN!,
      // Do NOT set Content-Type — fetch sets it with boundary automatically for FormData
    },
    body: formData,
  });

  if (!response.ok) {
    let message = `${response.status}`;
    try {
      const body = await response.json() as { error?: string; description?: string };
      if (body.description) message += ` — ${body.description}`;
      else if (body.error) message += ` — ${body.error}`;
    } catch { /* ignore parse errors */ }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/client.test.ts
```

Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/client.ts tests/client.test.ts
git commit -m "feat: HTTP client with auth injection and error normalisation"
```

---

## Task 3: Tags Tools

**Files:**
- Create: `src/tools/tags.ts`
- Create: `tests/tags.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/tags.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/client.js', () => ({
  modrinthFetch: vi.fn(),
  requireAuth: vi.fn(),
  modrinthUpload: vi.fn(),
}));

import { modrinthFetch } from '../src/client.js';
import { getCategories, getLoaders, getGameVersions, getLicenses } from '../src/tools/tags.js';

describe('tags', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('getCategories calls /tag/category', async () => {
    const mockData = [{ name: 'adventure', project_type: 'mod', icon: '' }];
    vi.mocked(modrinthFetch).mockResolvedValueOnce(mockData);
    const result = await getCategories();
    expect(modrinthFetch).toHaveBeenCalledWith('/tag/category');
    expect(result).toEqual(mockData);
  });

  it('getLoaders calls /tag/loader', async () => {
    const mockData = [{ name: 'fabric', supported_project_types: ['mod'] }];
    vi.mocked(modrinthFetch).mockResolvedValueOnce(mockData);
    const result = await getLoaders();
    expect(modrinthFetch).toHaveBeenCalledWith('/tag/loader');
    expect(result).toEqual(mockData);
  });

  it('getGameVersions calls /tag/game_version', async () => {
    const mockData = [{ version: '1.21', version_type: 'release' }];
    vi.mocked(modrinthFetch).mockResolvedValueOnce(mockData);
    const result = await getGameVersions();
    expect(modrinthFetch).toHaveBeenCalledWith('/tag/game_version');
    expect(result).toEqual(mockData);
  });

  it('getLicenses calls /tag/license', async () => {
    const mockData = [{ short: 'MIT', name: 'MIT License' }];
    vi.mocked(modrinthFetch).mockResolvedValueOnce(mockData);
    const result = await getLicenses();
    expect(modrinthFetch).toHaveBeenCalledWith('/tag/license');
    expect(result).toEqual(mockData);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/tags.test.ts
```

Expected: FAIL — `Cannot find module '../src/tools/tags.js'`

- [ ] **Step 3: Write `src/tools/tags.ts`**

```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { modrinthFetch } from '../client.js';

function respond(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

export async function getCategories(): Promise<unknown> {
  return modrinthFetch('/tag/category');
}

export async function getLoaders(): Promise<unknown> {
  return modrinthFetch('/tag/loader');
}

export async function getGameVersions(): Promise<unknown> {
  return modrinthFetch('/tag/game_version');
}

export async function getLicenses(): Promise<unknown> {
  return modrinthFetch('/tag/license');
}

export function registerTagTools(server: McpServer): void {
  server.tool(
    'modrinth_get_categories',
    'Get all Modrinth project categories with icons and project types',
    {},
    async () => respond(await getCategories())
  );

  server.tool(
    'modrinth_get_loaders',
    'Get all mod loaders (Fabric, Forge, etc.) with their icons and supported project types',
    {},
    async () => respond(await getLoaders())
  );

  server.tool(
    'modrinth_get_game_versions',
    'Get all Minecraft game versions supported by Modrinth',
    {},
    async () => respond(await getGameVersions())
  );

  server.tool(
    'modrinth_get_licenses',
    'Get all SPDX licenses supported by Modrinth',
    {},
    async () => respond(await getLicenses())
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/tags.test.ts
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/tags.ts tests/tags.test.ts
git commit -m "feat: tags tools (categories, loaders, game versions, licenses)"
```

---

## Task 4: Project Tools

**Files:**
- Create: `src/tools/projects.ts`
- Create: `tests/projects.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/projects.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/client.js', () => ({
  modrinthFetch: vi.fn(),
  requireAuth: vi.fn(),
  modrinthUpload: vi.fn(),
}));

import { modrinthFetch } from '../src/client.js';
import {
  searchProjects,
  getProject,
  getMultipleProjects,
  checkProjectValidity,
  getProjectDependencies,
} from '../src/tools/projects.js';

describe('project read tools', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('searchProjects calls /search with query params', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce({ hits: [], total_hits: 0 });
    await searchProjects({ query: 'sodium', limit: 10, offset: 0 });
    expect(modrinthFetch).toHaveBeenCalledWith(
      '/search?query=sodium&limit=10&offset=0'
    );
  });

  it('searchProjects omits undefined params', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce({ hits: [], total_hits: 0 });
    await searchProjects({});
    expect(modrinthFetch).toHaveBeenCalledWith('/search?');
  });

  it('getProject calls /project/:id', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce({ id: 'abc', slug: 'sodium' });
    await getProject({ idOrSlug: 'sodium' });
    expect(modrinthFetch).toHaveBeenCalledWith('/project/sodium');
  });

  it('getMultipleProjects calls /projects with ids param', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce([]);
    await getMultipleProjects({ ids: ['abc', 'def'] });
    expect(modrinthFetch).toHaveBeenCalledWith('/projects?ids=%5B%22abc%22%2C%22def%22%5D');
  });

  it('checkProjectValidity calls /project/:id/check', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce({ id: 'abc' });
    await checkProjectValidity({ idOrSlug: 'sodium' });
    expect(modrinthFetch).toHaveBeenCalledWith('/project/sodium/check');
  });

  it('getProjectDependencies calls /project/:id/dependencies', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce({ projects: [], versions: [] });
    await getProjectDependencies({ idOrSlug: 'sodium' });
    expect(modrinthFetch).toHaveBeenCalledWith('/project/sodium/dependencies');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/projects.test.ts
```

Expected: FAIL — `Cannot find module '../src/tools/projects.js'`

- [ ] **Step 3: Write read portion of `src/tools/projects.ts`**

```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { modrinthFetch, requireAuth, modrinthUpload } from '../client.js';
import { readFile } from 'fs/promises';

function respond(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

export async function searchProjects(args: {
  query?: string;
  facets?: string;
  index?: string;
  offset?: number;
  limit?: number;
}): Promise<unknown> {
  const params = new URLSearchParams();
  if (args.query !== undefined) params.set('query', args.query);
  if (args.facets !== undefined) params.set('facets', args.facets);
  if (args.index !== undefined) params.set('index', args.index);
  if (args.offset !== undefined) params.set('offset', String(args.offset));
  if (args.limit !== undefined) params.set('limit', String(args.limit));
  return modrinthFetch(`/search?${params}`);
}

export async function getProject(args: { idOrSlug: string }): Promise<unknown> {
  return modrinthFetch(`/project/${args.idOrSlug}`);
}

export async function getMultipleProjects(args: { ids: string[] }): Promise<unknown> {
  const params = new URLSearchParams({ ids: JSON.stringify(args.ids) });
  return modrinthFetch(`/projects?${params}`);
}

export async function checkProjectValidity(args: { idOrSlug: string }): Promise<unknown> {
  return modrinthFetch(`/project/${args.idOrSlug}/check`);
}

export async function getProjectDependencies(args: { idOrSlug: string }): Promise<unknown> {
  return modrinthFetch(`/project/${args.idOrSlug}/dependencies`);
}

export async function createProject(args: {
  slug: string;
  title: string;
  description: string;
  categories: string[];
  client_side: string;
  server_side: string;
  body: string;
  project_type: string;
  license_id: string;
  icon_path?: string;
  additional_categories?: string[];
  issues_url?: string;
  source_url?: string;
  wiki_url?: string;
  discord_url?: string;
  donation_urls?: Array<{ id: string; platform: string; url: string }>;
  license_url?: string;
  initial_versions?: unknown[];
  is_draft?: boolean;
}): Promise<unknown> {
  requireAuth();
  const { icon_path, ...metadata } = args;
  const formData = new FormData();
  formData.append('data', JSON.stringify(metadata));
  if (icon_path) {
    const iconBuffer = await readFile(icon_path);
    const ext = icon_path.split('.').pop()?.toLowerCase() ?? 'png';
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
    formData.append('icon', new Blob([iconBuffer], { type: mimeType }), `icon.${ext}`);
  }
  return modrinthUpload('/project', formData);
}

export async function updateProject(args: {
  idOrSlug: string;
  slug?: string;
  title?: string;
  description?: string;
  categories?: string[];
  client_side?: string;
  server_side?: string;
  body?: string;
  status?: string;
  requested_status?: string;
  additional_categories?: string[];
  issues_url?: string;
  source_url?: string;
  wiki_url?: string;
  discord_url?: string;
  donation_urls?: Array<{ id: string; platform: string; url: string }>;
  license_id?: string;
  license_url?: string;
  moderation_message?: string;
  moderation_message_body?: string;
}): Promise<unknown> {
  requireAuth();
  const { idOrSlug, ...patch } = args;
  return modrinthFetch(`/project/${idOrSlug}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}

export async function deleteProject(args: { idOrSlug: string }): Promise<unknown> {
  requireAuth();
  return modrinthFetch(`/project/${args.idOrSlug}`, { method: 'DELETE' });
}

export async function followProject(args: { idOrSlug: string }): Promise<unknown> {
  requireAuth();
  return modrinthFetch(`/project/${args.idOrSlug}/follow`, { method: 'POST' });
}

export async function unfollowProject(args: { idOrSlug: string }): Promise<unknown> {
  requireAuth();
  return modrinthFetch(`/project/${args.idOrSlug}/follow`, { method: 'DELETE' });
}

export function registerProjectTools(server: McpServer): void {
  server.tool(
    'modrinth_search_projects',
    'Search Modrinth projects with optional query and facet filters',
    {
      query: z.string().optional().describe('Search query text'),
      facets: z.string().optional().describe('JSON facet filters, e.g. [[\"categories:fabric\"]]'),
      index: z.enum(['relevance', 'downloads', 'follows', 'newest', 'updated']).optional(),
      offset: z.number().int().min(0).optional().describe('Pagination offset'),
      limit: z.number().int().min(1).max(100).optional().describe('Results per page (max 100)'),
    },
    async (args) => respond(await searchProjects(args))
  );

  server.tool(
    'modrinth_get_project',
    'Get a Modrinth project by its ID or slug',
    { idOrSlug: z.string().describe('Project ID or slug') },
    async (args) => respond(await getProject(args))
  );

  server.tool(
    'modrinth_get_multiple_projects',
    'Batch fetch multiple Modrinth projects by their IDs',
    { ids: z.array(z.string()).describe('Array of project IDs') },
    async (args) => respond(await getMultipleProjects(args))
  );

  server.tool(
    'modrinth_check_project_validity',
    'Check if a project ID or slug exists on Modrinth',
    { idOrSlug: z.string().describe('Project ID or slug to check') },
    async (args) => respond(await checkProjectValidity(args))
  );

  server.tool(
    'modrinth_get_project_dependencies',
    'Get all dependencies of a Modrinth project',
    { idOrSlug: z.string().describe('Project ID or slug') },
    async (args) => respond(await getProjectDependencies(args))
  );

  server.tool(
    'modrinth_create_project',
    'Create a new Modrinth project (requires MODRINTH_TOKEN)',
    {
      slug: z.string().describe('URL slug for the project (lowercase, hyphens)'),
      title: z.string().describe('Display name of the project'),
      description: z.string().describe('Short description (shown in search results)'),
      categories: z.array(z.string()).describe('Category tags, e.g. ["optimization","fabric"]'),
      client_side: z.enum(['required', 'optional', 'unsupported']),
      server_side: z.enum(['required', 'optional', 'unsupported']),
      body: z.string().describe('Long-form description (Markdown)'),
      project_type: z.enum(['mod', 'modpack', 'resourcepack', 'shader']),
      license_id: z.string().describe('SPDX license identifier, e.g. "MIT"'),
      icon_path: z.string().optional().describe('Local path to icon image (PNG/JPG)'),
      additional_categories: z.array(z.string()).optional(),
      issues_url: z.string().url().optional(),
      source_url: z.string().url().optional(),
      wiki_url: z.string().url().optional(),
      discord_url: z.string().url().optional(),
      is_draft: z.boolean().optional().describe('Create as draft (default true)'),
    },
    async (args) => respond(await createProject(args))
  );

  server.tool(
    'modrinth_update_project',
    'Update fields of an existing Modrinth project (requires MODRINTH_TOKEN)',
    {
      idOrSlug: z.string().describe('Project ID or slug'),
      slug: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      categories: z.array(z.string()).optional(),
      client_side: z.enum(['required', 'optional', 'unsupported']).optional(),
      server_side: z.enum(['required', 'optional', 'unsupported']).optional(),
      body: z.string().optional(),
      status: z.string().optional(),
      issues_url: z.string().url().optional(),
      source_url: z.string().url().optional(),
      wiki_url: z.string().url().optional(),
      discord_url: z.string().url().optional(),
      license_id: z.string().optional(),
    },
    async (args) => respond(await updateProject(args))
  );

  server.tool(
    'modrinth_delete_project',
    'Permanently delete a Modrinth project (requires MODRINTH_TOKEN)',
    { idOrSlug: z.string().describe('Project ID or slug') },
    async (args) => respond(await deleteProject(args))
  );

  server.tool(
    'modrinth_follow_project',
    'Follow a Modrinth project (requires MODRINTH_TOKEN)',
    { idOrSlug: z.string().describe('Project ID or slug') },
    async (args) => respond(await followProject(args))
  );

  server.tool(
    'modrinth_unfollow_project',
    'Unfollow a Modrinth project (requires MODRINTH_TOKEN)',
    { idOrSlug: z.string().describe('Project ID or slug') },
    async (args) => respond(await unfollowProject(args))
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/projects.test.ts
```

Expected: 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/projects.ts tests/projects.test.ts
git commit -m "feat: project tools (search, get, create, update, delete, follow)"
```

---

## Task 5: Version Tools

**Files:**
- Create: `src/tools/versions.ts`
- Create: `tests/versions.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/versions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/client.js', () => ({
  modrinthFetch: vi.fn(),
  requireAuth: vi.fn(),
  modrinthUpload: vi.fn(),
}));

import { modrinthFetch } from '../src/client.js';
import {
  listVersions,
  getVersion,
  getVersionFromHash,
  updateVersion,
  deleteVersion,
  scheduleVersion,
} from '../src/tools/versions.js';

describe('version tools', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listVersions calls /project/:id/version with filters', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce([]);
    await listVersions({ idOrSlug: 'sodium', loaders: ['fabric'], game_versions: ['1.21'] });
    expect(modrinthFetch).toHaveBeenCalledWith(
      '/project/sodium/version?loaders=%5B%22fabric%22%5D&game_versions=%5B%221.21%22%5D'
    );
  });

  it('listVersions calls without filters', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce([]);
    await listVersions({ idOrSlug: 'sodium' });
    expect(modrinthFetch).toHaveBeenCalledWith('/project/sodium/version?');
  });

  it('getVersion calls /version/:id', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce({ id: 'ver1' });
    await getVersion({ id: 'ver1' });
    expect(modrinthFetch).toHaveBeenCalledWith('/version/ver1');
  });

  it('getVersionFromHash calls /version_file/:hash', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce({ id: 'ver1' });
    await getVersionFromHash({ hash: 'abc123', algorithm: 'sha1' });
    expect(modrinthFetch).toHaveBeenCalledWith('/version_file/abc123?algorithm=sha1');
  });

  it('updateVersion calls PATCH /version/:id', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await updateVersion({ id: 'ver1', name: 'Updated Name' });
    expect(modrinthFetch).toHaveBeenCalledWith(
      '/version/ver1',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('deleteVersion calls DELETE /version/:id', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await deleteVersion({ id: 'ver1' });
    expect(modrinthFetch).toHaveBeenCalledWith('/version/ver1', { method: 'DELETE' });
  });

  it('scheduleVersion calls POST /version/:id/schedule', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await scheduleVersion({ id: 'ver1', requested_status: 'listed', time: '2026-06-01T00:00:00Z' });
    expect(modrinthFetch).toHaveBeenCalledWith(
      '/version/ver1/schedule',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/versions.test.ts
```

Expected: FAIL — `Cannot find module '../src/tools/versions.js'`

- [ ] **Step 3: Write `src/tools/versions.ts`**

```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { modrinthFetch, requireAuth, modrinthUpload } from '../client.js';
import { readFile } from 'fs/promises';

function respond(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

export async function listVersions(args: {
  idOrSlug: string;
  loaders?: string[];
  game_versions?: string[];
  featured?: boolean;
}): Promise<unknown> {
  const { idOrSlug, loaders, game_versions, featured } = args;
  const params = new URLSearchParams();
  if (loaders) params.set('loaders', JSON.stringify(loaders));
  if (game_versions) params.set('game_versions', JSON.stringify(game_versions));
  if (featured !== undefined) params.set('featured', String(featured));
  return modrinthFetch(`/project/${idOrSlug}/version?${params}`);
}

export async function getVersion(args: { id: string }): Promise<unknown> {
  return modrinthFetch(`/version/${args.id}`);
}

export async function getVersionFromHash(args: {
  hash: string;
  algorithm: 'sha1' | 'sha512';
}): Promise<unknown> {
  return modrinthFetch(`/version_file/${args.hash}?algorithm=${args.algorithm}`);
}

export async function createVersion(args: {
  project_id: string;
  version_number: string;
  name: string;
  dependencies: Array<{ version_id?: string; project_id?: string; dependency_type: string }>;
  game_versions: string[];
  version_type: string;
  loaders: string[];
  featured: boolean;
  status?: string;
  requested_status?: string;
  changelog?: string;
  file_parts: string[];
  primary_file?: string;
}): Promise<unknown> {
  requireAuth();
  const { file_parts, primary_file, ...metadata } = args;
  const formData = new FormData();
  const metadataWithParts = { ...metadata, file_parts: file_parts.map((_, i) => `file-${i}`) };
  formData.append('data', JSON.stringify(metadataWithParts));
  for (let i = 0; i < file_parts.length; i++) {
    const buffer = await readFile(file_parts[i]);
    const filename = file_parts[i].split('/').pop() ?? `file-${i}`;
    formData.append(`file-${i}`, new Blob([buffer]), filename);
  }
  return modrinthUpload('/version', formData);
}

export async function updateVersion(args: {
  id: string;
  name?: string;
  version_number?: string;
  changelog?: string;
  dependencies?: Array<{ version_id?: string; project_id?: string; dependency_type: string }>;
  game_versions?: string[];
  version_type?: string;
  loaders?: string[];
  featured?: boolean;
  status?: string;
  requested_status?: string;
  primary_file?: string[];
}): Promise<unknown> {
  requireAuth();
  const { id, ...patch } = args;
  return modrinthFetch(`/version/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}

export async function deleteVersion(args: { id: string }): Promise<unknown> {
  requireAuth();
  return modrinthFetch(`/version/${args.id}`, { method: 'DELETE' });
}

export async function scheduleVersion(args: {
  id: string;
  requested_status: string;
  time: string;
}): Promise<unknown> {
  requireAuth();
  const { id, ...body } = args;
  return modrinthFetch(`/version/${id}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function registerVersionTools(server: McpServer): void {
  server.tool(
    'modrinth_list_versions',
    'List versions of a Modrinth project with optional filters',
    {
      idOrSlug: z.string().describe('Project ID or slug'),
      loaders: z.array(z.string()).optional().describe('Filter by loaders, e.g. ["fabric"]'),
      game_versions: z.array(z.string()).optional().describe('Filter by game versions, e.g. ["1.21"]'),
      featured: z.boolean().optional().describe('Filter by featured status'),
    },
    async (args) => respond(await listVersions(args))
  );

  server.tool(
    'modrinth_get_version',
    'Get a specific version by its ID',
    { id: z.string().describe('Version ID') },
    async (args) => respond(await getVersion(args))
  );

  server.tool(
    'modrinth_get_version_from_hash',
    'Look up a version by file hash (SHA-1 or SHA-512)',
    {
      hash: z.string().describe('File hash'),
      algorithm: z.enum(['sha1', 'sha512']).describe('Hash algorithm'),
    },
    async (args) => respond(await getVersionFromHash(args))
  );

  server.tool(
    'modrinth_create_version',
    'Create a new version for a project and upload files (requires MODRINTH_TOKEN)',
    {
      project_id: z.string().describe('Project ID'),
      version_number: z.string().describe('Version string, e.g. "1.2.0"'),
      name: z.string().describe('Display name of the version'),
      dependencies: z.array(z.object({
        version_id: z.string().optional(),
        project_id: z.string().optional(),
        dependency_type: z.enum(['required', 'optional', 'incompatible', 'embedded']),
      })).describe('Dependencies'),
      game_versions: z.array(z.string()).describe('Supported Minecraft versions'),
      version_type: z.enum(['release', 'beta', 'alpha']),
      loaders: z.array(z.string()).describe('Supported loaders, e.g. ["fabric"]'),
      featured: z.boolean(),
      changelog: z.string().optional(),
      file_parts: z.array(z.string()).describe('Local file paths to upload'),
      primary_file: z.string().optional().describe('Filename of the primary file'),
    },
    async (args) => respond(await createVersion(args))
  );

  server.tool(
    'modrinth_update_version',
    'Update fields of an existing version (requires MODRINTH_TOKEN)',
    {
      id: z.string().describe('Version ID'),
      name: z.string().optional(),
      version_number: z.string().optional(),
      changelog: z.string().optional(),
      game_versions: z.array(z.string()).optional(),
      version_type: z.enum(['release', 'beta', 'alpha']).optional(),
      loaders: z.array(z.string()).optional(),
      featured: z.boolean().optional(),
      status: z.string().optional(),
    },
    async (args) => respond(await updateVersion(args))
  );

  server.tool(
    'modrinth_delete_version',
    'Permanently delete a version (requires MODRINTH_TOKEN)',
    { id: z.string().describe('Version ID') },
    async (args) => respond(await deleteVersion(args))
  );

  server.tool(
    'modrinth_schedule_version',
    'Schedule a version to be published at a specific time (requires MODRINTH_TOKEN)',
    {
      id: z.string().describe('Version ID'),
      requested_status: z.enum(['listed', 'archived']).describe('Status to set at scheduled time'),
      time: z.string().describe('ISO 8601 datetime, e.g. "2026-06-01T00:00:00Z"'),
    },
    async (args) => respond(await scheduleVersion(args))
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/versions.test.ts
```

Expected: 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/versions.ts tests/versions.test.ts
git commit -m "feat: version tools (list, get, hash lookup, create, update, delete, schedule)"
```

---

## Task 6: Version File Tools

**Files:**
- Create: `src/tools/version-files.ts`
- Create: `tests/version-files.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/version-files.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/client.js', () => ({
  modrinthFetch: vi.fn(),
  requireAuth: vi.fn(),
  modrinthUpload: vi.fn(),
}));

import { modrinthFetch, requireAuth } from '../src/client.js';
import { deleteFileFromVersion } from '../src/tools/version-files.js';

describe('version file tools', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deleteFileFromVersion calls DELETE /version_file/:hash', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await deleteFileFromVersion({ hash: 'abc123', algorithm: 'sha1' });
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith(
      '/version_file/abc123?algorithm=sha1',
      { method: 'DELETE' }
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/version-files.test.ts
```

Expected: FAIL — `Cannot find module '../src/tools/version-files.js'`

- [ ] **Step 3: Write `src/tools/version-files.ts`**

```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { modrinthFetch, requireAuth, modrinthUpload } from '../client.js';
import { readFile } from 'fs/promises';

function respond(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

export async function addFilesToVersion(args: {
  versionId: string;
  file_parts: string[];
}): Promise<unknown> {
  const formData = new FormData();
  const filePartNames: string[] = [];
  for (let i = 0; i < args.file_parts.length; i++) {
    const buffer = await readFile(args.file_parts[i]);
    const filename = args.file_parts[i].split('/').pop() ?? `file-${i}`;
    const partName = `file-${i}`;
    formData.append(partName, new Blob([buffer]), filename);
    filePartNames.push(partName);
  }
  formData.append('data', JSON.stringify({ file_parts: filePartNames }));
  return modrinthUpload(`/version/${args.versionId}/files`, formData);
}

export async function deleteFileFromVersion(args: {
  hash: string;
  algorithm: 'sha1' | 'sha512';
}): Promise<unknown> {
  requireAuth();
  return modrinthFetch(`/version_file/${args.hash}?algorithm=${args.algorithm}`, { method: 'DELETE' });
}

export function registerVersionFileTools(server: McpServer): void {
  server.tool(
    'modrinth_add_files_to_version',
    'Upload additional files to an existing version (requires MODRINTH_TOKEN)',
    {
      versionId: z.string().describe('Version ID to add files to'),
      file_parts: z.array(z.string()).describe('Local file paths to upload'),
    },
    async (args) => respond(await addFilesToVersion(args))
  );

  server.tool(
    'modrinth_delete_file_from_version',
    'Delete a file from a version by its hash (requires MODRINTH_TOKEN)',
    {
      hash: z.string().describe('File hash'),
      algorithm: z.enum(['sha1', 'sha512']).describe('Hash algorithm'),
    },
    async (args) => respond(await deleteFileFromVersion(args))
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/version-files.test.ts
```

Expected: 1 test PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/version-files.ts tests/version-files.test.ts
git commit -m "feat: version file tools (add files, delete file by hash)"
```

---

## Task 7: User Tools

**Files:**
- Create: `src/tools/users.ts`
- Create: `tests/users.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/users.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/client.js', () => ({
  modrinthFetch: vi.fn(),
  requireAuth: vi.fn(),
  modrinthUpload: vi.fn(),
}));

import { modrinthFetch, requireAuth } from '../src/client.js';
import { getUser, getAuthenticatedUser, updateUser, getUserProjects } from '../src/tools/users.js';

describe('user tools', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('getUser calls /user/:id', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce({ id: 'u1', username: 'alice' });
    await getUser({ idOrUsername: 'alice' });
    expect(modrinthFetch).toHaveBeenCalledWith('/user/alice');
  });

  it('getAuthenticatedUser calls /user and requiresAuth', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce({ id: 'u1' });
    await getAuthenticatedUser();
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith('/user');
  });

  it('updateUser calls PATCH /user/:id', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await updateUser({ id: 'u1', bio: 'Hello' });
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith(
      '/user/u1',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('getUserProjects calls /user/:id/projects', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce([]);
    await getUserProjects({ idOrUsername: 'alice' });
    expect(modrinthFetch).toHaveBeenCalledWith('/user/alice/projects');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/users.test.ts
```

Expected: FAIL — `Cannot find module '../src/tools/users.js'`

- [ ] **Step 3: Write `src/tools/users.ts`**

```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { modrinthFetch, requireAuth } from '../client.js';

function respond(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

export async function getUser(args: { idOrUsername: string }): Promise<unknown> {
  return modrinthFetch(`/user/${args.idOrUsername}`);
}

export async function getAuthenticatedUser(): Promise<unknown> {
  requireAuth();
  return modrinthFetch('/user');
}

export async function updateUser(args: {
  id: string;
  username?: string;
  bio?: string;
  email?: string;
  role?: string;
}): Promise<unknown> {
  requireAuth();
  const { id, ...patch } = args;
  return modrinthFetch(`/user/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}

export async function getUserProjects(args: { idOrUsername: string }): Promise<unknown> {
  return modrinthFetch(`/user/${args.idOrUsername}/projects`);
}

export function registerUserTools(server: McpServer): void {
  server.tool(
    'modrinth_get_user',
    'Get a Modrinth user by ID or username',
    { idOrUsername: z.string().describe('User ID or username') },
    async (args) => respond(await getUser(args))
  );

  server.tool(
    'modrinth_get_authenticated_user',
    'Get the currently authenticated user (the PAT owner). Requires MODRINTH_TOKEN',
    {},
    async () => respond(await getAuthenticatedUser())
  );

  server.tool(
    'modrinth_update_user',
    'Update the authenticated user\'s profile (requires MODRINTH_TOKEN)',
    {
      id: z.string().describe('User ID'),
      username: z.string().optional(),
      bio: z.string().optional(),
      email: z.string().email().optional(),
    },
    async (args) => respond(await updateUser(args))
  );

  server.tool(
    'modrinth_get_user_projects',
    'Get all projects belonging to a user',
    { idOrUsername: z.string().describe('User ID or username') },
    async (args) => respond(await getUserProjects(args))
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/users.test.ts
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/users.ts tests/users.test.ts
git commit -m "feat: user tools (get, get-authenticated, update, get-projects)"
```

---

## Task 8: Team Tools

**Files:**
- Create: `src/tools/teams.ts`
- Create: `tests/teams.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/teams.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/client.js', () => ({
  modrinthFetch: vi.fn(),
  requireAuth: vi.fn(),
  modrinthUpload: vi.fn(),
}));

import { modrinthFetch, requireAuth } from '../src/client.js';
import {
  getProjectTeam,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
  transferTeamOwnership,
} from '../src/tools/teams.js';

describe('team tools', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('getProjectTeam calls /project/:id/members', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce([]);
    await getProjectTeam({ idOrSlug: 'sodium' });
    expect(modrinthFetch).toHaveBeenCalledWith('/project/sodium/members');
  });

  it('addTeamMember calls POST /team/:id/members', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await addTeamMember({ teamId: 't1', user_id: 'u1' });
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith(
      '/team/t1/members',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('updateTeamMember calls PATCH /team/:id/members/:userId', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await updateTeamMember({ teamId: 't1', userId: 'u1', role: 'Developer' });
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith(
      '/team/t1/members/u1',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('removeTeamMember calls DELETE /team/:id/members/:userId', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await removeTeamMember({ teamId: 't1', userId: 'u1' });
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith(
      '/team/t1/members/u1',
      { method: 'DELETE' }
    );
  });

  it('transferTeamOwnership calls PATCH /team/:id/owner', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await transferTeamOwnership({ teamId: 't1', user_id: 'u2' });
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith(
      '/team/t1/owner',
      expect.objectContaining({ method: 'PATCH' })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/teams.test.ts
```

Expected: FAIL — `Cannot find module '../src/tools/teams.js'`

- [ ] **Step 3: Write `src/tools/teams.ts`**

```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { modrinthFetch, requireAuth } from '../client.js';

function respond(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

export async function getProjectTeam(args: { idOrSlug: string }): Promise<unknown> {
  return modrinthFetch(`/project/${args.idOrSlug}/members`);
}

export async function addTeamMember(args: {
  teamId: string;
  user_id: string;
}): Promise<unknown> {
  requireAuth();
  const { teamId, ...body } = args;
  return modrinthFetch(`/team/${teamId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function updateTeamMember(args: {
  teamId: string;
  userId: string;
  role?: string;
  permissions?: number;
  payouts_split?: number;
}): Promise<unknown> {
  requireAuth();
  const { teamId, userId, ...patch } = args;
  return modrinthFetch(`/team/${teamId}/members/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}

export async function removeTeamMember(args: {
  teamId: string;
  userId: string;
}): Promise<unknown> {
  requireAuth();
  return modrinthFetch(`/team/${args.teamId}/members/${args.userId}`, { method: 'DELETE' });
}

export async function transferTeamOwnership(args: {
  teamId: string;
  user_id: string;
}): Promise<unknown> {
  requireAuth();
  const { teamId, ...body } = args;
  return modrinthFetch(`/team/${teamId}/owner`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function registerTeamTools(server: McpServer): void {
  server.tool(
    'modrinth_get_project_team',
    'Get all members of a project\'s team',
    { idOrSlug: z.string().describe('Project ID or slug') },
    async (args) => respond(await getProjectTeam(args))
  );

  server.tool(
    'modrinth_add_team_member',
    'Add a user to a project team (requires MODRINTH_TOKEN)',
    {
      teamId: z.string().describe('Team ID'),
      user_id: z.string().describe('User ID to add'),
    },
    async (args) => respond(await addTeamMember(args))
  );

  server.tool(
    'modrinth_update_team_member',
    'Update a team member\'s role or permissions (requires MODRINTH_TOKEN)',
    {
      teamId: z.string().describe('Team ID'),
      userId: z.string().describe('User ID to update'),
      role: z.string().optional().describe('New role title'),
      permissions: z.number().int().optional().describe('Permission bitmask'),
      payouts_split: z.number().min(0).max(1).optional(),
    },
    async (args) => respond(await updateTeamMember(args))
  );

  server.tool(
    'modrinth_remove_team_member',
    'Remove a member from a project team (requires MODRINTH_TOKEN)',
    {
      teamId: z.string().describe('Team ID'),
      userId: z.string().describe('User ID to remove'),
    },
    async (args) => respond(await removeTeamMember(args))
  );

  server.tool(
    'modrinth_transfer_team_ownership',
    'Transfer project ownership to another team member (requires MODRINTH_TOKEN)',
    {
      teamId: z.string().describe('Team ID'),
      user_id: z.string().describe('User ID of the new owner'),
    },
    async (args) => respond(await transferTeamOwnership(args))
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/teams.test.ts
```

Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/teams.ts tests/teams.test.ts
git commit -m "feat: team tools (get, add/update/remove member, transfer ownership)"
```

---

## Task 9: Notification Tools

**Files:**
- Create: `src/tools/notifications.ts`
- Create: `tests/notifications.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/notifications.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/client.js', () => ({
  modrinthFetch: vi.fn(),
  requireAuth: vi.fn(),
  modrinthUpload: vi.fn(),
}));

import { modrinthFetch, requireAuth } from '../src/client.js';
import { getNotifications, markNotificationRead, deleteNotification } from '../src/tools/notifications.js';

describe('notification tools', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('getNotifications calls /user/notifications', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce([]);
    await getNotifications({ userId: 'u1' });
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith('/user/u1/notifications');
  });

  it('markNotificationRead calls PATCH /notification/:id', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await markNotificationRead({ id: 'n1' });
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith('/notification/n1', { method: 'PATCH' });
  });

  it('deleteNotification calls DELETE /notification/:id', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await deleteNotification({ id: 'n1' });
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith('/notification/n1', { method: 'DELETE' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/notifications.test.ts
```

Expected: FAIL — `Cannot find module '../src/tools/notifications.js'`

- [ ] **Step 3: Write `src/tools/notifications.ts`**

```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { modrinthFetch, requireAuth } from '../client.js';

function respond(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

export async function getNotifications(args: { userId: string }): Promise<unknown> {
  requireAuth();
  return modrinthFetch(`/user/${args.userId}/notifications`);
}

export async function markNotificationRead(args: { id: string }): Promise<unknown> {
  requireAuth();
  return modrinthFetch(`/notification/${args.id}`, { method: 'PATCH' });
}

export async function deleteNotification(args: { id: string }): Promise<unknown> {
  requireAuth();
  return modrinthFetch(`/notification/${args.id}`, { method: 'DELETE' });
}

export function registerNotificationTools(server: McpServer): void {
  server.tool(
    'modrinth_get_notifications',
    'Get all notifications for a user (requires MODRINTH_TOKEN)',
    { userId: z.string().describe('User ID (use modrinth_get_authenticated_user to find your ID)') },
    async (args) => respond(await getNotifications(args))
  );

  server.tool(
    'modrinth_mark_notification_read',
    'Mark a notification as read (requires MODRINTH_TOKEN)',
    { id: z.string().describe('Notification ID') },
    async (args) => respond(await markNotificationRead(args))
  );

  server.tool(
    'modrinth_delete_notification',
    'Delete a notification (requires MODRINTH_TOKEN)',
    { id: z.string().describe('Notification ID') },
    async (args) => respond(await deleteNotification(args))
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/notifications.test.ts
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/notifications.ts tests/notifications.test.ts
git commit -m "feat: notification tools (list, mark read, delete)"
```

---

## Task 10: Report Tools

**Files:**
- Create: `src/tools/reports.ts`
- Create: `tests/reports.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/reports.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/client.js', () => ({
  modrinthFetch: vi.fn(),
  requireAuth: vi.fn(),
  modrinthUpload: vi.fn(),
}));

import { modrinthFetch, requireAuth } from '../src/client.js';
import { submitReport, getReports, updateReport } from '../src/tools/reports.js';

describe('report tools', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('submitReport calls POST /report', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce({ id: 'r1' });
    await submitReport({ report_type: 'spam', item_id: 'proj1', item_type: 'project', body: 'Spam content' });
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith('/report', expect.objectContaining({ method: 'POST' }));
  });

  it('getReports calls GET /report', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce([]);
    await getReports();
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith('/report');
  });

  it('updateReport calls PATCH /report/:id', async () => {
    vi.mocked(modrinthFetch).mockResolvedValueOnce(null);
    await updateReport({ id: 'r1', closed: true });
    expect(requireAuth).toHaveBeenCalled();
    expect(modrinthFetch).toHaveBeenCalledWith('/report/r1', expect.objectContaining({ method: 'PATCH' }));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/reports.test.ts
```

Expected: FAIL — `Cannot find module '../src/tools/reports.js'`

- [ ] **Step 3: Write `src/tools/reports.ts`**

```typescript
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { modrinthFetch, requireAuth } from '../client.js';

function respond(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

export async function submitReport(args: {
  report_type: string;
  item_id: string;
  item_type: string;
  body: string;
}): Promise<unknown> {
  requireAuth();
  return modrinthFetch('/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
}

export async function getReports(): Promise<unknown> {
  requireAuth();
  return modrinthFetch('/report');
}

export async function updateReport(args: {
  id: string;
  body?: string;
  closed?: boolean;
}): Promise<unknown> {
  requireAuth();
  const { id, ...patch } = args;
  return modrinthFetch(`/report/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}

export function registerReportTools(server: McpServer): void {
  server.tool(
    'modrinth_submit_report',
    'Submit a report for a project, version, or user (requires MODRINTH_TOKEN)',
    {
      report_type: z.enum(['spam', 'copyright', 'inappropriate', 'malicious', 'other'])
        .describe('Type of report'),
      item_id: z.string().describe('ID of the item being reported'),
      item_type: z.enum(['project', 'version', 'user']).describe('Type of item being reported'),
      body: z.string().describe('Detailed description of the issue'),
    },
    async (args) => respond(await submitReport(args))
  );

  server.tool(
    'modrinth_get_reports',
    'Get all reports submitted by the authenticated user (requires MODRINTH_TOKEN)',
    {},
    async () => respond(await getReports())
  );

  server.tool(
    'modrinth_update_report',
    'Update a report\'s body or closed status (requires MODRINTH_TOKEN)',
    {
      id: z.string().describe('Report ID'),
      body: z.string().optional().describe('Updated description'),
      closed: z.boolean().optional().describe('Mark the report as closed'),
    },
    async (args) => respond(await updateReport(args))
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/reports.test.ts
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/reports.ts tests/reports.test.ts
git commit -m "feat: report tools (submit, list, update)"
```

---

## Task 11: Wire Up Entry Point

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Write `src/index.ts`**

```typescript
#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTagTools } from './tools/tags.js';
import { registerProjectTools } from './tools/projects.js';
import { registerVersionTools } from './tools/versions.js';
import { registerVersionFileTools } from './tools/version-files.js';
import { registerUserTools } from './tools/users.js';
import { registerTeamTools } from './tools/teams.js';
import { registerNotificationTools } from './tools/notifications.js';
import { registerReportTools } from './tools/reports.js';

const server = new McpServer({
  name: 'modrinth-mcp',
  version: '1.0.0',
});

registerTagTools(server);
registerProjectTools(server);
registerVersionTools(server);
registerVersionFileTools(server);
registerUserTools(server);
registerTeamTools(server);
registerNotificationTools(server);
registerReportTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
```

- [ ] **Step 2: Build and verify it compiles**

```bash
npm run build
```

Expected: `dist/` directory created with `index.js` and all tool files. Zero TypeScript errors.

- [ ] **Step 3: Make the binary executable**

```bash
chmod +x dist/index.js
```

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: All tests PASS (25+ tests across all modules)

- [ ] **Step 5: Commit**

```bash
git add src/index.ts dist/
git commit -m "feat: wire up MCP server entry point and build"
```

---

## Task 12: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

````markdown
# modrinth-mcp

MCP server for the [Modrinth](https://modrinth.com) API. Exposes the full Modrinth REST API v2 as tools for AI coding assistants like Claude Code and Codex.

## Installation

No installation needed — run via `npx`:

```json
{
  "mcpServers": {
    "modrinth": {
      "command": "npx",
      "args": ["-y", "modrinth-mcp"],
      "env": {
        "MODRINTH_TOKEN": "your-pat-here"
      }
    }
  }
}
```

Generate a PAT at [modrinth.com/settings/account](https://modrinth.com/settings/account).

## Tools

### Tags (no auth)
| Tool | Description |
|------|-------------|
| `modrinth_get_categories` | All project categories |
| `modrinth_get_loaders` | All mod loaders |
| `modrinth_get_game_versions` | All Minecraft versions |
| `modrinth_get_licenses` | All SPDX licenses |

### Projects
| Tool | Auth | Description |
|------|------|-------------|
| `modrinth_search_projects` | No | Faceted search |
| `modrinth_get_project` | No | Get by ID or slug |
| `modrinth_get_multiple_projects` | No | Batch fetch |
| `modrinth_check_project_validity` | No | Check if slug/ID exists |
| `modrinth_get_project_dependencies` | No | Get dependencies |
| `modrinth_create_project` | Yes | Create project |
| `modrinth_update_project` | Yes | Update fields |
| `modrinth_delete_project` | Yes | Delete permanently |
| `modrinth_follow_project` | Yes | Follow |
| `modrinth_unfollow_project` | Yes | Unfollow |

### Versions
| Tool | Auth | Description |
|------|------|-------------|
| `modrinth_list_versions` | No | List with filters |
| `modrinth_get_version` | No | Get by ID |
| `modrinth_get_version_from_hash` | No | Look up by file hash |
| `modrinth_create_version` | Yes | Create and upload files |
| `modrinth_update_version` | Yes | Update fields |
| `modrinth_delete_version` | Yes | Delete permanently |
| `modrinth_schedule_version` | Yes | Schedule publication |
| `modrinth_add_files_to_version` | Yes | Upload additional files |
| `modrinth_delete_file_from_version` | Yes | Delete file by hash |

### Users
| Tool | Auth | Description |
|------|------|-------------|
| `modrinth_get_user` | No | Get by ID or username |
| `modrinth_get_authenticated_user` | Yes | Get PAT owner |
| `modrinth_update_user` | Yes | Update profile |
| `modrinth_get_user_projects` | No | List user's projects |

### Teams
| Tool | Auth | Description |
|------|------|-------------|
| `modrinth_get_project_team` | No | Get team members |
| `modrinth_add_team_member` | Yes | Add member |
| `modrinth_update_team_member` | Yes | Update role/permissions |
| `modrinth_remove_team_member` | Yes | Remove member |
| `modrinth_transfer_team_ownership` | Yes | Transfer ownership |

### Notifications
| Tool | Auth | Description |
|------|------|-------------|
| `modrinth_get_notifications` | Yes | List notifications |
| `modrinth_mark_notification_read` | Yes | Mark as read |
| `modrinth_delete_notification` | Yes | Delete |

### Reports
| Tool | Auth | Description |
|------|------|-------------|
| `modrinth_submit_report` | Yes | Submit report |
| `modrinth_get_reports` | Yes | List submitted reports |
| `modrinth_update_report` | Yes | Update/close report |

## Development

```bash
npm install
npm test        # run tests
npm run build   # compile TypeScript
```

## License

MIT
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with tool reference and usage"
```

---

## Task 13: Publish Prep

**Files:**
- Modify: `package.json` (verify fields)

- [ ] **Step 1: Add `.npmignore`**

Create `.npmignore`:
```
src/
tests/
docs/
tsconfig.json
*.test.ts
.gitignore
```

- [ ] **Step 2: Add shebang line check — verify `dist/index.js` starts with `#!/usr/bin/env node`**

```bash
head -1 dist/index.js
```

Expected output: `#!/usr/bin/env node`

If it doesn't (tsc sometimes strips it), add a `postbuild` script to `package.json`:

```json
"postbuild": "node -e \"const fs=require('fs');const f='dist/index.js';const c=fs.readFileSync(f,'utf8');if(!c.startsWith('#!/'))fs.writeFileSync(f,'#!/usr/bin/env node\\n'+c);\""
```

- [ ] **Step 3: Do a dry-run publish check**

```bash
npm pack --dry-run
```

Expected: Lists `dist/index.js` and other dist files. Confirms `bin` field resolves correctly. No `src/` or `tests/` in the output.

- [ ] **Step 4: Final full test and build**

```bash
npm test && npm run build
```

Expected: All tests pass, `dist/` built cleanly.

- [ ] **Step 5: Commit**

```bash
git add .npmignore package.json
git commit -m "chore: publish prep — npmignore, shebang guard"
```
````
