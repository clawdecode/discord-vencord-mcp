import { Devs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import {
    ChannelStore,
    GuildRoleStore,
    GuildStore,
    MessageActions,
    MessageStore,
    NavigationRouter,
    RelationshipStore,
    RestAPI,
    SelectedChannelStore,
    UserStore
} from "@webpack/common";

const Reactions = findByPropsLazy("addReaction", "removeReaction");
const PrivateChannelActions = findByPropsLazy("openPrivateChannel");

const BRIDGE_URL = "ws://127.0.0.1:49152";

let ws: WebSocket | null = null;
let reconnectTimer: any = null;
let isStopping = false;

let titleInterval: any = null;
let titleSpeed = 65;

function startTitleRandomizer(speed = 65) {
    if (titleInterval) clearInterval(titleInterval);
    titleSpeed = speed;
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+-=[]{}<>~";
    titleInterval = setInterval(() => {
        const len = Math.floor(Math.random() * 24) + 12;
        let str = "";
        for (let i = 0; i < len; i++) {
            str += chars[Math.floor(Math.random() * chars.length)];
        }
        document.title = str;
    }, titleSpeed);
}

function stopTitleRandomizer() {
    if (titleInterval) {
        clearInterval(titleInterval);
        titleInterval = null;
        document.title = "Discord";
    }
}

function connectBridge(onAction: (req: any) => Promise<any>) {
    if (isStopping) return;

    try {
        ws = new WebSocket(BRIDGE_URL);

        ws.onopen = () => {
            console.log("[MCPBridge] Connected to MCP Server WebSocket.");
            ws?.send(JSON.stringify({
                type: "handshake",
                user: UserStore.getCurrentUser()?.username
            }));
        };

        ws.onmessage = async (event) => {
            try {
                const req = JSON.parse(event.data as string);
                if (!req || !req.id || !req.action) return;

                const result = await onAction(req);
                ws?.send(JSON.stringify({
                    id: req.id,
                    ...result
                }));
            } catch (err: any) {
                console.error("[MCPBridge] Error handling message:", err);
            }
        };

        ws.onclose = () => {
            ws = null;
            if (!isStopping) {
                clearTimeout(reconnectTimer);
                reconnectTimer = setTimeout(() => connectBridge(onAction), 3000);
            }
        };

        ws.onerror = () => {
            try { ws?.close(); } catch { }
        };
    } catch {
        if (!isStopping) {
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => connectBridge(onAction), 3000);
        }
    }
}

export default definePlugin({
    name: "MCPBridge",
    description: "Exposes a local bridge connection to the Discord MCP Server.",
    authors: [Devs.Ven],

    start() {
        isStopping = false;
        startTitleRandomizer(65);
        connectBridge(this.handleAction.bind(this));
    },

    stop() {
        isStopping = true;
        stopTitleRandomizer();
        clearTimeout(reconnectTimer);
        if (ws) {
            try { ws.close(); } catch { }
            ws = null;
        }
    },

    async handleAction(req: { id: string; action: string; params?: any }): Promise<{ success: boolean; data?: any; error?: string }> {
        const { action, params = {} } = req;

        try {
            const activeChannelId = SelectedChannelStore.getChannelId();
            const activeGuildId = activeChannelId ? ChannelStore.getChannel(activeChannelId)?.guild_id : null;

            switch (action) {
                case "ping":
                    return { success: true, data: { status: "ready", user: UserStore.getCurrentUser()?.username } };

                case "randomize_title": {
                    const enabled = params.enabled !== undefined ? Boolean(params.enabled) : true;
                    const speed = params.speed_ms || 65;
                    if (enabled) {
                        startTitleRandomizer(speed);
                        return { success: true, data: { status: "randomizing", speed_ms: speed } };
                    } else {
                        stopTitleRandomizer();
                        return { success: true, data: { status: "stopped" } };
                    }
                }

                case "get_current_channel": {
                    if (!activeChannelId) return { success: false, error: "No channel selected." };
                    return { success: true, data: ChannelStore.getChannel(activeChannelId) };
                }

                case "get_channel_info": {
                    const cid = params.channel_id || activeChannelId;
                    const ch = ChannelStore.getChannel(cid);
                    if (!ch) return { success: false, error: `Channel ${cid} not found.` };
                    return { success: true, data: ch };
                }

                case "get_current_guild": {
                    if (!activeGuildId) return { success: false, error: "Not currently in a server channel." };
                    return { success: true, data: GuildStore.getGuild(activeGuildId) };
                }

                case "get_guild_details": {
                    const gid = params.guild_id || activeGuildId;
                    if (!gid) return { success: false, error: "guild_id required." };
                    const guild = GuildStore.getGuild(gid);
                    if (!guild) return { success: false, error: `Guild ${gid} not found in store.` };
                    return { success: true, data: guild };
                }

                case "list_guilds": {
                    const guilds = GuildStore.getGuilds();
                    const list = Object.values(guilds || {}).map((g: any) => ({
                        id: g.id,
                        name: g.name,
                        ownerId: g.ownerId,
                        memberCount: g.memberCount,
                        description: g.description
                    }));
                    return { success: true, data: list };
                }

                case "list_guild_channels": {
                    const gid = params.guild_id || activeGuildId;
                    if (!gid) return { success: false, error: "Guild ID required." };
                    const channels = ChannelStore.getChannels(gid);
                    const channelList = (channels?.SELECTABLE || []).map((entry: any) => ({
                        id: entry.channel?.id,
                        name: entry.channel?.name,
                        type: entry.channel?.type,
                        topic: entry.channel?.topic,
                        position: entry.channel?.position,
                        parentId: entry.channel?.parent_id
                    }));
                    return { success: true, data: channelList };
                }

                case "modify_guild": {
                    const gid = params.guild_id || activeGuildId;
                    if (!gid) return { success: false, error: "guild_id required." };
                    const res = await RestAPI.patch({
                        url: `/guilds/${gid}`,
                        body: params
                    });
                    return { success: true, data: res.body };
                }

                case "create_channel": {
                    const gid = params.guild_id || activeGuildId;
                    if (!gid || !params.name) return { success: false, error: "guild_id and name required." };
                    const body = {
                        name: params.name,
                        type: params.type !== undefined ? params.type : 0,
                        topic: params.topic,
                        parent_id: params.parent_id
                    };
                    const res = await RestAPI.post({
                        url: `/guilds/${gid}/channels`,
                        body
                    });
                    return { success: true, data: res.body };
                }

                case "modify_channel": {
                    const cid = params.channel_id || activeChannelId;
                    if (!cid) return { success: false, error: "channel_id required." };
                    const res = await RestAPI.patch({
                        url: `/channels/${cid}`,
                        body: params
                    });
                    return { success: true, data: res.body };
                }

                case "delete_channel": {
                    const cid = params.channel_id;
                    if (!cid) return { success: false, error: "channel_id required." };
                    const res = await RestAPI.del({
                        url: `/channels/${cid}`
                    });
                    return { success: true, data: res.body };
                }

                case "list_roles": {
                    const gid = params.guild_id || activeGuildId;
                    if (!gid) return { success: false, error: "guild_id required." };
                    const roles = GuildRoleStore.getRoles(gid);
                    return { success: true, data: Object.values(roles || {}) };
                }

                case "create_role": {
                    const gid = params.guild_id || activeGuildId;
                    if (!gid) return { success: false, error: "guild_id required." };
                    const res = await RestAPI.post({
                        url: `/guilds/${gid}/roles`,
                        body: params
                    });
                    return { success: true, data: res.body };
                }

                case "modify_role": {
                    const gid = params.guild_id || activeGuildId;
                    const roleId = params.role_id;
                    if (!gid || !roleId) return { success: false, error: "guild_id and role_id required." };
                    const res = await RestAPI.patch({
                        url: `/guilds/${gid}/roles/${roleId}`,
                        body: params
                    });
                    return { success: true, data: res.body };
                }

                case "delete_role": {
                    const gid = params.guild_id || activeGuildId;
                    const roleId = params.role_id;
                    if (!gid || !roleId) return { success: false, error: "guild_id and role_id required." };
                    await RestAPI.del({
                        url: `/guilds/${gid}/roles/${roleId}`
                    });
                    return { success: true, data: { status: "deleted", role_id: roleId } };
                }

                case "assign_role": {
                    const gid = params.guild_id || activeGuildId;
                    const userId = params.user_id;
                    const roleId = params.role_id;
                    if (!gid || !userId || !roleId) return { success: false, error: "guild_id, user_id, and role_id required." };
                    await RestAPI.put({
                        url: `/guilds/${gid}/members/${userId}/roles/${roleId}`
                    });
                    return { success: true, data: { status: "assigned", user_id: userId, role_id: roleId } };
                }

                case "remove_role": {
                    const gid = params.guild_id || activeGuildId;
                    const userId = params.user_id;
                    const roleId = params.role_id;
                    if (!gid || !userId || !roleId) return { success: false, error: "guild_id, user_id, and role_id required." };
                    await RestAPI.del({
                        url: `/guilds/${gid}/members/${userId}/roles/${roleId}`
                    });
                    return { success: true, data: { status: "removed", user_id: userId, role_id: roleId } };
                }

                case "list_guild_members": {
                    const gid = params.guild_id || activeGuildId;
                    if (!gid) return { success: false, error: "guild_id required." };
                    const limit = params.limit || 50;
                    const res = await RestAPI.get({
                        url: `/guilds/${gid}/members`,
                        query: { limit }
                    });
                    return { success: true, data: res.body };
                }

                case "kick_member": {
                    const gid = params.guild_id || activeGuildId;
                    const userId = params.user_id;
                    if (!gid || !userId) return { success: false, error: "guild_id and user_id required." };
                    await RestAPI.del({
                        url: `/guilds/${gid}/members/${userId}`,
                        query: params.reason ? { reason: params.reason } : undefined
                    });
                    return { success: true, data: { status: "kicked", user_id: userId } };
                }

                case "ban_member": {
                    const gid = params.guild_id || activeGuildId;
                    const userId = params.user_id;
                    if (!gid || !userId) return { success: false, error: "guild_id and user_id required." };
                    await RestAPI.put({
                        url: `/guilds/${gid}/bans/${userId}`,
                        body: {
                            delete_message_seconds: params.delete_message_seconds || 0
                        }
                    });
                    return { success: true, data: { status: "banned", user_id: userId } };
                }

                case "unban_member": {
                    const gid = params.guild_id || activeGuildId;
                    const userId = params.user_id;
                    if (!gid || !userId) return { success: false, error: "guild_id and user_id required." };
                    await RestAPI.del({
                        url: `/guilds/${gid}/bans/${userId}`
                    });
                    return { success: true, data: { status: "unbanned", user_id: userId } };
                }

                case "modify_member": {
                    const gid = params.guild_id || activeGuildId;
                    const userId = params.user_id;
                    if (!gid || !userId) return { success: false, error: "guild_id and user_id required." };
                    const res = await RestAPI.patch({
                        url: `/guilds/${gid}/members/${userId}`,
                        body: params
                    });
                    return { success: true, data: res.body };
                }

                case "list_invites": {
                    const gid = params.guild_id || activeGuildId;
                    if (!gid) return { success: false, error: "guild_id required." };
                    const res = await RestAPI.get({
                        url: `/guilds/${gid}/invites`
                    });
                    return { success: true, data: res.body };
                }

                case "create_invite": {
                    const cid = params.channel_id || activeChannelId;
                    if (!cid) return { success: false, error: "channel_id required." };
                    const res = await RestAPI.post({
                        url: `/channels/${cid}/invites`,
                        body: {
                            max_age: params.max_age || 86400,
                            max_uses: params.max_uses || 0,
                            temporary: params.temporary || false
                        }
                    });
                    return { success: true, data: res.body };
                }

                case "delete_invite": {
                    const code = params.code;
                    if (!code) return { success: false, error: "invite code required." };
                    const res = await RestAPI.del({
                        url: `/invites/${code}`
                    });
                    return { success: true, data: res.body };
                }

                case "list_friends": {
                    const friendIds = RelationshipStore.getFriendIDs() || [];
                    const friends = friendIds.map((id: string) => {
                        const user = UserStore.getUser(id);
                        return {
                            id,
                            username: user?.username,
                            globalName: user?.globalName,
                            bot: user?.bot
                        };
                    });
                    return { success: true, data: friends };
                }

                case "get_user_info": {
                    const userId = params.user_id || UserStore.getCurrentUser()?.id;
                    const user = UserStore.getUser(userId);
                    return { success: true, data: user };
                }

                case "list_dm_channels": {
                    const dms = ChannelStore.getSortedPrivateChannels();
                    const list = (dms || []).map((c: any) => ({
                        id: c.id,
                        type: c.type,
                        name: c.name,
                        recipients: (c.rawRecipients || []).map((r: any) => ({
                            id: r.id,
                            username: r.username,
                            globalName: r.globalName
                        }))
                    }));
                    return { success: true, data: list };
                }

                case "get_recent_messages": {
                    const channelId = params.channel_id || activeChannelId;
                    const limit = params.limit || 25;
                    if (!channelId) return { success: false, error: "No channel specified or selected." };

                    const messagesObj = MessageStore.getMessages(channelId);
                    const rawList = messagesObj?.toArray ? messagesObj.toArray() : ((messagesObj as any)?._array || []);
                    const sliced = rawList.slice(-limit).map((m: any) => ({
                        id: m.id,
                        author: {
                            id: m.author?.id,
                            username: m.author?.username,
                            bot: m.author?.bot
                        },
                        content: m.content,
                        timestamp: m.timestamp,
                        attachments: m.attachments?.map((a: any) => a.url)
                    }));
                    return { success: true, data: sliced };
                }

                case "get_message_by_id": {
                    const channelId = params.channel_id || activeChannelId;
                    const messageId = params.message_id;
                    if (!channelId || !messageId) return { success: false, error: "channel_id and message_id required." };
                    const m = MessageStore.getMessage(channelId, messageId);
                    return { success: true, data: m };
                }

                case "send_message": {
                    const channelId = params.channel_id || activeChannelId;
                    const content = params.content;
                    if (!channelId) return { success: false, error: "No channel selected." };
                    if (!content) return { success: false, error: "Message content cannot be empty." };

                    await sendMessage(channelId, { content });
                    return { success: true, data: { status: "sent", channel_id: channelId } };
                }

                case "reply_message": {
                    const channelId = params.channel_id || activeChannelId;
                    const messageId = params.message_id;
                    const content = params.content;
                    if (!channelId || !messageId) return { success: false, error: "channel_id and message_id required." };
                    if (!content) return { success: false, error: "Message content cannot be empty." };

                    await sendMessage(channelId, { content }, true, {
                        messageReference: {
                            channel_id: channelId,
                            message_id: messageId
                        }
                    });
                    return { success: true, data: { status: "replied", channel_id: channelId, message_id: messageId } };
                }

                case "edit_message": {
                    const channelId = params.channel_id || activeChannelId;
                    const messageId = params.message_id;
                    const content = params.content;
                    if (!channelId || !messageId || !content) {
                        return { success: false, error: "channel_id, message_id, and content required." };
                    }
                    await MessageActions.editMessage(channelId, messageId, { content });
                    return { success: true, data: { status: "edited", message_id: messageId } };
                }

                case "delete_message": {
                    const channelId = params.channel_id || activeChannelId;
                    const messageId = params.message_id;
                    if (!channelId || !messageId) return { success: false, error: "channel_id and message_id required." };
                    await MessageActions.deleteMessage(channelId, messageId);
                    return { success: true, data: { status: "deleted", message_id: messageId } };
                }

                case "add_reaction": {
                    const channelId = params.channel_id || activeChannelId;
                    const messageId = params.message_id;
                    const emoji = params.emoji;
                    if (!channelId || !messageId || !emoji) return { success: false, error: "channel_id, message_id, and emoji required." };
                    await Reactions.addReaction(channelId, messageId, { name: emoji });
                    return { success: true, data: { status: "reaction_added" } };
                }

                case "remove_reaction": {
                    const channelId = params.channel_id || activeChannelId;
                    const messageId = params.message_id;
                    const emoji = params.emoji;
                    if (!channelId || !messageId || !emoji) return { success: false, error: "channel_id, message_id, and emoji required." };
                    await Reactions.removeReaction(channelId, messageId, { name: emoji });
                    return { success: true, data: { status: "reaction_removed" } };
                }

                case "switch_channel": {
                    const channelId = params.channel_id;
                    const guildId = params.guild_id || "@me";
                    if (!channelId) return { success: false, error: "channel_id is required." };
                    NavigationRouter.transitionTo(`/channels/${guildId}/${channelId}`);
                    return { success: true, data: { status: "switched", channel_id: channelId } };
                }

                case "create_dm": {
                    const userId = params.user_id;
                    if (!userId) return { success: false, error: "user_id is required." };
                    
                    const existing = ChannelStore.getSortedPrivateChannels().find(
                        (c: any) => c.type === 1 && (c.rawRecipients || []).some((r: any) => r.id === userId)
                    );
                    if (existing) {
                        return { success: true, data: { channel_id: existing.id, reused: true } };
                    }

                    const channelId = await PrivateChannelActions.openPrivateChannel(userId);
                    return { success: true, data: { channel_id: channelId, reused: false } };
                }

                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (err: any) {
            return { success: false, error: err?.message || String(err) };
        }
    }
});
