// src/pages/ProposalDetailScreen.tsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { HamburgerMenu } from '../components/HamburgerMenu'
import { supabase } from '../lib/supabase'
import './ProposalDetailScreen.scss'

interface Idea {
  id: string
  idea_name: string
  creator_id: string
  workspace_id: string
  created_at: string
  updated_at: string
  profiles?: {
    username: string
  } | null
}

export function ProposalDetailScreen() {
  const { workspaceId, ideaId } = useParams<{ workspaceId: string; ideaId: string }>()
  const navigate = useNavigate()
  
  const [idea, setIdea] = useState<Idea | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // アイデア情報を取得
  useEffect(() => {
    if (!ideaId || !workspaceId) {
      setError('必要なパラメータが不足しています')
      setLoading(false)
      return
    }

    const fetchIdea = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('ideas')
          .select(`
            id,
            idea_name,
            creator_id,
            workspace_id,
            created_at,
            updated_at,
            profiles:creator_id (
              username
            )
          `)
          .eq('id', ideaId)
          .eq('workspace_id', workspaceId)
          .single()

        if (fetchError) {
          throw fetchError
        }

        if (!data) {
          throw new Error('アイデアが見つかりません')
        }

        setIdea({
          id: data.id,
          idea_name: data.idea_name,
          creator_id: data.creator_id,
          workspace_id: data.workspace_id,
          created_at: data.created_at,
          updated_at: data.updated_at,
          profiles: {
            username: Array.isArray(data.profiles) 
              ? (data.profiles[0] as any)?.username || 'Unknown'
              : (data.profiles as any)?.username || 'Unknown'
          }
        })
      } catch (err) {
        console.error('アイデア取得エラー:', err)
        setError('アイデア情報の取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchIdea()
  }, [ideaId, workspaceId])

  // ローディング状態
  if (loading) {
    return (
      <div className="proposal-detail-screen loading">
        <div className="proposal-detail-header">
          <div className="header">
            <HamburgerMenu currentPage="other" />
            <div className="idea-info">
              <p className="loading-text">アイデア情報を読み込み中...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // エラー状態
  if (error || !idea) {
    return (
      <div className="proposal-detail-screen error">
        <div className="proposal-detail-header">
          <div className="header">
            <HamburgerMenu currentPage="other" />
            <div className="idea-info">
              <p className="error-text">{error || 'アイデアが見つかりません'}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="proposal-detail-screen">
      {/* ヘッダー部分 - Discussion画面と同じ構造 */}
      <header className="proposal-detail-header">
        <div className="header">
          <HamburgerMenu currentPage="other" />
          
          {/* アイデア情報表示 - Discussion画面と同じ構造 */}
          <div className="idea-info">
            <div className="idea-name">
              <span className="label">アイデア名:</span>
              <h1 className="value">{idea.idea_name}</h1>
            </div>
            <div className="idea-owner">
              <span className="label">アイデアオーナー:</span>
              <p className="value">
                {idea.profiles?.username || 'Unknown User'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="proposal-detail-main">
        {/* ここに今後、採用された提案と採用されなかった提案のコンテンツが入る */}
        <div className="content-placeholder">
          <h2>検討詳細画面</h2>
          <p>アイデア「{idea.idea_name}」の詳細情報をここに表示予定</p>
          
          {/* 一時的な戻るボタン */}
          <button 
            className="btn-back"
            onClick={() => navigate(`/workspace/${workspaceId}`)}
          >
            Homeに戻る
          </button>
        </div>
      </main>
    </div>
  )
}

export default ProposalDetailScreen