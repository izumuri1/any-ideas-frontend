// src/components/LikeButton.tsx
import { useState } from 'react'
import './LikeButton.scss'

// 型定義
export interface IdeaLike {
  id: string
  idea_id: string
  user_id: string
  created_at: string
  profiles: {
    username: string
  }
}

export interface LikeableItem {
  id: string
  idea_likes?: IdeaLike[]
  like_count?: number
  user_has_liked?: boolean
}

interface LikeButtonProps {
  item: LikeableItem
  currentUser: any
  onLikeToggle?: (itemId: string) => void
  disabled?: boolean
  className?: string
  zone?: 'our_ideas' | 'thinking_about' | 'trying'  // 新規追加
}

export function LikeButton({ 
  item, 
  currentUser, 
  onLikeToggle,
  disabled = false,
  className = '',
  zone = 'our_ideas'  // デフォルト値を設定
}: LikeButtonProps) {
  const [liking, setLiking] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [showCancelMessage, setShowCancelMessage] = useState(false)

  // いいねのトグル処理
  const handleLikeToggle = async () => {
    if (!currentUser || liking || disabled || !onLikeToggle) return

    setLiking(true)
    try {
      await onLikeToggle(item.id)
    } finally {
      setLiking(false)
    }
  }

    // マウスホバー処理
    const handleMouseEnter = () => {
    console.log('Mouse entered - like_count:', item.like_count, 'user_has_liked:', item.user_has_liked)
    
    // いいねが1件以上ある場合は常に上側にユーザー名を表示（全ゾーン共通）
    if (item.like_count && item.like_count > 0) {
        console.log('Showing tooltip')
        setShowTooltip(true)
    }
    
    // Ideas we're tryingゾーンでは下側の「取り消し」メッセージを表示しない
    if (zone === 'trying') {
        return
    }
    
    // 自分がいいね済みの場合は下側に「取り消し」メッセージを表示（our_ideas, thinking_aboutのみ）
    if (currentUser && item.user_has_liked) {
        console.log('Showing cancel message')
        setShowCancelMessage(true)
    }
    }

  const handleMouseLeave = () => {
    setShowTooltip(false)
    setShowCancelMessage(false)
  }

  // いいねしたユーザー一覧のツールチップ
  const renderLikeTooltip = () => {
    if (!showTooltip || !item.like_count || item.like_count === 0) return null

    return (
      <div className="like-tooltip">
        <div className="tooltip-content">
          {item.idea_likes?.map((like, index) => (
            <span key={like.id}>
              {like.profiles.username}
              {index < (item.idea_likes?.length || 0) - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
      </div>
    )
  }

  // いいね取り消しメッセージ
  const renderCancelMessage = () => {
    if (!showCancelMessage) return null

    return (
      <div className="cancel-message">
        <div className="message-content">
          いいねを取り消す
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`like-section ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
    <button
    className={`like-button ${item.user_has_liked ? 'liked' : ''} ${liking ? 'liking' : ''}`}
    onClick={handleLikeToggle}
    disabled={liking || disabled || !currentUser}
    title={zone === 'trying' ? undefined : (item.user_has_liked ? 'いいねを取り消す' : 'いいねする')}
    >
    {item.user_has_liked ? '♥' : '♡'} {item.like_count || 0}
    </button>
      {renderLikeTooltip()}
      {renderCancelMessage()}
    </div>
  )
}