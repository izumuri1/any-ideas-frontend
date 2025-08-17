// src/components/Home.tsx
import type { User } from '@supabase/auth-js'
import { useAuth } from '../contexts/AuthContext'
import './Home.scss'

interface HomeProps {
  user: User
}

export function Home({ user: userProp }: HomeProps) {
  const { signOut } = useAuth()
  // App.tsxから渡されたuserを使用
  const user = userProp

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('ログアウトエラー:', error)
    }
  }

  return (
    <div className="home-container">
      {/* 上部メニュー */}
      <header className="home-header">
        <div className="header-left">
          <h1 className="logo">Any ideas?</h1>
          <div className="workspace-info">
            <span className="workspace-name">テストワークスペース・{user?.email}</span>
            <span className="invite-token">招待トークン: ABC123</span>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-workspace">ワークスペース選択</button>
          <button className="btn-logout" onClick={handleSignOut}>
            ログアウト
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="home-main">
        <div className="welcome-section">
          <h2 className="welcome-title">ログイン確認テスト</h2>
          <p className="welcome-message">
            ログイン成功！ユーザー: {user?.email}
          </p>
        </div>

        {/* 簡易アイデア登録セクション */}
        <section className="idea-form-section">
          <h3 className="section-title">Any ideas?</h3>
          <div className="idea-form">
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
              <div className="ideas-cards">
                <div className="idea-card">
                  <p className="idea-text">今年の夏・家族で・海に行きたい</p>
                  <div className="card-actions">
                    <button className="btn-like">♡ 2</button>
                    <button className="btn-proceed">進める</button>
                    <button className="btn-delete">削除</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Ideas we're thinking about */}
            <div className="ideas-zone">
              <h4 className="zone-title">Ideas we're thinking about</h4>
              <div className="ideas-cards">
                <div className="idea-card">
                  <p className="idea-text">春休み・友人と・温泉旅行</p>
                  <div className="card-actions">
                    <button className="btn-like">♡ 1</button>
                    <button className="btn-detail">検討</button>
                    <button className="btn-delete">削除</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Ideas we're trying */}
            <div className="ideas-zone">
              <h4 className="zone-title">Ideas we're trying</h4>
              <div className="ideas-cards">
                <div className="idea-card">
                  <p className="idea-text">来月・恋人と・映画館デート</p>
                  <div className="card-actions">
                    <button className="btn-like">♡ 3</button>
                    <button className="btn-detail">詳細</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* メンバー表示 */}
        <section className="members-section">
          <h4 className="section-title">Members sharing ideas...</h4>
          <div className="members-list">
            <span className="member-name">{user?.email}</span>
            <span className="member-name">テストユーザー2</span>
          </div>
        </section>
      </main>
    </div>
  )
}