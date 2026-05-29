import { z } from 'zod';
import { modrinthFetch, requireAuth, modrinthUpload } from '../client.js';
import { readFile } from 'fs/promises';
function respond(data) {
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}
export async function listVersions(args) {
    const { idOrSlug, loaders, game_versions, featured } = args;
    const params = new URLSearchParams();
    if (loaders)
        params.set('loaders', JSON.stringify(loaders));
    if (game_versions)
        params.set('game_versions', JSON.stringify(game_versions));
    if (featured !== undefined)
        params.set('featured', String(featured));
    return modrinthFetch(`/project/${idOrSlug}/version?${params}`);
}
export async function getVersion(args) {
    return modrinthFetch(`/version/${args.id}`);
}
export async function getVersionFromHash(args) {
    return modrinthFetch(`/version_file/${args.hash}?algorithm=${args.algorithm}`);
}
export async function createVersion(args) {
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
export async function updateVersion(args) {
    requireAuth();
    const { id, ...patch } = args;
    return modrinthFetch(`/version/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
    });
}
export async function deleteVersion(args) {
    requireAuth();
    return modrinthFetch(`/version/${args.id}`, { method: 'DELETE' });
}
export async function scheduleVersion(args) {
    requireAuth();
    const { id, ...body } = args;
    return modrinthFetch(`/version/${id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}
export function registerVersionTools(server) {
    server.tool('modrinth_list_versions', 'List versions of a Modrinth project with optional filters', {
        idOrSlug: z.string().describe('Project ID or slug'),
        loaders: z.array(z.string()).optional().describe('Filter by loaders, e.g. ["fabric"]'),
        game_versions: z.array(z.string()).optional().describe('Filter by game versions, e.g. ["1.21"]'),
        featured: z.boolean().optional().describe('Filter by featured status'),
    }, async (args) => respond(await listVersions(args)));
    server.tool('modrinth_get_version', 'Get a specific version by its ID', { id: z.string().describe('Version ID') }, async (args) => respond(await getVersion(args)));
    server.tool('modrinth_get_version_from_hash', 'Look up a version by file hash (SHA-1 or SHA-512)', {
        hash: z.string().describe('File hash'),
        algorithm: z.enum(['sha1', 'sha512']).describe('Hash algorithm'),
    }, async (args) => respond(await getVersionFromHash(args)));
    server.tool('modrinth_create_version', 'Create a new version for a project and upload files (requires MODRINTH_TOKEN)', {
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
    }, async (args) => respond(await createVersion(args)));
    server.tool('modrinth_update_version', 'Update fields of an existing version (requires MODRINTH_TOKEN)', {
        id: z.string().describe('Version ID'),
        name: z.string().optional(),
        version_number: z.string().optional(),
        changelog: z.string().optional(),
        game_versions: z.array(z.string()).optional(),
        version_type: z.enum(['release', 'beta', 'alpha']).optional(),
        loaders: z.array(z.string()).optional(),
        featured: z.boolean().optional(),
        status: z.string().optional(),
    }, async (args) => respond(await updateVersion(args)));
    server.tool('modrinth_delete_version', 'Permanently delete a version (requires MODRINTH_TOKEN)', { id: z.string().describe('Version ID') }, async (args) => respond(await deleteVersion(args)));
    server.tool('modrinth_schedule_version', 'Schedule a version to be published at a specific time (requires MODRINTH_TOKEN)', {
        id: z.string().describe('Version ID'),
        requested_status: z.enum(['listed', 'archived']).describe('Status to set at scheduled time'),
        time: z.string().describe('ISO 8601 datetime, e.g. "2026-06-01T00:00:00Z"'),
    }, async (args) => respond(await scheduleVersion(args)));
}
