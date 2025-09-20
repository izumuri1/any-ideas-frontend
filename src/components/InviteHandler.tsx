// src/components/InviteHandler.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';
import './InviteHandler.scss';

interface InviteTokenData {
  id: string;
  token: string;
  workspace_id: string;
  created_by: string;
  expires_at: string;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  workspaces: {
    id: string;
    name: string;
    owner_id: string;
  } | null;
}

export function InviteHandler() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteData, setInviteData] = useState<InviteTokenData | null>(null);

  useEffect(() => {
    if (!token) {
      setError('招待URLが無効です');
      setLoading(false);
      return;
    }

    validateInviteToken();
  }, [token]);

  const validateInviteToken = async () => {
    try {
      setLoading(true);
      
      // 招待トークンの検証
      const { data: tokenData, error: tokenError } = await supabase
        .from('invitation_tokens')
        .select(`
          id,
          token,
          workspace_id,
          created_by,
          expires_at,
          max_uses,
          used_count,
          is_active,
          workspaces (
            id,
            name,
            owner_id
          )
        `)
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (tokenError) {
        console.error('トークン取得エラー:', tokenError);
        setError('招待リンクが見つかりません');
        return;
      }

      // トークンの有効性チェック
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      
      if (now > expiresAt) {
        setError('招待リンクの有効期限が切れています');
        return;
      }

      if (tokenData.used_count >= tokenData.max_uses) {
        setError('この招待リンクは既に使用されています');
        return;
      }

    // Supabaseレスポンスから適切な形に変換
      const processedData: InviteTokenData = {
        ...tokenData,
        workspaces: Array.isArray(tokenData.workspaces) 
          ? tokenData.workspaces[0] || null 
          : tokenData.workspaces
      };

      setInviteData(processedData);

      // 既にログインしているユーザーの場合
      if (user) {
        await joinWorkspace(processedData);
        } else {
        // 未ログインの場合：招待データをセッションストレージに保存してから遷移
        sessionStorage.setItem('pendingInvite', JSON.stringify({
            token: token,
            workspaceId: processedData.workspace_id,
            workspaceName: processedData.workspaces?.name || 'ワークスペース'
        }));
        
        // 新規登録画面にトークンを渡して遷移
        navigate(`/signup?inviteToken=${token}&workspaceName=${encodeURIComponent(processedData.workspaces?.name || 'ワークスペース')}`);
        }

    } catch (error: any) {
      console.error('招待トークン検証エラー:', error);
      setError('招待リンクの処理中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const joinWorkspace = async (tokenData: InviteTokenData) => {
    try {
      setLoading(true);

      // 既にメンバーかチェック
      const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', tokenData.workspace_id)
        .eq('user_id', user!.id)
        .single();

      if (existingMember) {
        // 既にメンバーの場合はワークスペースに直接移動
        navigate(`/workspace/${tokenData.workspace_id}`);
        return;
      }

      // ワークスペースメンバーとして追加
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: tokenData.workspace_id,
          user_id: user!.id,
          role: 'member'
        });

      if (memberError) throw memberError;

      // トークンを使用済みに更新
      const { error: tokenUpdateError } = await supabase
        .from('invitation_tokens')
        .update({
          used_count: tokenData.used_count + 1,
          used_by: user!.id,
          used_at: new Date().toISOString(),
          is_active: tokenData.used_count + 1 >= tokenData.max_uses ? false : true
        })
        .eq('id', tokenData.id);

      if (tokenUpdateError) {
        console.warn('トークン更新エラー:', tokenUpdateError);
        // トークン更新失敗は致命的ではないので続行
      }

      // ワークスペースに遷移
      navigate(`/workspace/${tokenData.workspace_id}`);

    } catch (error: any) {
      console.error('ワークスペース参加エラー:', error);
      setError('ワークスペースへの参加に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="invite-error-container">
        <div className="invite-error-card">
          <h1 className="logo">Any ideas?</h1>
          <div className="error-content">
            <h2 className="error-title">招待リンクエラー</h2>
            <p className="error-message">{error}</p>
            <button 
              className="btn-back"
              onClick={() => navigate('/login')}
            >
              ログイン画面に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-processing-container">
      <div className="invite-processing-card">
        <h1 className="logo">Any ideas?</h1>
        <div className="processing-content">
          <h2 className="processing-title">招待を処理中...</h2>
          <p className="processing-message">
            {inviteData?.workspaces?.name || 'ワークスペース'} への参加を準備しています
          </p>
        </div>
      </div>
    </div>
  );
}