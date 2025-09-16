// src/components/IdeaCard/IdeaCard.tsx
import React from 'react';
import { LikeButton, type LikeableItem } from '../LikeButton';
import { DeleteButton } from '../DeleteButton';
import './IdeaCard.scss';

// アイデアの型定義（LikeableItemを拡張）
export interface Idea extends LikeableItem {
  idea_name: string;
  when_text: string | null;
  who_text: string | null;
  what_text: string;
  creator_id: string;
  status: string;
  created_at: string;
  profiles: {
    username: string;
  };
}

// アクション設定の型定義
export interface IdeaCardActions {
  onProceed?: (ideaId: string) => void;
  onDelete?: (ideaId: string) => void;
  onLikeToggle?: (ideaId: string) => void;
  onDiscussion?: (ideaId: string) => void;
  onViewDetails?: (ideaId: string) => void;
}

// ローディング状態の型定義
export interface IdeaCardLoadingStates {
  proceedingId?: string | null;
  deletingId?: string | null;
}

// 表示制御の型定義
export interface IdeaCardDisplayOptions {
  showProceedButton?: boolean;
  showDetailsButton?: boolean;
  showDiscussionButton?: boolean;
}

// メインのProps型定義
export interface IdeaCardProps {
  idea: Idea;
  currentUser: any;
  actions?: IdeaCardActions;
  loadingStates?: IdeaCardLoadingStates;
  displayOptions?: IdeaCardDisplayOptions;
  className?: string;
}

export const IdeaCard: React.FC<IdeaCardProps> = ({
  idea,
  currentUser,
  actions = {},
  loadingStates = {},
  displayOptions = {},
  className = ''
}) => {
  const {
    onProceed,
    onDelete,
    onLikeToggle,
    onDiscussion,
    onViewDetails
  } = actions;

  const {
    proceedingId,
    deletingId
  } = loadingStates;

  const {
    showProceedButton = false,
    showDetailsButton = false,
    showDiscussionButton = false
  } = displayOptions;

  // ユーザー権限の確認
  const isOwner = currentUser && currentUser.id === idea.creator_id;
  const isProceeding = proceedingId === idea.id;
  const isDeleting = deletingId === idea.id;

  return (
    <div className={`idea-card ${className}`}>
      {/* アイデアヘッダー（元のEnhancedIdeaCard形式） */}
      <div className="idea-header">
        <h3 className="idea-name">{idea.idea_name}</h3>
        <span className="idea-owner">by {idea.profiles.username}</span>
      </div>

      {/* アイデア詳細（元のEnhancedIdeaCard形式 - ラベルなし） */}
      <div className="idea-details">
        {idea.when_text && (
          <div className="idea-detail">
            <span className="detail-value">{idea.when_text}</span>
          </div>
        )}
        
        {idea.who_text && (
          <div className="idea-detail">
            <span className="detail-value">{idea.who_text}</span>
          </div>
        )}
        
        <div className="idea-detail">
          <span className="detail-value">{idea.what_text}</span>
        </div>
      </div>

      {/* アクションボタンエリア（元のEnhancedIdeaCard形式） */}
      <div className="idea-actions">
        {/* いいねボタン（常に表示） */}
        <LikeButton 
          item={idea}
          currentUser={currentUser}
          onLikeToggle={onLikeToggle}
        />
        
        {/* 進めるボタン（Our ideas用・オーナーのみ） */}
        {isOwner && showProceedButton && onProceed && (
          <button 
            className="btn-proceed"
            onClick={() => onProceed(idea.id)}
            disabled={isProceeding}
          >
            {isProceeding ? '検討を進める中...' : '検討を進める'}
          </button>
        )}

        {/* 検討ボタン（Ideas we're thinking about用） */}
        {showDiscussionButton && onDiscussion && (
          <button 
            className="btn-proceed"
            onClick={() => onDiscussion(idea.id)}
          >
            具体的に検討する
          </button>
        )}

        {/* 詳細ボタン（Ideas we're trying用） */}
        {showDetailsButton && onViewDetails && (
          <button 
            className="btn-proceed"
            onClick={() => onViewDetails(idea.id)}
          >
            詳細
          </button>
        )}

        {/* 削除ボタン（オーナーのみ） */}
        {onDelete && (
          <DeleteButton
            item={idea}
            currentUser={currentUser}
            creatorId={idea.creator_id}
            isDeleting={isDeleting}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  );
};

export default IdeaCard;