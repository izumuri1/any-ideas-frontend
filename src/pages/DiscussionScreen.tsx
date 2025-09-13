// src/pages/DiscussionScreen.tsx
// 修正版 - TabContentの再レンダリング問題を解決

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { HamburgerMenu } from '../components/HamburgerMenu'
import './DiscussionScreen.scss'

// アイデア情報の型定義
interface IdeaInfo {
  id: string
  idea_name: string
  creator_id: string
  profiles: {
    username: string
  }
}

// 提案フォームの型定義
interface ProposalForm {
  period: {
    startDate: string
    endDate: string
  }
  todo: {
    text: string
  }
  notTodo: {
    text: string
  }
  budget: {
    text: string
  }
}

// メイン検討画面コンポーネント
export default function DiscussionScreen() {
  const { user } = useAuth()
  const { workspaceId, ideaId } = useParams<{ workspaceId: string; ideaId: string }>()
  
  // 状態管理
  const [activeTab, setActiveTab] = useState('period')
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ideaInfo, setIdeaInfo] = useState<IdeaInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // フォームデータの状態
  const [proposalForm, setProposalForm] = useState<ProposalForm>({
    period: {
      startDate: '',
      endDate: ''
    },
    todo: {
      text: ''
    },
    notTodo: {
      text: ''
    },
    budget: {
      text: ''
    }
  })

  // アイデア情報を取得する関数
  const fetchIdeaInfo = async () => {
    if (!ideaId || !user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('ideas')
        .select(`
          id,
          idea_name,
          creator_id,
          profiles:creator_id (
            username
          )
        `)
        .eq('id', ideaId)
        .eq('workspace_id', workspaceId)
        .single()

      if (error) throw error

      setIdeaInfo({
        id: data.id,
        idea_name: data.idea_name,
        creator_id: data.creator_id,
        profiles: {
          username: (data.profiles as any)?.username || 'Unknown'
        }
      })
    } catch (error) {
      console.error('アイデア情報の取得でエラーが発生しました:', error)
      setSubmitError('アイデア情報を取得できませんでした')
    } finally {
      setLoading(false)
    }
  }

  // コンポーネントマウント時にアイデア情報を取得
  useEffect(() => {
    fetchIdeaInfo()
  }, [ideaId, workspaceId, user])

  // フォーム値の変更処理
  const handleFormChange = (type: keyof ProposalForm, field: string, value: string) => {
    setProposalForm(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }))
  }

  // 提案送信処理
  const handleProposalSubmit = async (type: keyof ProposalForm) => {
    if (!user || !ideaId) return

    setIsSubmitting(true)
    setSubmitError('')

    try {
      // バリデーション
      if (type === 'period') {
        if (!proposalForm.period.startDate || !proposalForm.period.endDate) {
          throw new Error('開始日と終了日を入力してください')
        }
        if (new Date(proposalForm.period.startDate) > new Date(proposalForm.period.endDate)) {
          throw new Error('開始日は終了日より前に設定してください')
        }
      } else if (type === 'todo' || type === 'notTodo' || type === 'budget') {
        if (!proposalForm[type].text.trim()) {
          throw new Error('内容を入力してください')
        }
      }

      // Supabaseのproposalsテーブルにデータを送信
      const proposalData = {
        idea_id: ideaId,
        proposer_id: user.id,
        proposal_type: type,
        content: type === 'period' 
          ? `${proposalForm.period.startDate}から${proposalForm.period.endDate}` 
          : proposalForm[type].text,
        start_date: type === 'period' ? proposalForm.period.startDate : null,
        end_date: type === 'period' ? proposalForm.period.endDate : null,
        todo_text: type === 'todo' ? proposalForm.todo.text : null,
        not_todo_text: type === 'notTodo' ? proposalForm.notTodo.text : null,
        budget_text: type === 'budget' ? proposalForm.budget.text : null
      }

      const { error } = await supabase
        .from('proposals')
        .insert(proposalData)

      if (error) throw error

      // 成功時はフォームをリセット
      if (type === 'period') {
        setProposalForm(prev => ({
          ...prev,
          period: { startDate: '', endDate: '' }
        }))
      } else {
        setProposalForm(prev => ({
          ...prev,
          [type]: { text: '' }
        }))
      }

      alert('提案を送信しました！')

    } catch (error: any) {
      console.error('提案送信エラー:', error)
      setSubmitError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ローディング中の表示
  if (loading) {
    return (
      <div className="discussion-screen">
        <header className="discussion-header">
          <div className="header">
            <HamburgerMenu currentPage="other" />
            <div className="idea-info">
              <p className="loading-text">読み込み中...</p>
            </div>
          </div>
        </header>
        <main className="discussion-main">
          <p>アイデア情報を読み込み中...</p>
        </main>
      </div>
    )
  }

  // アイデア情報が取得できない場合
  if (!ideaInfo) {
    return (
      <div className="discussion-screen">
        <header className="discussion-header">
          <div className="header">
            <HamburgerMenu currentPage="other" />
            <div className="idea-info">
              <p className="error-text">アイデア情報を取得できませんでした</p>
            </div>
          </div>
        </header>
        <main className="discussion-main">
          <p>アイデア情報を取得できませんでした。</p>
        </main>
      </div>
    )
  }

  return (
    <div className="discussion-screen">
      {/* ヘッダー - Home画面の構造に合わせて修正 */}
      <header className="discussion-header">
        <div className="header">
          <HamburgerMenu currentPage="other" />
          
          <div className="idea-info">
            <div className="idea-name">
              <span className="label">アイデア名：</span>
              <span className="value">{ideaInfo.idea_name}</span>
            </div>
            <div className="idea-owner">
              <span className="label">アイデアオーナー：</span>
              <span className="value">{ideaInfo.profiles.username}</span>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="discussion-main">
        <section className="how-about-section">
          <div className="section-header">
            <h2 className="section-title">How about？</h2>
            <p className="section-description">具体的な提案をしてみよう</p>
          </div>

          {/* エラーメッセージ */}
          {submitError && (
            <div className="error-message" role="alert">
              {submitError}
            </div>
          )}

          {/* タブナビゲーション */}
          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'period' ? 'active' : ''}`}
              onClick={() => setActiveTab('period')}
            >
              いつから・いつまで
            </button>
            <button 
              className={`tab-button ${activeTab === 'todo' ? 'active' : ''}`}
              onClick={() => setActiveTab('todo')}
            >
              やりたいこと
            </button>
            <button 
              className={`tab-button ${activeTab === 'notTodo' ? 'active' : ''}`}
              onClick={() => setActiveTab('notTodo')}
            >
              やらなくても良いこと
            </button>
            <button 
              className={`tab-button ${activeTab === 'budget' ? 'active' : ''}`}
              onClick={() => setActiveTab('budget')}
            >
              想定予算
            </button>
          </div>

          {/* タブコンテンツ - TabContentコンポーネントを使わずに直接描画 */}
          <div className="tab-contents">
            {/* いつから・いつまで */}
            {activeTab === 'period' && (
              <div className="tab-content active">
                <h3 className="tab-title">実施希望時期</h3>
                <div className="proposal-registration-form">
                  <div className="form-row">
                    <input
                      type="date"
                      value={proposalForm.period.startDate}
                      onChange={(e) => handleFormChange('period', 'startDate', e.target.value)}
                      className="input-field"
                      placeholder="いつから"
                    />
                  </div>
                  
                  <div className="form-row">
                    <input
                      type="date"
                      value={proposalForm.period.endDate}
                      onChange={(e) => handleFormChange('period', 'endDate', e.target.value)}
                      className="input-field"
                      placeholder="いつまで"
                    />
                  </div>

                  <button
                    onClick={() => handleProposalSubmit('period')}
                    disabled={isSubmitting}
                    className="btn-primary"
                  >
                    {isSubmitting ? '提案中...' : '提案'}
                  </button>
                </div>
              </div>
            )}

            {/* やりたいこと */}
            {activeTab === 'todo' && (
              <div className="tab-content active">
                <h3 className="tab-title">やりたいこと</h3>
                <div className="proposal-registration-form">
                  <div className="form-row">
                    <textarea
                      value={proposalForm.todo.text}
                      onChange={(e) => handleFormChange('todo', 'text', e.target.value)}
                      className="input-field textarea-field"
                      placeholder="やりたいことを記入"
                      rows={4}
                      maxLength={500}
                    />
                    <div className="character-count">
                      {proposalForm.todo.text.length}/500
                    </div>
                  </div>

                  <button
                    onClick={() => handleProposalSubmit('todo')}
                    disabled={isSubmitting}
                    className="btn-primary"
                  >
                    {isSubmitting ? '提案中...' : '提案'}
                  </button>
                </div>
              </div>
            )}

            {/* やらなくても良いこと */}
            {activeTab === 'notTodo' && (
              <div className="tab-content active">
                <h3 className="tab-title">やらなくても良いこと</h3>
                <div className="proposal-registration-form">
                  <div className="form-row">
                    <textarea
                      value={proposalForm.notTodo.text}
                      onChange={(e) => handleFormChange('notTodo', 'text', e.target.value)}
                      className="input-field textarea-field"
                      placeholder="やらなくても良いことを記入"
                      rows={4}
                      maxLength={500}
                    />
                    <div className="character-count">
                      {proposalForm.notTodo.text.length}/500
                    </div>
                  </div>

                  <button
                    onClick={() => handleProposalSubmit('notTodo')}
                    disabled={isSubmitting}
                    className="btn-primary"
                  >
                    {isSubmitting ? '提案中...' : '提案'}
                  </button>
                </div>
              </div>
            )}

            {/* 想定予算 */}
            {activeTab === 'budget' && (
              <div className="tab-content active">
                <h3 className="tab-title">想定予算</h3>
                <div className="proposal-registration-form">
                  <div className="form-row">
                    <textarea
                      value={proposalForm.budget.text}
                      onChange={(e) => handleFormChange('budget', 'text', e.target.value)}
                      className="input-field textarea-field"
                      placeholder="想定予算を記入"
                      rows={4}
                      maxLength={500}
                    />
                    <div className="character-count">
                      {proposalForm.budget.text.length}/500
                    </div>
                  </div>

                  <button
                    onClick={() => handleProposalSubmit('budget')}
                    disabled={isSubmitting}
                    className="btn-primary"
                  >
                    {isSubmitting ? '提案中...' : '提案'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 提案一覧セクション（今後実装予定） */}
        <section className="proposals-section">
          <h3 className="proposals-title">提案一覧</h3>
          <p className="proposals-description">（提案の表示・いいね・採用機能は次のステップで実装予定）</p>
        </section>
      </main>
    </div>
  )
}