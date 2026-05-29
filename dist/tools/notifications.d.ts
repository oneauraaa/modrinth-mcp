import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export declare function getNotifications(args: {
    userId: string;
}): Promise<unknown>;
export declare function markNotificationRead(args: {
    id: string;
}): Promise<unknown>;
export declare function deleteNotification(args: {
    id: string;
}): Promise<unknown>;
export declare function registerNotificationTools(server: McpServer): void;
