import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export declare function getUser(args: {
    idOrUsername: string;
}): Promise<unknown>;
export declare function getAuthenticatedUser(): Promise<unknown>;
export declare function updateUser(args: {
    id: string;
    username?: string;
    bio?: string;
    email?: string;
    role?: string;
}): Promise<unknown>;
export declare function getUserProjects(args: {
    idOrUsername: string;
}): Promise<unknown>;
export declare function registerUserTools(server: McpServer): void;
