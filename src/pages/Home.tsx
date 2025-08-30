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
              <div className="ideas-cards">
                <div className="idea-card">
                  <p className="idea-text">今年の夏・家族で・海に行きたい</p>
                  <div className="card-actions">
                    {/* ③いいねの♡ボタン - 角丸枠を削除 */}
                    <button className="btn-like">♡ 2</button>
                    <button className="btn-proceed">進める</button>
                    {/* ②削除ボタン - 背景色グレー、テキスト白 */}
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
                    <button className="btn-proceed">進める</button>
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
                  <p className="idea-text">年末・恋人と・温泉旅行</p>
                  <div className="card-actions">
                    <button className="btn-like">♡ 3</button>
                    <button className="btn-proceed">進める</button>
                    <button className="btn-delete">削除</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}