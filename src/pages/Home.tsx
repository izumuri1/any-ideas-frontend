// src/pages/Home.tsx
import './Home.scss'

export function Home() {
  // 現在は認証機能を使用していないので、userプロパティも削除

  return (
    <div className="home-container">
      {/* 上部メニュー */}
      <header className="home-header">
        <div className="header">
          <div className="workspace-info">
            <span className="workspace-name">テストワークスペース</span>
            <span className="invite-token">招待URL: ABC123</span>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="home-main">
        {/* 簡易アイデア登録セクション */}
        <section className="idea-form-section">
          <div className="idea-form">
          <h3 className="section-title">Any ideas?</h3>
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
                {/* ダミーデータを削除 */}
              </div>
            </div>

            {/* Ideas we're thinking about */}
            <div className="ideas-zone">
              <h4 className="zone-title">Ideas we're thinking about</h4>
              <p className="zone-description">共感が得られたアイデアの検討を進めましょう</p>
              <div className="ideas-cards">
                {/* ダミーデータを削除 */}
              </div>
            </div>

            {/* Ideas we're trying */}
            <div className="ideas-zone">
              <h4 className="zone-title">Ideas we're trying</h4>
              <p className="zone-description">これまでに検討したアイデアを確認しましょう</p>
              <div className="ideas-cards">
                {/* ダミーデータを削除 */}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}