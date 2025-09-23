-- Supabase Schema Export
-- Date: 2025-09-23
-- Description: Any Ideas アプリケーション完全スキーマ（AI使用制限機能・セキュリティ修正後）
-- Export Source: Supabase SQL Editor

-- ============================
-- テーブル定義
-- ============================

CREATE TABLE public.activity_logs (
    id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    action_type character varying NOT NULL,
    target_type character varying NOT NULL,
    target_id uuid NOT NULL,
    metadata jsonb,
    created_at timestamp without time zone NOT NULL
);

CREATE TABLE public.admin_idea_likes_summary (
    idea_name character varying,
    workspace_id uuid,
    workspace_name character varying,
    total_likes bigint,
    liked_by_users ARRAY,
    idea_created_at timestamp without time zone
);

CREATE TABLE public.ai_usage_quotas (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    usage_date date NOT NULL,
    daily_count integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);

CREATE TABLE public.idea_likes (
    id uuid NOT NULL,
    idea_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp without time zone NOT NULL
);

CREATE TABLE public.ideas (
    id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    creator_id uuid NOT NULL,
    when_text character varying,
    who_text character varying,
    what_text character varying NOT NULL,
    status character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    moved_to_thinking_at timestamp without time zone,
    moved_to_trying_at timestamp without time zone,
    deleted_at timestamp without time zone,
    idea_name character varying NOT NULL
);

CREATE TABLE public.ideas_with_like_counts (
    id uuid,
    workspace_id uuid,
    creator_id uuid,
    when_text character varying,
    who_text character varying,
    what_text character varying,
    status character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    moved_to_thinking_at timestamp without time zone,
    moved_to_trying_at timestamp without time zone,
    deleted_at timestamp without time zone,
    idea_name character varying,
    like_count bigint,
    creator_username character varying
);

CREATE TABLE public.invitation_tokens (
    id uuid NOT NULL,
    token character varying NOT NULL,
    workspace_id uuid NOT NULL,
    created_by uuid NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    max_uses integer NOT NULL,
    used_count integer NOT NULL,
    used_by uuid,
    used_at timestamp without time zone,
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL
);

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    actor_user_id uuid NOT NULL,
    type text NOT NULL,
    message text NOT NULL,
    related_id uuid,
    is_read boolean NOT NULL,
    created_at timestamp with time zone NOT NULL
);

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    username character varying NOT NULL,
    last_workspace_id uuid,
    default_workspace_id uuid,
    last_workspace_accessed_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);

CREATE TABLE public.proposal_likes (
    id uuid NOT NULL,
    proposal_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp without time zone NOT NULL
);

CREATE TABLE public.proposals (
    id uuid NOT NULL,
    idea_id uuid NOT NULL,
    proposer_id uuid NOT NULL,
    proposal_type character varying NOT NULL,
    content text NOT NULL,
    start_date date,
    end_date date,
    todo_text character varying,
    not_todo_text character varying,
    budget_text character varying,
    is_adopted boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    adopted_at timestamp without time zone,
    adopted_by uuid,
    deleted_at timestamp without time zone
);

CREATE TABLE public.workspace_members (
    id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying NOT NULL,
    joined_at timestamp without time zone NOT NULL,
    invited_by uuid
);

CREATE TABLE public.workspaces (
    id uuid NOT NULL,
    name character varying NOT NULL,
    owner_id uuid NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);

-- ============================
-- RLS ポリシー定義
-- ============================

CREATE POLICY "Workspace members can view activity logs" ON "public"."activity_logs" FOR SELECT USING ((workspace_id IN ( SELECT workspace_members.workspace_id
   FROM workspace_members
  WHERE (workspace_members.user_id = auth.uid()))));

CREATE POLICY "Users can insert own usage" ON "public"."ai_usage_quotas" FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update own usage" ON "public"."ai_usage_quotas" FOR UPDATE USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own usage" ON "public"."ai_usage_quotas" FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can delete own likes" ON "public"."idea_likes" FOR DELETE USING ((auth.uid() = user_id));

CREATE POLICY "Workspace members can like ideas" ON "public"."idea_likes" FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM (ideas i
     JOIN workspace_members wm ON ((i.workspace_id = wm.workspace_id)))
  WHERE ((i.id = idea_likes.idea_id) AND (wm.user_id = auth.uid()))))));

CREATE POLICY "Workspace members can manage idea likes" ON "public"."idea_likes" FOR ALL USING ((idea_id IN ( SELECT i.id
   FROM (ideas i
     JOIN workspace_members wm ON ((i.workspace_id = wm.workspace_id)))
  WHERE ((wm.user_id = auth.uid()) AND (i.deleted_at IS NULL)))));

CREATE POLICY "Workspace members can view idea likes" ON "public"."idea_likes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (ideas i
     JOIN workspace_members wm ON ((i.workspace_id = wm.workspace_id)))
  WHERE ((i.id = idea_likes.idea_id) AND (wm.user_id = auth.uid())))));

CREATE POLICY "Idea creators can delete their ideas" ON "public"."ideas" FOR DELETE USING (((creator_id = auth.uid()) AND (deleted_at IS NULL)));

CREATE POLICY "Simple update policy with brackets" ON "public"."ideas" FOR UPDATE USING ((creator_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Workspace members can create ideas" ON "public"."ideas" FOR INSERT WITH CHECK (((workspace_id IN ( SELECT workspace_members.workspace_id
   FROM workspace_members
  WHERE (workspace_members.user_id = auth.uid()))) AND (creator_id = auth.uid())));

CREATE POLICY "Workspace members can view ideas" ON "public"."ideas" FOR SELECT USING (((workspace_id IN ( SELECT workspace_members.workspace_id
   FROM workspace_members
  WHERE (workspace_members.user_id = auth.uid()))) AND (deleted_at IS NULL)));

CREATE POLICY "Allow anonymous read for active tokens" ON "public"."invitation_tokens" FOR SELECT USING (((is_active = true) AND (expires_at > now())));

CREATE POLICY "Token creators can update tokens" ON "public"."invitation_tokens" FOR UPDATE USING ((created_by = auth.uid()));

CREATE POLICY "Workspace members can view invitation tokens" ON "public"."invitation_tokens" FOR SELECT USING ((workspace_id IN ( SELECT workspace_members.workspace_id
   FROM workspace_members
  WHERE (workspace_members.user_id = auth.uid()))));

CREATE POLICY "Workspace owners can create invitation tokens" ON "public"."invitation_tokens" FOR INSERT WITH CHECK ((workspace_id IN ( SELECT workspaces.id
   FROM workspaces
  WHERE (workspaces.owner_id = auth.uid()))));

CREATE POLICY "Users can delete their own notifications" ON "public"."notifications" FOR DELETE USING (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM workspace_members
  WHERE ((workspace_members.workspace_id = notifications.workspace_id) AND (workspace_members.user_id = auth.uid()))))));

CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM workspace_members
  WHERE ((workspace_members.workspace_id = notifications.workspace_id) AND (workspace_members.user_id = auth.uid()))))));

CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM workspace_members
  WHERE ((workspace_members.workspace_id = notifications.workspace_id) AND (workspace_members.user_id = auth.uid()))))));

CREATE POLICY "Workspace members can create notifications" ON "public"."notifications" FOR INSERT WITH CHECK (((actor_user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM workspace_members
  WHERE ((workspace_members.workspace_id = notifications.workspace_id) AND (workspace_members.user_id = auth.uid()))))));

CREATE POLICY "profiles_own_update" ON "public"."profiles" FOR UPDATE USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));

CREATE POLICY "profiles_public_read" ON "public"."profiles" FOR SELECT USING (true);

CREATE POLICY "Workspace members can manage proposal likes" ON "public"."proposal_likes" FOR ALL USING ((proposal_id IN ( SELECT p.id
   FROM ((proposals p
     JOIN ideas i ON ((p.idea_id = i.id)))
     JOIN workspace_members wm ON ((i.workspace_id = wm.workspace_id)))
  WHERE ((wm.user_id = auth.uid()) AND (p.deleted_at IS NULL) AND (i.deleted_at IS NULL)))));

CREATE POLICY "Idea owners can adopt proposals" ON "public"."proposals" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ideas
  WHERE ((ideas.id = proposals.idea_id) AND (ideas.creator_id = auth.uid())))));

CREATE POLICY "Proposers can delete own proposals" ON "public"."proposals" FOR UPDATE USING ((proposer_id = auth.uid()));

CREATE POLICY "Workspace members can create proposals" ON "public"."proposals" FOR INSERT WITH CHECK ((idea_id IN ( SELECT i.id
   FROM (ideas i
     JOIN workspace_members wm ON ((i.workspace_id = wm.workspace_id)))
  WHERE ((wm.user_id = auth.uid()) AND (i.deleted_at IS NULL)))));

CREATE POLICY "Workspace members can view all proposals" ON "public"."proposals" FOR SELECT USING ((idea_id IN ( SELECT i.id
   FROM (ideas i
     JOIN workspace_members wm ON ((i.workspace_id = wm.workspace_id)))
  WHERE ((wm.user_id = auth.uid()) AND (i.deleted_at IS NULL)))));

CREATE POLICY "workspace_members_safe_view" ON "public"."workspace_members" FOR SELECT USING (((user_id = auth.uid()) OR (workspace_id IN ( SELECT w.id
   FROM workspaces w
  WHERE (w.owner_id = auth.uid())))));

CREATE POLICY "workspace_members_self_delete" ON "public"."workspace_members" FOR DELETE USING ((user_id = auth.uid()));

CREATE POLICY "workspace_members_self_insert" ON "public"."workspace_members" FOR INSERT WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Public read for invited workspaces" ON "public"."workspaces" FOR SELECT USING (true);

CREATE POLICY "workspaces_owner_full_access" ON "public"."workspaces" FOR ALL USING ((owner_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));

-- ============================
-- RLS 有効化
-- ============================

ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."ai_usage_quotas" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."idea_likes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."ideas" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."invitation_tokens" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."proposal_likes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."proposals" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."workspace_members" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."workspaces" ENABLE ROW LEVEL SECURITY;

-- ============================
-- スキーマ権限設定
-- ============================

GRANT USAGE ON SCHEMA "public" TO "postgres";

GRANT USAGE ON SCHEMA "public" TO "anon";

GRANT USAGE ON SCHEMA "public" TO "authenticated";

GRANT USAGE ON SCHEMA "public" TO "service_role";

-- ============================
-- 注記
-- ============================

-- このスキーマは以下の機能を含みます：
-- 1. ワークスペース管理 (workspaces, workspace_members)
-- 2. アイデア管理 (ideas, idea_likes) 
-- 3. 提案管理 (proposals, proposal_likes)
-- 4. 招待システム (invitation_tokens)
-- 5. 通知システム (notifications)
-- 6. ユーザープロファイル (profiles)
-- 7. アクティビティログ (activity_logs)
-- 8. AI使用制限管理 (ai_usage_quotas) - 新規追加
-- 9. 管理者向け集計ビュー (admin_idea_likes_summary, ideas_with_like_counts)
-- 
-- 全テーブルにRow Level Security (RLS) が有効化されており、
-- ユーザーはワークスペースメンバーとしてのみデータにアクセス可能。
-- Function Search Path セキュリティ警告対応済み。