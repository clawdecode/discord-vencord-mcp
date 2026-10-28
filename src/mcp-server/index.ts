import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { BridgeClient } from "./bridge-client.js";

const client = new BridgeClient();

const server = new Server(
  {
    name: "discord-vencord-bridge",
    version: "2.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Identity & Profile
      {
        name: "discord_status",
        description: "Check if the Discord Vencord bridge is online and view the authenticated user.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "discord_get_user_info",
        description: "Fetch profile details for yourself or another user by ID.",
        inputSchema: {
          type: "object",
          properties: {
            user_id: { type: "string", description: "Target Discord User ID (defaults to yourself)." },
          },
        },
      },
      {
        name: "discord_list_friends",
        description: "List your friends on Discord.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "discord_list_dm_channels",
        description: "List all existing direct message channels and group DMs with recipients.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "discord_create_dm",
        description: "Get existing DM channel ID for a user or open one if not already created.",
        inputSchema: {
          type: "object",
          properties: {
            user_id: { type: "string", description: "The User ID to open/find a DM with." },
          },
          required: ["user_id"],
        },
      },

      // Navigation & Guild Discovery
      {
        name: "discord_get_current_channel",
        description: "Get details about the channel currently open / selected in your Discord client.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "discord_get_current_guild",
        description: "Get details of the Discord server/guild currently selected.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "discord_get_channel_info",
        description: "Get metadata for a specific Discord channel by ID.",
        inputSchema: {
          type: "object",
          properties: {
            channel_id: { type: "string", description: "Discord channel ID." },
          },
        },
      },
      {
        name: "discord_list_guilds",
        description: "List all Discord servers (guilds) you are currently a member of.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "discord_switch_channel",
        description: "Switch the active channel view in your Discord desktop client to a target channel.",
        inputSchema: {
          type: "object",
          properties: {
            channel_id: { type: "string", description: "The channel ID to switch to." },
            guild_id: { type: "string", description: "Server ID or '@me' for DMs (optional)." },
          },
          required: ["channel_id"],
        },
      },

      // Server & Channel Management (Subject to user permissions)
      {
        name: "discord_get_guild_details",
        description: "Get comprehensive details and settings of a server/guild.",
        inputSchema: {
          type: "object",
          properties: {
            guild_id: { type: "string", description: "Server ID (defaults to active server)." },
          },
        },
      },
      {
        name: "discord_modify_guild",
        description: "Modify server settings (requires MANAGE_GUILD permission).",
        inputSchema: {
          type: "object",
          properties: {
            guild_id: { type: "string", description: "Server ID (defaults to active server)." },
            name: { type: "string", description: "New name for the server." },
            description: { type: "string", description: "New server description." },
            verification_level: { type: "number", description: "Verification level (0-4)." },
            default_message_notifications: { type: "number", description: "0 for all messages, 1 for only mentions." },
          },
        },
      },
      {
        name: "discord_list_guild_channels",
        description: "List all channels in a server.",
        inputSchema: {
          type: "object",
          properties: {
            guild_id: { type: "string", description: "Server ID (defaults to active server)." },
          },
        },
      },
      {
        name: "discord_create_channel",
        description: "Create a new channel in a server (requires MANAGE_CHANNELS permission).",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name of the channel." },
            guild_id: { type: "string", description: "Server ID (defaults to active server)." },
            type: { type: "number", description: "0 = Text, 2 = Voice, 4 = Category, 15 = Forum (default: 0)." },
            topic: { type: "string", description: "Channel topic." },
            parent_id: { type: "string", description: "Category ID to place channel under." },
          },
          required: ["name"],
        },
      },
      {
        name: "discord_modify_channel",
        description: "Modify an existing channel (name, topic, NSFW, parent category, slowmode).",
        inputSchema: {
          type: "object",
          properties: {
            channel_id: { type: "string", description: "Target channel ID (defaults to active channel)." },
            name: { type: "string", description: "New channel name." },
            topic: { type: "string", description: "New channel topic." },
            nsfw: { type: "boolean", description: "Set NSFW flag." },
            parent_id: { type: "string", description: "Parent category ID." },
            rate_limit_per_user: { type: "number", description: "Slowmode in seconds (0-21600)." },
          },
        },
      },
      {
        name: "discord_delete_channel",
        description: "Delete a channel from a server (requires MANAGE_CHANNELS permission).",
        inputSchema: {
          type: "object",
          properties: {
            channel_id: { type: "string", description: "ID of the channel to delete." },
          },
          required: ["channel_id"],
        },
      },

      // Roles Management
      {
        name: "discord_list_roles",
        description: "List all roles in a server.",
        inputSchema: {
          type: "object",
          properties: {
            guild_id: { type: "string", description: "Server ID (defaults to active server)." },
          },
        },
      },
      {
        name: "discord_create_role",
        description: "Create a new role in a server (requires MANAGE_ROLES permission).",
        inputSchema: {
          type: "object",
          properties: {
            guild_id: { type: "string", description: "Server ID (defaults to active server)." },
            name: { type: "string", description: "Role name." },
            color: { type: "number", description: "RGB integer color (e.g. 0xFF0000 for red)." },
            hoist: { type: "boolean", description: "Display role separately in member list." },
            mentionable: { type: "boolean", description: "Allow anyone to @mention this role." },
            permissions: { type: "string", description: "Bitwise permission flag string." },
          },
        },
      },
      {
        name: "discord_modify_role",
        description: "Modify an existing role's name, color, hoist, or mentionable status.",
        inputSchema: {
          type: "object",
          properties: {
            role_id: { type: "string", description: "The ID of the role to modify." },
            guild_id: { type: "string", description: "Server ID (defaults to active server)." },
            name: { type: "string", description: "New role name." },
            color: { type: "number", description: "RGB integer color." },
            hoist: { type: "boolean", description: "Display role separately." },
            mentionable: { type: "boolean", description: "Allow @mention." },
          },
          required: ["role_id"],
        },
      },
      {
        name: "discord_delete_role",
        description: "Delete a role from a server (requires MANAGE_ROLES permission).",
        inputSchema: {
          type: "object",
          properties: {
            role_id: { type: "string", description: "The ID of the role to delete." },
            guild_id: { type: "string", description: "Server ID (defaults to active server)." },
          },
          required: ["role_id"],
        },
      },
      {
        name: "discord_assign_role",
        description: "Assign a role to a server member.",
        inputSchema: {
          type: "object",
          properties: {
            user_id: { type: "string", description: "The ID of the user." },
            role_id: { type: "string", description: "The ID of the role to assign." },
            guild_id: { type: "string", description: "Server ID (defaults to active server)." },
          },
          required: ["user_id", "role_id"],
        },
      },
      {
        name: "discord_remove_role",
        description: "Remove a role from a server member.",
        inputSchema: {
          type: "object",
          properties: {
            user_id: { type: "string", description: "The ID of the user." },
            role_id: { type: "string", description: "The ID of the role to remove." },
            guild_id: { type: "string", description: "Server ID (defaults to active server)." },
          },
          required: ["user_id", "role_id"],
        },
      },

      // Members & Moderation
      {
        name: "discord_list_guild_members",
        description: "List members in a server (requires appropriate permissions/intent).",
        inputSchema: {
          type: "object",
          properties: {
            guild_id: { type: "string", description: "Server ID (defaults to active server)." },
            limit: { type: "number", description: "Max members to retrieve (default: 50)." },
          },
        },
      },
      {
        name: "discord_modify_member",
        description: "Modify a member's nickname, mute/deaf state, or apply a timeout.",
        inputSchema: {
          type: "object",
          properties: {
            user_id: { type: "string", description: "Target user ID." },
            guild_id: { type: "string", description: "Server ID (defaults to active server)." },
            nick: { type: "string", description: "New nickname." },
            mute: { type: "boolean", description: "Mute user in voice." },
            deaf: { type: "boolean", description: "Deafen user in voice." },
            communication_disabled_until: { type: "string", description: "Timeout ISO timestamp (e.g. 2026-12-01T00:00:00.000Z)." },
          },
          required: ["user_id"],
        },
      },
      {
        name: "discord_kick_member",
        description: "Kick a member from a server.",
        inputSchema: {
          type: "object",
          properties: {
            user_id: { type: "string", description: "User ID to kick." },
            guild_id: { type: "string", description: "Server ID (defaults to active server)." },
            reason: { type: "string", description: "Audit log reason." },
          },
          required: ["user_id"],
        },
      },
      {
        name: "discord_ban_member",
        description: "Ban a user from a server.",
        inputSchema: {
          type: "object",
          properties: {
            user_id: { type: "string", description: "User ID to ban." },
            guild_id: { type: "string", description: "Server ID (defaults to active server)." },
            delete_message_seconds: { type: "number", description: "Number of seconds of message history to delete." },
          },
          required: ["user_id"],
        },
      },
      {
        name: "discord_unban_member",
        description: "Remove a ban for a user in a server.",
        inputSchema: {
          type: "object",
          properties: {
            user_id: { type: "string", description: "User ID to unban." },
            guild_id: { type: "string", description: "Server ID (defaults to active server)." },
          },
          required: ["user_id"],
        },
      },

      // Invites
      {
        name: "discord_list_invites",
        description: "List all active invites for a server.",
        inputSchema: {
          type: "object",
          properties: {
            guild_id: { type: "string", description: "Server ID (defaults to active server)." },
          },
        },
      },
      {
        name: "discord_create_invite",
        description: "Create an invite for a channel.",
        inputSchema: {
          type: "object",
          properties: {
            channel_id: { type: "string", description: "Target channel ID (defaults to active)." },
            max_age: { type: "number", description: "Duration in seconds (0 = never, default: 86400)." },
            max_uses: { type: "number", description: "Max number of uses (0 = unlimited)." },
            temporary: { type: "boolean", description: "Grant temporary membership." },
          },
        },
      },
      {
        name: "discord_delete_invite",
        description: "Delete/revoke an invite code.",
        inputSchema: {
          type: "object",
          properties: {
            code: { type: "string", description: "The invite code to revoke." },
          },
          required: ["code"],
        },
      },

      // Messages & Reactions
      {
        name: "discord_get_recent_messages",
        description: "Fetch recent messages in the active or target channel.",
        inputSchema: {
          type: "object",
          properties: {
            channel_id: { type: "string", description: "Target channel ID (optional, defaults to active)." },
            limit: { type: "number", description: "Number of messages to retrieve (default: 25)." },
          },
        },
      },
      {
        name: "discord_get_message_by_id",
        description: "Fetch a specific message by its ID.",
        inputSchema: {
          type: "object",
          properties: {
            message_id: { type: "string", description: "Target message ID." },
            channel_id: { type: "string", description: "Channel ID (defaults to active channel)." },
          },
          required: ["message_id"],
        },
      },
      {
        name: "discord_send_message",
        description: "Send a message as your authenticated Discord user into the current or specified channel.",
        inputSchema: {
          type: "object",
          properties: {
            content: { type: "string", description: "The text content of the message to send." },
            channel_id: { type: "string", description: "Target channel ID (optional, defaults to active)." },
          },
          required: ["content"],
        },
      },
      {
        name: "discord_reply_message",
        description: "Reply directly to a specific message in Discord.",
        inputSchema: {
          type: "object",
          properties: {
            message_id: { type: "string", description: "The ID of the message to reply to." },
            content: { type: "string", description: "The reply message content." },
            channel_id: { type: "string", description: "Target channel ID (defaults to active)." },
          },
          required: ["message_id", "content"],
        },
      },
      {
        name: "discord_edit_message",
        description: "Edit one of your previously sent messages.",
        inputSchema: {
          type: "object",
          properties: {
            message_id: { type: "string", description: "The ID of the message to edit." },
            content: { type: "string", description: "The new content for the message." },
            channel_id: { type: "string", description: "Target channel ID (defaults to active)." },
          },
          required: ["message_id", "content"],
        },
      },
      {
        name: "discord_delete_message",
        description: "Delete a message from a channel.",
        inputSchema: {
          type: "object",
          properties: {
            message_id: { type: "string", description: "The ID of the message to delete." },
            channel_id: { type: "string", description: "Target channel ID (defaults to active)." },
          },
          required: ["message_id"],
        },
      },
      {
        name: "discord_add_reaction",
        description: "Add an emoji reaction to a message.",
        inputSchema: {
          type: "object",
          properties: {
            message_id: { type: "string", description: "The ID of the target message." },
            emoji: { type: "string", description: "The emoji character (e.g. 👍, 🔥, 🎉)." },
            channel_id: { type: "string", description: "Channel ID (defaults to active)." },
          },
          required: ["message_id", "emoji"],
        },
      },
      {
        name: "discord_remove_reaction",
        description: "Remove your emoji reaction from a message.",
        inputSchema: {
          type: "object",
          properties: {
            message_id: { type: "string", description: "The ID of the target message." },
            emoji: { type: "string", description: "The emoji character to remove." },
            channel_id: { type: "string", description: "Channel ID (defaults to active)." },
          },
          required: ["message_id", "emoji"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: any;

    switch (name) {
      // Identity & Profile
      case "discord_status":
        result = await client.send("ping");
        break;
      case "discord_get_user_info":
        result = await client.send("get_user_info", args);
        break;
      case "discord_list_friends":
        result = await client.send("list_friends");
        break;
      case "discord_list_dm_channels":
        result = await client.send("list_dm_channels");
        break;
      case "discord_create_dm":
        result = await client.send("create_dm", args);
        break;

      // Navigation & Discovery
      case "discord_get_current_channel":
        result = await client.send("get_current_channel");
        break;
      case "discord_get_current_guild":
        result = await client.send("get_current_guild");
        break;
      case "discord_get_channel_info":
        result = await client.send("get_channel_info", args);
        break;
      case "discord_list_guilds":
        result = await client.send("list_guilds");
        break;
      case "discord_switch_channel":
        result = await client.send("switch_channel", args);
        break;

      // Server & Channel Management
      case "discord_get_guild_details":
        result = await client.send("get_guild_details", args);
        break;
      case "discord_modify_guild":
        result = await client.send("modify_guild", args);
        break;
      case "discord_list_guild_channels":
        result = await client.send("list_guild_channels", args);
        break;
      case "discord_create_channel":
        result = await client.send("create_channel", args);
        break;
      case "discord_modify_channel":
        result = await client.send("modify_channel", args);
        break;
      case "discord_delete_channel":
        result = await client.send("delete_channel", args);
        break;

      // Roles
      case "discord_list_roles":
        result = await client.send("list_roles", args);
        break;
      case "discord_create_role":
        result = await client.send("create_role", args);
        break;
      case "discord_modify_role":
        result = await client.send("modify_role", args);
        break;
      case "discord_delete_role":
        result = await client.send("delete_role", args);
        break;
      case "discord_assign_role":
        result = await client.send("assign_role", args);
        break;
      case "discord_remove_role":
        result = await client.send("remove_role", args);
        break;

      // Members & Moderation
      case "discord_list_guild_members":
        result = await client.send("list_guild_members", args);
        break;
      case "discord_modify_member":
        result = await client.send("modify_member", args);
        break;
      case "discord_kick_member":
        result = await client.send("kick_member", args);
        break;
      case "discord_ban_member":
        result = await client.send("ban_member", args);
        break;
      case "discord_unban_member":
        result = await client.send("unban_member", args);
        break;

      // Invites
      case "discord_list_invites":
        result = await client.send("list_invites", args);
        break;
      case "discord_create_invite":
        result = await client.send("create_invite", args);
        break;
      case "discord_delete_invite":
        result = await client.send("delete_invite", args);
        break;

      // Messaging
      case "discord_get_recent_messages":
        result = await client.send("get_recent_messages", args);
        break;
      case "discord_get_message_by_id":
        result = await client.send("get_message_by_id", args);
        break;
      case "discord_send_message":
        result = await client.send("send_message", args);
        break;
      case "discord_reply_message":
        result = await client.send("reply_message", args);
        break;
      case "discord_edit_message":
        result = await client.send("edit_message", args);
        break;
      case "discord_delete_message":
        result = await client.send("delete_message", args);
        break;
      case "discord_add_reaction":
        result = await client.send("add_reaction", args);
        break;
      case "discord_remove_reaction":
        result = await client.send("remove_reaction", args);
        break;

      default:
        throw new Error(`Tool ${name} is not recognized.`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Discord Bridge Error: ${error?.message || String(error)}`,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP Server fatal error:", err);
  process.exit(1);
});
