

CREATE POLICY "Allow anonymous read for active tokens" ON "public"."invitation_tokens" FOR SELECT USING ((("is_active" = true) AND ("expires_at" > "now"())));



CREATE POLICY "Idea creators can delete their ideas" ON "public"."ideas" FOR DELETE USING ((("creator_id" = "auth"."uid"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "Idea owners can adopt any proposal" ON "public"."proposals" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."ideas"
  WHERE (("ideas"."id" = "proposals"."idea_id") AND ("ideas"."creator_id" = "auth"."uid"())))) OR (("proposer_id" = "auth"."uid"()) AND ("deleted_at" IS NULL))));



CREATE POLICY "Public read for invited workspaces" ON "public"."workspaces" FOR SELECT USING (true);



CREATE POLICY "Simple update policy with brackets" ON "public"."ideas" FOR UPDATE USING (("creator_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Token creators can update tokens" ON "public"."invitation_tokens" FOR UPDATE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Users can delete own likes" ON "public"."idea_likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own notifications" ON "public"."notifications" FOR DELETE USING ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."workspace_id" = "notifications"."workspace_id") AND ("workspace_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."workspace_id" = "notifications"."workspace_id") AND ("workspace_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."workspace_id" = "notifications"."workspace_id") AND ("workspace_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Workspace members can create ideas" ON "public"."ideas" FOR INSERT WITH CHECK ((("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE ("workspace_members"."user_id" = "auth"."uid"()))) AND ("creator_id" = "auth"."uid"())));



CREATE POLICY "Workspace members can create notifications" ON "public"."notifications" FOR INSERT WITH CHECK ((("actor_user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."workspace_members"
  WHERE (("workspace_members"."workspace_id" = "notifications"."workspace_id") AND ("workspace_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Workspace members can create proposals" ON "public"."proposals" FOR INSERT WITH CHECK (("idea_id" IN ( SELECT "i"."id"
   FROM ("public"."ideas" "i"
     JOIN "public"."workspace_members" "wm" ON (("i"."workspace_id" = "wm"."workspace_id")))
  WHERE (("wm"."user_id" = "auth"."uid"()) AND ("i"."deleted_at" IS NULL)))));



CREATE POLICY "Workspace members can like ideas" ON "public"."idea_likes" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM ("public"."ideas" "i"
     JOIN "public"."workspace_members" "wm" ON (("i"."workspace_id" = "wm"."workspace_id")))
  WHERE (("i"."id" = "idea_likes"."idea_id") AND ("wm"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Workspace members can manage idea likes" ON "public"."idea_likes" USING (("idea_id" IN ( SELECT "i"."id"
   FROM ("public"."ideas" "i"
     JOIN "public"."workspace_members" "wm" ON (("i"."workspace_id" = "wm"."workspace_id")))
  WHERE (("wm"."user_id" = "auth"."uid"()) AND ("i"."deleted_at" IS NULL)))));



CREATE POLICY "Workspace members can manage proposal likes" ON "public"."proposal_likes" USING (("proposal_id" IN ( SELECT "p"."id"
   FROM (("public"."proposals" "p"
     JOIN "public"."ideas" "i" ON (("p"."idea_id" = "i"."id")))
     JOIN "public"."workspace_members" "wm" ON (("i"."workspace_id" = "wm"."workspace_id")))
  WHERE (("wm"."user_id" = "auth"."uid"()) AND ("p"."deleted_at" IS NULL) AND ("i"."deleted_at" IS NULL)))));



CREATE POLICY "Workspace members can view activity logs" ON "public"."activity_logs" FOR SELECT USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE ("workspace_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Workspace members can view all proposals" ON "public"."proposals" FOR SELECT USING (("idea_id" IN ( SELECT "i"."id"
   FROM ("public"."ideas" "i"
     JOIN "public"."workspace_members" "wm" ON (("i"."workspace_id" = "wm"."workspace_id")))
  WHERE (("wm"."user_id" = "auth"."uid"()) AND ("i"."deleted_at" IS NULL)))));



CREATE POLICY "Workspace members can view idea likes" ON "public"."idea_likes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."ideas" "i"
     JOIN "public"."workspace_members" "wm" ON (("i"."workspace_id" = "wm"."workspace_id")))
  WHERE (("i"."id" = "idea_likes"."idea_id") AND ("wm"."user_id" = "auth"."uid"())))));



CREATE POLICY "Workspace members can view ideas" ON "public"."ideas" FOR SELECT USING ((("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE ("workspace_members"."user_id" = "auth"."uid"()))) AND ("deleted_at" IS NULL)));



CREATE POLICY "Workspace members can view invitation tokens" ON "public"."invitation_tokens" FOR SELECT USING (("workspace_id" IN ( SELECT "workspace_members"."workspace_id"
   FROM "public"."workspace_members"
  WHERE ("workspace_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Workspace owners can create invitation tokens" ON "public"."invitation_tokens" FOR INSERT WITH CHECK (("workspace_id" IN ( SELECT "workspaces"."id"
   FROM "public"."workspaces"
  WHERE ("workspaces"."owner_id" = "auth"."uid"()))));



ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."idea_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitation_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_own_update" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_public_read" ON "public"."profiles" FOR SELECT USING (true);



ALTER TABLE "public"."proposal_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."proposals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workspace_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workspace_members_safe_view" ON "public"."workspace_members" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("workspace_id" IN ( SELECT "w"."id"
   FROM "public"."workspaces" "w"
  WHERE ("w"."owner_id" = "auth"."uid"())))));



CREATE POLICY "workspace_members_self_delete" ON "public"."workspace_members" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "workspace_members_self_insert" ON "public"."workspace_members" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."workspaces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workspaces_owner_full_access" ON "public"."workspaces" USING (("owner_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("owner_id" = ( SELECT "auth"."uid"() AS "uid")));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



