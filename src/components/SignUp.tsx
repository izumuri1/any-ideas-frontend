// src/components/SignUp.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import './Login.scss' // Login.scssを共有利用


////////////////////////////////////////////////////////////////
// ◆ 実行時の流れ
// ページ読み込み → コンポーネントが表示される
// ユーザーが入力 → React Hook Formがリアルタイムでバリデーション
// 新規アカウント登録ボタンクリック → onSubmit関数が実行される
// 登録成功 → AuthContextが状態を更新 → App.tsxがHome画面に切り替え
// 登録失敗 → エラーメッセージを表示
////////////////////////////////////////////////////////////////

// 1. 準備・設定
// 新規アカウント登録フォームの型定義
interface SignUpFormData {
  email: string
  password: string
  confirmPassword: string
  username: string
  inviteCode?: string // 任意項目
}


// 2. 状態管理・フック初期化
// 新規アカウント登録画面を表示するためのコンポーネントを作成
export function SignUp() {
  const { signUp, loading } = useAuth()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState('')

// 新規アカウント登録フォーム
// React Hook Formからフォーム管理に必要な3つの道具を取り出す
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
    // React Hook Formを初期化。<SignUpFormData>でフォームの型を指定
  } = useForm<SignUpFormData>()

  // パスワード確認のためにパスワードの値を監視
  const watchPassword = watch('password')

// 3. 新規アカウント登録処理ロジック
// 自作のonSubmit関数でサインアップの結果を取得する非同期処理
// 関数の引数は新規アカウント登録フォームの入力データ（SignUpFormDataで型を指定）
// SubmitErrorを初期化➡サインアップ結果取得（取得完了まで次の処理には進まない）
// ➡サインアップ成功の場合は、監視側で状態更新／エラーの場合は、SubmitErrorを更新してエラーメッセージを表示
  const onSubmit = async (data: SignUpFormData) => {
    setSubmitError('')
    
    const { error } = await signUp(data.email, data.password, data.username)
    if (error) {
      // エラーメッセージをユーザーフレンドリーに変換
      let errorMessage = 'アカウント登録に失敗しました。'
      
      if (error.message.includes('already registered')) {
        errorMessage = 'このメールアドレスは既に登録されています。'
      } else if (error.message.includes('Invalid email')) {
        errorMessage = '正しいメールアドレスを入力してください。'
      } else if (error.message.includes('Password should be')) {
        errorMessage = 'パスワードは6文字以上で入力してください。'
      }
      
      setSubmitError(errorMessage)
    }
  }

  const handleLoginClick = () => {
    // loginページに遷移
    navigate('/login')
  }


// 4. レンダリング（画面処理）
  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="logo">Any ideas?</h1>
        <p className="subtitle">はじめまして</p>
        <p className="introduction">新しいアカウントを作成して始めましょう</p>

        {/* エラーメッセージ */}
        {/* &&の左側が truthy なら右側<div xxx /div>を返す */}
        {/* この場合、エラーメッセージが左側にあれば、divでエラーメッセージを表示する */}
        {submitError && <div className="error-message">{submitError}</div>}

        {/* 新規アカウント登録フォーム */}
        {/* 送信ボタンをクリックすると、handleSubmit関数が発火し、バリデーションを実行 */}
        {/* 成功すれば事前に定義したonSubmit関数を実行する */}
        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">メールアドレス</label>
            <input
              type="email"
              id="email"
              {...register('email', {
                required: 'メールアドレスは必須です',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: '正しいメールアドレスを入力してください'
                }
              })}
              placeholder="メールアドレスを入力"
              // ローディング中（loadingがtrue）はボタンを無効化
              disabled={loading}
            />

            {/* React Hook formのformStateを利用し、入力フィールドのバリデーションエラーの場合、メッセージを出力 */}
            {errors.email && (
              <span className="field-error">{errors.email.message}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="username">ユーザー名</label>
            <input
              type="text"
              id="username"
              {...register('username', {
                required: 'ユーザー名は必須です',
                minLength: {
                  value: 2,
                  message: 'ユーザー名は2文字以上で入力してください'
                },
                maxLength: {
                  value: 20,
                  message: 'ユーザー名は20文字以下で入力してください'
                }
              })}
              placeholder="ユーザー名を入力"
              disabled={loading}
            />
            {errors.username && (
              <span className="field-error">{errors.username.message}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <input
              type="password"
              id="password"
              {...register('password', {
                required: 'パスワードは必須です',
                minLength: {
                  value: 8,
                  message: 'パスワードは8文字以上で入力してください'
                }
              })}
              placeholder="パスワードを入力"
              disabled={loading}
            />
            {errors.password && (
              <span className="field-error">{errors.password.message}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">パスワード確認</label>
            <input
              type="password"
              id="confirmPassword"
              {...register('confirmPassword', {
                required: 'パスワード確認は必須です',
                validate: (value) =>
                  value === watchPassword || 'パスワードが一致しません'
              })}
              placeholder="パスワードを再入力"
              disabled={loading}
            />
            {errors.confirmPassword && (
              <span className="field-error">{errors.confirmPassword.message}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="inviteCode">招待コード（任意）</label>
            <input
              type="text"
              id="inviteCode"
              {...register('inviteCode')}
              placeholder="招待コードがあれば入力"
              disabled={loading}
            />
            {/* 招待コードは任意のためエラー表示なし */}
          </div>

          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'アカウント作成中...' : '新規アカウント登録'}
          </button>

          {/* Google ログイン（将来実装）
          <button 
            type="button" 
            className="btn-google"
            disabled={loading}
          >
            Googleでアカウント作成
          </button>
          */}

          <p className="auth-switch">
            既にアカウントをお持ちの方は
            <button 
              type="button"
              onClick={handleLoginClick}
              className="link-button"
            >
              ログイン
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}