import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export declare function getProjectTeam(args: {
    idOrSlug: string;
}): Promise<unknown>;
export declare function addTeamMember(args: {
    teamId: string;
    user_id: string;
}): Promise<unknown>;
export declare function updateTeamMember(args: {
    teamId: string;
    userId: string;
    role?: string;
    permissions?: number;
    payouts_split?: number;
}): Promise<unknown>;
export declare function removeTeamMember(args: {
    teamId: string;
    userId: string;
}): Promise<unknown>;
export declare function transferTeamOwnership(args: {
    teamId: string;
    user_id: string;
}): Promise<unknown>;
export declare function registerTeamTools(server: McpServer): void;
