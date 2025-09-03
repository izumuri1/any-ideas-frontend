// src/components/CreateWorkspace.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import './CreateWorkspace.scss' // ワークスペース作成専用スタイル

////////////////////////////////////////////////////////////////
// ◆ 実行時の流れ
// ページ読み込み → ワークスペース選択状態で表示される
// ワークスペース作成ボタンクリック → ワークスペース作成フォーム表示
// ワークスペース作成成功 → ワークスペース選択状態に戻る
// ワークスペース選択 → Home画面に遷移
////////////////////////////////////////////////////////////////

// 1. 準備・設定
// ワークスペース作成フォームの型定義
interface CreateWorkspaceFormData {
  workspaceName: string
  description?: string
}

// 仮のワークスペース型定義（将来のAPI実装用）
interface Workspace {
  id: string
  name: string
  description?: string
  owner_id: string
  created_at: string
}

// 2. 状態管理・フック初期化
// ワークスペース画面を表示するためのコンポーネントを作成
export function CreateWorkspace() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false) // フォーム表示状態
  const [workspaces, setWorkspaces] = useState<Workspace[]>([
    // 将来のAPI実装時には、ここをAPIから取得したデータで置き換える

  ])

  // ワークスペース作成フォーム
  // React Hook Formからフォーム管理に必要な3つの道具を取り出す
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
    // React Hook Formを初期化。<CreateWorkspaceFormData>でフォームの型を指定
  } = useForm<CreateWorkspaceFormData>()

  // 3. ワークスペース作成処理ロジック
  const onSubmit = async (data: CreateWorkspaceFormData) => {
    if (!user) {
      setSubmitError('ログインが必要です')
      return
    }

    setSubmitError('')
    setIsLoading(true)
    
    try {
      // TODO: 実際のワークスペース作成API呼び出し
      // const { data: workspace, error } = await supabase
      //   .from('workspaces')
      //   .insert({
      //     name: data.workspaceName,
      //     description: data.description,
      //     owner_id: user.id
      //   })
      //   .select()
      //   .single()
      
      // if (error) throw error
      
      // // ワークスペースメンバーとして自分を追加
      // const { error: memberError } = await supabase
      //   .from('workspace_members')
      //   .insert({
      //     workspace_id: workspace.id,
      //     user_id: user.id,
      //     role: 'owner'
      //   })
      
      // if (memberError) throw memberError
      
      // 仮の成功処理（実装時は上記のコメントアウト部分を使用）
      setTimeout(() => {
        // 新しいワークスペースを一覧に追加
        const newWorkspace: Workspace = {
          id: Date.now().toString(),
          name: data.workspaceName,
          description: data.description,
          owner_id: user.id,
          created_at: new Date().toISOString()
        }
        setWorkspaces(prev => [newWorkspace, ...prev])
        
        // フォームをリセットして選択状態に戻る
        reset()
        setShowCreateForm(false)
      }, 1000)
      
    } catch (error: any) {
      // エラーハンドリング
      switch (error?.code) {
        case 'workspace_name_too_long':
          setSubmitError('ワークスペース名が長すぎます。30文字以下で入力してください。')
          break
        case 'workspace_name_invalid':
          setSubmitError('ワークスペース名に使用できない文字が含まれています。')
          break
        case 'user_workspace_limit_exceeded':
          setSubmitError('作成できるワークスペースの上限に達しています。')
          break
        default:
          setSubmitError('ワークスペースの作成に失敗しました。もう一度お試しください。')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // ログアウト処理関数
  const handleLogoutClick = async () => {
    try {
      setIsLoading(true)
      await signOut()
      // AuthContextがサインアウト状態を検知してログインページに自動リダイレクト
    } catch (error) {
      console.error('ログアウトに失敗しました:', error)
      // エラーが発生してもログインページに遷移させる
      navigate('/login')
    } finally {
      setIsLoading(false)
    }
  }

  // ワークスペース作成フォーム表示切り替え
  const handleShowCreateForm = () => {
    setShowCreateForm(true)
    setSubmitError('') // エラーメッセージをクリア
  }

  // ワークスペース作成キャンセル
  const handleCancelCreate = () => {
    setShowCreateForm(false)
    setSubmitError('')
    reset()
  }

  // ワークスペース選択処理
  const handleWorkspaceSelect = (workspace: Workspace) => {
    // TODO: 選択したワークスペースをローカルストレージに保存
    // localStorage.setItem('currentWorkspace', JSON.stringify(workspace))
    
    // Home画面に遷移
    navigate(`/workspace/${workspace.id}`)
  }

  // 4. レンダリング（画面処理）
  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="logo">Any ideas?</h1>
        
        {/* ワークスペース作成フォーム表示状態 */}
        {showCreateForm ? (
          <>
            <p className="subtitle">ワークスペース作成</p>
            <p className="introduction">アイデアを共有するワークスペースを作成しましょう</p>

            {/* エラーメッセージ */}
            {submitError && <div className="error-message">{submitError}</div>}

            {/* ワークスペース作成フォーム */}
            <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
              <div className="form-group">
                <label htmlFor="workspaceName">ワークスペース名</label>
                <input
                  type="text"
                  id="workspaceName"
                  placeholder="家族旅行の計画"
                  {...register('workspaceName', {
                    required: 'ワークスペース名は必須です',
                    maxLength: {
                      value: 30,
                      message: 'ワークスペース名は30文字以下で入力してください'
                    },
                    pattern: {
                      value: /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s\-_]+$/,
                      message: 'ワークスペース名に使用できない文字が含まれています'
                    }
                  })}
                />
                {errors.workspaceName && (
                  <span className="field-error">{errors.workspaceName.message}</span>
                )}
              </div>

              <div className="form-buttons">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="btn-primary"
                >
                  {isLoading ? 'ワークスペース作成中...' : 'ワークスペース作成'}
                </button>
                
                <button 
                  type="button"
                  onClick={handleCancelCreate}
                  disabled={isLoading}
                  className="btn-secondary"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </>
        ) : (
          /* ワークスペース選択状態 */
          <>
            <p className="subtitle">ワークスペース選択</p>
            <p className="introduction">参加しているワークスペースを選択してください</p>

            {/* ワークスペース作成ボタン */}
            <button 
              onClick={handleShowCreateForm}
              disabled={isLoading}
              className="btn-primary workspace-create-btn"
            >
              ワークスペース作成
            </button>

            {/* 既存ワークスペース一覧 */}
            <div className="workspace-list">
              {workspaces.length === 0 ? (
                <div className="empty-workspace">
                  <p>まだワークスペースがありません</p>
                  <p>最初のワークスペースを作成しましょう！</p>
                </div>
              ) : (
                workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => handleWorkspaceSelect(workspace)}
                    disabled={isLoading}
                    className="workspace-item"
                  >
                    <div className="workspace-info">
                      <h3 className="workspace-name">{workspace.name}</h3>
                      <span className="workspace-date">
                        作成日: {new Date(workspace.created_at).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {/* ログアウトボタン */}
        <div className="auth-footer">
          <button 
            onClick={handleLogoutClick}
            className="btn-secondary"
            disabled={isLoading}
          >
            ログアウト
          </button>
        </div>
      </div>
    </div>
  )
}