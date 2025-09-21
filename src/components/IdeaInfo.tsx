// src/components/IdeaInfo.tsx
import React from 'react'
import './IdeaInfo.scss'

interface IdeaInfoProps {
  ideaName: string
  ownerName: string
  loading?: boolean
  error?: string | null
}

const IdeaInfo: React.FC<IdeaInfoProps> = React.memo(({ 
  ideaName, 
  ownerName, 
  loading = false, 
  error = null 
}) => {
  if (loading) {
    return (
      <div className="idea-info">
        <div className="idea-name">
          <span className="label">アイデア名：</span>
          <span className="loading-text">読み込み中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="idea-info">
        <div className="idea-name">
          <span className="label">アイデア名：</span>
          <span className="error-text">エラーが発生しました</span>
        </div>
      </div>
    )
  }

  return (
    <div className="idea-info">
      <div className="idea-name">
        <span className="label">アイデア名：</span>
        <span className="value">{ideaName}</span>
      </div>
      <div className="idea-owner">
        <span className="label">提案者：</span>
        <span className="value">{ownerName}</span>
      </div>
    </div>
  )
})

export default IdeaInfo