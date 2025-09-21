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
        navigate('/workspace-select')
        break
      case 'logout':
        try {
          await signOut()
          // ログアウト成功後、明示的にログイン画面にリダイレクト
          window.location.href = '/login'
        } catch (error) {
          console.error('ログアウトエラー:', error)
          // エラー時も強制的にログイン画面に遷移
          window.location.href = '/login'
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
                <div className="tutorial-section-title">ーーーAny ideas？ーーー</div>
                <div className="tutorial-step">
                  <span className="tutorial-step-number">①</span>
                  <span className="tutorial-step-text">アイデアを登録しましょう。</span>
                </div>
              </div>
              
              <div className="tutorial-section">
                <div className="tutorial-section-title">ーーーOur ideasーーー</div>
                <div className="tutorial-step">
                  <span className="tutorial-step-number">②</span>
                  <span className="tutorial-step-text">登録されたアイデアを確認して、共感したアイデアにいいねしましょう。</span>
                </div>
                <div className="tutorial-step">
                  <span className="tutorial-step-number">③</span>
                  <span className="tutorial-step-text">アイデアオーナーは、共感が得られたアイデアの検討を進めましょう。</span>
                </div>
              </div>
              
              <div className="tutorial-section">
                <div className="tutorial-section-title">ーーーIdeas we're thinking aboutーーー</div>
                <div className="tutorial-step">
                  <span className="tutorial-step-number">④</span>
                  <span className="tutorial-step-text">アイデアに対して提案のある人は、具体的に検討しましょう。</span>
                </div>
              </div>
              
              <div className="tutorial-section">
                <div className="tutorial-section-title">ーーーHow about？ーーー</div>
                <div className="tutorial-step">
                  <span className="tutorial-step-number">⑤</span>
                  <span className="tutorial-step-text">やりたいことなどを提案しましょう。</span>
                </div>
              </div>
              
              <div className="tutorial-section">
                <div className="tutorial-section-title">ーーーGo for itーーー</div>
                <div className="tutorial-step">
                  <span className="tutorial-step-number">⑥</span>
                  <span className="tutorial-step-text">登録された提案を確認して、共感した提案にいいねしましょう。</span>
                </div>
                <div className="tutorial-step">
                  <span className="tutorial-step-number">⑦</span>
                  <span className="tutorial-step-text">アイデアオーナーは、共感が得られた提案を採用しましょう。</span>
                </div>
              </div>
              
              <div className="tutorial-section">
                <div className="tutorial-section-title">ーーーLet's go with that!ーーー</div>
                <div className="tutorial-step">
                  <span className="tutorial-step-number">⑧</span>
                  <span className="tutorial-step-text">アイデアオーナーは、採用した提案を決定して実行しましょう。</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}