# modrinth-mcp

MCP server for the [Modrinth](https://modrinth.com) API. Exposes the full Modrinth REST API v2 as tools for AI coding assistants like Claude Code and Codex.

## Installation

Clone and build (requires Node ≥ 18):

```bash
git clone https://github.com/oneauraaa/modrinth-mcp.git
cd modrinth-mcp
npm install        # builds automatically via the prepare script
```

### Wizard (recommended)

Run the interactive installer and pick which agents to wire up:

```bash
node dist/index.js install
```

It detects installed clients (Claude Code, Claude Desktop, Cursor, Windsurf, Gemini CLI, Codex), lets you multi-select them with the keyboard (`↑/↓` move, `space` toggle, `a` all, `enter` confirm), optionally stores your Modrinth token, and merges the server into each client's config — pointing at this clone's `dist/index.js`. Existing servers are preserved and a `.bak` backup is written.

Non-interactive / scripted:

```bash
node dist/index.js install --client cursor,codex --token <your-pat>
```

Run `node dist/index.js install --help` for all options.

### Manual

Or add it to your client's MCP config by hand, using the absolute path to this clone:

```json
{
  "mcpServers": {
    "modrinth": {
      "command": "node",
      "args": ["/absolute/path/to/modrinth-mcp/dist/index.js"],
      "env": {
        "MODRINTH_TOKEN": "your-pat-here"
      }
    }
  }
}
```

Generate a PAT at [modrinth.com/settings/account](https://modrinth.com/settings/account).

## Tools

### Tags (no auth required)
| Tool | Description |
|------|-------------|
| `modrinth_get_categories` | All project categories |
| `modrinth_get_loaders` | All mod loaders |
| `modrinth_get_game_versions` | All Minecraft versions |
| `modrinth_get_licenses` | All SPDX licenses |

### Projects
| Tool | Auth | Description |
|------|------|-------------|
| `modrinth_search_projects` | No | Faceted search |
| `modrinth_get_project` | No | Get by ID or slug |
| `modrinth_get_multiple_projects` | No | Batch fetch |
| `modrinth_check_project_validity` | No | Check if slug/ID exists |
| `modrinth_get_project_dependencies` | No | Get dependencies |
| `modrinth_create_project` | Yes | Create project |
| `modrinth_update_project` | Yes | Update fields |
| `modrinth_delete_project` | Yes | Delete permanently |
| `modrinth_follow_project` | Yes | Follow |
| `modrinth_unfollow_project` | Yes | Unfollow |

### Versions
| Tool | Auth | Description |
|------|------|-------------|
| `modrinth_list_versions` | No | List with filters |
| `modrinth_get_version` | No | Get by ID |
| `modrinth_get_version_from_hash` | No | Look up by file hash |
| `modrinth_create_version` | Yes | Create and upload files |
| `modrinth_update_version` | Yes | Update fields |
| `modrinth_delete_version` | Yes | Delete permanently |
| `modrinth_schedule_version` | Yes | Schedule publication |
| `modrinth_add_files_to_version` | Yes | Upload additional files |
| `modrinth_delete_file_from_version` | Yes | Delete file by hash |

### Users
| Tool | Auth | Description |
|------|------|-------------|
| `modrinth_get_user` | No | Get by ID or username |
| `modrinth_get_authenticated_user` | Yes | Get PAT owner |
| `modrinth_update_user` | Yes | Update profile |
| `modrinth_get_user_projects` | No | List user's projects |

### Teams
| Tool | Auth | Description |
|------|------|-------------|
| `modrinth_get_project_team` | No | Get team members |
| `modrinth_add_team_member` | Yes | Add member |
| `modrinth_update_team_member` | Yes | Update role/permissions |
| `modrinth_remove_team_member` | Yes | Remove member |
| `modrinth_transfer_team_ownership` | Yes | Transfer ownership |

### Notifications
| Tool | Auth | Description |
|------|------|-------------|
| `modrinth_get_notifications` | Yes | List notifications |
| `modrinth_mark_notification_read` | Yes | Mark as read |
| `modrinth_delete_notification` | Yes | Delete |

### Reports
| Tool | Auth | Description |
|------|------|-------------|
| `modrinth_submit_report` | Yes | Submit report |
| `modrinth_get_reports` | Yes | List submitted reports |
| `modrinth_update_report` | Yes | Update/close report |

## Development

```bash
npm install
npm test        # run tests
npm run build   # compile TypeScript
```

## License

MIT
