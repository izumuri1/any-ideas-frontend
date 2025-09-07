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
}

interface IdeaCardProps {
  idea: Idea
  currentUser: any
  onProceed?: (ideaId: string) => void
  onDelete: (ideaId: string) => void
  proceedingIdeaId: string | null
  deletingIdeaId: string | null
  showProceedButton?: boolean
}

// アイデアカードコンポーネント
function IdeaCard({ 
  idea, 
  currentUser, 
  onProceed, 
  onDelete, 
  proceedingIdeaId, 
  deletingIdeaId,
  showProceedButton = false 
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
        <span className="like-button">♡ 0</span>
        
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

  // データ変換用共通関数
  const transformIdeaData = (item: any): Idea => ({
    id: item.id,
    idea_name: item.idea_name,
    when_text: item.when_text,
    who_text: item.who_text,
    what_text: item.what_text,
    creator_id: item.creator_id,
    status: item.status,
    created_at: item.created_at,
    profiles: {
      username: item.profiles?.username || 'Unknown'
    }
  })

  // ステータス別アイデア取得用共通関数
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
        profiles!ideas_creator_id_fkey (
          username
        )
      `)
      .eq('workspace_id', workspaceId)
      .eq('status', status)
      .is('deleted_at', null)
      .order('when_text', { ascending: true })

    if (error) {
      console.error(`${status}アイデア取得エラー:`, error)
      throw error
    }

    return (data || []).map(transformIdeaData)
  }

  // エラーハンドリング用共通関数
  const handleError = (error: any, message: string) => {
    console.error(message, error)
    alert(message)
  }

  // アイデア一覧取得関数（統合版）
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

  // ワークスペース情報取得
  useEffect(() => {
    const fetchWorkspaceInfo = async () => {
      if (!workspaceId || !user) return

      try {
        setLoading(true)
        setError(null)

        const { data, error: wsError } = await supabase
          .from('workspaces')
          .select(`
            id,
            name,
            owner_id,
            profiles!workspaces_owner_id_fkey (
              username
            )
          `)
          .eq('id', workspaceId)
          .single()

        if (wsError) {
          console.error('ワークスペース情報取得エラー:', wsError)
          throw wsError
        }

        if (!data) {
          throw new Error('ワークスペースが見つかりません')
        }

        const profiles = data.profiles as any
        setWorkspaceInfo({
          id: data.id,
          name: data.name,
          owner_id: data.owner_id,
          owner_username: profiles?.username || 'Unknown'
        })

      } catch (error) {
        console.error('ワークスペース情報取得エラー:', error)
        setError('ワークスペース情報の取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchWorkspaceInfo()
  }, [workspaceId, user])

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

  // アイデア進める処理
  const handleIdeaProceed = async (ideaId: string) => {
    if (!user) {
      alert('ユーザー情報が不正です')
      return
    }

    if (!window.confirm('このアイデアを検討段階に進めてもよろしいですか？')) {
      return
    }

    try {
      setProceedingIdeaId(ideaId)

      const { error } = await supabase
        .from('ideas')
        .update({ 
          status: 'thinking_about',
          moved_to_thinking_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', ideaId)
        .eq('creator_id', user.id)

      if (error) throw error

      console.log('アイデア進める成功:', ideaId)
      alert('アイデアを検討段階に進めました')
      await fetchAllIdeas()

    } catch (error) {
      handleError(error, 'アイデアを進めることに失敗しました。もう一度お試しください。')
    } finally {
      setProceedingIdeaId(null)
    }
  }

  // アイデア削除処理
  const handleIdeaDelete = async (ideaId: string) => {
    if (!user) {
      alert('ユーザー情報が不正です')
      return
    }

    if (!window.confirm('このアイデアを削除してもよろしいですか？')) {
      return
    }

    try {
      setDeletingIdeaId(ideaId)

      const { error } = await supabase
        .from('ideas')
        .update({ 
          deleted_at: new Date().toISOString()
        })
        .eq('id', ideaId)
        .eq('creator_id', user.id)

      if (error) throw error

      console.log('アイデア削除成功:', ideaId)
      alert('アイデアを削除しました')
      await fetchAllIdeas()

    } catch (error) {
      handleError(error, 'アイデアの削除に失敗しました。もう一度お試しください。')
    } finally {
      setDeletingIdeaId(null)
    }
  }

  // アイデア登録処理
  const handleIdeaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !workspaceId) {
      setIdeaSubmitError('ユーザー情報またはワークスペース情報が不正です')
      return
    }

    if (!ideaForm.idea_name.trim()) {
      setIdeaSubmitError('アイデア名を入力してください')
      return
    }
    if (!ideaForm.what_text.trim()) {
      setIdeaSubmitError('何をしたいかを入力してください')
      return
    }

    try {
      setIsSubmittingIdea(true)
      setIdeaSubmitError(null)

      const { data, error } = await supabase
        .from('ideas')
        .insert([
          {
            workspace_id: workspaceId,
            creator_id: user.id,
            idea_name: ideaForm.idea_name.trim(),
            when_text: ideaForm.when_text.trim() || null,
            who_text: ideaForm.who_text.trim() || null,
            what_text: ideaForm.what_text.trim(),
            status: 'our_ideas'
          }
        ])
        .select()

      if (error) throw error

      console.log('アイデア登録成功:', data)

      setIdeaForm({
        idea_name: '',
        when_text: getCurrentYearMonth(),
        who_text: '',
        what_text: ''
      })

      alert('アイデアを登録しました！')
      await fetchAllIdeas()

    } catch (error) {
      handleError(error, 'アイデアの登録に失敗しました。もう一度お試しください。')
      setIdeaSubmitError('アイデアの登録に失敗しました。もう一度お試しください。')
    } finally {
      setIsSubmittingIdea(false)
    }
  }

  // 年月入力用のオプション生成
  const generateWhenOptions = () => {
    const options = []
    const startYear = 2025
    const endYear = 2099
    
    for (let year = startYear; year <= endYear; year++) {
      for (let month = 1; month <= 12; month++) {
        options.push(`${year}年${month}月`)
      }
    }
    return options
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
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  currentUser={user}
                  onProceed={handleIdeaProceed}
                  onDelete={handleIdeaDelete}
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
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  currentUser={user}
                  onDelete={handleIdeaDelete}
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

        {/* Members sharing ideas セクション */}
        <section className="members-section">
          <h2 className="members-title">Members sharing ideas</h2>
          <div className="members-list">
            <p>（メンバー一覧は次のステップで実装予定）</p>
          </div>
        </section>
      </main>
    </div>
  )
}