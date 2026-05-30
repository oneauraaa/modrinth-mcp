#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTagTools } from './tools/tags.js';
import { registerProjectTools } from './tools/projects.js';
import { registerVersionTools } from './tools/versions.js';
import { registerVersionFileTools } from './tools/version-files.js';
import { registerUserTools } from './tools/users.js';
import { registerTeamTools } from './tools/teams.js';
import { registerNotificationTools } from './tools/notifications.js';
import { registerReportTools } from './tools/reports.js';

// Subcommands run before any MCP wiring so the server never starts for them.
const subcommand = process.argv[2];
if (subcommand === 'install') {
  const { runInstall } = await import('./install.js');
  await runInstall(process.argv.slice(3));
  process.exit(process.exitCode ?? 0);
}

const server = new McpServer({
  name: 'modrinth-mcp',
  version: '1.0.0',
});

registerTagTools(server);
registerProjectTools(server);
registerVersionTools(server);
registerVersionFileTools(server);
registerUserTools(server);
registerTeamTools(server);
registerNotificationTools(server);
registerReportTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
