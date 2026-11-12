import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/*                                   Enums                                    */
/* -------------------------------------------------------------------------- */

export const userStatusEnum = pgEnum("user_status", [
  "online",
  "idle",
  "dnd",
  "offline",
]);

export const channelTypeEnum = pgEnum("channel_type", [
  "text",
  "voice",
  "category",
  "announcement",
  "forum",
  "dm",
  "group_dm",
]);

export const messageTypeEnum = pgEnum("message_type", [
  "default",
  "system",
  "reply",
]);

export const permissionTargetEnum = pgEnum("permission_target", [
  "role",
  "user",
]);

export const friendshipStatusEnum = pgEnum("friendship_status", [
  "pending",
  "accepted",
  "blocked",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "mention",
  "reply",
  "friend_request",
  "server_invite",
  "system",
]);

/* -------------------------------------------------------------------------- */
/*                                    Auth                                    */
/* -------------------------------------------------------------------------- */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 32 }).notNull().unique(),
  displayName: varchar("display_name", { length: 32 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url"),
  bio: varchar("bio", { length: 190 }),
  status: userStatusEnum("status").notNull().default("offline"),
  customStatus: varchar("custom_status", { length: 128 }),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).notNull(),
    providerAccountId: varchar("provider_account_id", {
      length: 255,
    }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("accounts_provider_account_unique").on(
      t.provider,
      t.providerAccountId,
    ),
    index("accounts_user_idx").on(t.userId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: text("token").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/* -------------------------------------------------------------------------- */
/*                              Servers / Guilds                              */
/* -------------------------------------------------------------------------- */

export const servers = pgTable(
  "servers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    description: varchar("description", { length: 300 }),
    iconUrl: text("icon_url"),
    bannerUrl: text("banner_url"),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("servers_owner_idx").on(t.ownerId)],
);

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serverId: uuid("server_id")
      .notNull()
      .references(() => servers.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    color: integer("color").notNull().default(0),
    position: integer("position").notNull().default(0),
    permissions: bigint("permissions", { mode: "number" })
      .notNull()
      .default(0),
    isEveryone: boolean("is_everyone").notNull().default(false),
    hoist: boolean("hoist").notNull().default(false),
    mentionable: boolean("mentionable").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("roles_server_position_idx").on(t.serverId, t.position)],
);

export const serverMembers = pgTable(
  "server_members",
  {
    serverId: uuid("server_id")
      .notNull()
      .references(() => servers.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    nickname: varchar("nickname", { length: 32 }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.serverId, t.userId] }),
    index("server_members_user_idx").on(t.userId),
  ],
);

export const memberRoles = pgTable(
  "member_roles",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.roleId, t.userId] }),
    index("member_roles_user_idx").on(t.userId),
  ],
);

export const serverBans = pgTable(
  "server_bans",
  {
    serverId: uuid("server_id")
      .notNull()
      .references(() => servers.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: varchar("reason", { length: 300 }),
    bannedById: uuid("banned_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.serverId, t.userId] })],
);

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 16 }).notNull().unique(),
    serverId: uuid("server_id")
      .notNull()
      .references(() => servers.id, { onDelete: "cascade" }),
    inviterId: uuid("inviter_id").references(() => users.id, {
      onDelete: "set null",
    }),
    channelId: uuid("channel_id").references((): AnyPgColumn => channels.id, {
      onDelete: "set null",
    }),
    maxUses: integer("max_uses").notNull().default(0),
    uses: integer("uses").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("invites_server_idx").on(t.serverId)],
);

/* -------------------------------------------------------------------------- */
/*                                  Channels                                  */
/* -------------------------------------------------------------------------- */

export const channels = pgTable(
  "channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serverId: uuid("server_id").references(() => servers.id, {
      onDelete: "cascade",
    }),
    name: varchar("name", { length: 100 }),
    type: channelTypeEnum("type").notNull(),
    topic: varchar("topic", { length: 1024 }),
    position: integer("position").notNull().default(0),
    parentId: uuid("parent_id").references((): AnyPgColumn => channels.id, {
      onDelete: "set null",
    }),
    nsfw: boolean("nsfw").notNull().default(false),
    slowmodeSeconds: integer("slowmode_seconds").notNull().default(0),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("channels_server_position_idx").on(t.serverId, t.position),
    check(
      "channels_server_required",
      sql`(${t.type} in ('dm', 'group_dm')) = (${t.serverId} is null)`,
    ),
  ],
);

export const channelPermissionOverwrites = pgTable(
  "channel_permission_overwrites",
  {
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    targetId: uuid("target_id").notNull(),
    targetType: permissionTargetEnum("target_type").notNull(),
    allow: bigint("allow", { mode: "number" }).notNull().default(0),
    deny: bigint("deny", { mode: "number" }).notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.channelId, t.targetId, t.targetType] }),
  ],
);

export const dmParticipants = pgTable(
  "dm_participants",
  {
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.channelId, t.userId] }),
    index("dm_participants_user_idx").on(t.userId),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                  Messages                                  */
/* -------------------------------------------------------------------------- */

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    content: text("content").notNull().default(""),
    type: messageTypeEnum("type").notNull().default("default"),
    replyToId: uuid("reply_to_id").references((): AnyPgColumn => messages.id, {
      onDelete: "set null",
    }),
    pinned: boolean("pinned").notNull().default(false),
    pinnedAt: timestamp("pinned_at", { withTimezone: true }),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("messages_channel_created_idx").on(t.channelId, t.createdAt),
    index("messages_author_idx").on(t.authorId),
  ],
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    filename: varchar("filename", { length: 255 }).notNull(),
    contentType: varchar("content_type", { length: 100 }),
    size: integer("size").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("attachments_message_idx").on(t.messageId)],
);

export const messageReactions = pgTable(
  "message_reactions",
  {
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emoji: varchar("emoji", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.messageId, t.userId, t.emoji] }),
  ],
);

export const messageMentions = pgTable(
  "message_mentions",
  {
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId] })],
);

export const readStates = pgTable(
  "read_states",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    lastReadMessageId: uuid("last_read_message_id").references(
      () => messages.id,
      { onDelete: "set null" },
    ),
    mentionCount: integer("mention_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.channelId] }),
    index("read_states_channel_idx").on(t.channelId),
  ],
);

export const voiceStates = pgTable(
  "voice_states",
  {
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    selfMute: boolean("self_mute").notNull().default(false),
    selfDeaf: boolean("self_deaf").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.channelId, t.userId] })],
);

/* -------------------------------------------------------------------------- */
/*                               Social / DMs                                 */
/* -------------------------------------------------------------------------- */

export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addresseeId: uuid("addressee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: friendshipStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("friendships_pair_unique").on(t.requesterId, t.addresseeId),
    check("friendships_no_self", sql`${t.requesterId} <> ${t.addresseeId}`),
    index("friendships_addressee_idx").on(t.addresseeId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("notifications_user_created_idx").on(t.userId, t.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                 Relations                                  */
/* -------------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  ownedServers: many(servers, { relationName: "server_owner" }),
  memberships: many(serverMembers),
  memberRoles: many(memberRoles),
  messages: many(messages),
  reactions: many(messageReactions),
  mentions: many(messageMentions),
  dmChannels: many(dmParticipants),
  readStates: many(readStates),
  voiceStates: many(voiceStates),
  sentFriendRequests: many(friendships, { relationName: "friend_requester" }),
  receivedFriendRequests: many(friendships, {
    relationName: "friend_addressee",
  }),
  notifications: many(notifications),
  bansIssued: many(serverBans),
  invitesCreated: many(invites),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const serversRelations = relations(servers, ({ one, many }) => ({
  owner: one(users, {
    fields: [servers.ownerId],
    references: [users.id],
    relationName: "server_owner",
  }),
  members: many(serverMembers),
  roles: many(roles),
  channels: many(channels),
  invites: many(invites),
  bans: many(serverBans),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  server: one(servers, {
    fields: [roles.serverId],
    references: [servers.id],
  }),
  members: many(memberRoles),
}));

export const serverMembersRelations = relations(serverMembers, ({ one }) => ({
  server: one(servers, {
    fields: [serverMembers.serverId],
    references: [servers.id],
  }),
  user: one(users, {
    fields: [serverMembers.userId],
    references: [users.id],
  }),
}));

export const memberRolesRelations = relations(memberRoles, ({ one }) => ({
  role: one(roles, {
    fields: [memberRoles.roleId],
    references: [roles.id],
  }),
  user: one(users, {
    fields: [memberRoles.userId],
    references: [users.id],
  }),
}));

export const serverBansRelations = relations(serverBans, ({ one }) => ({
  server: one(servers, {
    fields: [serverBans.serverId],
    references: [servers.id],
  }),
  user: one(users, {
    fields: [serverBans.userId],
    references: [users.id],
  }),
  bannedBy: one(users, {
    fields: [serverBans.bannedById],
    references: [users.id],
  }),
}));

export const invitesRelations = relations(invites, ({ one }) => ({
  server: one(servers, {
    fields: [invites.serverId],
    references: [servers.id],
  }),
  inviter: one(users, {
    fields: [invites.inviterId],
    references: [users.id],
  }),
  channel: one(channels, {
    fields: [invites.channelId],
    references: [channels.id],
  }),
}));

export const channelsRelations = relations(channels, ({ one, many }) => ({
  server: one(servers, {
    fields: [channels.serverId],
    references: [servers.id],
  }),
  parent: one(channels, {
    fields: [channels.parentId],
    references: [channels.id],
    relationName: "channel_parent",
  }),
  children: many(channels, { relationName: "channel_parent" }),
  messages: many(messages),
  permissionOverwrites: many(channelPermissionOverwrites),
  participants: many(dmParticipants),
  readStates: many(readStates),
  voiceStates: many(voiceStates),
}));

export const channelPermissionOverwritesRelations = relations(
  channelPermissionOverwrites,
  ({ one }) => ({
    channel: one(channels, {
      fields: [channelPermissionOverwrites.channelId],
      references: [channels.id],
    }),
  }),
);

export const dmParticipantsRelations = relations(dmParticipants, ({ one }) => ({
  channel: one(channels, {
    fields: [dmParticipants.channelId],
    references: [channels.id],
  }),
  user: one(users, {
    fields: [dmParticipants.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  channel: one(channels, {
    fields: [messages.channelId],
    references: [channels.id],
  }),
  author: one(users, {
    fields: [messages.authorId],
    references: [users.id],
  }),
  replyTo: one(messages, {
    fields: [messages.replyToId],
    references: [messages.id],
    relationName: "message_reply",
  }),
  replies: many(messages, { relationName: "message_reply" }),
  attachments: many(attachments),
  reactions: many(messageReactions),
  mentions: many(messageMentions),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  message: one(messages, {
    fields: [attachments.messageId],
    references: [messages.id],
  }),
}));

export const messageReactionsRelations = relations(
  messageReactions,
  ({ one }) => ({
    message: one(messages, {
      fields: [messageReactions.messageId],
      references: [messages.id],
    }),
    user: one(users, {
      fields: [messageReactions.userId],
      references: [users.id],
    }),
  }),
);

export const messageMentionsRelations = relations(
  messageMentions,
  ({ one }) => ({
    message: one(messages, {
      fields: [messageMentions.messageId],
      references: [messages.id],
    }),
    user: one(users, {
      fields: [messageMentions.userId],
      references: [users.id],
    }),
  }),
);

export const readStatesRelations = relations(readStates, ({ one }) => ({
  user: one(users, {
    fields: [readStates.userId],
    references: [users.id],
  }),
  channel: one(channels, {
    fields: [readStates.channelId],
    references: [channels.id],
  }),
  lastReadMessage: one(messages, {
    fields: [readStates.lastReadMessageId],
    references: [messages.id],
  }),
}));

export const voiceStatesRelations = relations(voiceStates, ({ one }) => ({
  channel: one(channels, {
    fields: [voiceStates.channelId],
    references: [channels.id],
  }),
  user: one(users, {
    fields: [voiceStates.userId],
    references: [users.id],
  }),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  requester: one(users, {
    fields: [friendships.requesterId],
    references: [users.id],
    relationName: "friend_requester",
  }),
  addressee: one(users, {
    fields: [friendships.addresseeId],
    references: [users.id],
    relationName: "friend_addressee",
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Server = typeof servers.$inferSelect;
export type NewServer = typeof servers.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Attachment = typeof attachments.$inferSelect;
export type Reaction = typeof messageReactions.$inferSelect;
export type Friendship = typeof friendships.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type VoiceState = typeof voiceStates.$inferSelect;
