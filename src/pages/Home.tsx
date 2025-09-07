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
    when_text: getCurrentYearMonth(), // 初期値を現在の年月に設定
    who_text: '',
    what_text: ''
  })
  const [isSubmittingIdea, setIsSubmittingIdea] = useState(false)
  const [ideaSubmitError, setIdeaSubmitError] = useState<string | null>(null)

  // アイデア一覧用の状態
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loadingIdeas, setLoadingIdeas] = useState(false)

  // ワークスペース情報取得
  useEffect(() => {
    const fetchWorkspaceInfo = async () => {
      if (!workspaceId || !user) return

      try {
        setLoading(true)
        setError(null)

        // ワークスペース情報とオーナー情報を取得
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

        // 型安全な情報設定
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

  // アイデア一覧取得
  useEffect(() => {
    const fetchIdeas = async () => {
      if (!workspaceId) return

      try {
        setLoadingIdeas(true)

        // ワークスペース内のOur ideasステータスのアイデアを取得（when_text昇順）
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
          .eq('status', 'our_ideas')
          .is('deleted_at', null)
          .order('when_text', { ascending: true })

        if (error) {
          console.error('アイデア取得エラー:', error)
          throw error
        }

        // 型安全な変換処理
        const transformedIdeas: Idea[] = (data || []).map((item: any) => ({
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
        }))

        setIdeas(transformedIdeas)

      } catch (error) {
        console.error('アイデア一覧取得エラー:', error)
      } finally {
        setLoadingIdeas(false)
      }
    }

    fetchIdeas()
  }, [workspaceId])

  // アイデア登録フォームの入力ハンドラ
  const handleIdeaFormChange = (field: keyof IdeaFormData, value: string) => {
    setIdeaForm(prev => ({
      ...prev,
      [field]: value
    }))
    // エラーメッセージをクリア
    if (ideaSubmitError) {
      setIdeaSubmitError(null)
    }
  }

  // アイデア一覧取得関数（登録後の再取得用）
  const fetchIdeas = async () => {
    if (!workspaceId) return

    try {
      setLoadingIdeas(true)

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
        .eq('status', 'our_ideas')
        .is('deleted_at', null)
        .order('when_text', { ascending: true })

      if (error) {
        console.error('アイデア取得エラー:', error)
        throw error
      }

      // 型安全な変換処理
      const transformedIdeas: Idea[] = (data || []).map((item: any) => ({
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
      }))

      setIdeas(transformedIdeas)

    } catch (error) {
      console.error('アイデア一覧取得エラー:', error)
    } finally {
      setLoadingIdeas(false)
    }
  }

  // アイデア登録処理
  const handleIdeaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !workspaceId) {
      setIdeaSubmitError('ユーザー情報またはワークスペース情報が不正です')
      return
    }

    // バリデーション
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

      // アイデアをDBに登録
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

      if (error) {
        console.error('アイデア登録エラー:', error)
        throw error
      }

      console.log('アイデア登録成功:', data)

      // フォームをリセット
      setIdeaForm({
        idea_name: '',
        when_text: getCurrentYearMonth(), // リセット時も現在の年月に戻す
        who_text: '',
        what_text: ''
      })

      // 成功メッセージ（一時的に表示）
      alert('アイデアを登録しました！')

      // アイデア一覧を再取得
      await fetchIdeas()

    } catch (error) {
      console.error('アイデア登録エラー:', error)
      setIdeaSubmitError('アイデアの登録に失敗しました。もう一度お試しください。')
    } finally {
      setIsSubmittingIdea(false)
    }
  }

  // 年月入力用のオプション生成（2025年1月から2099年12月まで、現在月がデフォルト選択）
  const generateWhenOptions = () => {
    const options = []
    
    // 2025年1月から2099年12月まで全ての年月を生成
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
          {/* ハンバーガーメニュー */}
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
            {/* ロゴとタイトルを横並びに、説明文を下の行に */}
            <div className="logo-title-section">
              {/* ロゴとタイトルの横並び部分 */}
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
              
              {/* 説明文 */}
              <p className="app-description">
                みんなでアイデアを共有して、一緒に楽しいことを企画しよう
              </p>
            </div>

            {/* アイデア登録フォーム */}
            <form onSubmit={handleIdeaSubmit} className="idea-registration-form">
              {/* エラーメッセージ */}
              {ideaSubmitError && (
                <div className="error-message" role="alert">
                  {ideaSubmitError}
                </div>
              )}

              {/* アイデア名 */}
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

              {/* いつ頃？ */}
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

              {/* 誰と？ */}
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

              {/* 何をしたい？ */}
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

              {/* 登録ボタン */}
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
          <p className="zone-description">みんなが投稿したアイデアを共有しよう</p>
          <div className="ideas-cards">
            {loadingIdeas ? (
              <p>アイデア読み込み中...</p>
            ) : ideas.length === 0 ? (
              <p>まだアイデアがありません。最初のアイデアを投稿してみましょう！</p>
            ) : (
              ideas.map((idea) => (
                <div key={idea.id} className="idea-card">
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
                  
                  {/* TODO: 後で権限管理とアクションボタンを追加 */}
                  <div className="idea-actions">
                    <span className="like-button">♡ 0</span>
                    <button className="btn-proceed">進める</button>
                    <button className="btn-delete">削除</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Ideas we're thinking about セクション */}
        <section className="ideas-zone thinking-about">
          <h2 className="zone-title">Ideas we're thinking about</h2>
          <p className="zone-description">みんなで具体的に検討しているアイデア</p>
          <div className="ideas-cards">
            <p>（検討中アイデア一覧は次のステップで実装予定）</p>
          </div>
        </section>

        {/* Ideas we're trying セクション */}
        <section className="ideas-zone trying">
          <h2 className="zone-title">Ideas we're trying</h2>
          <p className="zone-description">実行に向けて準備中のアイデア</p>
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