export const BRIDGE_PORT = 49152;

export type BridgeAction =
  | "ping"
  | "get_current_channel"
  | "get_current_guild"
  | "get_channel_info"
  | "list_guild_channels"
  | "list_guilds"
  | "list_friends"
  | "list_dm_channels"
  | "get_recent_messages"
  | "get_message_by_id"
  | "search_messages"
  | "send_message"
  | "reply_message"
  | "edit_message"
  | "delete_message"
  | "add_reaction"
  | "remove_reaction"
  | "create_dm"
  | "switch_channel"
  | "get_user_info"
  // Server Management
  | "get_guild_details"
  | "modify_guild"
  | "create_channel"
  | "modify_channel"
  | "delete_channel"
  | "list_roles"
  | "create_role"
  | "modify_role"
  | "delete_role"
  | "assign_role"
  | "remove_role"
  | "list_guild_members"
  | "kick_member"
  | "ban_member"
  | "unban_member"
  | "modify_member"
  | "list_invites"
  | "create_invite"
  | "delete_invite";

export interface BridgeRequest {
  id: string;
  action: BridgeAction;
  params?: Record<string, any>;
}

export interface BridgeResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}
