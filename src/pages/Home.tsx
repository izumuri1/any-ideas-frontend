// src/pages/Home.tsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { HamburgerMenu } from '../components/HamburgerMenu'
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

interface IdeaLike {
  id: string
  idea_id: string
  user_id: string
  created_at: string
  profiles: {
    username: string
  }
}

interface Idea {
  id: string
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
  idea_likes?: IdeaLike[]
  like_count?: number
  user_has_liked?: boolean
}

interface IdeaCardProps {
  idea: Idea
  currentUser: any
  onProceed?: (ideaId: string) => void
  onDelete: (ideaId: string) => void
  onLikeToggle?: (ideaId: string) => void
  proceedingIdeaId: string | null
  deletingIdeaId: string | null
  showProceedButton?: boolean
}

// 追加：Members sharing ideas用の型定義
interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: string
  joined_at: string
  profiles: {
    username: string
  }
}

// 強化されたアイデアカードコンポーネント
function EnhancedIdeaCard({ 
  idea, 
  currentUser, 
  onProceed, 
  onDelete, 
  onLikeToggle,
  proceedingIdeaId, 
  deletingIdeaId,
  showProceedButton = false 
}: IdeaCardProps) {
  const [liking, setLiking] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const isOwner = currentUser && currentUser.id === idea.creator_id

  // いいねのトグル処理
  const handleLikeToggle = async () => {
    if (!currentUser || liking || !onLikeToggle) return

    setLiking(true)
    try {
      await onLikeToggle(idea.id)
    } finally {
      setLiking(false)
    }
  }

  // いいねしたユーザー一覧のツールチップ
  const renderLikeTooltip = () => {
    if (!showTooltip || !idea.like_count || idea.like_count === 0) return null

    return (
      <div className="like-tooltip">
        <div className="tooltip-content">
          {idea.idea_likes?.map((like, index) => (
            <span key={like.id}>
              {like.profiles.username}
              {index < (idea.idea_likes?.length || 0) - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
      </div>
    )
  }

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
        {/* 強化されたいいねボタン */}
        <div 
          className="like-section"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <button
            className={`like-button ${idea.user_has_liked ? 'liked' : ''} ${liking ? 'liking' : ''}`}
            onClick={handleLikeToggle}
            disabled={liking || !currentUser}
            title={idea.user_has_liked ? 'いいねを取り消す' : 'いいねする'}
          >
            {idea.user_has_liked ? '♥' : '♡'} {idea.like_count || 0}
          </button>
          {renderLikeTooltip()}
        </div>
        
        {/* 進めるボタン */}
        {isOwner && showProceedButton && onProceed && (
          <button 
            className="btn-proceed"
            onClick={() => onProceed(idea.id)}
            disabled={proceedingIdeaId === idea.id}
          >
            {proceedingIdeaId === idea.id ? '進める中...' : '進める'}
          </button>
        )}
        
        {/* 検討ボタン（Ideas we're thinking about用） */}
        {!showProceedButton && (
          <button className="btn-proceed">検討</button>
        )}
        
        {/* 削除ボタン */}
        {isOwner && (
          <button 
            className="btn-delete"
            onClick={() => onDelete(idea.id)}
            disabled={deletingIdeaId === idea.id}
          >
            {deletingIdeaId === idea.id ? '削除中...' : '削除'}
          </button>
        )}
      </div>
    </div>
  )
}

// 追加：Members sharing ideas コンポーネント
function MembersSharingIdeas({ workspaceId }: { workspaceId: string }) {
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkspaceMembers = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('workspace_members')
        .select(`
          id,
          workspace_id,
          user_id,
          role,
          joined_at,
          profiles:user_id (
            username
          )
        `)
        .eq('workspace_id', workspaceId)
        .order('joined_at', { ascending: true }) // メンバーになった順（古い順）

      if (fetchError) {
        throw fetchError
      }

      // データの型を正しく変換してセット
      const formattedMembers: WorkspaceMember[] = (data || []).map((item: any) => ({
        id: item.id,
        workspace_id: item.workspace_id,
        user_id: item.user_id,
        role: item.role,
        joined_at: item.joined_at,
        profiles: {
          username: Array.isArray(item.profiles) ? item.profiles[0]?.username || 'Unknown' : item.profiles?.username || 'Unknown'
        }
      }))
      
      setMembers(formattedMembers)
    } catch (err: any) {
      console.error('メンバー取得エラー:', err)
      setError(err.message || 'メンバー情報の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspaceMembers()
    }
  }, [workspaceId])

  if (loading) {
    return (
      <section className="members-section">
        <h2 className="members-title">Members sharing ideas</h2>
        <div className="members-list">
          <p>メンバー情報を読み込み中...</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="members-section">
        <h2 className="members-title">Members sharing ideas</h2>
        <div className="members-list">
          <p>エラー: {error}</p>
        </div>
      </section>
    )
  }

  if (members.length === 0) {
    return (
      <section className="members-section">
        <h2 className="members-title">Members sharing ideas</h2>
        <div className="members-list">
          <p>まだメンバーがいません</p>
        </div>
      </section>
    )
  }

  return (
    <section className="members-section">
      <h2 className="members-title">Members sharing ideas</h2>
      <div className="members-list">
        {members.map((member, index) => (
          <div key={member.id} className="member-item">
            <span className="member-order">#{index + 1}</span>
            <span className="member-username">{member.profiles.username}</span>
            <span className="member-role">{member.role === 'owner' ? 'オーナー' : 'メンバー'}</span>
            <span className="member-joined">
              {new Date(member.joined_at).toLocaleDateString('ja-JP')}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export function Home() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const { user } = useAuth()

  // 現在の年月を取得する関数
  const getCurrentYearMonth = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    return `${year}年${month}月`
  }

  // 年月オプション生成関数（2025年1月〜2099年12月）
  const generateWhenOptions = () => {
    const options = []
    
    // 2025年1月から2099年12月まで生成
    for (let year = 2025; year <= 2099; year++) {
      for (let month = 1; month <= 12; month++) {
        options.push(`${year}年${month}月`)
      }
    }
    
    return options
  }

  // 状態管理
  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // アイデア登録フォーム用の状態
  const [ideaForm, setIdeaForm] = useState<IdeaFormData>({
    idea_name: '',
    when_text: getCurrentYearMonth(),
    who_text: '',
    what_text: ''
  })
  const [isSubmittingIdea, setIsSubmittingIdea] = useState(false)
  const [ideaSubmitError, setIdeaSubmitError] = useState<string | null>(null)

  // アイデア一覧用の状態
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [thinkingIdeas, setThinkingIdeas] = useState<Idea[]>([])
  const [loadingIdeas, setLoadingIdeas] = useState(false)

  // アクション機能用の状態
  const [deletingIdeaId, setDeletingIdeaId] = useState<string | null>(null)
  const [proceedingIdeaId, setProceedingIdeaId] = useState<string | null>(null)

  // ステータス別アイデア取得用共通関数（いいね情報を含む）
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

    // いいね情報を追加して変換
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

  // エラーハンドリング用共通関数
  const handleError = (error: any, message: string) => {
    console.error(message, error)
    alert(message)
  }

  // アイデア一覧取得関数（既存ロジック保持）
  const fetchAllIdeas = async () => {
    if (!workspaceId) return

    try {
      setLoadingIdeas(true)
      
      const [ourIdeasData, thinkingIdeasData] = await Promise.all([
        fetchIdeasByStatus('our_ideas'),
        fetchIdeasByStatus('thinking_about')
      ])

      setIdeas(ourIdeasData)
      setThinkingIdeas(thinkingIdeasData)

    } catch (error) {
      handleError(error, 'アイデア一覧の取得に失敗しました')
    } finally {
      setLoadingIdeas(false)
    }
  }

  // いいね機能（新規追加）
  const handleLikeToggle = async (ideaId: string) => {
    if (!user) return

    try {
      // 現在のいいね状態を確認
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
        // いいねを削除
        const { error } = await supabase
          .from('idea_likes')
          .delete()
          .eq('idea_id', ideaId)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        // いいねを追加
        const { error } = await supabase
          .from('idea_likes')
          .insert({
            idea_id: ideaId,
            user_id: user.id
          })

        if (error) throw error
      }

      // アイデア一覧を再読み込み
      await fetchAllIdeas()
    } catch (error) {
      console.error('いいねの操作でエラーが発生しました:', error)
    }
  }

  // ワークスペース情報取得
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

  // アイデア一覧初期取得
  useEffect(() => {
    fetchAllIdeas()
  }, [workspaceId])

  // アイデア登録フォームの入力ハンドラ
  const handleIdeaFormChange = (field: keyof IdeaFormData, value: string) => {
    setIdeaForm(prev => ({
      ...prev,
      [field]: value
    }))
    if (ideaSubmitError) {
      setIdeaSubmitError(null)
    }
  }

  // アイデア登録処理
  const handleIdeaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!workspaceId || !user) return
    
    // バリデーション
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

      // フォームをリセット
      setIdeaForm({
        idea_name: '',
        when_text: getCurrentYearMonth(),
        who_text: '',
        what_text: ''
      })

      // アイデア一覧を再読み込み（重要）
      await fetchAllIdeas()

    } catch (error: any) {
      console.error('アイデア登録でエラーが発生しました:', error)
      setIdeaSubmitError('アイデアの登録に失敗しました')
    } finally {
      setIsSubmittingIdea(false)
    }
  }

  // アイデア削除処理
  const handleIdeaDelete = async (ideaId: string) => {
    if (!user) return

    setDeletingIdeaId(ideaId)
    try {
      const { error } = await supabase
        .from('ideas')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', ideaId)
        .eq('creator_id', user.id)

      if (error) throw error

      await fetchAllIdeas()
    } catch (error) {
      console.error('アイデア削除でエラーが発生しました:', error)
    } finally {
      setDeletingIdeaId(null)
    }
  }

  // アイデア進める処理
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

  // ローディング中
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

  // エラー時
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
      {/* 上部メニュー */}
      <header className="home-header">
        <div className="header">
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
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="home-main">
        {/* アイデア登録セクション */}
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

        {/* Our ideas セクション */}
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

        {/* Ideas we're thinking about セクション */}
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
                  proceedingIdeaId={proceedingIdeaId}
                  deletingIdeaId={deletingIdeaId}
                  showProceedButton={false}
                />
              ))
            )}
          </div>
        </section>

        {/* Ideas we're trying セクション */}
        <section className="ideas-zone trying">
          <h2 className="zone-title">Ideas we're trying</h2>
          <p className="zone-description">これまでに検討したアイデアを確認しよう</p>
          <div className="ideas-cards">
            <p>（実行中アイデア一覧は次のステップで実装予定）</p>
          </div>
        </section>

        {/* Members sharing ideas セクション - 追加 */}
        {workspaceId && <MembersSharingIdeas workspaceId={workspaceId} />}
      </main>
    </div>
  )
}