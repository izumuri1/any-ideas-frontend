-- ============================
-- Supabase Schema Export (Part 1: Tables, RLS, Indexes)
-- Date: 2025-10-04
-- Description: Any Ideas アプリケーション - テーブル定義とRLS設定
-- ============================

-- ============================
-- テーブル定義
-- ============================

CREATE TABLE public.activity_logs (
    target_id uuid NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    user_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    target_type varchar(50) NOT NULL,
    action_type varchar(100) NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metadata jsonb
);

CREATE TABLE public.admin_idea_likes_summary (
    workspace_id uuid,
    idea_created_at timestamp,
    liked_by_users _varchar,
    workspace_name varchar(255),
    idea_name varchar(100),
    total_likes int8
);

CREATE TABLE public.ai_usage_quotas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    updated_at timestamp DEFAULT now(),
    created_at timestamp DEFAULT now(),
    daily_count int4 DEFAULT 0 NOT NULL,
    usage_date date NOT NULL,
    user_id uuid NOT NULL
);

CREATE TABLE public.idea_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    idea_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE public.ideas (
    idea_name varchar(100) NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    creator_id uuid NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL,
    moved_to_thinking_at timestamp,
    moved_to_trying_at timestamp,
    deleted_at timestamp,
    when_text varchar(500),
    who_text varchar(500),
    what_text varchar(500) NOT NULL,
    status varchar(50) DEFAULT 'our_ideas'::character varying NOT NULL
);

CREATE TABLE public.ideas_with_like_counts (
    created_at timestamp,
    updated_at timestamp,
    moved_to_thinking_at timestamp,
    moved_to_trying_at timestamp,
    deleted_at timestamp,
    like_count int8,
    what_text varchar(500),
    who_text varchar(500),
    status varchar(50),
    when_text varchar(500),
    idea_name varchar(100),
    creator_username varchar(100),
    id uuid,
    workspace_id uuid,
    creator_id uuid
);

CREATE TABLE public.invitation_tokens (
    created_by uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token varchar(64) NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    is_active bool DEFAULT true NOT NULL,
    used_at timestamp,
    used_by uuid,
    used_count int4 DEFAULT 0 NOT NULL,
    max_uses int4 DEFAULT 1 NOT NULL,
    expires_at timestamp NOT NULL,
    workspace_id uuid NOT NULL
);

CREATE TABLE public.notifications (
    type text NOT NULL,
    message text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    is_read bool DEFAULT false NOT NULL,
    related_id uuid,
    actor_user_id uuid NOT NULL,
    user_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);

CREATE TABLE public.profiles (
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL,
    last_workspace_accessed_at timestamp,
    id uuid NOT NULL,
    default_workspace_id uuid,
    last_workspace_id uuid,
    username varchar(100) NOT NULL
);

CREATE TABLE public.proposal_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    proposal_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE public.proposals (
    budget_text varchar(500),
    deleted_at timestamp,
    idea_id uuid NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    is_adopted bool DEFAULT false NOT NULL,
    todo_text varchar(500),
    not_todo_text varchar(500),
    content text NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL,
    adopted_at timestamp,
    adopted_by uuid,
    end_date date,
    start_date date,
    proposer_id uuid NOT NULL,
    proposal_type varchar(50) NOT NULL
);

CREATE TABLE public.rate_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    window_start timestamptz DEFAULT now() NOT NULL,
    action_type text NOT NULL,
    request_count int4 DEFAULT 1 NOT NULL
);

CREATE TABLE public.workspace_members (
    user_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    joined_at timestamp DEFAULT now() NOT NULL,
    invited_by uuid,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role varchar(50) DEFAULT 'member'::character varying NOT NULL
);

CREATE TABLE public.workspaces (
    name varchar(255) NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    is_active bool DEFAULT true NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
);

-- ============================
-- 主キー制約
-- ============================

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ai_usage_quotas
    ADD CONSTRAINT ai_usage_quotas_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.idea_likes
    ADD CONSTRAINT idea_likes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ideas
    ADD CONSTRAINT ideas_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.invitation_tokens
    ADD CONSTRAINT invitation_tokens_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.proposal_likes
    ADD CONSTRAINT proposal_likes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);

-- ============================
-- インデックス
-- ============================

CREATE UNIQUE INDEX activity_logs_pkey ON public.activity_logs USING btree (id);
CREATE INDEX idx_activity_logs_action_type ON public.activity_logs USING btree (action_type);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs USING btree (created_at);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs USING btree (user_id);
CREATE INDEX idx_activity_logs_workspace_id ON public.activity_logs USING btree (workspace_id);
CREATE UNIQUE INDEX ai_usage_quotas_pkey ON public.ai_usage_quotas USING btree (id);
CREATE UNIQUE INDEX ai_usage_quotas_user_id_usage_date_key ON public.ai_usage_quotas USING btree (user_id, usage_date);
CREATE INDEX idx_ai_usage_quotas_user_date ON public.ai_usage_quotas USING btree (user_id, usage_date);
CREATE UNIQUE INDEX idea_likes_idea_id_user_id_key ON public.idea_likes USING btree (idea_id, user_id);
CREATE UNIQUE INDEX idea_likes_pkey ON public.idea_likes USING btree (id);
CREATE INDEX idx_idea_likes_created_at ON public.idea_likes USING btree (created_at DESC);
CREATE INDEX idx_idea_likes_idea_id ON public.idea_likes USING btree (idea_id);
CREATE INDEX idx_idea_likes_user_id ON public.idea_likes USING btree (user_id);
CREATE UNIQUE INDEX ideas_pkey ON public.ideas USING btree (id);
CREATE INDEX idx_ideas_creator_id ON public.ideas USING btree (creator_id);
CREATE INDEX idx_ideas_deleted_at ON public.ideas USING btree (deleted_at);
CREATE INDEX idx_ideas_workspace_id ON public.ideas USING btree (workspace_id);
CREATE INDEX idx_ideas_workspace_status_deleted ON public.ideas USING btree (workspace_id, status) WHERE (deleted_at IS NULL);
CREATE INDEX idx_invitation_tokens_created_by ON public.invitation_tokens USING btree (created_by);
CREATE INDEX idx_invitation_tokens_expires_at ON public.invitation_tokens USING btree (expires_at);
CREATE INDEX idx_invitation_tokens_is_active ON public.invitation_tokens USING btree (is_active);
CREATE INDEX idx_invitation_tokens_token ON public.invitation_tokens USING btree (token);
CREATE INDEX idx_invitation_tokens_workspace_id ON public.invitation_tokens USING btree (workspace_id);
CREATE UNIQUE INDEX invitation_tokens_pkey ON public.invitation_tokens USING btree (id);
CREATE UNIQUE INDEX invitation_tokens_token_key ON public.invitation_tokens USING btree (token);
CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);
CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, is_read);
CREATE INDEX idx_notifications_user_workspace ON public.notifications USING btree (user_id, workspace_id);
CREATE INDEX idx_notifications_user_workspace_created ON public.notifications USING btree (user_id, workspace_id, created_at DESC);
CREATE INDEX idx_notifications_workspace ON public.notifications USING btree (workspace_id);
CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);
CREATE INDEX idx_profiles_default_workspace_id ON public.profiles USING btree (default_workspace_id);
CREATE INDEX idx_profiles_last_workspace_id ON public.profiles USING btree (last_workspace_id);
CREATE INDEX idx_profiles_username ON public.profiles USING btree (username);
CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);
CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username);
CREATE INDEX idx_proposal_likes_proposal_id ON public.proposal_likes USING btree (proposal_id);
CREATE INDEX idx_proposal_likes_user_id ON public.proposal_likes USING btree (user_id);
CREATE UNIQUE INDEX proposal_likes_pkey ON public.proposal_likes USING btree (id);
CREATE UNIQUE INDEX proposal_likes_proposal_id_user_id_key ON public.proposal_likes USING btree (proposal_id, user_id);
CREATE INDEX idx_proposals_deleted_at ON public.proposals USING btree (deleted_at);
CREATE INDEX idx_proposals_idea_adopted_deleted ON public.proposals USING btree (idea_id, is_adopted) WHERE (deleted_at IS NULL);
CREATE INDEX idx_proposals_idea_deleted ON public.proposals USING btree (idea_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_proposals_idea_id ON public.proposals USING btree (idea_id);
CREATE INDEX idx_proposals_proposer_id ON public.proposals USING btree (proposer_id);
CREATE UNIQUE INDEX proposals_pkey ON public.proposals USING btree (id);
CREATE INDEX idx_rate_limits_user_action ON public.rate_limits USING btree (user_id, action_type, window_start);
CREATE INDEX idx_rate_limits_window_start ON public.rate_limits USING btree (window_start);
CREATE UNIQUE INDEX rate_limits_pkey ON public.rate_limits USING btree (id);
CREATE UNIQUE INDEX rate_limits_user_id_action_type_window_start_key ON public.rate_limits USING btree (user_id, action_type, window_start);
CREATE INDEX idx_workspace_members_user_id ON public.workspace_members USING btree (user_id);
CREATE INDEX idx_workspace_members_workspace_id ON public.workspace_members USING btree (workspace_id);
CREATE UNIQUE INDEX workspace_members_pkey ON public.workspace_members USING btree (id);
CREATE UNIQUE INDEX workspace_members_workspace_id_user_id_key ON public.workspace_members USING btree (workspace_id, user_id);
CREATE INDEX idx_workspaces_is_active ON public.workspaces USING btree (is_active);
CREATE INDEX idx_workspaces_owner_id ON public.workspaces USING btree (owner_id);
CREATE UNIQUE INDEX workspaces_pkey ON public.workspaces USING btree (id);

-- ============================
-- RLSポリシー定義
-- ============================

-- activity_logs policies
CREATE POLICY "Workspace members can view activity logs"
    ON public.activity_logs
    FOR SELECT
    USING ((workspace_id IN ( SELECT workspace_members.workspace_id
   FROM workspace_members
  WHERE (workspace_members.user_id = auth.uid()))));

-- ai_usage_quotas policies
CREATE POLICY "Users can insert own usage"
    ON public.ai_usage_quotas
    FOR INSERT
    USING (true)
    WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update own usage"
    ON public.ai_usage_quotas
    FOR UPDATE
    USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own usage"
    ON public.ai_usage_quotas
    FOR SELECT
    USING ((auth.uid() = user_id));

-- idea_likes policies
CREATE POLICY "Users can delete own likes"
    ON public.idea_likes
    FOR DELETE
    USING ((auth.uid() = user_id));

CREATE POLICY "Workspace members can like ideas"
    ON public.idea_likes
    FOR INSERT
    USING (true)
    WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM (ideas i
     JOIN workspace_members wm ON ((i.workspace_id = wm.workspace_id)))
  WHERE ((i.id = idea_likes.idea_id) AND (wm.user_id = auth.uid()))))));

CREATE POLICY "Workspace members can manage idea likes"
    ON public.idea_likes
    FOR ALL
    USING ((idea_id IN ( SELECT i.id
   FROM (ideas i
     JOIN workspace_members wm ON ((i.workspace_id = wm.workspace_id)))
  WHERE ((wm.user_id = auth.uid()) AND (i.deleted_at IS NULL)))));

CREATE POLICY "Workspace members can view idea likes"
    ON public.idea_likes
    FOR SELECT
    USING ((EXISTS ( SELECT 1
   FROM (ideas i
     JOIN workspace_members wm ON ((i.workspace_id = wm.workspace_id)))
  WHERE ((i.id = idea_likes.idea_id) AND (wm.user_id = auth.uid())))));

-- ideas policies
CREATE POLICY "Idea owners can delete ideas"
    ON public.ideas
    FOR DELETE
    USING (((creator_id = auth.uid()) AND (workspace_id IN ( SELECT workspace_members.workspace_id
   FROM workspace_members
  WHERE (workspace_members.user_id = auth.uid())))));

CREATE POLICY "Idea owners can update ideas"
    ON public.ideas
    FOR UPDATE
    USING (((creator_id = auth.uid()) AND (workspace_id IN ( SELECT workspace_members.workspace_id
   FROM workspace_members
  WHERE (workspace_members.user_id = auth.uid())))))
    WITH CHECK (((creator_id = auth.uid()) AND (workspace_id IN ( SELECT workspace_members.workspace_id
   FROM workspace_members
  WHERE (workspace_members.user_id = auth.uid())))));

CREATE POLICY "Workspace members can create ideas"
    ON public.ideas
    FOR INSERT
    USING (true)
    WITH CHECK (((workspace_id IN ( SELECT workspace_members.workspace_id
   FROM workspace_members
  WHERE (workspace_members.user_id = auth.uid()))) AND (creator_id = auth.uid())));

CREATE POLICY "Workspace members can view active ideas"
    ON public.ideas
    FOR SELECT
    USING (((workspace_id IN ( SELECT workspace_members.workspace_id
   FROM workspace_members
  WHERE (workspace_members.user_id = auth.uid()))) AND (deleted_at IS NULL)));

-- invitation_tokens policies
CREATE POLICY "Allow anonymous read for active tokens"
    ON public.invitation_tokens
    FOR SELECT
    USING (((is_active = true) AND (expires_at > now())));

CREATE POLICY "Token creators can update tokens"
    ON public.invitation_tokens
    FOR UPDATE
    USING ((created_by = auth.uid()));

CREATE POLICY "Workspace members can view invitation tokens"
    ON public.invitation_tokens
    FOR SELECT
    USING ((workspace_id IN ( SELECT workspace_members.workspace_id
   FROM workspace_members
  WHERE (workspace_members.user_id = auth.uid()))));

CREATE POLICY "Workspace owners can create invitation tokens"
    ON public.invitation_tokens
    FOR INSERT
    USING (true)
    WITH CHECK ((workspace_id IN ( SELECT workspaces.id
   FROM workspaces
  WHERE (workspaces.owner_id = auth.uid()))));

-- notifications policies
CREATE POLICY "Users can delete their own notifications"
    ON public.notifications
    FOR DELETE
    USING (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM workspace_members
  WHERE ((workspace_members.workspace_id = notifications.workspace_id) AND (workspace_members.user_id = auth.uid()))))));

CREATE POLICY "Users can update their own notifications"
    ON public.notifications
    FOR UPDATE
    USING (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM workspace_members
  WHERE ((workspace_members.workspace_id = notifications.workspace_id) AND (workspace_members.user_id = auth.uid()))))));

CREATE POLICY "Users can view their own notifications"
    ON public.notifications
    FOR SELECT
    USING (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM workspace_members
  WHERE ((workspace_members.workspace_id = notifications.workspace_id) AND (workspace_members.user_id = auth.uid()))))));

CREATE POLICY "Workspace members can create notifications"
    ON public.notifications
    FOR INSERT
    USING (true)
    WITH CHECK (((actor_user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM workspace_members
  WHERE ((workspace_members.workspace_id = notifications.workspace_id) AND (workspace_members.user_id = auth.uid()))))));

-- profiles policies
CREATE POLICY "profiles_own_update"
    ON public.profiles
    FOR UPDATE
    USING ((id = auth.uid()))
    WITH CHECK ((id = auth.uid()));

CREATE POLICY "profiles_public_read"
    ON public.profiles
    FOR SELECT
    USING (true);

-- proposal_likes policies
CREATE POLICY "Workspace members can manage proposal likes"
    ON public.proposal_likes
    FOR ALL
    USING ((proposal_id IN ( SELECT p.id
   FROM ((proposals p
     JOIN ideas i ON ((p.idea_id = i.id)))
     JOIN workspace_members wm ON ((i.workspace_id = wm.workspace_id)))
  WHERE ((wm.user_id = auth.uid()) AND (p.deleted_at IS NULL) AND (i.deleted_at IS NULL)))));

-- proposals policies
CREATE POLICY "Idea owners can adopt proposals"
    ON public.proposals
    FOR UPDATE
    USING ((EXISTS ( SELECT 1
   FROM ideas
  WHERE ((ideas.id = proposals.idea_id) AND (ideas.creator_id = auth.uid())))));

CREATE POLICY "Proposers can delete own proposals"
    ON public.proposals
    FOR UPDATE
    USING ((proposer_id = auth.uid()));

CREATE POLICY "Workspace members can create proposals"
    ON public.proposals
    FOR INSERT
    USING (true)
    WITH CHECK ((idea_id IN ( SELECT i.id
   FROM (ideas i
     JOIN workspace_members wm ON ((i.workspace_id = wm.workspace_id)))
  WHERE ((wm.user_id = auth.uid()) AND (i.deleted_at IS NULL)))));

CREATE POLICY "Workspace members can view all proposals"
    ON public.proposals
    FOR SELECT
    USING ((idea_id IN ( SELECT i.id
   FROM (ideas i
     JOIN workspace_members wm ON ((i.workspace_id = wm.workspace_id)))
  WHERE ((wm.user_id = auth.uid()) AND (i.deleted_at IS NULL)))));

-- workspace_members policies
CREATE POLICY "workspace_members_safe_view"
    ON public.workspace_members
    FOR SELECT
    USING (((user_id = auth.uid()) OR (workspace_id IN ( SELECT w.id
   FROM workspaces w
  WHERE (w.owner_id = auth.uid())))));

CREATE POLICY "workspace_members_self_delete"
    ON public.workspace_members
    FOR DELETE
    USING ((user_id = auth.uid()));

CREATE POLICY "workspace_members_self_insert"
    ON public.workspace_members
    FOR INSERT
    USING (true)
    WITH CHECK ((user_id = auth.uid()));

-- workspaces policies
CREATE POLICY "Public read for invited workspaces"
    ON public.workspaces
    FOR SELECT
    USING (true);

CREATE POLICY "workspaces_owner_full_access"
    ON public.workspaces
    FOR ALL
    USING ((owner_id = ( SELECT auth.uid() AS uid)))
    WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));

-- ============================
-- RLS有効化
-- ============================

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;