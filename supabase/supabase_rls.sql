-- Supabase RLS (Row Level Security) ポリシー設定
-- Any Ideas アプリケーション用セキュリティ設定
-- 書き出し日時: 2025-09-21

-- ===========================
-- RLS ポリシー定義
-- ===========================

CREATE POLICY "Workspace members can view activity logs" ON "public"."activity_logs" FOR SELECT USING ((workspace_id IN ( SELECT workspace_members.workspace_id
   FROM workspace_members
  WHERE (workspace_members.user_id = auth.uid()))));

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

-- ===========================
-- RLS 有効化
-- ===========================

ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."idea_likes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."invitation_tokens" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."proposal_likes" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."proposals" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."workspace_members" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."workspaces" ENABLE ROW LEVEL SECURITY;

-- ===========================
-- スキーマ権限設定
-- ===========================

GRANT USAGE ON SCHEMA "public" TO "postgres";

GRANT USAGE ON SCHEMA "public" TO "anon";

GRANT USAGE ON SCHEMA "public" TO "authenticated";

GRANT USAGE ON SCHEMA "public" TO "service_role";