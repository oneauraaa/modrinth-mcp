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
