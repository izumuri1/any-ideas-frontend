// src/pages/DiscussionScreen.tsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { HamburgerMenu } from '../components/HamburgerMenu'
import { LikeButton, type LikeableItem } from '../components/LikeButton'
import { DeleteButton } from '../components/DeleteButton'
import './DiscussionScreen.scss'

// 型定義
interface IdeaInfo {
  id: string
  idea_name: string
  creator_id: string
  profiles: {
    username: string
  }
}

interface ProposalFormData {
  period: {
    startDate: string
    endDate: string
  }
  todo: {
    text: string
  }
  notTodo: {
    text: string
  }
  budget: {
    text: string
  }
}

interface Proposal extends LikeableItem {
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
  is_liked_by_current_user: boolean
  profiles: {
    username: string
  }
}

interface ProposalCardProps {
  proposal: Proposal
  currentUser: any
  ideaCreatorId: string
  onLikeToggle: (proposalId: string) => void
  onAdopt: (proposalId: string) => void
  onDelete: (proposalId: string) => void
  adoptingProposalId: string | null
  deletingProposalId: string | null
}

// 提案カードコンポーネント
function ProposalCard({
  proposal,
  currentUser,
  ideaCreatorId,
  onLikeToggle,
  onAdopt,
  onDelete,
  adoptingProposalId,
  deletingProposalId
}: ProposalCardProps) {
  const isIdeaOwner = currentUser && currentUser.id === ideaCreatorId

  // 提案内容の表示を取得
  const getProposalContent = () => {
    switch (proposal.proposal_type) {
      case 'period':
        if (proposal.start_date && proposal.end_date) {
          const startDate = new Date(proposal.start_date).toLocaleDateString('ja-JP')
          const endDate = new Date(proposal.end_date).toLocaleDateString('ja-JP')
          return `${startDate}～${endDate}`
        }
        return proposal.content
      case 'todo':
        return proposal.todo_text || proposal.content
      case 'not_todo':
        return proposal.not_todo_text || proposal.content
      case 'budget':
        return proposal.budget_text || proposal.content
      default:
        return proposal.content
    }
  }

  return (
    <div className="proposal-card">
      <div className="proposal-content">
        <p>{getProposalContent()}</p>
      </div>
      
      <div className="proposal-header">
        <span className="proposal-owner">by {proposal.profiles.username}</span>
      </div>
      
      <div className="proposal-actions">
        {/* いいねボタン */}
        <LikeButton 
          item={proposal}
          currentUser={currentUser}
          onLikeToggle={onLikeToggle}
        />
        
        {/* 採用ボタン（アイデアオーナーのみ） */}
        {isIdeaOwner && !proposal.is_adopted && (
          <button 
            className="btn-adopt"
            onClick={() => onAdopt(proposal.id)}
            disabled={adoptingProposalId === proposal.id}
          >
            {adoptingProposalId === proposal.id ? '採用中...' : '採用'}
          </button>
        )}
        
        {/* 削除ボタン（提案者のみ） */}
        {currentUser && currentUser.id === proposal.proposer_id && (
        <DeleteButton
        item={proposal}
        currentUser={currentUser}
        creatorId={proposal.proposer_id}
        isDeleting={deletingProposalId === proposal.id}
        onDelete={onDelete}
        />
        )}
      </div>
    </div>
  )
}

export default function DiscussionScreen() {
  const { ideaId } = useParams<{ ideaId: string }>()
  const { user } = useAuth()
  
  // 状態管理
  const [ideaInfo, setIdeaInfo] = useState<IdeaInfo | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'period' | 'todo' | 'notTodo' | 'budget'>('period')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [adoptingProposalId, setAdoptingProposalId] = useState<string | null>(null)
  const [deletingProposalId, setDeletingProposalId] = useState<string | null>(null)
  
  // フォームデータ
  const [proposalForm, setProposalForm] = useState<ProposalFormData>({
    period: { startDate: '', endDate: '' },
    todo: { text: '' },
    notTodo: { text: '' },
    budget: { text: '' }
  })

  // アイデア情報の取得
  const fetchIdeaInfo = async () => {
    if (!ideaId) return

    try {
      const { data, error } = await supabase
        .from('ideas')
        .select(`
          id,
          idea_name,
          creator_id,
          profiles:creator_id (
            username
          )
        `)
        .eq('id', ideaId)
        .is('deleted_at', null)
        .single()

      if (error) throw error
      if (!data) throw new Error('アイデアが見つかりません')

      setIdeaInfo({
        id: data.id,
        idea_name: data.idea_name,
        creator_id: data.creator_id,
        profiles: {
          username: Array.isArray(data.profiles) 
            ? (data.profiles[0] as any)?.username || 'Unknown'
            : (data.profiles as any)?.username || 'Unknown'
        }
      })
    } catch (err) {
      console.error('Error fetching idea info:', err)
      setError('アイデア情報の取得に失敗しました')
    }
  }

  // 提案一覧の取得
  const fetchProposals = async () => {
    if (!ideaId) return

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
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error

      const proposalsWithLikes = await Promise.all(
        (data || []).map(async (proposal: any) => {
          const { data: likes, error: likesError } = await supabase
            .from('proposal_likes')
            .select('user_id, profiles:user_id(username)')
            .eq('proposal_id', proposal.id)

          return {
            ...proposal,
            profiles: {
              username: Array.isArray(proposal.profiles) ? 
                proposal.profiles[0]?.username : 
                proposal.profiles?.username
            },
            likes: likesError ? [] : (likes || []).map((like: any) => ({
              user_id: like.user_id,
              username: Array.isArray(like.profiles) ? 
                like.profiles[0]?.username : 
                like.profiles?.username
            })),
            like_count: likesError ? 0 : (likes || []).length,
            is_liked_by_current_user: user ? (likes || []).some((like: any) => like.user_id === user.id) : false
          }
        })
      )

      setProposals(proposalsWithLikes)
    } catch (err) {
      console.error('Error fetching proposals:', err)
      setError('提案の取得に失敗しました')
    }
  }

  // 初期データ読み込み
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchIdeaInfo(),
        fetchProposals()
      ])
      setLoading(false)
    }

    loadData()
  }, [ideaId, user])

  // フォーム入力の処理
  const handleFormChange = (tab: string, field: string, value: string) => {
    setProposalForm(prev => ({
      ...prev,
      [tab]: {
        ...prev[tab as keyof ProposalFormData],
        [field]: value
      }
    }))
  }

  // 提案の送信
  const handleProposalSubmit = async (type: 'period' | 'todo' | 'notTodo' | 'budget') => {
    if (!user || !ideaId) return

    setIsSubmitting(true)
    setError(null)

    try {
      let proposalData: any = {
        idea_id: ideaId,
        proposer_id: user.id,
        proposal_type: type === 'notTodo' ? 'not_todo' : type,
        content: ''
      }

      // タイプ別のデータ設定
      switch (type) {
        case 'period':
          if (!proposalForm.period.startDate || !proposalForm.period.endDate) {
            throw new Error('開始日と終了日を入力してください')
          }
          proposalData.start_date = proposalForm.period.startDate
          proposalData.end_date = proposalForm.period.endDate
          proposalData.content = `${proposalForm.period.startDate}～${proposalForm.period.endDate}`
          break
        case 'todo':
          if (!proposalForm.todo.text.trim()) {
            throw new Error('やりたいことを入力してください')
          }
          proposalData.todo_text = proposalForm.todo.text
          proposalData.content = proposalForm.todo.text
          break
        case 'notTodo':
          if (!proposalForm.notTodo.text.trim()) {
            throw new Error('やらなくても良いことを入力してください')
          }
          proposalData.not_todo_text = proposalForm.notTodo.text
          proposalData.content = proposalForm.notTodo.text
          break
        case 'budget':
          if (!proposalForm.budget.text.trim()) {
            throw new Error('想定予算を入力してください')
          }
          proposalData.budget_text = proposalForm.budget.text
          proposalData.content = proposalForm.budget.text
          break
      }

      const { error } = await supabase
        .from('proposals')
        .insert([proposalData])

      if (error) throw error

      // フォームリセット
      setProposalForm(prev => ({
        ...prev,
        [type]: type === 'period' ? { startDate: '', endDate: '' } : { text: '' }
      }))

      // 提案一覧を再取得
      await fetchProposals()
    } catch (err) {
      console.error('Error submitting proposal:', err)
      setError(err instanceof Error ? err.message : '提案の送信に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  // いいねの切り替え
  const handleLikeToggle = async (proposalId: string) => {
    if (!user) return

    try {
      const proposal = proposals.find(p => p.id === proposalId)
      if (!proposal) return

      if (proposal.is_liked_by_current_user) {
        // いいね削除
        const { error } = await supabase
          .from('proposal_likes')
          .delete()
          .eq('proposal_id', proposalId)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        // いいね追加
        const { error } = await supabase
          .from('proposal_likes')
          .insert([{
            proposal_id: proposalId,
            user_id: user.id
          }])

        if (error) throw error
      }

      // 提案一覧を再取得
      await fetchProposals()
    } catch (err) {
      console.error('Error toggling like:', err)
    }
  }

  // 提案の採用
  const handleAdopt = async (proposalId: string) => {
    if (!user || !ideaInfo || user.id !== ideaInfo.creator_id) return

    setAdoptingProposalId(proposalId)

    try {
      const { error } = await supabase
        .from('proposals')
        .update({
          is_adopted: true,
          adopted_at: new Date().toISOString(),
          adopted_by: user.id
        })
        .eq('id', proposalId)

      if (error) throw error

      // 提案一覧を再取得
      await fetchProposals()
    } catch (err) {
      console.error('Error adopting proposal:', err)
      setError('提案の採用に失敗しました')
    } finally {
      setAdoptingProposalId(null)
    }
  }

  // 提案の削除
  const handleDelete = async (proposalId: string) => {
    if (!user) return

    setDeletingProposalId(proposalId)

    try {
      const { error } = await supabase
        .from('proposals')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', proposalId)
        .eq('proposer_id', user.id)

      if (error) throw error

      // 提案一覧を再取得
      await fetchProposals()
    } catch (err) {
      console.error('Error deleting proposal:', err)
      setError('提案の削除に失敗しました')
    } finally {
      setDeletingProposalId(null)
    }
  }

  if (loading) {
    return <div className="discussion-screen loading">読み込み中...</div>
  }

  if (error) {
    return <div className="discussion-screen error">エラー: {error}</div>
  }

  if (!ideaInfo) {
    return <div className="discussion-screen error">アイデアが見つかりません</div>
  }

  return (
    <div className="discussion-screen">
      <header className="discussion-header">
        <div className="header">
          <HamburgerMenu />
          
          <div className="idea-info">
            <div className="idea-name">
              <span className="label">アイデア名：</span>
              <span className="value">{ideaInfo.idea_name}</span>
            </div>
            <div className="idea-owner">
              <span className="label">アイデアオーナー：</span>
              <span className="value">{ideaInfo.profiles.username}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="discussion-main">
        {/* How about? セクション */}
        <section className="how-about-section">
          <h2 className="section-title">How about?</h2>
          <p className="section-description">具体的な提案をしてみよう</p>
          
          {/* タブメニュー */}
          <div className="tab-menu">
            <button 
              className={`tab-button ${activeTab === 'period' ? 'active' : ''}`}
              onClick={() => setActiveTab('period')}
            >
              いつから・いつまで
            </button>
            <button 
              className={`tab-button ${activeTab === 'todo' ? 'active' : ''}`}
              onClick={() => setActiveTab('todo')}
            >
              やりたいこと
            </button>
            <button 
              className={`tab-button ${activeTab === 'notTodo' ? 'active' : ''}`}
              onClick={() => setActiveTab('notTodo')}
            >
              やらなくても良いこと
            </button>
            <button 
              className={`tab-button ${activeTab === 'budget' ? 'active' : ''}`}
              onClick={() => setActiveTab('budget')}
            >
              想定予算
            </button>
          </div>

          {/* タブコンテンツ */}
          <div className="tab-contents">
            {/* いつから？ */}
            {activeTab === 'period' && (
              <div className="tab-content active">
                <h3 className="tab-title">実施希望時期</h3>
                <div className="proposal-registration-form">
                  <div className="form-row">
                    <input
                      type="date"
                      value={proposalForm.period.startDate}
                      onChange={(e) => handleFormChange('period', 'startDate', e.target.value)}
                      className="input-field"
                      placeholder="開始日"
                    />
                  </div>
                  <div className="form-row">
                    <input
                      type="date"
                      value={proposalForm.period.endDate}
                      onChange={(e) => handleFormChange('period', 'endDate', e.target.value)}
                      className="input-field"
                      placeholder="終了日"
                    />
                  </div>

                  <button
                    onClick={() => handleProposalSubmit('period')}
                    disabled={isSubmitting}
                    className="btn-primary"
                  >
                    {isSubmitting ? '提案中...' : '提案'}
                  </button>
                </div>
              </div>
            )}

            {/* やりたいこと */}
            {activeTab === 'todo' && (
              <div className="tab-content active">
                <h3 className="tab-title">やりたいこと</h3>
                <div className="proposal-registration-form">
                  <div className="form-row">
                    <textarea
                      value={proposalForm.todo.text}
                      onChange={(e) => handleFormChange('todo', 'text', e.target.value)}
                      className="input-field textarea-field"
                      placeholder="やりたいことを記入"
                      rows={4}
                      maxLength={500}
                    />
                    <div className="character-count">
                      {proposalForm.todo.text.length}/500
                    </div>
                  </div>

                  <button
                    onClick={() => handleProposalSubmit('todo')}
                    disabled={isSubmitting}
                    className="btn-primary"
                  >
                    {isSubmitting ? '提案中...' : '提案'}
                  </button>
                </div>
              </div>
            )}

            {/* やらなくても良いこと */}
            {activeTab === 'notTodo' && (
              <div className="tab-content active">
                <h3 className="tab-title">やらなくても良いこと</h3>
                <div className="proposal-registration-form">
                  <div className="form-row">
                    <textarea
                      value={proposalForm.notTodo.text}
                      onChange={(e) => handleFormChange('notTodo', 'text', e.target.value)}
                      className="input-field textarea-field"
                      placeholder="やらなくても良いことを記入"
                      rows={4}
                      maxLength={500}
                    />
                    <div className="character-count">
                      {proposalForm.notTodo.text.length}/500
                    </div>
                  </div>

                  <button
                    onClick={() => handleProposalSubmit('notTodo')}
                    disabled={isSubmitting}
                    className="btn-primary"
                  >
                    {isSubmitting ? '提案中...' : '提案'}
                  </button>
                </div>
              </div>
            )}

            {/* 想定予算 */}
            {activeTab === 'budget' && (
              <div className="tab-content active">
                <h3 className="tab-title">想定予算</h3>
                <div className="proposal-registration-form">
                  <div className="form-row">
                    <textarea
                      value={proposalForm.budget.text}
                      onChange={(e) => handleFormChange('budget', 'text', e.target.value)}
                      className="input-field textarea-field"
                      placeholder="想定予算を記入"
                      rows={4}
                      maxLength={500}
                    />
                    <div className="character-count">
                      {proposalForm.budget.text.length}/500
                    </div>
                  </div>

                  <button
                    onClick={() => handleProposalSubmit('budget')}
                    disabled={isSubmitting}
                    className="btn-primary"
                  >
                    {isSubmitting ? '提案中...' : '提案'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 提案一覧セクション */}
        <section className="proposals-section">
          <h3 className="proposals-title">提案一覧</h3>
          
          {/* タブ別提案表示 */}
          <div className="proposals-by-type">
            {/* 実施時期の提案 */}
            <div className="proposal-type-section">
              <h4 className="proposal-type-title">実施時期</h4>
              <div className="proposal-cards">
                {proposals
                  .filter(p => p.proposal_type === 'period')
                  .map(proposal => (
                    <ProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      currentUser={user}
                      ideaCreatorId={ideaInfo.creator_id}
                      onLikeToggle={handleLikeToggle}
                      onAdopt={handleAdopt}
                      onDelete={handleDelete}
                      adoptingProposalId={adoptingProposalId}
                      deletingProposalId={deletingProposalId}
                    />
                  ))}
                {proposals.filter(p => p.proposal_type === 'period').length === 0 && (
                  <p className="no-proposals">実施時期の提案はまだありません</p>
                )}
              </div>
            </div>

            {/* やりたいことの提案 */}
            <div className="proposal-type-section">
              <h4 className="proposal-type-title">やりたいこと</h4>
              <div className="proposal-cards">
                {proposals
                  .filter(p => p.proposal_type === 'todo')
                  .map(proposal => (
                    <ProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      currentUser={user}
                      ideaCreatorId={ideaInfo.creator_id}
                      onLikeToggle={handleLikeToggle}
                      onAdopt={handleAdopt}
                      onDelete={handleDelete}
                      adoptingProposalId={adoptingProposalId}
                      deletingProposalId={deletingProposalId}
                    />
                  ))}
                {proposals.filter(p => p.proposal_type === 'todo').length === 0 && (
                  <p className="no-proposals">やりたいことの提案はまだありません</p>
                )}
              </div>
            </div>

            {/* やらなくても良いことの提案 */}
            <div className="proposal-type-section">
              <h4 className="proposal-type-title">やらなくても良いこと</h4>
              <div className="proposal-cards">
                {proposals
                  .filter(p => p.proposal_type === 'not_todo')
                  .map(proposal => (
                    <ProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      currentUser={user}
                      ideaCreatorId={ideaInfo.creator_id}
                      onLikeToggle={handleLikeToggle}
                      onAdopt={handleAdopt}
                      onDelete={handleDelete}
                      adoptingProposalId={adoptingProposalId}
                      deletingProposalId={deletingProposalId}
                    />
                  ))}
                {proposals.filter(p => p.proposal_type === 'not_todo').length === 0 && (
                  <p className="no-proposals">やらなくても良いことの提案はまだありません</p>
                )}
              </div>
            </div>

            {/* 想定予算の提案 */}
            <div className="proposal-type-section">
              <h4 className="proposal-type-title">想定予算</h4>
              <div className="proposal-cards">
                {proposals
                  .filter(p => p.proposal_type === 'budget')
                  .map(proposal => (
                    <ProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      currentUser={user}
                      ideaCreatorId={ideaInfo.creator_id}
                      onLikeToggle={handleLikeToggle}
                      onAdopt={handleAdopt}
                      onDelete={handleDelete}
                      adoptingProposalId={adoptingProposalId}
                      deletingProposalId={deletingProposalId}
                    />
                  ))}
                {proposals.filter(p => p.proposal_type === 'budget').length === 0 && (
                  <p className="no-proposals">想定予算の提案はまだありません</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}