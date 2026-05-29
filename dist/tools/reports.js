import { z } from 'zod';
import { modrinthFetch, requireAuth } from '../client.js';
function respond(data) {
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}
export async function submitReport(args) {
    requireAuth();
    return modrinthFetch('/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
    });
}
export async function getReports() {
    requireAuth();
    return modrinthFetch('/report');
}
export async function updateReport(args) {
    requireAuth();
    const { id, ...patch } = args;
    return modrinthFetch(`/report/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
    });
}
export function registerReportTools(server) {
    server.tool('modrinth_submit_report', 'Submit a report for a project, version, or user (requires MODRINTH_TOKEN)', {
        report_type: z.enum(['spam', 'copyright', 'inappropriate', 'malicious', 'other']).describe('Type of report'),
        item_id: z.string().describe('ID of the item being reported'),
        item_type: z.enum(['project', 'version', 'user']).describe('Type of item being reported'),
        body: z.string().describe('Detailed description of the issue'),
    }, async (args) => respond(await submitReport(args)));
    server.tool('modrinth_get_reports', 'Get all reports submitted by the authenticated user (requires MODRINTH_TOKEN)', {}, async () => respond(await getReports()));
    server.tool('modrinth_update_report', "Update a report's body or closed status (requires MODRINTH_TOKEN)", {
        id: z.string().describe('Report ID'),
        body: z.string().optional().describe('Updated description'),
        closed: z.boolean().optional().describe('Mark the report as closed'),
    }, async (args) => respond(await updateReport(args)));
}
