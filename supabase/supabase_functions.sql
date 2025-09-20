CREATE OR REPLACE FUNCTION "public"."cleanup_old_notifications"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications 
  WHERE is_read = TRUE 
    AND created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_idea_move_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    member_record RECORD;
    actor_name TEXT;
    notification_message TEXT;
    status_text TEXT;
BEGIN
    -- ステータス変更のみを対象とする
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;
    
    -- 【修正前】thinking_aboutへの移動のみを対象
    -- IF NEW.status != 'thinking_about' THEN
    
    -- 【修正後】thinking_aboutまたはtryingへの移動を対象
    IF NEW.status NOT IN ('thinking_about', 'trying') THEN
        RETURN NEW;
    END IF;
    
    -- 投稿者の表示名を取得
    SELECT COALESCE(username, 'Unknown User') INTO actor_name
    FROM profiles 
    WHERE id = NEW.creator_id;
    
    -- ステータスに応じたメッセージを生成
    CASE NEW.status
        WHEN 'thinking_about' THEN
            status_text := 'の検討を開始しました';
--
CREATE OR REPLACE FUNCTION "public"."create_idea_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    member_record RECORD;
    actor_name TEXT;
    notification_message TEXT;
BEGIN
    -- 投稿者の表示名を取得
    SELECT COALESCE(username, 'Unknown User') INTO actor_name
    FROM profiles 
    WHERE id = NEW.creator_id;
    
    -- 通知メッセージを生成
    notification_message := actor_name || 'さんが新しいアイデア「' || NEW.idea_name || '」を投稿しました';
    
    -- ワークスペースの全メンバー（投稿者以外）に通知を作成
    FOR member_record IN 
        SELECT user_id 
        FROM workspace_members 
        WHERE workspace_id = NEW.workspace_id 
        AND user_id != NEW.creator_id  -- 投稿者自身は除外
    LOOP
        INSERT INTO notifications (
            workspace_id,
            user_id,
            actor_user_id,
            type,
            message,
            related_id,
            is_read,
--
CREATE OR REPLACE FUNCTION "public"."create_notification"("p_workspace_id" "uuid", "p_user_id" "uuid", "p_actor_user_id" "uuid", "p_type" "text", "p_message" "text", "p_related_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  notification_id UUID;
BEGIN
  -- 自分の行動は自分に通知しない
  IF p_user_id = p_actor_user_id THEN
    RETURN NULL;
  END IF;
  
  INSERT INTO notifications (
    workspace_id,
    user_id,
    actor_user_id,
    type,
    message,
    related_id
  ) VALUES (
    p_workspace_id,
    p_user_id,
    p_actor_user_id,
    p_type,
    p_message,
    p_related_id
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

--
CREATE OR REPLACE FUNCTION "public"."create_proposal_adopted_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    member_record RECORD;
    adopter_name TEXT;
    proposer_name TEXT;
    idea_info RECORD;
    notification_message TEXT;
    proposal_type_text TEXT;
BEGIN
    -- is_adoptedの変更のみを対象とする
    IF OLD.is_adopted = NEW.is_adopted THEN
        RETURN NEW;
    END IF;
    
    -- 採用された場合のみ処理（採用解除は通知しない）
    IF NEW.is_adopted != TRUE THEN
        RETURN NEW;
    END IF;
    
    -- 採用者の表示名を取得
    SELECT COALESCE(username, 'Unknown User') INTO adopter_name
    FROM profiles 
    WHERE id = NEW.adopted_by;
    
    -- 提案者の表示名を取得
    SELECT COALESCE(username, 'Unknown User') INTO proposer_name
    FROM profiles 
    WHERE id = NEW.proposer_id;
    
--
CREATE OR REPLACE FUNCTION "public"."create_proposal_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    member_record RECORD;
    actor_name TEXT;
    idea_info RECORD;
    notification_message TEXT;
    proposal_type_text TEXT;
BEGIN
    -- 提案者の表示名を取得
    SELECT COALESCE(username, 'Unknown User') INTO actor_name
    FROM profiles 
    WHERE id = NEW.proposer_id;
    
    -- 関連するアイデア情報を取得
    SELECT 
        idea_name,
        creator_id,
        workspace_id
    INTO idea_info
    FROM ideas 
    WHERE id = NEW.idea_id;
    
    -- 提案タイプに応じたテキストを生成
    CASE NEW.proposal_type
        WHEN 'period' THEN
            proposal_type_text := '実施時期の提案';
        WHEN 'todo' THEN
            proposal_type_text := 'やりたいことの提案';
        WHEN 'not_todo' THEN
--
CREATE OR REPLACE FUNCTION "public"."generate_notification_message"("p_actor_name" "text", "p_type" "text", "p_target_name" "text" DEFAULT NULL::"text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  CASE p_type
    WHEN 'idea_created' THEN
      RETURN p_actor_name || 'さんが「' || COALESCE(p_target_name, 'アイデア') || '」を投稿しました';
    WHEN 'idea_moved' THEN
      RETURN p_actor_name || 'さんが「' || COALESCE(p_target_name, 'アイデア') || '」のステータスを変更しました';
    WHEN 'proposal_added' THEN
      RETURN p_actor_name || 'さんが「' || COALESCE(p_target_name, 'アイデア') || '」に提案を追加しました';
    WHEN 'member_joined' THEN
      RETURN p_actor_name || 'さんがワークスペースに参加しました';
    ELSE
      RETURN p_actor_name || 'さんが活動しました';
  END CASE;
END;
$$;


ALTER FUNCTION "public"."generate_notification_message"("p_actor_name" "text", "p_type" "text", "p_target_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_notification_message"("p_type" character varying, "p_actor_name" "text", "p_target_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  CASE p_type
    WHEN 'idea_created' THEN
      RETURN p_actor_name || 'さんが「' || COALESCE(p_target_name, 'アイデア') || '」を投稿しました';
    WHEN 'idea_moved' THEN
      RETURN p_actor_name || 'さんが「' || COALESCE(p_target_name, 'アイデア') || '」のステータスを変更しました';
    WHEN 'proposal_added' THEN
      RETURN p_actor_name || 'さんが「' || COALESCE(p_target_name, 'アイデア') || '」に提案を追加しました';
    WHEN 'proposal_adopted' THEN
      RETURN p_actor_name || 'さんが提案を採用しました';
    WHEN 'member_joined' THEN
      RETURN p_actor_name || 'さんがワークスペースに参加しました';
    ELSE
      RETURN p_actor_name || 'さんが活動しました';
  END CASE;
END;
$$;


ALTER FUNCTION "public"."generate_notification_message"("p_type" character varying, "p_actor_name" "text", "p_target_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_idea_like_count"("idea_uuid" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
--
CREATE OR REPLACE TRIGGER "trigger_create_idea_move_notification" AFTER UPDATE ON "public"."ideas" FOR EACH ROW EXECUTE FUNCTION "public"."create_idea_move_notification"();



CREATE OR REPLACE TRIGGER "trigger_create_idea_notification" AFTER INSERT ON "public"."ideas" FOR EACH ROW EXECUTE FUNCTION "public"."create_idea_notification"();



CREATE OR REPLACE TRIGGER "trigger_create_proposal_adopted_notification" AFTER UPDATE ON "public"."proposals" FOR EACH ROW EXECUTE FUNCTION "public"."create_proposal_adopted_notification"();



CREATE OR REPLACE TRIGGER "trigger_create_proposal_notification" AFTER INSERT ON "public"."proposals" FOR EACH ROW EXECUTE FUNCTION "public"."create_proposal_notification"();



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."idea_likes"
    ADD CONSTRAINT "idea_likes_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."idea_likes"
    ADD CONSTRAINT "idea_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ideas"
    ADD CONSTRAINT "ideas_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ideas"
    ADD CONSTRAINT "ideas_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;
