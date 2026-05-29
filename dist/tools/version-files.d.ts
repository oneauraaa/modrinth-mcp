import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export declare function addFilesToVersion(args: {
    versionId: string;
    file_parts: string[];
}): Promise<unknown>;
export declare function deleteFileFromVersion(args: {
    hash: string;
    algorithm: 'sha1' | 'sha512';
}): Promise<unknown>;
export declare function registerVersionFileTools(server: McpServer): void;
