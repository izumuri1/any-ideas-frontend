-- ============================
-- 関数定義（セキュリティ修正済み）
-- ============================

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.notifications 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

ALTER FUNCTION "public"."cleanup_old_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION public.create_idea_move_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    
    -- thinking_aboutまたはtryingへの移動を対象
    IF NEW.status NOT IN ('thinking_about', 'trying') THEN
        RETURN NEW;
    END IF;
    
    -- 投稿者の表示名を取得
    SELECT COALESCE(username, 'Unknown User') INTO actor_name
    FROM public.profiles 
    WHERE id = NEW.creator_id;
    
    -- ステータスに応じたメッセージを生成
    CASE NEW.status
        WHEN 'thinking_about' THEN
            status_text := 'の検討を開始しました';
        WHEN 'trying' THEN
            status_text := 'の実行を決定しました';
        ELSE
            status_text := 'のステータスを変更しました';
    END CASE;
    
    -- 通知メッセージを生成
    notification_message := actor_name || 'さんが「' || NEW.idea_name || '」' || status_text;
    
    -- ワークスペースの全メンバー（投稿者以外）に通知を作成
    FOR member_record IN 
        SELECT user_id 
        FROM public.workspace_members 
        WHERE workspace_id = NEW.workspace_id 
        AND user_id != NEW.creator_id
    LOOP
        INSERT INTO public.notifications (
            workspace_id,
            user_id,
            actor_user_id,
            type,
            message,
            related_id,
            is_read,
            created_at
        ) VALUES (
            NEW.workspace_id,
            member_record.user_id,
            NEW.creator_id,
            'idea_moved',
            notification_message,
            NEW.id,
            FALSE,
            NOW()
        );
    END LOOP;
    
    RETURN NEW;
END;
$function$;

ALTER FUNCTION "public"."create_idea_move_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION public.create_idea_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    member_record RECORD;
    actor_name TEXT;
    notification_message TEXT;
BEGIN
    -- 投稿者の表示名を取得
    SELECT COALESCE(username, 'Unknown User') INTO actor_name
    FROM public.profiles 
    WHERE id = NEW.creator_id;
    
    -- 通知メッセージを生成
    notification_message := actor_name || 'さんが新しいアイデア「' || NEW.idea_name || '」を投稿しました';
    
    -- ワークスペースの全メンバー（投稿者以外）に通知を作成
    FOR member_record IN 
        SELECT user_id 
        FROM public.workspace_members 
        WHERE workspace_id = NEW.workspace_id 
        AND user_id != NEW.creator_id
    LOOP
        INSERT INTO public.notifications (
            workspace_id,
            user_id,
            actor_user_id,
            type,
            message,
            related_id,
            is_read,
            created_at
        ) VALUES (
            NEW.workspace_id,
            member_record.user_id,
            NEW.creator_id,
            'idea_created',
            notification_message,
            NEW.id,
            FALSE,
            NOW()
        );
    END LOOP;
    
    RETURN NEW;
END;
$function$;

ALTER FUNCTION "public"."create_idea_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION public.create_notification(p_workspace_id uuid, p_user_id uuid, p_actor_user_id uuid, p_type text, p_message text, p_related_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  notification_id UUID;
BEGIN
  -- 自分の行動は自分に通知しない
  IF p_user_id = p_actor_user_id THEN
    RETURN NULL;
  END IF;
  
  INSERT INTO public.notifications (
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
$function$;

ALTER FUNCTION "public"."create_notification"(p_workspace_id uuid, p_user_id uuid, p_actor_user_id uuid, p_type text, p_message text, p_related_id uuid DEFAULT NULL::uuid) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION public.create_proposal_adopted_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    FROM public.profiles 
    WHERE id = NEW.adopted_by;
    
    -- 提案者の表示名を取得
    SELECT COALESCE(username, 'Unknown User') INTO proposer_name
    FROM public.profiles 
    WHERE id = NEW.proposer_id;
    
    -- 関連するアイデア情報を取得
    SELECT 
        idea_name,
        creator_id,
        workspace_id
    INTO idea_info
    FROM public.ideas 
    WHERE id = NEW.idea_id;
    
    -- 提案タイプに応じたテキストを生成
    CASE NEW.proposal_type
        WHEN 'period' THEN
            proposal_type_text := '実施時期の提案';
        WHEN 'todo' THEN
            proposal_type_text := 'やりたいことの提案';
        WHEN 'not_todo' THEN
            proposal_type_text := 'やらなくても良いことの提案';
        WHEN 'budget' THEN
            proposal_type_text := '予算の提案';
        ELSE
            proposal_type_text := '提案';
    END CASE;
    
    -- 通知メッセージを生成
    notification_message := adopter_name || 'さんが' || proposer_name || 'さんの「' || idea_info.idea_name || '」への' || proposal_type_text || 'を採用しました';
    
    -- 採用者以外の全ワークスペースメンバーに通知
    FOR member_record IN 
        SELECT user_id 
        FROM public.workspace_members 
        WHERE workspace_id = idea_info.workspace_id
        AND user_id != NEW.adopted_by
    LOOP
        INSERT INTO public.notifications (
            workspace_id,
            user_id,
            actor_user_id,
            type,
            message,
            related_id,
            is_read,
            created_at
        ) VALUES (
            idea_info.workspace_id,
            member_record.user_id,
            NEW.adopted_by,
            'proposal_adopted',
            notification_message,
            NEW.idea_id,
            FALSE,
            NOW()
        );
    END LOOP;
    
    RETURN NEW;
END;
$function$;

ALTER FUNCTION "public"."create_proposal_adopted_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION public.create_proposal_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    member_record RECORD;
    actor_name TEXT;
    idea_info RECORD;
    notification_message TEXT;
    proposal_type_text TEXT;
BEGIN
    -- 提案者の表示名を取得
    SELECT COALESCE(username, 'Unknown User') INTO actor_name
    FROM public.profiles 
    WHERE id = NEW.proposer_id;
    
    -- 関連するアイデア情報を取得
    SELECT 
        idea_name,
        creator_id,
        workspace_id
    INTO idea_info
    FROM public.ideas 
    WHERE id = NEW.idea_id;
    
    -- 提案タイプに応じたテキストを生成
    CASE NEW.proposal_type
        WHEN 'period' THEN
            proposal_type_text := '実施時期の提案';
        WHEN 'todo' THEN
            proposal_type_text := 'やりたいことの提案';
        WHEN 'not_todo' THEN
            proposal_type_text := 'やらなくても良いことの提案';
        WHEN 'budget' THEN
            proposal_type_text := '予算の提案';
        ELSE
            proposal_type_text := '提案';
    END CASE;
    
    -- 通知メッセージを生成
    notification_message := actor_name || 'さんが「' || idea_info.idea_name || '」に' || proposal_type_text || 'を追加しました';
    
    -- 提案者以外の全ワークスペースメンバーに通知
    FOR member_record IN 
        SELECT user_id 
        FROM public.workspace_members 
        WHERE workspace_id = idea_info.workspace_id
        AND user_id != NEW.proposer_id
    LOOP
        INSERT INTO public.notifications (
            workspace_id,
            user_id,
            actor_user_id,
            type,
            message,
            related_id,
            is_read,
            created_at
        ) VALUES (
            idea_info.workspace_id,
            member_record.user_id,
            NEW.proposer_id,
            'proposal_added',
            notification_message,
            NEW.idea_id,
            FALSE,
            NOW()
        );
    END LOOP;
    
    RETURN NEW;
END;
$function$;

ALTER FUNCTION "public"."create_proposal_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION public.generate_notification_message(p_type character varying, p_actor_name text, p_target_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

ALTER FUNCTION "public"."generate_notification_message"(p_type character varying, p_actor_name text, p_target_name text) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION public.generate_notification_message(p_actor_name text, p_type text, p_target_name text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$;

ALTER FUNCTION "public"."generate_notification_message"(p_actor_name text, p_type text, p_target_name text DEFAULT NULL::text) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION public.get_idea_like_count(idea_uuid uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.idea_likes
        WHERE idea_id = idea_uuid
    );
END;
$function$;

ALTER FUNCTION "public"."get_idea_like_count"(idea_uuid uuid) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION public.get_workspace_members(workspace_id_param uuid)
 RETURNS TABLE(id uuid, user_id uuid, role text, joined_at timestamp without time zone, username text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- 現在のユーザーがワークスペースのメンバーかオーナーかを確認
  IF NOT EXISTS (
    SELECT 1 FROM workspaces w 
    WHERE w.id = workspace_id_param 
    AND w.owner_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = workspace_id_param 
    AND wm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'このワークスペースのメンバーではありません';
  END IF;

  -- オーナー情報を含む全メンバーを返す
  RETURN QUERY
  WITH all_members AS (
    -- オーナー情報を取得
    SELECT 
      gen_random_uuid() as id,
      w.owner_id as user_id,
      'owner'::TEXT as role,
      w.created_at as joined_at,
      p.username as username
    FROM workspaces w
    JOIN profiles p ON w.owner_id = p.id
    WHERE w.id = workspace_id_param
    
    UNION ALL
    
    -- メンバー情報を取得（オーナー以外）
    SELECT 
      wm.id,
      wm.user_id,
      wm.role,
      wm.joined_at,
      p.username
    FROM workspace_members wm
    JOIN profiles p ON wm.user_id = p.id
    JOIN workspaces w ON wm.workspace_id = w.id
    WHERE wm.workspace_id = workspace_id_param
    AND wm.user_id != w.owner_id  -- オーナーの重複を避ける
  )
  SELECT 
    am.id,
    am.user_id,
    am.role,
    am.joined_at,
    am.username
  FROM all_members am
  ORDER BY 
    CASE WHEN am.role = 'owner' THEN 1 ELSE 2 END,
    am.joined_at ASC;
END;
$function$;

ALTER FUNCTION "public"."get_workspace_members"(workspace_id_param uuid) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION public.get_workspace_members_safe(workspace_id_param uuid)
 RETURNS TABLE(id uuid, user_id uuid, role text, joined_at timestamp without time zone, username text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- アクセス権限チェック
  IF NOT EXISTS (
    SELECT 1 FROM workspaces w 
    WHERE w.id = workspace_id_param 
    AND w.owner_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = workspace_id_param 
    AND wm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'このワークスペースのメンバーではありません';
  END IF;

  -- ワークスペースの全メンバーを返す
  RETURN QUERY
  WITH all_workspace_members AS (
    -- オーナー情報を取得
    SELECT 
      gen_random_uuid() as id,
      w.owner_id as user_id,
      'owner'::TEXT as role,
      w.created_at::TIMESTAMP as joined_at,
      p.username::TEXT as username -- 明示的にTEXTにキャスト
    FROM workspaces w
    JOIN profiles p ON w.owner_id = p.id
    WHERE w.id = workspace_id_param
    
    UNION ALL
    
    -- メンバー情報を取得
    SELECT 
      wm.id,
      wm.user_id,
      COALESCE(wm.role, 'member'::TEXT)::TEXT as role, -- 明示的にTEXTにキャスト
      wm.joined_at::TIMESTAMP as joined_at,
      p.username::TEXT as username -- 明示的にTEXTにキャスト
    FROM workspace_members wm
    JOIN profiles p ON wm.user_id = p.id
    JOIN workspaces w ON wm.workspace_id = w.id
    WHERE wm.workspace_id = workspace_id_param
    AND wm.user_id != w.owner_id
  )
  SELECT 
    am.id,
    am.user_id,
    am.role,
    am.joined_at,
    am.username
  FROM all_workspace_members am
  ORDER BY 
    CASE WHEN am.role = 'owner' THEN 1 ELSE 2 END,
    am.joined_at ASC;
END;
$function$;

ALTER FUNCTION "public"."get_workspace_members_safe"(workspace_id_param uuid) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- ユーザーが既に存在する場合はスキップ
    RETURN new;
END;
$function$;

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION public.user_has_liked_idea(idea_uuid uuid, user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.idea_likes
        WHERE idea_id = idea_uuid AND user_id = user_uuid
    );
END;
$function$;

ALTER FUNCTION "public"."user_has_liked_idea"(idea_uuid uuid, user_uuid uuid) OWNER TO "postgres";


-- ============================
-- トリガー定義
-- ============================

CREATE TRIGGER set_ideas_updated_at BEFORE UPDATE ON public.ideas FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER trigger_create_idea_move_notification AFTER UPDATE ON public.ideas FOR EACH ROW EXECUTE FUNCTION create_idea_move_notification();

CREATE TRIGGER trigger_create_idea_notification AFTER INSERT ON public.ideas FOR EACH ROW EXECUTE FUNCTION create_idea_notification();

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER trigger_create_proposal_adopted_notification AFTER UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION create_proposal_adopted_notification();

CREATE TRIGGER trigger_create_proposal_notification AFTER INSERT ON public.proposals FOR EACH ROW EXECUTE FUNCTION create_proposal_notification();

CREATE TRIGGER set_workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- ============================
-- 外部キー制約
-- ============================

ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."ai_usage_quotas"
    ADD CONSTRAINT "ai_usage_quotas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."idea_likes"
    ADD CONSTRAINT "idea_likes_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."idea_likes"
    ADD CONSTRAINT "idea_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."ideas"
    ADD CONSTRAINT "ideas_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."ideas"
    ADD CONSTRAINT "ideas_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."invitation_tokens"
    ADD CONSTRAINT "invitation_tokens_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."invitation_tokens"
    ADD CONSTRAINT "invitation_tokens_used_by_fkey" FOREIGN KEY ("used_by") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."invitation_tokens"
    ADD CONSTRAINT "invitation_tokens_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id");

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_default_workspace_id_fkey" FOREIGN KEY ("default_workspace_id") REFERENCES "public"."workspaces"("id");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_last_workspace_id_fkey" FOREIGN KEY ("last_workspace_id") REFERENCES "public"."workspaces"("id");

ALTER TABLE ONLY "public"."proposal_likes"
    ADD CONSTRAINT "proposal_likes_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."proposal_likes"
    ADD CONSTRAINT "proposal_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."proposals"
    ADD CONSTRAINT "proposals_adopted_by_fkey" FOREIGN KEY ("adopted_by") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."proposals"
    ADD CONSTRAINT "proposals_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."proposals"
    ADD CONSTRAINT "proposals_proposer_id_fkey" FOREIGN KEY ("proposer_id") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id");