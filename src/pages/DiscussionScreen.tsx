// src/pages/DiscussionScreen.tsx - フォーム部分のみuseFormとFormFieldでリファクタリング
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { HamburgerMenu } from '../components/HamburgerMenu'
import { LikeButton, type LikeableItem } from '../components/LikeButton'
import { DeleteButton } from '../components/DeleteButton'
import PageHeader from '../components/PageHeader'
import FormField from '../components/common/FormField'  // 追加
import { useForm } from '../hooks/useForm'  // 追加
import BudgetProposalForm from '../components/BudgetProposalForm'
import './DiscussionScreen.scss'

// 型定義（元のまま）
interface IdeaInfo {
  id: string
  idea_name: string
  creator_id: string
  profiles: {
    username: string
  }
}

// リファクタリング追加：各タブ用のフォーム型定義
interface PeriodFormData {
  startDate: string
  endDate: string
}

interface TextFormData {
  text: string
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

// 提案カードコンポーネント（元のまま）
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
            {adoptingProposalId === proposal.id ? '提案を採用中...' : '提案を採用する'}
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
  const { workspaceId, ideaId } = useParams<{ workspaceId: string; ideaId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  // 状態管理（元のまま）
  const [ideaInfo, setIdeaInfo] = useState<IdeaInfo | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'period' | 'todo' | 'notTodo' | 'budget'>('period')
  // フォーム関連の削除された状態は削除
  // const [isSubmitting, setIsSubmitting] = useState(false)  削除
  const [adoptingProposalId, setAdoptingProposalId] = useState<string | null>(null)
  const [deletingProposalId, setDeletingProposalId] = useState<string | null>(null)
  const [isDeciding, setIsDeciding] = useState(false);
  const [returningProposalId, setReturningProposalId] = useState<string | null>(null)
  
  // フォームデータの削除（元の手動管理を削除）
  // const [proposalForm, setProposalForm] = useState<ProposalFormData>({...})  削除
  
    // リファクタリング：各タブ用のuseFormフック
    const periodForm = useForm<PeriodFormData>({
    initialValues: { startDate: '', endDate: '' },
    validationRules: {
        startDate: { required: true, displayName: '開始日' },
        endDate: { required: true, displayName: '終了日' }
    }
    })

    const todoForm = useForm<TextFormData>({
    initialValues: { text: '' },
    validationRules: {
        text: { required: true, maxLength: 500, displayName: 'やりたいこと' }
    }
    })

    const notTodoForm = useForm<TextFormData>({
    initialValues: { text: '' },
    validationRules: {
        text: { required: true, maxLength: 500, displayName: 'やらなくても良いこと' }
    }
    })

    const budgetForm = useForm<TextFormData>({
    initialValues: { text: '' },
    validationRules: {
        text: { required: true, maxLength: 500, displayName: '想定予算' }
    }
    })

  // アイデア情報の取得（元のまま）
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

  // 提案一覧の取得（元のまま）
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

          if (likesError) {
            console.error('Error fetching likes for proposal:', proposal.id, likesError)
          }

          return {
            ...proposal,
            profiles: {
              username: Array.isArray(proposal.profiles) ? 
                proposal.profiles[0]?.username : 
                proposal.profiles?.username
            },
            // LikeButtonコンポーネント用にidea_likesとして構造を合わせる
            idea_likes: likesError ? [] : (likes || []).map((like: any) => ({
              id: `${proposal.id}-${like.user_id}`,
              idea_id: proposal.id, // proposal_idではなくidea_idとして設定
              user_id: like.user_id,
              created_at: new Date().toISOString(),
              profiles: {
                username: Array.isArray(like.profiles) ? 
                  like.profiles[0]?.username : 
                  like.profiles?.username
              }
            })),
            like_count: likesError ? 0 : (likes || []).length,
            user_has_liked: user ? (likes || []).some((like: any) => like.user_id === user.id) : false
          }
        })
      )

      setProposals(proposalsWithLikes)
    } catch (err) {
      console.error('Error fetching proposals:', err)
      setError('提案の取得に失敗しました')
    }
  }

  // 初期データ読み込み（元のまま）
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

  // フォーム入力の処理（削除 - 元の手動管理方法を削除）
  // const handleFormChange = (tab: string, field: string, value: string) => {...}  削除

  // リファクタリング：提案の送信処理
  const handleProposalSubmit = async (type: 'period' | 'todo' | 'notTodo' | 'budget') => {
    if (!user || !ideaId) return

    let currentForm;
    let formData: any = {};

    // タブごとのフォーム選択とバリデーション
    switch (type) {
      case 'period':
        currentForm = periodForm;
        if (!currentForm.validateAll()) return;
        formData = {
          proposal_type: 'period',
          content: `${currentForm.values.startDate}～${currentForm.values.endDate}`,
          start_date: currentForm.values.startDate,
          end_date: currentForm.values.endDate
        };
        break;
      
      case 'todo':
        currentForm = todoForm;
        if (!currentForm.validateAll()) return;
        formData = {
          proposal_type: 'todo',
          content: currentForm.values.text,
          todo_text: currentForm.values.text
        };
        break;
      
      case 'notTodo':
        currentForm = notTodoForm;
        if (!currentForm.validateAll()) return;
        formData = {
          proposal_type: 'not_todo',
          content: currentForm.values.text,
          not_todo_text: currentForm.values.text
        };
        break;
      
      case 'budget':
        currentForm = budgetForm;
        if (!currentForm.validateAll()) return;
        formData = {
          proposal_type: 'budget',
          content: currentForm.values.text,
          budget_text: currentForm.values.text
        };
        break;
      
      default:
        return;
    }

    currentForm.setSubmitting(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('proposals')
        .insert([{
          idea_id: ideaId,
          proposer_id: user.id,
          ...formData
        }])

      if (error) throw error

      currentForm.reset();
      await fetchProposals();
    } catch (err) {
      console.error('Error submitting proposal:', err)
      setError('提案の送信に失敗しました')
    } finally {
      currentForm.setSubmitting(false);
    }
  }

  // いいねの切り替え（元のまま）
  const handleLikeToggle = async (proposalId: string) => {
    if (!user) return

    try {
      const proposal = proposals.find(p => p.id === proposalId)
      if (!proposal) return

      if (proposal.user_has_liked) {
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

  // 提案の採用（元のまま）
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

  // 提案の削除（元のまま）
  const handleDelete = async (proposalId: string) => {
    if (!user) return

    setDeletingProposalId(proposalId)

    try {
      const { error } = await supabase
        .from('proposals')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', proposalId)

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

    // 決定処理（元のまま）
    const handleDecision = async () => {
        if (!user || !ideaInfo || user.id !== ideaInfo.creator_id) return;
        
        setIsDeciding(true);
        try {
            // アイデアのステータスを 'trying' に更新
            const { error } = await supabase
            .from('ideas')
            .update({ 
                status: 'trying',
                updated_at: new Date().toISOString()
            })
            .eq('id', ideaId);

            if (error) throw error;

            // ホーム画面に戻り、該当アイデアにスクロール
            navigate(`/workspace/${workspaceId}`, { 
                state: { 
                scrollToIdeaId: ideaId,
                message: `「${ideaInfo.idea_name}」を実行に移しました！`
                } 
            });
        } catch (error) {
            console.error('決定エラー:', error);
            alert('決定に失敗しました');
        } finally {
            setIsDeciding(false);
        }
    };

  // 提案を戻す処理（元のまま）
    const handleReturn = async (proposalId: string) => {
    if (!user || !ideaId || !ideaInfo) return

    // アイデアオーナーのみ戻せる
    if (user.id !== ideaInfo.creator_id) {
        setError('この操作は許可されていません')
        return
    }

    setReturningProposalId(proposalId)
    setError(null)

    try {
      // is_adopted を false に、adopted_at と adopted_by をクリアする
      const { error: returnError } = await supabase
        .from('proposals')
        .update({
          is_adopted: false,
          adopted_at: null,
          adopted_by: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', proposalId)
        .eq('idea_id', ideaId) // セキュリティ上、アイデアIDも確認

      if (returnError) {
        console.error('Return error:', returnError)
        throw returnError
      }

      // 提案一覧を再取得
      await fetchProposals()
      
    } catch (err) {
      console.error('Error returning proposal:', err)
      setError('提案の取り消しに失敗しました')
    } finally {
      setReturningProposalId(null)
    }
  }

  // ローディング・エラー表示（元のまま）
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
    <PageHeader className="discussion-header">
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
    </PageHeader>

      <main className="discussion-main">
        {/* How about? セクション（元の構造を保持） */}
        <section className="how-about-section">
          <h2 className="section-title">How about?</h2>
          <p className="section-description">提案してアイデアを具体化しよう</p>
          
          {/* タブメニュー（元のまま） */}
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

          {/* タブコンテンツ（フォーム部分のみリファクタリング） */}
          <div className="tab-contents">
            {/* いつから？ */}
            {activeTab === 'period' && (
              <div className="tab-content active">
                <h3 className="tab-title">実施希望時期</h3>
                <div className="proposal-registration-form">
                  <FormField
                    type="date"
                    placeholder="開始日"
                    className="input-field"
                    {...periodForm.getFieldProps('startDate')}
                  />
                  <FormField
                    type="date"
                    placeholder="終了日"
                    className="input-field"
                    {...periodForm.getFieldProps('endDate')}
                  />

                  <button
                    onClick={() => handleProposalSubmit('period')}
                    disabled={periodForm.isSubmitting}
                    className="btn-primary"
                  >
                    {periodForm.isSubmitting ? '提案中...' : '提案'}
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
                    <FormField
                      type="textarea"
                      placeholder="やりたいことを記入"
                      className="input-field textarea-field"
                      rows={4}
                      maxLength={500}
                      showCharCount={true}
                      {...todoForm.getFieldProps('text')}
                    />
                  </div>

                  <button
                    onClick={() => handleProposalSubmit('todo')}
                    disabled={todoForm.isSubmitting}
                    className="btn-primary"
                  >
                    {todoForm.isSubmitting ? '提案中...' : '提案'}
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
                    <FormField
                      type="textarea"
                      placeholder="やらなくても良いことを記入"
                      className="input-field textarea-field"
                      rows={4}
                      maxLength={500}
                      showCharCount={true}
                      {...notTodoForm.getFieldProps('text')}
                    />
                  </div>

                  <button
                    onClick={() => handleProposalSubmit('notTodo')}
                    disabled={notTodoForm.isSubmitting}
                    className="btn-primary"
                  >
                    {notTodoForm.isSubmitting ? '提案中...' : '提案'}
                  </button>
                </div>
              </div>
            )}

            {/* 想定予算 */}
            {activeTab === 'budget' && (
            <div className="tab-content active">
                <h3 className="tab-title">想定予算</h3>
                <BudgetProposalForm
                budgetForm={budgetForm}
                onSubmit={() => handleProposalSubmit('budget')}
                isSubmitting={budgetForm.isSubmitting}
                />
            </div>
            )}
          </div>
        </section>

    {/* 提案一覧セクション（元のまま） */}
    <section className="proposals-section">
    <h3 className="proposals-title">Go for it</h3>
    <p className="proposals-description">提案を採用しよう</p>
    
    {/* タブ別提案表示 */}
    <div className="proposals-by-type">
        {/* 実施時期の提案 */}
        <div className="proposal-type-section">
        <h4 className="proposal-type-title">実施時期</h4>
        <div className="proposal-cards">
            {proposals
            .filter(p => p.proposal_type === 'period' && !p.is_adopted)
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
            {proposals.filter(p => p.proposal_type === 'period' && !p.is_adopted).length === 0 && (
            <p className="no-proposals">実施時期の提案はまだありません</p>
            )}
        </div>
        </div>

        {/* やりたいことの提案 */}
        <div className="proposal-type-section">
        <h4 className="proposal-type-title">やりたいこと</h4>
        <div className="proposal-cards">
            {proposals
            .filter(p => p.proposal_type === 'todo' && !p.is_adopted)
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
            {proposals.filter(p => p.proposal_type === 'todo' && !p.is_adopted).length === 0 && (
            <p className="no-proposals">やりたいことの提案はまだありません</p>
            )}
        </div>
        </div>

        {/* やらなくても良いことの提案 */}
        <div className="proposal-type-section">
        <h4 className="proposal-type-title">やらなくても良いこと</h4>
        <div className="proposal-cards">
            {proposals
            .filter(p => p.proposal_type === 'not_todo' && !p.is_adopted)
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
            {proposals.filter(p => p.proposal_type === 'not_todo' && !p.is_adopted).length === 0 && (
            <p className="no-proposals">やらなくても良いことの提案はまだありません</p>
            )}
        </div>
        </div>

        {/* 想定予算の提案 */}
        <div className="proposal-type-section">
        <h4 className="proposal-type-title">想定予算</h4>
        <div className="proposal-cards">
            {proposals
            .filter(p => p.proposal_type === 'budget' && !p.is_adopted)
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
            {proposals.filter(p => p.proposal_type === 'budget' && !p.is_adopted).length === 0 && (
            <p className="no-proposals">想定予算の提案はまだありません</p>
            )}
        </div>
        </div>
    </div>
    </section>
    {/* 採用された提案セクション（元のまま） */}
        <section className="adopted-proposals-section">
        <h3 className="adopted-proposals-title">Let's go with that!</h3>
          <p className="adopted-proposals-description">採用された提案を実行しよう</p>
          
          <div className="adopted-proposals-by-type">
            {/* 採用された実施時期の提案 */}
            <div className="proposal-type-section">
              <h4 className="proposal-type-title">実施時期</h4>
              <div className="proposal-cards">
                {proposals
                  .filter(p => p.proposal_type === 'period' && p.is_adopted)
                  .map(proposal => (
                    <div key={proposal.id} className="proposal-card adopted-card">
                      <div className="proposal-content">
                        <p>{proposal.start_date && proposal.end_date ? 
                          `${new Date(proposal.start_date).toLocaleDateString('ja-JP')} 〜 ${new Date(proposal.end_date).toLocaleDateString('ja-JP')}` : 
                          proposal.content}
                        </p>
                      </div>
                      <div className="proposal-header">
                        <span className="proposal-owner">by {proposal.profiles.username}</span>
                      </div>
                      
                      <div className="proposal-actions adopted-actions">
                        {/* 戻すボタン（アイデアオーナーのみ） */}
                        {user?.id === ideaInfo.creator_id && (
                          <button 
                            className="btn-return"
                            onClick={() => handleReturn(proposal.id)}
                            disabled={returningProposalId === proposal.id}
                          >
                            {returningProposalId === proposal.id ? '提案へ戻し中...' : '提案へ戻す'}
                          </button>
                        )}
                        
                        {/* 削除ボタン（提案者のみ） */}
                        <DeleteButton
                          item={proposal}
                          currentUser={user}
                          creatorId={proposal.proposer_id}
                          isDeleting={deletingProposalId === proposal.id}
                          onDelete={handleDelete}
                        />
                      </div>
                    </div>
                  ))}
                {proposals.filter(p => p.proposal_type === 'period' && p.is_adopted).length === 0 && (
                  <p className="no-proposals">採用された実施時期はありません</p>
                )}
              </div>
            </div>

            {/* 採用されたやりたいことの提案 */}
            <div className="proposal-type-section">
              <h4 className="proposal-type-title">やりたいこと</h4>
              <div className="proposal-cards">
                {proposals
                  .filter(p => p.proposal_type === 'todo' && p.is_adopted)
                  .map(proposal => (
                    <div key={proposal.id} className="proposal-card adopted-card">
                      <div className="proposal-content">
                        <p>{proposal.todo_text || proposal.content}</p>
                      </div>
                      <div className="proposal-header">
                        <span className="proposal-owner">by {proposal.profiles.username}</span>
                      </div>
                      
                      <div className="proposal-actions adopted-actions">
                        {user?.id === ideaInfo.creator_id && (
                          <button 
                            className="btn-return"
                            onClick={() => handleReturn(proposal.id)}
                            disabled={returningProposalId === proposal.id}
                          >
                            {returningProposalId === proposal.id ? '提案へ戻し中...' : '提案へ戻す'}
                          </button>
                        )}
                        
                        <DeleteButton
                          item={proposal}
                          currentUser={user}
                          creatorId={proposal.proposer_id}
                          isDeleting={deletingProposalId === proposal.id}
                          onDelete={handleDelete}
                        />
                      </div>
                    </div>
                  ))}
                {proposals.filter(p => p.proposal_type === 'todo' && p.is_adopted).length === 0 && (
                  <p className="no-proposals">採用されたやりたいことはありません</p>
                )}
              </div>
            </div>

            {/* 採用されたやらなくても良いことの提案 */}
            <div className="proposal-type-section">
              <h4 className="proposal-type-title">やらなくても良いこと</h4>
              <div className="proposal-cards">
                {proposals
                  .filter(p => p.proposal_type === 'not_todo' && p.is_adopted)
                  .map(proposal => (
                    <div key={proposal.id} className="proposal-card adopted-card">
                      <div className="proposal-content">
                        <p>{proposal.not_todo_text || proposal.content}</p>
                      </div>
                      <div className="proposal-header">
                        <span className="proposal-owner">by {proposal.profiles.username}</span>
                      </div>
                      
                      <div className="proposal-actions adopted-actions">
                        {user?.id === ideaInfo.creator_id && (
                          <button 
                            className="btn-return"
                            onClick={() => handleReturn(proposal.id)}
                            disabled={returningProposalId === proposal.id}
                          >
                            {returningProposalId === proposal.id ? '提案へ戻し中...' : '提案へ戻す'}
                          </button>
                        )}
                        
                        <DeleteButton
                          item={proposal}
                          currentUser={user}
                          creatorId={proposal.proposer_id}
                          isDeleting={deletingProposalId === proposal.id}
                          onDelete={handleDelete}
                        />
                      </div>
                    </div>
                  ))}
                {proposals.filter(p => p.proposal_type === 'not_todo' && p.is_adopted).length === 0 && (
                  <p className="no-proposals">採用されたやらなくても良いことはありません</p>
                )}
              </div>
            </div>

            {/* 採用された想定予算の提案 */}
            <div className="proposal-type-section">
              <h4 className="proposal-type-title">想定予算</h4>
              <div className="proposal-cards">
                {proposals
                  .filter(p => p.proposal_type === 'budget' && p.is_adopted)
                  .map(proposal => (
                    <div key={proposal.id} className="proposal-card adopted-card">
                      <div className="proposal-content">
                        <p>{proposal.budget_text || proposal.content}</p>
                      </div>
                      <div className="proposal-header">
                        <span className="proposal-owner">by {proposal.profiles.username}</span>
                      </div>
                      
                      <div className="proposal-actions adopted-actions">
                        {user?.id === ideaInfo.creator_id && (
                          <button 
                            className="btn-return"
                            onClick={() => handleReturn(proposal.id)}
                            disabled={returningProposalId === proposal.id}
                          >
                            {returningProposalId === proposal.id ? '提案へ戻し中...' : '提案へ戻す'}
                          </button>
                        )}
                        
                        <DeleteButton
                          item={proposal}
                          currentUser={user}
                          creatorId={proposal.proposer_id}
                          isDeleting={deletingProposalId === proposal.id}
                          onDelete={handleDelete}
                        />
                      </div>
                    </div>
                  ))}
                {proposals.filter(p => p.proposal_type === 'budget' && p.is_adopted).length === 0 && (
                  <p className="no-proposals">採用された想定予算はありません</p>
                )}
              </div>
            </div>
          </div>

          {/* 決定ボタン（アイデアオーナーのみ、採用された提案がある場合のみ表示） */}
          {user?.id === ideaInfo.creator_id && 
           proposals.some(p => p.is_adopted) && (
            <div className="decision-button-container">
              <button
                className="btn-primary decision-button"
                onClick={handleDecision}
                disabled={isDeciding}
              >
                {isDeciding ? '決定中...' : '決定して実行する'}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}