import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export declare function submitReport(args: {
    report_type: string;
    item_id: string;
    item_type: string;
    body: string;
}): Promise<unknown>;
export declare function getReports(): Promise<unknown>;
export declare function updateReport(args: {
    id: string;
    body?: string;
    closed?: boolean;
}): Promise<unknown>;
export declare function registerReportTools(server: McpServer): void;
