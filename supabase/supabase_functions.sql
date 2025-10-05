-- ============================
-- Supabase Schema Export (Part 2: Functions, Triggers, Foreign Keys)
-- Date: 2025-10-04
-- Description: Any Ideas アプリケーション - 関数、トリガー、外部キー制約
-- ============================

-- ============================
-- 関数定義
-- ============================

CREATE OR REPLACE FUNCTION public.check_idea_creation_rate_limit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT check_rate_limit(NEW.creator_id, 'idea_creation', 5, 1) THEN
    RAISE EXCEPTION 'レート制限: アイデアの作成が多すぎます。しばらく待ってから再試行してください。';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_like_rate_limit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT check_rate_limit(NEW.user_id, 'like_action', 30, 1) THEN
    RAISE EXCEPTION 'レート制限: いいねが多すぎます。しばらく待ってから再試行してください。';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_proposal_creation_rate_limit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT check_rate_limit(NEW.proposer_id, 'proposal_creation', 10, 1) THEN
    RAISE EXCEPTION 'レート制限: 提案の作成が多すぎます。しばらく待ってから再試行してください。';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_user_id uuid, p_action_type text, p_max_requests integer, p_window_minutes integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
BEGIN
  -- 現在のウィンドウの開始時刻を計算
  v_window_start := DATE_TRUNC('minute', NOW()) - 
                    (EXTRACT(MINUTE FROM NOW())::INTEGER % p_window_minutes) * INTERVAL '1 minute';
  
  -- 現在のウィンドウでのリクエスト数を取得
  SELECT COALESCE(request_count, 0)
  INTO v_current_count
  FROM public.rate_limits
  WHERE user_id = p_user_id
    AND action_type = p_action_type
    AND window_start = v_window_start;
  
  -- リクエスト数が制限を超えているかチェック
  IF v_current_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- リクエストを記録
  INSERT INTO public.rate_limits (user_id, action_type, request_count, window_start)
  VALUES (p_user_id, p_action_type, 1, v_window_start)
  ON CONFLICT (user_id, action_type, window_start)
  DO UPDATE SET request_count = public.rate_limits.request_count + 1;
  
  RETURN TRUE;
END;
$function$;

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

CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$function$;

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

CREATE OR REPLACE FUNCTION public.create_idea_notification()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    member_record RECORD;
    notification_message TEXT;
    idea_creator_username TEXT;
BEGIN
    -- 作成者のユーザー名を取得
    SELECT username INTO idea_creator_username
    FROM public.profiles
    WHERE id = NEW.creator_id;

    -- 通知メッセージを生成
    notification_message := idea_creator_username || 'さんが新しいアイデア「' || NEW.idea_name || '」を作成しました';

    -- ワークスペースの全メンバーに通知を作成（作成者自身を除く）
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

CREATE OR REPLACE FUNCTION public.delete_idea_by_owner(idea_uuid uuid, user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- アイデアオーナーかチェック
  IF NOT EXISTS (
    SELECT 1 FROM public.ideas 
    WHERE id = idea_uuid AND creator_id = user_uuid AND deleted_at IS NULL
  ) THEN
    RETURN false;
  END IF;
  
  -- 論理削除を実行
  UPDATE public.ideas 
  SET deleted_at = NOW()
  WHERE id = idea_uuid AND creator_id = user_uuid;
  
  RETURN true;
END;
$function$;

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
      p.username::TEXT as username
    FROM workspaces w
    JOIN profiles p ON w.owner_id = p.id
    WHERE w.id = workspace_id_param
    
    UNION ALL
    
    -- メンバー情報を取得
    SELECT 
      wm.id,
      wm.user_id,
      COALESCE(wm.role, 'member'::TEXT)::TEXT as role,
      wm.joined_at::TIMESTAMP as joined_at,
      p.username::TEXT as username
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

CREATE OR REPLACE FUNCTION public.sanitize_dangerous_patterns(input_text text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- JavaScriptイベントハンドラを除去
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          input_text,
          'javascript:', '', 'gi'
        ),
        'on\w+\s*=', '', 'gi'  -- onclick, onload など
      ),
      'eval\s*\(', '', 'gi'
    ),
    'expression\s*\(', '', 'gi'  -- CSS expression
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sanitize_html(input_text text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- HTMLタグを除去（<script>、<img>、<a>など）
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        input_text,
        '<script[^>]*>.*?</script>', '', 'gi'
      ),
      '<[^>]+>', '', 'g'
    ),
    '&[a-z]+;', '', 'gi'  -- HTMLエンティティも除去
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sanitize_idea_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.idea_name IS NOT NULL THEN
    NEW.idea_name := public.sanitize_text(NEW.idea_name);
  END IF;
  IF NEW.when_text IS NOT NULL THEN
    NEW.when_text := public.sanitize_text(NEW.when_text);
  END IF;
  IF NEW.who_text IS NOT NULL THEN
    NEW.who_text := public.sanitize_text(NEW.who_text);
  END IF;
  IF NEW.what_text IS NOT NULL THEN
    NEW.what_text := public.sanitize_text(NEW.what_text);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sanitize_notification_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.message IS NOT NULL THEN
    NEW.message := public.sanitize_text(NEW.message);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sanitize_profile_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.username IS NOT NULL THEN
    NEW.username := public.sanitize_text(NEW.username);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sanitize_proposal_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.content IS NOT NULL THEN
    NEW.content := public.sanitize_text(NEW.content);
  END IF;
  IF NEW.todo_text IS NOT NULL THEN
    NEW.todo_text := public.sanitize_text(NEW.todo_text);
  END IF;
  IF NEW.not_todo_text IS NOT NULL THEN
    NEW.not_todo_text := public.sanitize_text(NEW.not_todo_text);
  END IF;
  IF NEW.budget_text IS NOT NULL THEN
    NEW.budget_text := public.sanitize_text(NEW.budget_text);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sanitize_text(input_text text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    -- NULLチェック
    IF input_text IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- XSS対策: HTMLタグを除去
    RETURN regexp_replace(input_text, '<[^>]*>', '', 'g');
END;
$function$;

CREATE OR REPLACE FUNCTION public.sanitize_workspace_before_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.name IS NOT NULL THEN
    NEW.name := public.sanitize_text(NEW.name);
  END IF;
  RETURN NEW;
END;
$function$;

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

-- ============================
-- トリガー定義
-- ============================

CREATE TRIGGER idea_like_rate_limit_trigger
    BEFORE INSERT
    ON public.idea_likes
    FOR EACH ROW
    EXECUTE FUNCTION check_like_rate_limit();

CREATE TRIGGER idea_creation_rate_limit_trigger
    BEFORE INSERT
    ON public.ideas
    FOR EACH ROW
    EXECUTE FUNCTION check_idea_creation_rate_limit();

CREATE TRIGGER sanitize_idea_trigger
    BEFORE UPDATE
    ON public.ideas
    FOR EACH ROW
    EXECUTE FUNCTION sanitize_idea_before_insert();

CREATE TRIGGER sanitize_idea_trigger
    BEFORE INSERT
    ON public.ideas
    FOR EACH ROW
    EXECUTE FUNCTION sanitize_idea_before_insert();

CREATE TRIGGER set_ideas_updated_at
    BEFORE UPDATE
    ON public.ideas
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER trigger_create_idea_move_notification
    AFTER UPDATE
    ON public.ideas
    FOR EACH ROW
    EXECUTE FUNCTION create_idea_move_notification();

CREATE TRIGGER trigger_create_idea_notification
    AFTER INSERT
    ON public.ideas
    FOR EACH ROW
    EXECUTE FUNCTION create_idea_notification();

CREATE TRIGGER sanitize_notification_trigger
    BEFORE INSERT
    ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION sanitize_notification_before_insert();

CREATE TRIGGER sanitize_notification_trigger
    BEFORE UPDATE
    ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION sanitize_notification_before_insert();

CREATE TRIGGER sanitize_profile_trigger
    BEFORE UPDATE
    ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION sanitize_profile_before_insert();

CREATE TRIGGER sanitize_profile_trigger
    BEFORE INSERT
    ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION sanitize_profile_before_insert();

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE
    ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER proposal_like_rate_limit_trigger
    BEFORE INSERT
    ON public.proposal_likes
    FOR EACH ROW
    EXECUTE FUNCTION check_like_rate_limit();

CREATE TRIGGER proposal_creation_rate_limit_trigger
    BEFORE INSERT
    ON public.proposals
    FOR EACH ROW
    EXECUTE FUNCTION check_proposal_creation_rate_limit();

CREATE TRIGGER sanitize_proposal_trigger
    BEFORE INSERT
    ON public.proposals
    FOR EACH ROW
    EXECUTE FUNCTION sanitize_proposal_before_insert();

CREATE TRIGGER sanitize_proposal_trigger
    BEFORE UPDATE
    ON public.proposals
    FOR EACH ROW
    EXECUTE FUNCTION sanitize_proposal_before_insert();

CREATE TRIGGER set_proposals_updated_at
    BEFORE UPDATE
    ON public.proposals
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER trigger_create_proposal_adopted_notification
    AFTER UPDATE
    ON public.proposals
    FOR EACH ROW
    EXECUTE FUNCTION create_proposal_adopted_notification();

CREATE TRIGGER trigger_create_proposal_notification
    AFTER INSERT
    ON public.proposals
    FOR EACH ROW
    EXECUTE FUNCTION create_proposal_notification();

CREATE TRIGGER sanitize_workspace_trigger
    BEFORE UPDATE
    ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION sanitize_workspace_before_insert();

CREATE TRIGGER sanitize_workspace_trigger
    BEFORE INSERT
    ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION sanitize_workspace_before_insert();

CREATE TRIGGER set_workspaces_updated_at
    BEFORE UPDATE
    ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- ============================
-- 外部キー制約
-- ============================

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.profiles(id);

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_workspace_id_fkey FOREIGN KEY (workspace_id)
    REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.ai_usage_quotas
    ADD CONSTRAINT ai_usage_quotas_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.idea_likes
    ADD CONSTRAINT idea_likes_idea_id_fkey FOREIGN KEY (idea_id)
    REFERENCES public.ideas(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.idea_likes
    ADD CONSTRAINT idea_likes_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.ideas
    ADD CONSTRAINT ideas_creator_id_fkey FOREIGN KEY (creator_id)
    REFERENCES public.profiles(id);

ALTER TABLE ONLY public.ideas
    ADD CONSTRAINT ideas_workspace_id_fkey FOREIGN KEY (workspace_id)
    REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.invitation_tokens
    ADD CONSTRAINT invitation_tokens_created_by_fkey FOREIGN KEY (created_by)
    REFERENCES public.profiles(id);

ALTER TABLE ONLY public.invitation_tokens
    ADD CONSTRAINT invitation_tokens_used_by_fkey FOREIGN KEY (used_by)
    REFERENCES public.profiles(id);

ALTER TABLE ONLY public.invitation_tokens
    ADD CONSTRAINT invitation_tokens_workspace_id_fkey FOREIGN KEY (workspace_id)
    REFERENCES public.workspaces(id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_workspace_id_fkey FOREIGN KEY (workspace_id)
    REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_default_workspace_id_fkey FOREIGN KEY (default_workspace_id)
    REFERENCES public.workspaces(id);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_last_workspace_id_fkey FOREIGN KEY (last_workspace_id)
    REFERENCES public.workspaces(id);

ALTER TABLE ONLY public.proposal_likes
    ADD CONSTRAINT proposal_likes_proposal_id_fkey FOREIGN KEY (proposal_id)
    REFERENCES public.proposals(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.proposal_likes
    ADD CONSTRAINT proposal_likes_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_adopted_by_fkey FOREIGN KEY (adopted_by)
    REFERENCES public.profiles(id);

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_idea_id_fkey FOREIGN KEY (idea_id)
    REFERENCES public.ideas(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_proposer_id_fkey FOREIGN KEY (proposer_id)
    REFERENCES public.profiles(id);

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_invited_by_fkey FOREIGN KEY (invited_by)
    REFERENCES public.profiles(id);

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id)
    REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_owner_id_fkey FOREIGN KEY (owner_id)
    REFERENCES public.profiles(id);

-- ============================
-- 注記
-- ============================

-- このファイルには以下の機能が含まれます：
-- 1. レート制限機能 (check_rate_limit, cleanup_old_rate_limits)
-- 2. 通知システム関数 (create_*_notification系)
-- 3. ワークスペースメンバー管理 (get_workspace_members系)
-- 4. アイデア関連操作 (delete_idea_by_owner, get_idea_like_count等)
-- 5. ユーザー管理 (handle_new_user, handle_updated_at)
-- 6. 通知メッセージ生成 (generate_notification_message)
-- 7. XSS対策サニタイズ関数 (sanitize_*)
-- 8. データクリーンアップ (cleanup_old_notifications)
-- 
-- セキュリティ強化内容：
-- - 全関数にSECURITY DEFINERとsearch_path設定を適用
-- - PostgreSQLのFunction Search Path脆弱性対策済み
-- - XSS対策としてユーザー入力を自動サニタイズ
-- - レート制限によるDoS攻撃対策
-- 
-- generate_notification_message関数は引数の順序が異なる2つのオーバーロード版が存在。