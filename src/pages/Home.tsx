// src/pages/Home.tsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import './Home.scss'
import { HamburgerMenu } from '../components/HamburgerMenu'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// ワークスペース情報の型定義
interface WorkspaceInfo {
  id: string
  name: string
  owner_id: string
  owner_username: string
  created_at: string
}

export function Home() {
  const { user } = useAuth()
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ワークスペース情報を取得する関数
  const fetchWorkspaceInfo = async () => {
    if (!workspaceId || !user) {
      setError('ワークスペースIDまたはユーザー情報がありません')
      setLoading(false)
      return
    }

    try {
      // ワークスペース情報とオーナー情報を取得
      const { data, error } = await supabase
        .from('workspaces')
        .select(`
          id,
          name,
          owner_id,
          created_at,
          profiles:owner_id (
            username
          )
        `)
        .eq('id', workspaceId)
        .single()

      if (error) {
        console.error('ワークスペース情報取得エラー:', error)
        setError('ワークスペース情報の取得に失敗しました')
        return
      }

      if (!data) {
        setError('ワークスペースが見つかりません')
        return
      }

      // 型安全にデータを整形
      const workspaceData: WorkspaceInfo = {
        id: data.id,
        name: data.name,
        owner_id: data.owner_id,
        owner_username: (data.profiles as any)?.username || 'Unknown User',
        created_at: data.created_at
      }

      setWorkspaceInfo(workspaceData)
      setError(null)
    } catch (err) {
      console.error('予期しないエラー:', err)
      setError('予期しないエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  // コンポーネント初期化時にワークスペース情報を取得
  useEffect(() => {
    fetchWorkspaceInfo()
  }, [workspaceId, user])

  // ローディング状態の表示
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

  // エラー状態の表示
  if (error) {
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
        {/* 簡易アイデア登録セクション */}
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
                <h3 className="section-title">Any ideas?</h3>
              </div>
              {/* 説明文を独立した行に */}
              <p className="zone-description">メンバーと共有したいアイデアを登録しましょう</p>
            </div>
            <div className="form-row">
              <input type="text" placeholder="いつ頃？" className="input-field" />
              <input type="text" placeholder="誰と？" className="input-field" />
              <input type="text" placeholder="何をしたい？" className="input-field" />
            </div>
            <button className="btn-primary">アイデア登録</button>
          </div>
        </section>

        {/* アイデア表示エリア */}
        <section className="ideas-section">
          <div className="ideas-grid">
            {/* Our ideas */}
            <div className="ideas-zone">
              <h4 className="zone-title">Our ideas</h4>
              <p className="zone-description">登録されたアイデアの中から共感が得られたものを選ぼう</p>
              <div className="ideas-cards">
                {/* 今後実装予定：アイデアカードのリスト */}
              </div>
            </div>

            {/* Ideas we're thinking about */}
            <div className="ideas-zone">
              <h4 className="zone-title">Ideas we're thinking about</h4>
              <p className="zone-description">共感が得られたアイデアの検討を進めましょう</p>
              <div className="ideas-cards">
                {/* 今後実装予定：検討中アイデアカードのリスト */}
              </div>
            </div>

            {/* Ideas we're trying */}
            <div className="ideas-zone">
              <h4 className="zone-title">Ideas we're trying</h4>
              <p className="zone-description">これまでに検討したアイデアを確認しましょう</p>
              <div className="ideas-cards">
                {/* 今後実装予定：実行中アイデアカードのリスト */}
              </div>
            </div>
          </div>
        </section>

        {/* メンバー表示セクション（今後実装予定） */}
        <section className="members-section">
          <h4 className="zone-title">Members sharing ideas</h4>
          <div className="members-list">
            {/* 今後実装予定：ワークスペースメンバーのリスト */}
          </div>
        </section>
      </main>
    </div>
  )
}