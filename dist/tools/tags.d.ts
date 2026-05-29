import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export declare function getCategories(): Promise<unknown>;
export declare function getLoaders(): Promise<unknown>;
export declare function getGameVersions(): Promise<unknown>;
export declare function getLicenses(): Promise<unknown>;
export declare function registerTagTools(server: McpServer): void;
