// src/pages/ProposalDetailScreen.tsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
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

interface Proposal {
  id: string
  idea_id: string
  proposer_id: string
  proposal_type: 'period' | 'todo' | 'not_todo' | 'budget'
  content: string
  start_date: string | null
  end_date: string | null
  todo_text: string | null
  not_todo_text: string | null
  budget_text: string | null
  is_adopted: boolean
  created_at: string
  profiles?: {
    username: string
  } | null
}

export function ProposalDetailScreen() {
  const { workspaceId, ideaId } = useParams<{ workspaceId: string; ideaId: string }>()
  
  const [idea, setIdea] = useState<Idea | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [proposals, setProposals] = useState<Proposal[]>([])

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

    // 提案データを取得
    useEffect(() => {
        if (!ideaId) return

        const fetchProposals = async () => {
        try {
            const { data, error } = await supabase
            .from('proposals')
            .select(`
                id,
                idea_id,
                proposer_id,
                proposal_type,
                content,
                start_date,
                end_date,
                todo_text,
                not_todo_text,
                budget_text,
                is_adopted,
                created_at,
                profiles:proposer_id (
                username
                )
            `)
            .eq('idea_id', ideaId)
            .eq('is_adopted', true)  // 採用された提案のみ
            .is('deleted_at', null)
            .order('created_at', { ascending: false })

            if (error) throw error
            
            const formattedProposals = (data || []).map((proposal: any) => ({
            ...proposal,
            profiles: {
                username: Array.isArray(proposal.profiles) 
                ? (proposal.profiles[0] as any)?.username || 'Unknown'
                : (proposal.profiles as any)?.username || 'Unknown'
            }
            }))
            
            setProposals(formattedProposals)
        } catch (err) {
            console.error('提案取得エラー:', err)
        }
        }

        fetchProposals()
    }, [ideaId])

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
        {/* Ideas we're trying セクション */}
        <section className="adopted-proposals-section">
            <h3 className="adopted-proposals-title">Ideas we're trying</h3>
            <p className="adopted-proposals-description">採用された提案</p>
            
            <div className="adopted-proposals-by-type">
            {/* 実施時期 */}
            <div className="proposal-type-section">
                <h4 className="proposal-type-title">実施時期</h4>
                <div className="proposal-cards">
                {/* 採用された実施時期の提案 */}
                    {proposals
                        .filter(p => p.proposal_type === 'period')
                        .map(proposal => (
                        <div key={proposal.id} className="proposal-card adopted-card">
                            <div className="proposal-content">
                            <p>{proposal.start_date && proposal.end_date ? 
                                `${new Date(proposal.start_date).toLocaleDateString('ja-JP')} 〜 ${new Date(proposal.end_date).toLocaleDateString('ja-JP')}` : 
                                proposal.content}
                            </p>
                            </div>
                            <div className="proposal-header">
                            <span className="proposal-owner">by {proposal.profiles?.username || 'Unknown'}</span>
                            </div>
                        </div>
                        ))}
                    {proposals.filter(p => p.proposal_type === 'period').length === 0 && (
                        <p className="no-proposals">採用された実施時期はありません</p>
                    )}
                    </div>
            </div>

            {/* やりたいこと */}
            <div className="proposal-type-section">
                <h4 className="proposal-type-title">やりたいこと</h4>
                <div className="proposal-cards">
                {/* 採用されたやりたいことの提案をここに表示 */}
                <p className="no-proposals">やりたいことの提案はまだありません</p>
                </div>
            </div>

            {/* やらなくても良いこと */}
            <div className="proposal-type-section">
                <h4 className="proposal-type-title">やらなくても良いこと</h4>
                <div className="proposal-cards">
                {/* 採用されたやらなくても良いことの提案をここに表示 */}
                <p className="no-proposals">やらなくても良いことの提案はまだありません</p>
                </div>
            </div>

            {/* 想定予算 */}
            <div className="proposal-type-section">
                <h4 className="proposal-type-title">想定予算</h4>
                <div className="proposal-cards">
                {/* 採用された想定予算の提案をここに表示 */}
                <p className="no-proposals">想定予算の提案はまだありません</p>
                </div>
            </div>
            </div>
        </section>
        </main>
    </div>
  )
}

export default ProposalDetailScreen