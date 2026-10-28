# Discord Vencord MCP Bridge

Model Context Protocol (MCP) server for Discord user sessions.
Enables Claude Desktop, Antigravity, Cursor, and any MCP-compatible AI agent to interact with Discord directly through your native desktop client.

---

## Why This Exists

Traditional Discord MCP tools require providing a Bot Token or extracting your User Token.
- Bot Tokens cannot send messages in DMs without mutual servers or read your private chats.
- User Tokens in external scripts frequently trigger Cloudflare challenges, phone locks, and account flags due to TLS fingerprint mismatch (JA3/TLS, WebSockets heartbeat, super-properties).

This project routes all actions natively through your active Discord client via a local Vencord userplugin.
- Zero Account Flagging: Runs inside your authentic Discord Electron runtime.
- No Tokens in Config Files: Authenticates automatically using your client's existing session.
- 30+ Tools: Read channels, send replies, react, list DMs, manage servers, kick/ban, and manage roles.

---

## Architecture

```
[ AI Assistant (Claude Desktop / Antigravity / Cursor) ]
                         │ (stdio)
                         ▼
        [ Node.js MCP Server (This Repo) ]
        [ WebSocket Server: 127.0.0.1:49152 ]
                         │ (Local WebSocket JSON Bridge)
                         ▼
       [ Vencord UserPlugin (MCPBridge) ]
       [ Inside Discord Desktop (Renderer Context) ]
                         │ (Discord Internal Webpack Stores & RestAPI)
                         ▼
                [ Discord Gateway ]
```

---

## Quick Start Guide

### Step 1: Clone and Build the MCP Server

```bash
git clone https://github.com/clawdecode/discord-vencord-mcp.git
cd discord-vencord-mcp
npm install
npm run build
```

---

### Step 2: Install the Vencord Plugin

1. Ensure you have the Vencord Dev Build (or clone Vencord):
   ```bash
   git clone https://github.com/Vendicated/Vencord.git
   cd Vencord
   pnpm install
   ```

2. Copy the plugin file from this repository into Vencord's userplugins directory:
   ```bash
   mkdir src\userplugins\mcpBridge
   copy "path\to\discord-vencord-mcp\vencord-plugin\index.tsx" "src\userplugins\mcpBridge\index.tsx"
   ```

3. Build and inject into Discord:
   ```bash
   pnpm build
   pnpm inject
   ```

4. Open Discord and verify MCPBridge is visible under User Settings -> Vencord -> Plugins (tagged with the USERPLUGIN badge) and enabled. Press `Ctrl + R` to reload.

---

### Step 3: Register in Your MCP Client

Add the server to your client configuration file:

#### Antigravity (`~/.gemini/config/mcp_config.json`)
```json
{
  "mcpServers": {
    "discord-bridge": {
      "command": "node",
      "args": [
        "C:/path/to/discord-vencord-mcp/dist/mcp-server/index.js"
      ]
    }
  }
}
```

#### Claude Desktop (`%APPDATA%/Claude/claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "discord-bridge": {
      "command": "node",
      "args": [
        "C:/path/to/discord-vencord-mcp/dist/mcp-server/index.js"
      ]
    }
  }
}
```

#### Cursor (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "discord-bridge": {
      "command": "node",
      "args": [
        "C:/path/to/discord-vencord-mcp/dist/mcp-server/index.js"
      ]
    }
  }
}
```

---

## Complete Tools Reference

### Identity and Private Messages
| Tool | Description |
| :--- | :--- |
| `discord_status` | Test bridge connectivity and verify authenticated user. |
| `discord_get_user_info` | Look up account details by User ID or self. |
| `discord_list_friends` | Retrieve your entire Discord friends list. |
| `discord_list_dm_channels` | List all active direct message channels and group DMs. |
| `discord_create_dm` | Retrieve existing DM thread with a user (or open one). |

### Messaging and Reactions
| Tool | Description |
| :--- | :--- |
| `discord_get_recent_messages` | Read the last N messages with attachments and authors. |
| `discord_get_message_by_id` | Query a single message by ID. |
| `discord_send_message` | Send a message as yourself to any channel or DM. |
| `discord_reply_message` | Reply directly to a specific message ID. |
| `discord_edit_message` | Edit one of your previous messages. |
| `discord_delete_message` | Delete a message. |
| `discord_add_reaction` | React to a message with an emoji. |
| `discord_remove_reaction` | Remove your reaction from a message. |

### Navigation and UI Control
| Tool | Description |
| :--- | :--- |
| `discord_get_current_channel` | Return the channel currently focused in your client. |
| `discord_get_current_guild` | Return the server currently focused in your client. |
| `discord_switch_channel` | Switch your active desktop client view to any channel or DM. |

### Server and Channel Administration
| Tool | Description |
| :--- | :--- |
| `discord_list_guilds` | List all servers your account belongs to. |
| `discord_get_guild_details` | Detailed server statistics, vanity URL, and settings. |
| `discord_modify_guild` | Update server name, description, verification tier. |
| `discord_list_guild_channels` | List text channels, voice channels, and categories. |
| `discord_create_channel` | Create new text (0), voice (2), or category (4) channels. |
| `discord_modify_channel` | Modify name, topic, slowmode, and NSFW settings. |
| `discord_delete_channel` | Delete any channel or category. |

### Roles and Permissions
| Tool | Description |
| :--- | :--- |
| `discord_list_roles` | Inspect server roles, permissions, hoist, and colors. |
| `discord_create_role` | Create roles with custom names, hex colors, and bitwise permissions. |
| `discord_modify_role` | Update role color, name, hoist, and mentionability. |
| `discord_delete_role` | Delete a server role. |
| `discord_assign_role` | Add a role to a server member. |
| `discord_remove_role` | Strip a role from a server member. |

### Moderation and Invites
| Tool | Description |
| :--- | :--- |
| `discord_list_guild_members` | List members in a server. |
| `discord_modify_member` | Change nickname, server mute/deaf, or apply timeouts. |
| `discord_kick_member` | Kick a user with audit log reason. |
| `discord_ban_member` | Ban a user with optional message purge duration. |
| `discord_unban_member` | Revoke a server ban. |
| `discord_list_invites` | List active server invite links and usage counts. |
| `discord_create_invite` | Create an invite link with custom age and max uses. |
| `discord_delete_invite` | Revoke an invite code. |

---

## Security and Privacy

1. Local-Only Communication: The WebSocket bridge binds strictly to loopback (`127.0.0.1:49152`) and never accepts outside network connections.
2. Permission Parity: The tools operate under your user account's actual Discord permissions. It cannot bypass server role hierarchies or access channels your account cannot see.
3. No External Telemetry: All data flows exclusively between your local AI agent, the local MCP process, and your local Discord client.

---

## License

Released under the MIT License.
