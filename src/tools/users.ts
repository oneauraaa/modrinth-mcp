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
  server.tool('modrinth_get_user', 'Get a Modrinth user by ID or username',
    { idOrUsername: z.string().describe('User ID or username') },
    async (args) => respond(await getUser(args)));

  server.tool('modrinth_get_authenticated_user',
    'Get the currently authenticated user (the PAT owner). Requires MODRINTH_TOKEN', {},
    async () => respond(await getAuthenticatedUser()));

  server.tool('modrinth_update_user', "Update the authenticated user's profile (requires MODRINTH_TOKEN)",
    {
      id: z.string().describe('User ID'),
      username: z.string().optional(),
      bio: z.string().optional(),
      email: z.string().email().optional(),
    },
    async (args) => respond(await updateUser(args)));

  server.tool('modrinth_get_user_projects', 'Get all projects belonging to a user',
    { idOrUsername: z.string().describe('User ID or username') },
    async (args) => respond(await getUserProjects(args)));
}
