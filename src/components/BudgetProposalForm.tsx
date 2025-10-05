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
  planType: string;      // 最大100文字
  participants: string;  // 最大50文字
  duration: string;      // 最大30文字
  location: string;      // 最大50文字
  budget_range: string;  // 最大50文字
  preferences: string;   // 最大200文字
}

interface LimitMessage {
  title: string;
  message: string;
  resetTime: Date | null;
}

interface QuotaStatus {
  canRequest: boolean;
  remaining: { daily: number; minute: number };
  limitMessage: LimitMessage | null;
}

const BudgetProposalForm: React.FC<BudgetProposalFormProps> = ({
  budgetForm,
  onSubmit,
  isSubmitting
}) => {
  const { user } = useAuth();
  const [showAIForm, setShowAIForm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>('');
  const [error, setError] = useState('');
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus>({
    canRequest: true,
    remaining: { daily: 15, minute: 15 },
    limitMessage: null
    });
  const [remainingUsage, setRemainingUsage] = useState<number | null>(null);

  const [aiFormData, setAiFormData] = useState<AIFormData>({
    planType: '',
    participants: '',
    duration: '',
    location: '',
    budget_range: '',
    preferences: ''
    });

    // 制限状況を更新する関数
    const updateQuotaStatus = async () => {
    if (!user) return;
    
    try {
        const response = await fetch(`/api/get-usage-quota?userId=${user.id}`);
        const data = await response.json();
        
        if (data.success) {
        const canRequest = data.usage.daily.remaining > 0;
        setQuotaStatus({
            canRequest,
            remaining: { 
            daily: data.usage.daily.remaining, 
            minute: 15 // 分制限は簡素化のため削除
            },
            limitMessage: canRequest ? null : {
            title: '本日の利用制限に達しました',
            message: `本日のAI使用回数が上限（${data.usage.daily.limit}回）に達しました。明日の0時にリセットされます。`,
            resetTime: (() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0);
                return tomorrow;
            })()
            }
        });
        
        setRemainingUsage(data.usage.daily.remaining);
        }
    } catch (error) {
        console.error('使用回数取得エラー:', error);
    }
    };

    // AI提案のフォーマット処理関数を追加
    const formatAISuggestion = (suggestion: string) => {
        if (!suggestion) return '';
        
        return suggestion
        .split('\n')
        .map((line, index) => {
            // 空行の処理
            if (line.trim() === '') {
            return <br key={index} />;
            }
            
            // 「総額予算:」「内訳:」などの見出し行
            if (line.includes('総額予算:') || line.includes('内訳:')) {
            return (
                <div key={index} className="budget-header">
                {line}
                </div>
            );
            }
            
            // 「- 宿泊費:」などのリスト項目
            if (line.trim().startsWith('- ')) {
            return (
                <div key={index} className="budget-item">
                {line}
                </div>
            );
            }
            
            // その他の通常行
            return (
            <div key={index} className="budget-line">
                {line}
            </div>
            );
        });
    };

    // 制限状況の定期更新
    React.useEffect(() => {
    updateQuotaStatus();
    const interval = setInterval(updateQuotaStatus, 5000);
    return () => clearInterval(interval);
    }, []);

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
    // 制限チェック
    if (!quotaStatus.canRequest) {
        setError(quotaStatus.limitMessage?.message || '使用制限に達しています');
        return;
    }

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

        if (!response.ok) {
        // 制限エラーの場合の特別な処理
        if (data.error === 'quota_exceeded') {
            setError(data.message);
            updateQuotaStatus();
            return;
        }
        }

       if (data.success) {
            console.log('API レスポンス:', data);
            console.log('AI提案データ:', data.suggestion, typeof data.suggestion);
            setAiSuggestion(data.suggestion);
            
            // 使用回数の更新（サーバーから返される値を使用）
            if (data.usage) {
            setRemainingUsage(data.usage.daily.remaining);
            setQuotaStatus(prev => ({
                ...prev,
                canRequest: data.usage.daily.remaining > 0,
                remaining: { daily: data.usage.daily.remaining, minute: 15 }
            }));
            }
            
            setShowAIForm(false);
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
            let suggestionText = '';
            
            console.log('AI提案の型とデータ:', typeof aiSuggestion, aiSuggestion); // デバッグ用
            
            if (typeof aiSuggestion === 'string') {
                suggestionText = aiSuggestion;
            } else if (aiSuggestion && typeof aiSuggestion === 'object') {
                const suggestion = aiSuggestion as any; // 型アサーション
                // オブジェクトの場合、よく使われるプロパティを確認
                if (suggestion.suggestion) {
                    suggestionText = suggestion.suggestion;
                } else if (suggestion.text) {
                    suggestionText = suggestion.text;
                } else if (suggestion.content) {
                    suggestionText = suggestion.content;
                } else if (suggestion.message) {
                    suggestionText = suggestion.message;
                } else {
                    // 上記のプロパティがない場合はJSON形式で表示
                    suggestionText = JSON.stringify(suggestion, null, 2);
                }
            } else if (aiSuggestion !== null && aiSuggestion !== undefined) {
                suggestionText = String(aiSuggestion);
            } else {
                suggestionText = '';
            }
            
            console.log('変換後のテキスト:', suggestionText); // デバッグ用
            
            if (suggestionText.trim()) {
                budgetForm.setValue('text', suggestionText);
                setAiSuggestion(''); // 提案を使用したら非表示
            } else {
                setError('有効な提案データがありません');
            }
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
        disabled={!quotaStatus.canRequest}
        >
        AI予算提案
        {!quotaStatus.canRequest && <span className="disabled-indicator">（制限中）</span>}
        </button>
        
        {/* 制限メッセージの表示 */}
        {!quotaStatus.canRequest && quotaStatus.limitMessage && (
        <div className="quota-limit-message">
            <strong>{quotaStatus.limitMessage.title}</strong>
            <p>{quotaStatus.limitMessage.message}</p>
            {quotaStatus.limitMessage.resetTime && (
            <small>
                リセット時刻: {quotaStatus.limitMessage.resetTime.toLocaleString()}
            </small>
            )}
        </div>
        )}

        {/* 残り使用回数表示 */}
        {remainingUsage !== null && quotaStatus.canRequest && (
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
                  maxLength={100}
                />
                <small className="char-count">{aiFormData.planType.length}/100文字</small>
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
                  maxLength={50}
                />
                <small className="char-count">{aiFormData.participants.length}/50文字</small>
              </div>
              
              <div className="form-row">
                <label htmlFor="duration">期間・日数 *</label>
                <input
                  id="duration"
                  type="text"
                  value={aiFormData.duration}
                  onChange={(e) => handleAIFormChange('duration', e.target.value)}
                  placeholder="例: 10月上旬に1泊2日、年末年始またいで2泊3日、日帰り、3泊4日"
                  className="form-input"
                  maxLength={30}
                />
                <small className="char-count">{aiFormData.duration.length}/30文字</small>
              </div>
              
              <div className="form-row">
                <label htmlFor="location">場所 *</label>
                <input
                  id="location"
                  type="text"
                  value={aiFormData.location}
                  onChange={(e) => handleAIFormChange('location', e.target.value)}
                  placeholder="例: 沖縄の離島、箱根の温泉、北海道、東京ディズニーリゾート"
                  className="form-input"
                  maxLength={50}
                />
                <small className="char-count">{aiFormData.location.length}/50文字</small>
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
                <label htmlFor="preferences">特別な要望（任意）</label>
                <textarea
                  id="preferences"
                  value={aiFormData.preferences}
                  onChange={(e) => handleAIFormChange('preferences', e.target.value)}
                  placeholder="例: オーシャンビューの部屋、朝食付き、ペット同伴可、など"
                  className="form-input"
                  rows={3}
                  maxLength={300}
                />
                <small className="char-count">{aiFormData.preferences.length}/300文字</small>
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
              <div className="formatted-suggestion">
                {formatAISuggestion(aiSuggestion)}
              </div>
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
        value={budgetForm.values.text}
        onChange={(e) => budgetForm.setValue('text', e.target.value)}
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