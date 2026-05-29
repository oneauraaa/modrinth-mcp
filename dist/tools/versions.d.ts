import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export declare function listVersions(args: {
    idOrSlug: string;
    loaders?: string[];
    game_versions?: string[];
    featured?: boolean;
}): Promise<unknown>;
export declare function getVersion(args: {
    id: string;
}): Promise<unknown>;
export declare function getVersionFromHash(args: {
    hash: string;
    algorithm: 'sha1' | 'sha512';
}): Promise<unknown>;
export declare function createVersion(args: {
    project_id: string;
    version_number: string;
    name: string;
    dependencies: Array<{
        version_id?: string;
        project_id?: string;
        dependency_type: string;
    }>;
    game_versions: string[];
    version_type: string;
    loaders: string[];
    featured: boolean;
    status?: string;
    requested_status?: string;
    changelog?: string;
    file_parts: string[];
    primary_file?: string;
}): Promise<unknown>;
export declare function updateVersion(args: {
    id: string;
    name?: string;
    version_number?: string;
    changelog?: string;
    dependencies?: Array<{
        version_id?: string;
        project_id?: string;
        dependency_type: string;
    }>;
    game_versions?: string[];
    version_type?: string;
    loaders?: string[];
    featured?: boolean;
    status?: string;
    requested_status?: string;
    primary_file?: string[];
}): Promise<unknown>;
export declare function deleteVersion(args: {
    id: string;
}): Promise<unknown>;
export declare function scheduleVersion(args: {
    id: string;
    requested_status: string;
    time: string;
}): Promise<unknown>;
export declare function registerVersionTools(server: McpServer): void;
