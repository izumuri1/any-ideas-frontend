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
    </>
  )
}