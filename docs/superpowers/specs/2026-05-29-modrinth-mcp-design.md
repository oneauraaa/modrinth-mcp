# Modrinth MCP Server — Design Spec

**Date:** 2026-05-29
**Status:** Approved

---

## Overview

A Model Context Protocol (MCP) server that exposes the full Modrinth REST API v2 as tools for AI coding assistants (Claude Code, Codex, etc.). Authentication is via Personal Access Token (PAT) passed as an environment variable. The server uses the `stdio` transport and is distributed as an npm package runnable via `npx`.

---

## Architecture

```
modrinth-mcp/
├── src/
│   ├── index.ts              # MCP server entry point, registers all tools
│   ├── client.ts             # fetch wrapper — injects PAT, base URL, error handling
│   └── tools/
│       ├── projects.ts
│       ├── versions.ts
│       ├── version-files.ts
│       ├── users.ts
│       ├── teams.ts
│       ├── tags.ts
│       ├── notifications.ts
│       └── reports.ts
├── package.json
├── tsconfig.json
└── README.md
```

**Data flow:**
`index.ts` creates the MCP server → imports tool definitions from each resource module → each tool calls `client.ts` → `client.ts` injects `Authorization: ${MODRINTH_TOKEN}` and `User-Agent: modrinth-mcp/1.0.0` on every request → Modrinth API at `https://api.modrinth.com/v2` → response returned as MCP tool result.

---

## Authentication

- PAT read from `process.env.MODRINTH_TOKEN` once at startup.
- Tools that do not require auth (search, get project, tags) work without a token.
- Tools that mutate data return an early, readable error if the token is absent:
  `"MODRINTH_TOKEN is not set — this tool requires authentication"`
- Never logged or exposed in tool output.

---

## Tool Surface (~35 tools)

All tools use flat naming with the `modrinth_` prefix.

### Projects
| Tool | Auth | Description |
|------|------|-------------|
| `modrinth_search_projects` | No | Faceted search (query, facets, limit, offset) |
| `modrinth_get_project` | No | Get by id or slug |
| `modrinth_get_multiple_projects` | No | Batch fetch by ids |
| `modrinth_check_project_validity` | No | Check if slug/id exists |
| `modrinth_get_project_dependencies` | No | Get all dependencies |
| `modrinth_create_project` | Yes | Full project creation with optional icon upload |
| `modrinth_update_project` | Yes | Patch any project fields |
| `modrinth_delete_project` | Yes | Delete a project |
| `modrinth_follow_project` | Yes | Follow a project |
| `modrinth_unfollow_project` | Yes | Unfollow a project |

### Versions
| Tool | Auth | Description |
|------|------|-------------|
| `modrinth_list_versions` | No | List with filters (loader, game version, featured) |
| `modrinth_get_version` | No | Get by id |
| `modrinth_get_version_from_hash` | No | sha1/sha512 lookup |
| `modrinth_create_version` | Yes | Create version with file upload (local path) |
| `modrinth_update_version` | Yes | Patch version fields |
| `modrinth_delete_version` | Yes | Delete a version |
| `modrinth_schedule_version` | Yes | Schedule a version for release |

### Version Files
| Tool | Auth | Description |
|------|------|-------------|
| `modrinth_add_files_to_version` | Yes | Upload additional files to existing version |
| `modrinth_delete_file_from_version` | Yes | Remove a file by hash |

### Users
| Tool | Auth | Description |
|------|------|-------------|
| `modrinth_get_user` | No | Get by id or username |
| `modrinth_get_authenticated_user` | Yes | Get current PAT owner |
| `modrinth_update_user` | Yes | Update user fields |
| `modrinth_get_user_projects` | No | List projects by user |

### Teams
| Tool | Auth | Description |
|------|------|-------------|
| `modrinth_get_project_team` | No | Get team for a project |
| `modrinth_add_team_member` | Yes | Add a member |
| `modrinth_update_team_member` | Yes | Update role/permissions |
| `modrinth_remove_team_member` | Yes | Remove a member |
| `modrinth_transfer_team_ownership` | Yes | Transfer ownership |

### Tags (all read-only)
| Tool | Auth | Description |
|------|------|-------------|
| `modrinth_get_categories` | No | All categories |
| `modrinth_get_loaders` | No | All loaders with supported project types |
| `modrinth_get_game_versions` | No | All game versions |
| `modrinth_get_licenses` | No | All SPDX licenses |

### Notifications
| Tool | Auth | Description |
|------|------|-------------|
| `modrinth_get_notifications` | Yes | List notifications |
| `modrinth_mark_notification_read` | Yes | Mark one as read |
| `modrinth_delete_notification` | Yes | Delete one |

### Reports
| Tool | Auth | Description |
|------|------|-------------|
| `modrinth_submit_report` | Yes | Submit a report |
| `modrinth_get_reports` | Yes | List submitted reports |
| `modrinth_update_report` | Yes | Update a report |

---

## Error Handling

`client.ts` parses Modrinth's error body (`{ error, description }`) on non-2xx responses and surfaces clean messages:

```
Error: 404 — Project not found (slug: "my-mod")
Error: 401 — Authentication required. Set MODRINTH_TOKEN env variable.
Error: 422 — Validation failed: "name" is required
```

File upload tools (create project, create version) accept a local file path, read it with `fs.readFile`, and send as `multipart/form-data`.

---

## Distribution & Usage

**npm package name:** `modrinth-mcp`
**`bin` entry:** `dist/index.js`
**Runtime:** Node.js 18+
**Transport:** `stdio`

**Claude Code MCP config:**
```json
{
  "mcpServers": {
    "modrinth": {
      "command": "npx",
      "args": ["-y", "modrinth-mcp"],
      "env": { "MODRINTH_TOKEN": "your-pat-here" }
    }
  }
}
```

---

## Tech Stack

| Concern | Choice |
|---------|--------|
| Language | TypeScript |
| MCP SDK | `@modelcontextprotocol/sdk` |
| HTTP client | Native `fetch` (Node 18+) |
| Build | `tsc` → `dist/` |
| Package manager | npm |
