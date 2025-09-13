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
}

export function LikeButton({ 
  item, 
  currentUser, 
  onLikeToggle,
  disabled = false,
  className = '' 
}: LikeButtonProps) {
  const [liking, setLiking] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

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

  return (
    <div 
      className={`like-section ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        className={`like-button ${item.user_has_liked ? 'liked' : ''} ${liking ? 'liking' : ''}`}
        onClick={handleLikeToggle}
        disabled={liking || disabled || !currentUser}
        title={item.user_has_liked ? 'いいねを取り消す' : 'いいねする'}
      >
        {item.user_has_liked ? '♥' : '♡'} {item.like_count || 0}
      </button>
      {renderLikeTooltip()}
    </div>
  )
}