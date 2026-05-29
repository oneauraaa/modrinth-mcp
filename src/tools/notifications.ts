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
  server.tool('modrinth_get_notifications', 'Get all notifications for a user (requires MODRINTH_TOKEN)',
    { userId: z.string().describe('User ID (use modrinth_get_authenticated_user to find your ID)') },
    async (args) => respond(await getNotifications(args)));

  server.tool('modrinth_mark_notification_read', 'Mark a notification as read (requires MODRINTH_TOKEN)',
    { id: z.string().describe('Notification ID') },
    async (args) => respond(await markNotificationRead(args)));

  server.tool('modrinth_delete_notification', 'Delete a notification (requires MODRINTH_TOKEN)',
    { id: z.string().describe('Notification ID') },
    async (args) => respond(await deleteNotification(args)));
}
