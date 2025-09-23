// BudgetProposalForm.tsx
// DiscussionScreen の想定予算タブに追加するコンポーネント

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface BudgetProposalFormProps {
  budgetForm: any; // 既存のuseFormフック
  onSubmit: () => void;
  isSubmitting: boolean;
}

interface AIFormData {
  planType: string;
  participants: string;
  duration: string;
  location: string;
  budget_range: string;
  preferences: string;
}

const BudgetProposalForm: React.FC<BudgetProposalFormProps> = ({
  budgetForm,
  onSubmit,
  isSubmitting
}) => {
  const { user } = useAuth();
  const [showAIForm, setShowAIForm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [error, setError] = useState('');
  const [remainingUsage] = useState<number | null>(null);

  const [aiFormData, setAiFormData] = useState<AIFormData>({
    planType: '',
    participants: '',
    duration: '',
    location: '',
    budget_range: '',
    preferences: ''
  });

  // AI提案フォームの入力変更処理
  const handleAIFormChange = (field: keyof AIFormData, value: string) => {
    setAiFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // フォームのバリデーション
  const isAIFormValid = () => {
    return aiFormData.planType && 
           aiFormData.participants && 
           aiFormData.duration && 
           aiFormData.location;
  };

  // AI予算提案を生成
  const generateAIBudget = async () => {
    if (!user) {
      setError('ログインが必要です');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/generate-budget', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            planType: aiFormData.planType,
            participants: aiFormData.participants, 
            duration: aiFormData.duration,
            location: aiFormData.location,
            budget_range: aiFormData.budget_range,
            preferences: aiFormData.preferences,
            userId: user.id
            })
      });

      const data = await response.json();

      if (data.success) {
        setAiSuggestion(data.suggestion);
        // setRemainingUsage(data.remaining);
        setShowAIForm(false); // フォームを閉じる
      } else {
        setError(data.error || 'AI提案の生成に失敗しました');
      }
    } catch (error) {
      console.error('AI提案エラー:', error);
      setError('ネットワークエラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  // AI提案を予算テキストにコピー
    const useAISuggestion = () => {
    try {
        // useFormフックの正しいsetValueメソッドを使用
        budgetForm.setValue('text', aiSuggestion);
        setAiSuggestion(''); // 提案を使用したら非表示
    } catch (error) {
        console.error('AI提案の使用に失敗しました:', error);
        setError('提案の使用に失敗しました');
    }
    };

  return (
    <div className="proposal-registration-form">
      {/* AI提案セクション */}
      <div className="ai-suggestion-container">
        <button 
          type="button"
          onClick={() => setShowAIForm(!showAIForm)}
          className="btn-ai-suggestion"
        >
          <span className="ai-icon">🤖</span>
          AI予算提案
        </button>
        
        {/* 残り使用回数表示 */}
        {remainingUsage !== null && (
          <div className="usage-info">
            今日の残り使用回数: {remainingUsage}回
          </div>
        )}

        {/* AI提案用の情報入力フォーム */}
        {showAIForm && (
          <div className="ai-form-container">
            <div className="ai-form-header">
              <h5>予算提案に必要な情報を入力してください</h5>
              <button 
                type="button"
                onClick={() => setShowAIForm(false)}
                className="btn-close"
              >
                ×
              </button>
            </div>
            
            <div className="ai-form-content">
              <div className="form-row">
                <label htmlFor="planType">プラン内容 *</label>
                <input
                  id="planType"
                  type="text"
                  value={aiFormData.planType}
                  onChange={(e) => handleAIFormChange('planType', e.target.value)}
                  placeholder="例: 一泊二日の温泉旅行、日帰りBBQ、三泊四日の沖縄旅行"
                  className="form-input"
                />
              </div>
              
              <div className="form-row">
                <label htmlFor="participants">参加者 *</label>
                <input
                  id="participants"
                  type="text"
                  value={aiFormData.participants}
                  onChange={(e) => handleAIFormChange('participants', e.target.value)}
                  placeholder="例: 夫婦2人、家族4人（大人2人・子供2人）、友人6人"
                  className="form-input"
                />
              </div>
              
              <div className="form-row">
                <label htmlFor="duration">期間・日数 *</label>
                <input
                  id="duration"
                  type="text"
                  value={aiFormData.duration}
                  onChange={(e) => handleAIFormChange('duration', e.target.value)}
                  placeholder="例: 1泊2日、2泊3日、日帰り、3泊4日"
                  className="form-input"
                />
              </div>
              
              <div className="form-row">
                <label htmlFor="location">場所・エリア *</label>
                <input
                  id="location"
                  type="text"
                  value={aiFormData.location}
                  onChange={(e) => handleAIFormChange('location', e.target.value)}
                  placeholder="例: 箱根温泉、沖縄本島、京都市内、軽井沢"
                  className="form-input"
                />
              </div>
              
              <div className="form-row">
                <label htmlFor="budget_range">希望予算範囲</label>
                <select
                  id="budget_range"
                  value={aiFormData.budget_range}
                  onChange={(e) => handleAIFormChange('budget_range', e.target.value)}
                  className="form-select"
                >
                  <option value="">予算範囲を選択（任意）</option>
                  <option value="1万円以下">1万円以下</option>
                  <option value="1-3万円">1万円〜3万円</option>
                  <option value="3-5万円">3万円〜5万円</option>
                  <option value="5-10万円">5万円〜10万円</option>
                  <option value="10-20万円">10万円〜20万円</option>
                  <option value="20万円以上">20万円以上</option>
                  <option value="予算上限なし">予算上限なし</option>
                </select>
              </div>
              
              <div className="form-row">
                <label htmlFor="preferences">特別な希望・要望</label>
                <textarea
                  id="preferences"
                  value={aiFormData.preferences}
                  onChange={(e) => handleAIFormChange('preferences', e.target.value)}
                  placeholder="例: 高級旅館希望、節約重視、子供向けアクティビティ重視、グルメ中心など"
                  className="form-textarea"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="ai-form-actions">
              <button 
                type="button"
                onClick={generateAIBudget}
                disabled={!isAIFormValid() || isGenerating}
                className="btn-generate"
              >
                {isGenerating ? (
                  <>
                    <span className="loading-spinner"></span>
                    予算提案生成中...
                  </>
                ) : (
                  'AI予算提案を生成'
                )}
              </button>
            </div>
          </div>
        )}

        {/* AI提案結果表示 */}
        {aiSuggestion && (
          <div className="ai-suggestion-result">
            <div className="ai-suggestion-header">
              <span className="ai-badge">AI提案</span>
              <button 
                type="button"
                onClick={() => setAiSuggestion('')}
                className="btn-close"
              >
                ×
              </button>
            </div>
            <div className="ai-suggestion-content">
              <pre>{aiSuggestion}</pre>
            </div>
            <div className="ai-suggestion-actions">
              <button 
                type="button"
                onClick={useAISuggestion}
                className="btn-use-suggestion"
              >
                この提案を使用
              </button>
              <button 
                type="button"
                onClick={generateAIBudget}
                disabled={isGenerating}
                className="btn-regenerate"
              >
                再生成
              </button>
            </div>
          </div>
        )}

        {/* エラーメッセージ */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>

      {/* 既存の予算入力エリア */}
      <div className="form-row">
        <textarea
          placeholder="想定予算を記入"
          className="input-field textarea-field"
          rows={4}
          maxLength={500}
          {...budgetForm.getFieldProps('text')}
        />
        <div className="character-count">
          {budgetForm.values.text.length}/500
        </div>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting}
        className="btn-primary"
      >
        {isSubmitting ? '提案中...' : '提案'}
      </button>
    </div>
  );
};

export default BudgetProposalForm;