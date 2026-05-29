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
  if (args.limit !== undefined) params.set('limit', String(args.limit));
  if (args.offset !== undefined) params.set('offset', String(args.offset));
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
      facets: z.string().optional().describe('JSON facet filters, e.g. [["categories:fabric"]]'),
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
