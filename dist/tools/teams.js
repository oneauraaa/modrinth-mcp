import { z } from 'zod';
import { modrinthFetch, requireAuth } from '../client.js';
function respond(data) {
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}
export async function getProjectTeam(args) {
    return modrinthFetch(`/project/${args.idOrSlug}/members`);
}
export async function addTeamMember(args) {
    requireAuth();
    const { teamId, ...body } = args;
    return modrinthFetch(`/team/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}
export async function updateTeamMember(args) {
    requireAuth();
    const { teamId, userId, ...patch } = args;
    return modrinthFetch(`/team/${teamId}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
    });
}
export async function removeTeamMember(args) {
    requireAuth();
    return modrinthFetch(`/team/${args.teamId}/members/${args.userId}`, { method: 'DELETE' });
}
export async function transferTeamOwnership(args) {
    requireAuth();
    const { teamId, ...body } = args;
    return modrinthFetch(`/team/${teamId}/owner`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}
export function registerTeamTools(server) {
    server.tool('modrinth_get_project_team', "Get all members of a project's team", { idOrSlug: z.string().describe('Project ID or slug') }, async (args) => respond(await getProjectTeam(args)));
    server.tool('modrinth_add_team_member', 'Add a user to a project team (requires MODRINTH_TOKEN)', { teamId: z.string().describe('Team ID'), user_id: z.string().describe('User ID to add') }, async (args) => respond(await addTeamMember(args)));
    server.tool('modrinth_update_team_member', "Update a team member's role or permissions (requires MODRINTH_TOKEN)", {
        teamId: z.string().describe('Team ID'),
        userId: z.string().describe('User ID to update'),
        role: z.string().optional().describe('New role title'),
        permissions: z.number().int().optional().describe('Permission bitmask'),
        payouts_split: z.number().min(0).max(1).optional(),
    }, async (args) => respond(await updateTeamMember(args)));
    server.tool('modrinth_remove_team_member', 'Remove a member from a project team (requires MODRINTH_TOKEN)', { teamId: z.string().describe('Team ID'), userId: z.string().describe('User ID to remove') }, async (args) => respond(await removeTeamMember(args)));
    server.tool('modrinth_transfer_team_ownership', 'Transfer project ownership to another team member (requires MODRINTH_TOKEN)', { teamId: z.string().describe('Team ID'), user_id: z.string().describe('User ID of the new owner') }, async (args) => respond(await transferTeamOwnership(args)));
}
