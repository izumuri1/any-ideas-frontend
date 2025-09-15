// src/pages/Home.tsx
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { HamburgerMenu } from '../components/HamburgerMenu'
import { LikeButton, type LikeableItem } from '../components/LikeButton'
import { DeleteButton } from '../components/DeleteButton'
import PageHeader from '../components/PageHeader'
import { MembersList } from '../components/MembersList'
import './Home.scss'

// 型定義
interface WorkspaceInfo {
  id: string
  name: string
  owner_id: string
  owner_username: string
}

interface IdeaFormData {
  idea_name: string
  when_text: string
  who_text: string
  what_text: string
}

interface Idea extends LikeableItem {
  idea_name: string
  when_text: string | null
  who_text: string | null
  what_text: string
  creator_id: string
  status: string
  created_at: string
  profiles: {
    username: string
  }
}

interface IdeaCardProps {
  idea: Idea
  currentUser: any
  onProceed?: (ideaId: string) => void
  onDelete: (ideaId: string) => void
  onLikeToggle?: (ideaId: string) => void
  onDiscussion?: (ideaId: string) => void
  proceedingIdeaId: string | null
  deletingIdeaId: string | null
  showProceedButton?: boolean
  onViewDetails?: (ideaId: string) => void
  showDetailsButton?: boolean
}


// 強化されたアイデアカードコンポーネント
function EnhancedIdeaCard({ 
  idea, 
  currentUser, 
  onProceed, 
  onDelete, 
  onLikeToggle,
  onDiscussion, 
  onViewDetails,  // 追加
  proceedingIdeaId, 
  deletingIdeaId,
  showProceedButton = false,
  showDetailsButton = false  // 追加
}: IdeaCardProps) {
  const isOwner = currentUser && currentUser.id === idea.creator_id

  return (
    <div className="idea-card">
    <div className="idea-header">
      <h3 className="idea-name">{idea.idea_name}</h3>
      <span className="idea-owner">by {idea.profiles.username}</span>
    </div>

    <div className="idea-details">
      {idea.when_text && (
        <div className="idea-detail">
          <span className="detail-value">{idea.when_text}</span>
        </div>
      )}
      
      {idea.who_text && (
        <div className="idea-detail">
          <span className="detail-value">{idea.who_text}</span>
        </div>
      )}
      
      <div className="idea-detail">
        <span className="detail-value">{idea.what_text}</span>
      </div>
    </div>
      
      <div className="idea-actions">
        <LikeButton 
          item={idea}
          currentUser={currentUser}
          onLikeToggle={onLikeToggle}
        />
        
        {/* 進めるボタン（Our ideas用） */}
        {isOwner && showProceedButton && onProceed && (
          <button 
            className="btn-proceed"
            onClick={() => onProceed(idea.id)}
            disabled={proceedingIdeaId === idea.id}
          >
            {proceedingIdeaId === idea.id ? '検討を進める中...' : '検討を進める'}
          </button>
        )}
        
        {/* 検討ボタン（Ideas we're thinking about用）- 条件を更新 */}
        {!showProceedButton && !showDetailsButton && onDiscussion && (
          <button 
            className="btn-proceed"
            onClick={() => onDiscussion(idea.id)}
          >
            具体的に検討する
          </button>
        )}
  
        {/* 詳細ボタン（Ideas we're trying用）- 新規追加 */}
        {showDetailsButton && onViewDetails && (
          <button 
            className="btn-proceed"
            onClick={() => onViewDetails(idea.id)}
          >
            詳細
          </button>
        )}

        <DeleteButton
          item={idea}
          currentUser={currentUser}
          creatorId={idea.creator_id}
          isDeleting={deletingIdeaId === idea.id}
          onDelete={onDelete}
        />
      </div>
    </div>
  )
}


export default function Home() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()  // 検討画面遷移のために追加
  const location = useLocation()
  const tryingIdeasRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  const getCurrentYearMonth = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    return `${year}年${month}月`
  }

  const generateWhenOptions = () => {
    const options = []
    for (let year = 2025; year <= 2099; year++) {
      for (let month = 1; month <= 12; month++) {
        options.push(`${year}年${month}月`)
      }
    }
    return options
  }

  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [ideaForm, setIdeaForm] = useState<IdeaFormData>({
    idea_name: '',
    when_text: getCurrentYearMonth(),
    who_text: '',
    what_text: ''
  })
  const [isSubmittingIdea, setIsSubmittingIdea] = useState(false)
  const [ideaSubmitError, setIdeaSubmitError] = useState<string | null>(null)

  const [ideas, setIdeas] = useState<Idea[]>([])
  const [thinkingIdeas, setThinkingIdeas] = useState<Idea[]>([])
  const [tryingIdeas, setTryingIdeas] = useState<Idea[]>([])
  const [loadingIdeas, setLoadingIdeas] = useState(false)

  const [deletingIdeaId, setDeletingIdeaId] = useState<string | null>(null)
  const [proceedingIdeaId, setProceedingIdeaId] = useState<string | null>(null)

  // 検討画面への遷移処理
  const handleDiscussion = (ideaId: string) => {
    navigate(`/workspace/${workspaceId}/discussion/${ideaId}`)
  }

  // 詳細画面への遷移処理
  const handleViewDetails = (ideaId: string) => {
    navigate(`/workspace/${workspaceId}/idea/${ideaId}/detail`)
  }

  const fetchIdeasByStatus = async (status: string): Promise<Idea[]> => {
    if (!workspaceId) throw new Error('ワークスペースIDが不正です')

    const { data, error } = await supabase
      .from('ideas')
      .select(`
        id,
        idea_name,
        when_text,
        who_text,
        what_text,
        creator_id,
        status,
        created_at,
        profiles:creator_id (username),
        idea_likes (
          id,
          idea_id,
          user_id,
          created_at,
          profiles:user_id (username)
        )
      `)
      .eq('workspace_id', workspaceId)
      .eq('status', status)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(`${status}アイデア取得エラー:`, error)
      throw error
    }

    return (data || []).map(item => ({
      id: item.id,
      idea_name: item.idea_name,
      when_text: item.when_text,
      who_text: item.who_text,
      what_text: item.what_text,
      creator_id: item.creator_id,
      status: item.status,
      created_at: item.created_at,
      profiles: {
        username: (item.profiles as any)?.username || 'Unknown'
      },
      idea_likes: (item.idea_likes || []).map((like: any) => ({
        id: like.id,
        idea_id: like.idea_id,
        user_id: like.user_id,
        created_at: like.created_at,
        profiles: {
          username: Array.isArray(like.profiles) ? like.profiles[0]?.username || 'Unknown' : like.profiles?.username || 'Unknown'
        }
      })),
      like_count: item.idea_likes?.length || 0,
      user_has_liked: user ? item.idea_likes?.some((like: any) => like.user_id === user.id) || false : false
    }))
  }

  const handleError = (error: any, message: string) => {
    console.error(message, error)
    alert(message)
  }

  const fetchAllIdeas = async () => {
    if (!workspaceId) return

    try {
      setLoadingIdeas(true)
      
      const [ourIdeasData, thinkingIdeasData, tryingIdeasData] = await Promise.all([
        fetchIdeasByStatus('our_ideas'),
        fetchIdeasByStatus('thinking_about'),
        fetchIdeasByStatus('trying')
      ])

      setIdeas(ourIdeasData)
      setThinkingIdeas(thinkingIdeasData)
      setTryingIdeas(tryingIdeasData)

    } catch (error) {
      handleError(error, 'アイデア一覧の取得に失敗しました')
    } finally {
      setLoadingIdeas(false)
    }
  }

  // Home.tsx の handleLikeToggle 関数を楽観的更新版に修正
  const handleLikeToggle = async (ideaId: string) => {
    if (!user) return

    try {
      // ★ 楽観的更新：DB更新前にローカルstateを先に更新
      const updateIdeasOptimistically = (ideas: Idea[]) => 
        ideas.map(idea => {
          if (idea.id === ideaId) {
            const currentlyLiked = idea.user_has_liked
            const currentCount = idea.like_count || 0
            
            return {
              ...idea,
              user_has_liked: !currentlyLiked,
              like_count: currentlyLiked ? currentCount - 1 : currentCount + 1,
              // idea_likesも適切に更新
              idea_likes: currentlyLiked 
                ? // いいね取り消し：現在のユーザーのいいねを削除
                  idea.idea_likes?.filter(like => like.user_id !== user.id) || []
                : // いいね追加：新しいいいねを追加
                  [...(idea.idea_likes || []), { 
                    id: 'temp-' + Date.now(), // 一時的なID
                    idea_id: ideaId, 
                    user_id: user.id, 
                    created_at: new Date().toISOString(),
                    profiles: { 
                      username: user.user_metadata?.username || user.email?.split('@')[0] || 'Unknown' 
                    }
                  }]
            }
          }
          return idea
        })

      // 両方のstateを楽観的に更新（即座にUI反映）
      setIdeas(prev => updateIdeasOptimistically(prev))
      setThinkingIdeas(prev => updateIdeasOptimistically(prev))

      // ★ ここからDB更新処理（既存のロジック）
      const { data: existingLike, error: checkError } = await supabase
        .from('idea_likes')
        .select('id')
        .eq('idea_id', ideaId)
        .eq('user_id', user.id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existingLike) {
        // いいね削除
        const { error } = await supabase
          .from('idea_likes')
          .delete()
          .eq('idea_id', ideaId)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        // いいね追加
        const { error } = await supabase
          .from('idea_likes')
          .insert({
            idea_id: ideaId,
            user_id: user.id
          })

        if (error) throw error
      }

      // ★ 成功時：楽観的更新で十分なので fetchAllIdeas() は呼ばない
      // 必要に応じて正確なデータで検証したい場合のみ以下をコメントアウト
      // await fetchAllIdeas()

    } catch (error) {
      // ★ エラー時のみ：全データ再取得でロールバック
      console.error('いいねの操作でエラーが発生しました:', error)
      
      // UIを元の状態に戻すために全データを再取得
      await fetchAllIdeas()
      
      // ユーザーにエラーを通知（オプション）
      // alert('いいねの処理中にエラーが発生しました。再度お試しください。')
    }
  }

  useEffect(() => {
    const fetchWorkspaceInfo = async () => {
      if (!workspaceId) {
        setError('ワークスペースIDが不正です')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const { data, error } = await supabase
          .from('workspaces')
          .select(`
            id,
            name,
            owner_id,
            profiles:owner_id (username)
          `)
          .eq('id', workspaceId)
          .single()

        if (error) throw error

        if (!data) {
          throw new Error('ワークスペースが見つかりません')
        }

        setWorkspaceInfo({
          id: data.id,
          name: data.name,
          owner_id: data.owner_id,
          owner_username: (data.profiles as any)?.username || 'Unknown'
        })
      } catch (error: any) {
        console.error('ワークスペース情報の取得でエラーが発生しました:', error)
        setError(error.message || 'ワークスペース情報の取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchWorkspaceInfo()
  }, [workspaceId])

  useEffect(() => {
    fetchAllIdeas()
  }, [workspaceId])

  useEffect(() => {
    const state = location.state as { scrollToIdeaId?: string; message?: string } | null;
    if (state?.scrollToIdeaId) {
      // アイデアデータが読み込まれるまで待つ
      const scrollToTarget = () => {
        const targetElement = tryingIdeasRefs.current[state.scrollToIdeaId!];
        if (targetElement) {
          // スクロール前に少し時間を置く（アニメーション効果）
          setTimeout(() => {
            targetElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
            
            // ハイライト効果（オプション）
            targetElement.style.transition = 'box-shadow 0.3s ease';
            targetElement.style.boxShadow = '0 4px 20px rgba(255, 193, 7, 0.5)';
            setTimeout(() => {
              targetElement.style.boxShadow = '';
            }, 2000);
          }, 300);
          
          // 状態をクリアして再スクロールを防ぐ
          window.history.replaceState({}, document.title);
        }
      };

      // tryingIdeasが読み込まれるまで待つ
      if (tryingIdeas.length > 0) {
        scrollToTarget();
      } else {
        // データ読み込み待ち
        const timeout = setTimeout(scrollToTarget, 500);
        return () => clearTimeout(timeout);
      }
    }
  }, [location.state, tryingIdeas]);

  const handleIdeaFormChange = (field: keyof IdeaFormData, value: string) => {
    setIdeaForm(prev => ({
      ...prev,
      [field]: value
    }))
    if (ideaSubmitError) {
      setIdeaSubmitError(null)
    }
  }

  const handleIdeaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!workspaceId || !user) return
    
    if (!ideaForm.idea_name.trim()) {
      setIdeaSubmitError('アイデア名は必須です')
      return
    }
    
    if (!ideaForm.what_text.trim()) {
      setIdeaSubmitError('何をしたい？は必須です')
      return
    }

    setIsSubmittingIdea(true)
    setIdeaSubmitError(null)

    try {
      const { error } = await supabase
        .from('ideas')
        .insert({
          workspace_id: workspaceId,
          creator_id: user.id,
          idea_name: ideaForm.idea_name.trim(),
          when_text: ideaForm.when_text.trim() || null,
          who_text: ideaForm.who_text.trim() || null,
          what_text: ideaForm.what_text.trim(),
          status: 'our_ideas'
        })

      if (error) throw error

      setIdeaForm({
        idea_name: '',
        when_text: getCurrentYearMonth(),
        who_text: '',
        what_text: ''
      })

      await fetchAllIdeas()

    } catch (error: any) {
      console.error('アイデア登録でエラーが発生しました:', error)
      setIdeaSubmitError('アイデアの登録に失敗しました')
    } finally {
      setIsSubmittingIdea(false)
    }
  }

  const handleIdeaDelete = async (ideaId: string) => {
      if (!user) return
      
      // 修正: tryingIdeas も含めて検索するように変更
      const ideaToDelete = [...ideas, ...thinkingIdeas, ...tryingIdeas].find(idea => idea.id === ideaId)
      if (!ideaToDelete || ideaToDelete.creator_id !== user.id) {
        alert('自分が作成したアイデアのみ削除できます')
        return
      }

      setDeletingIdeaId(ideaId)
      try {
        const { error } = await supabase
          .from('ideas')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', ideaId)

        if (error) throw error
        await fetchAllIdeas()
      } catch (error) {
        console.error('アイデア削除でエラーが発生しました:', error)
      } finally {
        setDeletingIdeaId(null)
      }
    }

  const handleIdeaProceed = async (ideaId: string) => {
    if (!user) return

    setProceedingIdeaId(ideaId)
    try {
      const { error } = await supabase
        .from('ideas')
        .update({ 
          status: 'thinking_about',
          moved_to_thinking_at: new Date().toISOString()
        })
        .eq('id', ideaId)
        .eq('creator_id', user.id)

      if (error) throw error

      await fetchAllIdeas()
    } catch (error) {
      console.error('アイデア進める処理でエラーが発生しました:', error)
    } finally {
      setProceedingIdeaId(null)
    }
  }

  if (loading) {
    return (
      <div className="home-container">
        <header className="home-header">
          <div className="header">
            <HamburgerMenu currentPage="home" />
            <div className="workspace-info">
              <p className="loading-text">読み込み中...</p>
            </div>
          </div>
        </header>
      </div>
    )
  }

  if (error || !workspaceInfo) {
    return (
      <div className="home-container">
        <header className="home-header">
          <div className="header">
            <HamburgerMenu currentPage="home" />
            <div className="workspace-info">
              <p className="error-text">{error}</p>
            </div>
          </div>
        </header>
      </div>
    )
  }

  return (
    <div className="home-container">
      <PageHeader className="home-header">
        <HamburgerMenu currentPage="home" />
        
        <div className="workspace-info">
          {workspaceInfo && (
            <>
              <div className="workspace-name">
                <span className="label">ワークスペース名：</span>
                <span className="value">{workspaceInfo.name}</span>
              </div>
              <div className="workspace-owner">
                <span className="label">ワークスペースオーナー：</span>
                <span className="value">{workspaceInfo.owner_username}</span>
              </div>
            </>
          )}
        </div>
      </PageHeader>

      <main className="home-main">
        <section className="idea-form-section">
          <div className="idea-form">
            <div className="logo-title-section">
              <div className="logo-title-row">
                <img 
                  src="/icons/icon-48x48.png" 
                  alt="Any ideas? ロゴ"
                  className="app-logo"
                  width="48"
                  height="48"
                />
                <h1 className="app-title">Any ideas?</h1>
              </div>
              
              <p className="app-description">
                いつ頃？誰と？何をしたい？アイデアを登録しよう
              </p>
            </div>

            <form onSubmit={handleIdeaSubmit} className="idea-registration-form">
              {ideaSubmitError && (
                <div className="error-message" role="alert">
                  {ideaSubmitError}
                </div>
              )}

              <div className="form-row">
                <input
                  type="text"
                  placeholder="アイデア名"
                  value={ideaForm.idea_name}
                  onChange={(e) => handleIdeaFormChange('idea_name', e.target.value)}
                  className="input-field"
                  maxLength={100}
                  required
                />
              </div>

              <div className="form-row">
                <select
                  value={ideaForm.when_text}
                  onChange={(e) => handleIdeaFormChange('when_text', e.target.value)}
                  className="input-field"
                >
                  <option value="">いつ頃？</option>
                  {generateWhenOptions().map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <input
                  type="text"
                  placeholder="誰と？"
                  value={ideaForm.who_text}
                  onChange={(e) => handleIdeaFormChange('who_text', e.target.value)}
                  className="input-field"
                  maxLength={500}
                />
              </div>

              <div className="form-row">
                <textarea
                  placeholder="何をしたい？"
                  value={ideaForm.what_text}
                  onChange={(e) => handleIdeaFormChange('what_text', e.target.value)}
                  className="input-field textarea-field"
                  rows={3}
                  maxLength={500}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingIdea}
                className="btn-primary"
              >
                {isSubmittingIdea ? 'アイデア登録中...' : 'アイデア登録'}
              </button>
            </form>
          </div>
        </section>

        <section className="ideas-zone our-ideas">
          <h2 className="zone-title">Our ideas</h2>
          <p className="zone-description">みんなの共感が得られたら検討を進めよう</p>
          <div className="ideas-cards">
            {loadingIdeas ? (
              <p>アイデア読み込み中...</p>
            ) : ideas.length === 0 ? (
              <p>まだアイデアがありません。最初のアイデアを投稿してみましょう！</p>
            ) : (
              ideas.map((idea) => (
                <EnhancedIdeaCard
                  key={idea.id}
                  idea={idea}
                  currentUser={user}
                  onProceed={handleIdeaProceed}
                  onDelete={handleIdeaDelete}
                  onLikeToggle={handleLikeToggle}
                  proceedingIdeaId={proceedingIdeaId}
                  deletingIdeaId={deletingIdeaId}
                  showProceedButton={true}
                />
              ))
            )}
          </div>
        </section>

        <section className="ideas-zone thinking-about">
          <h2 className="zone-title">Ideas we're thinking about</h2>
          <p className="zone-description">アイデアを具体的に検討しよう</p>
          <div className="ideas-cards">
            {thinkingIdeas.length === 0 ? (
              <p>検討中のアイデアはありません。Our ideasから進めてみましょう！</p>
            ) : (
              thinkingIdeas.map((idea) => (
              <EnhancedIdeaCard
                key={idea.id}
                idea={idea}
                currentUser={user}
                onDelete={handleIdeaDelete}
                onLikeToggle={handleLikeToggle}
                onDiscussion={handleDiscussion}
                proceedingIdeaId={proceedingIdeaId}
                deletingIdeaId={deletingIdeaId}
                showProceedButton={false}
              />
              ))
            )}
          </div>
        </section>

        <section className="ideas-zone trying">
          <h2 className="zone-title">Ideas we're trying</h2>
          <p className="zone-description">これまでに検討したアイデアを確認しよう</p>
          <div className="ideas-cards">
            {tryingIdeas.length === 0 ? (
              <p>実行中のアイデアはありません。検討を進めてみましょう！</p>
            ) : (
              tryingIdeas.map((idea) => (
                <div 
                  key={idea.id}
                  ref={(el) => {
                    tryingIdeasRefs.current[idea.id] = el;
                  }}
                  className="idea-card-wrapper"
                  data-idea-id={idea.id}
                >
                <EnhancedIdeaCard
                  idea={idea}
                  currentUser={user}
                  onDelete={handleIdeaDelete}
                  onLikeToggle={handleLikeToggle}
                  onViewDetails={handleViewDetails}
                  proceedingIdeaId={proceedingIdeaId}
                  deletingIdeaId={deletingIdeaId}
                  showProceedButton={false}
                  showDetailsButton={true}
                />
                </div>
              ))
            )}
          </div>
        </section>

        {workspaceId && <MembersList workspaceId={workspaceId} />}
      </main>
    </div>
  )
}