import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export declare function searchProjects(args: {
    query?: string;
    facets?: string;
    index?: string;
    offset?: number;
    limit?: number;
}): Promise<unknown>;
export declare function getProject(args: {
    idOrSlug: string;
}): Promise<unknown>;
export declare function getMultipleProjects(args: {
    ids: string[];
}): Promise<unknown>;
export declare function checkProjectValidity(args: {
    idOrSlug: string;
}): Promise<unknown>;
export declare function getProjectDependencies(args: {
    idOrSlug: string;
}): Promise<unknown>;
export declare function createProject(args: {
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
    donation_urls?: Array<{
        id: string;
        platform: string;
        url: string;
    }>;
    license_url?: string;
    initial_versions?: unknown[];
    is_draft?: boolean;
}): Promise<unknown>;
export declare function updateProject(args: {
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
    donation_urls?: Array<{
        id: string;
        platform: string;
        url: string;
    }>;
    license_id?: string;
    license_url?: string;
    moderation_message?: string;
    moderation_message_body?: string;
}): Promise<unknown>;
export declare function deleteProject(args: {
    idOrSlug: string;
}): Promise<unknown>;
export declare function followProject(args: {
    idOrSlug: string;
}): Promise<unknown>;
export declare function unfollowProject(args: {
    idOrSlug: string;
}): Promise<unknown>;
export declare function registerProjectTools(server: McpServer): void;
