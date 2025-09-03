// src/components/CreateWorkspace.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import './CreateWorkspace.scss' // ワークスペース作成専用スタイル

////////////////////////////////////////////////////////////////
// ◆ 実行時の流れ
// ページ読み込み → コンポーネントが表示される
// ユーザーが入力 → React Hook Formがリアルタイムでバリデーション
// ワークスペース作成ボタンクリック → onSubmit関数が実行される
// 作成成功 → ワークスペース一覧画面または直接作成したワークスペースに遷移
// 作成失敗 → エラーメッセージを表示
////////////////////////////////////////////////////////////////

// 1. 準備・設定
// ワークスペース作成フォームの型定義
interface CreateWorkspaceFormData {
  workspaceName: string
  description?: string
}

// 2. 状態管理・フック初期化
// ワークスペース作成画面を表示するためのコンポーネントを作成
export function CreateWorkspace() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // ワークスペース作成フォーム
  // React Hook Formからフォーム管理に必要な3つの道具を取り出す
  const {
    register,
    handleSubmit,
    formState: { errors }
    // React Hook Formを初期化。<CreateWorkspaceFormData>でフォームの型を指定
  } = useForm<CreateWorkspaceFormData>()

  // 3. ワークスペース作成処理ロジック
  // 自作のonSubmit関数でワークスペース作成の結果を取得する非同期処理
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
        navigate('/workspace-select') // ワークスペース一覧に遷移
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

  const handleBackClick = () => {
    // ワークスペース一覧またはホーム画面に戻る
    navigate('/workspace-select')
  }

  // 4. レンダリング（画面処理）
  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="logo">Any ideas?</h1>
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
                  value: /^[a-zA-Z0-9ひらがなカタカナ漢字\s\-_]+$/,
                  message: 'ワークスペース名に使用できない文字が含まれています'
                }
              })}
            />
            {errors.workspaceName && (
              <span className="field-error">{errors.workspaceName.message}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="description">説明（任意）</label>
            <input
              type="text"
              id="description"
              placeholder="このワークスペースの目的や内容を簡単に説明"
              {...register('description', {
                maxLength: {
                  value: 100,
                  message: '説明は100文字以下で入力してください'
                }
              })}
            />
            {errors.description && (
              <span className="field-error">{errors.description.message}</span>
            )}
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="btn-primary"
          >
            {isLoading ? 'ワークスペース作成中...' : 'ワークスペース作成'}
          </button>
        </form>

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