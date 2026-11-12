CREATE TYPE "public"."channel_type" AS ENUM('text', 'voice', 'category', 'announcement', 'forum', 'dm', 'group_dm');--> statement-breakpoint
CREATE TYPE "public"."friendship_status" AS ENUM('pending', 'accepted', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('default', 'system', 'reply');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('mention', 'reply', 'friend_request', 'server_invite', 'system');--> statement-breakpoint
CREATE TYPE "public"."permission_target" AS ENUM('role', 'user');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('online', 'idle', 'dnd', 'offline');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_provider_account_unique" UNIQUE("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"url" text NOT NULL,
	"filename" varchar(255) NOT NULL,
	"content_type" varchar(100),
	"size" integer DEFAULT 0 NOT NULL,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_permission_overwrites" (
	"channel_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"target_type" "permission_target" NOT NULL,
	"allow" bigint DEFAULT 0 NOT NULL,
	"deny" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "channel_permission_overwrites_channel_id_target_id_target_type_pk" PRIMARY KEY("channel_id","target_id","target_type")
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" uuid,
	"name" varchar(100),
	"type" "channel_type" NOT NULL,
	"topic" varchar(1024),
	"position" integer DEFAULT 0 NOT NULL,
	"parent_id" uuid,
	"nsfw" boolean DEFAULT false NOT NULL,
	"slowmode_seconds" integer DEFAULT 0 NOT NULL,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channels_server_required" CHECK (("channels"."type" in ('dm', 'group_dm')) = ("channels"."server_id" is null))
);
--> statement-breakpoint
CREATE TABLE "dm_participants" (
	"channel_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dm_participants_channel_id_user_id_pk" PRIMARY KEY("channel_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"addressee_id" uuid NOT NULL,
	"status" "friendship_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friendships_pair_unique" UNIQUE("requester_id","addressee_id"),
	CONSTRAINT "friendships_no_self" CHECK ("friendships"."requester_id" <> "friendships"."addressee_id")
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(16) NOT NULL,
	"server_id" uuid NOT NULL,
	"inviter_id" uuid,
	"channel_id" uuid,
	"max_uses" integer DEFAULT 0 NOT NULL,
	"uses" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invites_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "member_roles" (
	"role_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_roles_role_id_user_id_pk" PRIMARY KEY("role_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "message_mentions" (
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "message_mentions_message_id_user_id_pk" PRIMARY KEY("message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "message_reactions" (
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"emoji" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_reactions_message_id_user_id_emoji_pk" PRIMARY KEY("message_id","user_id","emoji")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"author_id" uuid,
	"content" text DEFAULT '' NOT NULL,
	"type" "message_type" DEFAULT 'default' NOT NULL,
	"reply_to_id" uuid,
	"pinned" boolean DEFAULT false NOT NULL,
	"pinned_at" timestamp with time zone,
	"edited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "read_states" (
	"user_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"last_read_message_id" uuid,
	"mention_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "read_states_user_id_channel_id_pk" PRIMARY KEY("user_id","channel_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"permissions" bigint DEFAULT 0 NOT NULL,
	"is_everyone" boolean DEFAULT false NOT NULL,
	"hoist" boolean DEFAULT false NOT NULL,
	"mentionable" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "server_bans" (
	"server_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reason" varchar(300),
	"banned_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "server_bans_server_id_user_id_pk" PRIMARY KEY("server_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "server_members" (
	"server_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"nickname" varchar(32),
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "server_members_server_id_user_id_pk" PRIMARY KEY("server_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(300),
	"icon_url" text,
	"banner_url" text,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" varchar(64),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(32) NOT NULL,
	"display_name" varchar(32) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"avatar_url" text,
	"banner_url" text,
	"bio" varchar(190),
	"status" "user_status" DEFAULT 'offline' NOT NULL,
	"custom_status" varchar(128),
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "voice_states" (
	"channel_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" text NOT NULL,
	"self_mute" boolean DEFAULT false NOT NULL,
	"self_deaf" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voice_states_channel_id_user_id_pk" PRIMARY KEY("channel_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_permission_overwrites" ADD CONSTRAINT "channel_permission_overwrites_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_parent_id_channels_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_participants" ADD CONSTRAINT "dm_participants_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_participants" ADD CONSTRAINT "dm_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_users_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_mentions" ADD CONSTRAINT "message_mentions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_mentions" ADD CONSTRAINT "message_mentions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_to_id_messages_id_fk" FOREIGN KEY ("reply_to_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "read_states" ADD CONSTRAINT "read_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "read_states" ADD CONSTRAINT "read_states_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "read_states" ADD CONSTRAINT "read_states_last_read_message_id_messages_id_fk" FOREIGN KEY ("last_read_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_bans" ADD CONSTRAINT "server_bans_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_bans" ADD CONSTRAINT "server_bans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_bans" ADD CONSTRAINT "server_bans_banned_by_id_users_id_fk" FOREIGN KEY ("banned_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_members" ADD CONSTRAINT "server_members_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_members" ADD CONSTRAINT "server_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servers" ADD CONSTRAINT "servers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_states" ADD CONSTRAINT "voice_states_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_states" ADD CONSTRAINT "voice_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "attachments_message_idx" ON "attachments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "channels_server_position_idx" ON "channels" USING btree ("server_id","position");--> statement-breakpoint
CREATE INDEX "dm_participants_user_idx" ON "dm_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "friendships_addressee_idx" ON "friendships" USING btree ("addressee_id");--> statement-breakpoint
CREATE INDEX "invites_server_idx" ON "invites" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "member_roles_user_idx" ON "member_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "messages_channel_created_idx" ON "messages" USING btree ("channel_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_author_idx" ON "messages" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "read_states_channel_idx" ON "read_states" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "roles_server_position_idx" ON "roles" USING btree ("server_id","position");--> statement-breakpoint
CREATE INDEX "server_members_user_idx" ON "server_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "servers_owner_idx" ON "servers" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");