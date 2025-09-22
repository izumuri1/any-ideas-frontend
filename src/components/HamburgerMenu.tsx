// src/components/HamburgerMenu.tsx
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './HamburgerMenu.scss'

interface HamburgerMenuProps {
  currentPage?: 'home' | 'workspace-create' | 'workspace-select' | 'other'
}

export function HamburgerMenu({ currentPage = 'other' }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isTutorialOpen, setIsTutorialOpen] = useState(false)
  const navigate = useNavigate()
  const { signOut } = useAuth()
  
  // 現在のワークスペースIDを取得
  const { workspaceId } = useParams<{ workspaceId: string }>()

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const closeMenu = () => {
    setIsOpen(false)
  }

  const handleMenuClick = async (action: string) => {
    closeMenu()
    
    switch (action) {
      case 'home':
        // workspaceIdが存在する場合は、そのワークスペースのHomeに戻る
        if (workspaceId) {
          navigate(`/workspace/${workspaceId}`)
        } else {
          // workspaceIdがない場合は、ワークスペース選択画面に戻る
          navigate('/workspace-select')
        }
        break
      case 'tutorial':
        setIsTutorialOpen(true)
        break
      case 'workspace-create':
        navigate('/create-workspace')
        break
      case 'workspace-select':
        navigate('/workspace')
        break
      case 'logout':
        try {
          await signOut()
          // ログアウト成功後、React Routerを使用してログイン画面にリダイレクト
          navigate('/login')
        } catch (error) {
          console.error('ログアウトエラー:', error)
          // エラー時もReact Routerを使用してログイン画面に遷移
          navigate('/login')
        }
        break
      default:
        break
    }
  }

  // メニュー項目の設定
  const menuItems = [
    {
      id: 'home',
      label: 'Home',
      isActive: currentPage === 'home'
    },
    {
      id: 'tutorial',
      label: 'Tutorial',
      isActive: false
    },
    {
      id: 'workspace-create',
      label: 'ワークスペース作成',
      isActive: currentPage === 'workspace-create'
    },
    {
      id: 'workspace-select',
      label: 'ワークスペース選択',
      isActive: currentPage === 'workspace-select'
    },
    {
      id: 'logout',
      label: 'ログアウト',
      isActive: false,
      isDanger: true
    }
  ]

  return (
    <>
      {/* ハンバーガーメニューボタン */}
      <button 
        className={`hamburger-button ${isOpen ? 'active' : ''}`}
        onClick={toggleMenu}
        aria-label="メニューを開く"
        aria-expanded={isOpen}
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      {/* オーバーレイ */}
      {isOpen && (
        <div 
          className="hamburger-overlay"
          onClick={closeMenu}
          role="button"
          tabIndex={0}
          aria-label="メニューを閉じる"
        />
      )}

      {/* メニューパネル */}
      <nav className={`hamburger-menu ${isOpen ? 'open' : ''}`}>
        <div className="menu-header">
          <h3 className="menu-title">Any ideas?</h3>
          <button 
            className="menu-close-button"
            onClick={closeMenu}
            aria-label="メニューを閉じる"
          >
            ✕
          </button>
        </div>

        <div className="menu-content">
          <ul className="menu-list">
            {menuItems.map((item) => (
              <li key={item.id} className="menu-item">
                <button
                  className={`menu-link ${item.isActive ? 'active' : ''} ${item.isDanger ? 'danger' : ''}`}
                  onClick={() => handleMenuClick(item.id)}
                >
                  <span className="menu-label">{item.label}</span>
                  {item.isActive && <span className="active-indicator">●</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Tutorialウィンドウ */}
      {isTutorialOpen && (
        <>
          <div 
            className="tutorial-overlay"
            onClick={() => setIsTutorialOpen(false)}
          />
          <div className="tutorial-notification">
            <div className="tutorial-header">
              <h3 className="tutorial-title">このアプリの使い方</h3>
              <button 
                className="tutorial-close-button"
                onClick={() => setIsTutorialOpen(false)}
                aria-label="Tutorialを閉じる"
              >
                ✕
              </button>
            </div>
            <div className="tutorial-content">
              <div className="tutorial-section">
                <div className="tutorial-section-title">💡 Any ideas？</div>
                <div className="tutorial-step">
                  <span className="tutorial-step-number">1</span>
                  <div className="tutorial-step-content">
                    <span className="tutorial-step-text">みんなで思いついたアイデアを投稿しよう！</span>
                    <span className="tutorial-step-tip">アイデア登録をクリック</span>
                  </div>
                </div>
              </div>
              
              <div className="tutorial-section">
                <div className="tutorial-section-title">👥 Our ideas</div>
                <div className="tutorial-step">
                  <span className="tutorial-step-number">2</span>
                  <div className="tutorial-step-content">
                    <span className="tutorial-step-text">みんなで気になるアイデアに「いいね」しよう！</span>
                    <span className="tutorial-step-tip">♡をクリック</span>
                  </div>
                </div>
                <div className="tutorial-step">
                  <span className="tutorial-step-number">3</span>
                  <div className="tutorial-step-content">
                    <span className="tutorial-step-text">反響があったアイデアの実現に向けて検討しよう！</span>
                    <span className="tutorial-step-tip">アイデアオーナーは検討を進めるをクリック</span>
                  </div>
                </div>
              </div>
              
              <div className="tutorial-section">
                <div className="tutorial-section-title">🤔 Ideas we're thinking about</div>
                <div className="tutorial-step">
                  <span className="tutorial-step-number">4</span>
                  <div className="tutorial-step-content">
                    <span className="tutorial-step-text">みんなで実現方法を提案しよう！</span>
                    <span className="tutorial-step-tip">具体的に検討するをクリック</span>
                  </div>
                </div>
              </div>
              
              <div className="tutorial-section">
                <div className="tutorial-section-title">💭 How about？</div>
                <div className="tutorial-step">
                  <span className="tutorial-step-number">5</span>
                  <div className="tutorial-step-content">
                    <span className="tutorial-step-text">みんなで実施時期や、やりたいことなどを提案しよう！</span>
                    <span className="tutorial-step-tip">提案をクリック。複数の案があってもOK</span>
                  </div>
                </div>
              </div>
              
              <div className="tutorial-section">
                <div className="tutorial-section-title">🎯 Go for it</div>
                <div className="tutorial-step">
                  <span className="tutorial-step-number">6</span>
                  <div className="tutorial-step-content">
                    <span className="tutorial-step-text">みんなでベストな提案に「いいね」しよう！</span>
                    <span className="tutorial-step-tip">♡をクリック。みんなで最適解を選ぼう</span>
                  </div>
                </div>
                <div className="tutorial-step">
                  <span className="tutorial-step-number">7</span>
                  <div className="tutorial-step-content">
                    <span className="tutorial-step-text">アイデアオーナーが提案を採用しよう！</span>
                    <span className="tutorial-step-tip">提案を採用するをクリック</span>
                  </div>
                </div>
              </div>
              
              <div className="tutorial-section">
                <div className="tutorial-section-title">🚀 Let's go with that!</div>
                <div className="tutorial-step">
                  <span className="tutorial-step-number">8</span>
                  <div className="tutorial-step-content">
                    <span className="tutorial-step-text">アイデアオーナーが採用した提案を決定して実行しよう！</span>
                    <span className="tutorial-step-tip">決定して実行するをクリック</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}