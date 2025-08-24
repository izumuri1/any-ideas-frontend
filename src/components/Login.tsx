// src/components/Login.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import './Login.scss'

////////////////////////////////////////////////////////////////
// ◆ 実行時の流れ
// ページ読み込み → コンポーネントが表示される
// ユーザーが入力 → React Hook Formがリアルタイムでバリデーション
// ログインボタンクリック → onSubmit関数が実行される
// ログイン成功 → AuthContextが状態を更新 → App.tsxが別画面に切り替え
// ログイン失敗 → エラーメッセージを表示
////////////////////////////////////////////////////////////////

// 1. 準備・設定
// ログインフォームの型定義
interface LoginFormData {
  email: string
  password: string
}

// 2. 状態管理・フック初期化
// ログイン画面を表示するためのコンポーネントを作成
export function Login() {
  const { signIn, loading } = useAuth()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState('')

// ログインフォーム
// React Hook Formからフォーム管理に必要な3つの道具を取り出す
  const {
    register,
    handleSubmit,
    formState: { errors }
    // React Hook Formを初期化。<LoginFormData>でフォームの型を指定
  } = useForm<LoginFormData>()

// 3. ログイン処理ロジック
// 自作のonSubmit関数でサインインの結果を取得する非同期処理
// 関数の引数はログインフォームの入力データ（LoginFormDataで型を指定）
// SubmitErrorを初期化➡サインイン結果取得（取得完了まで次の処理には進まない）
// ➡サインイン成功の場合は、監視側で状態更新／エラーの場合は、SubmitErrorを更新してエラーメッセージを表示
  const onSubmit = async (data: LoginFormData) => {
    setSubmitError('')
    
    const { error } = await signIn(data.email, data.password)
    if (error) {
      switch (error.code) {
        case 'invalid_credentials':
          setSubmitError('メールアドレスまたはパスワードが正しくありません。')
          break
        case 'email_not_confirmed':
          setSubmitError('メールアドレスの確認が完了していません。確認メールをご確認ください。')
          break
        case 'user_not_found':
          setSubmitError('アカウントが見つかりません。メールアドレスを確認してください。')
          break
        case 'over_request_rate_limit':
          setSubmitError('ログイン試行回数が多すぎます。数分待ってから再度お試しください。')
          break
        case 'user_banned':
          setSubmitError('このアカウントは一時的に利用が制限されています。')
          break
        case 'email_address_invalid':
          setSubmitError('正しいメールアドレスを入力してください。')
          break
        case 'validation_failed':
          setSubmitError('入力内容に誤りがあります。確認してください。')
          break
        default:
          setSubmitError('ログインに失敗しました。メールアドレスとパスワードを確認してください。')
      }
    }
  }

  const handleSignUpClick = () => {
    // signupページに遷移
    navigate('/signup')
}

// 4. レンダリング（画面処理）
  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="logo">Any ideas?</h1>
        <p className="subtitle">おかえりなさい</p>
        <p className="introduction">アカウントにログインして始めましょう</p>

        {/* エラーメッセージ */}
        {/* &&の左側が truthy なら右側<div xxx /div>を返す */}
        {/* この場合、エラーメッセージが左側にあれば、divでエラーメッセージを表示する */}
        {submitError && <div className="error-message">{submitError}</div>}

        {/* ログインフォーム */}
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
                // pattern: {
                //   value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                //   message: '正しいメールアドレスを入力してください'
                // }
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
            <label htmlFor="password">パスワード</label>
            <input
              type="password"
              id="password"
              {...register('password', {
                required: 'パスワードは必須です',
                // minLength: {
                //   value: 8,
                //   message: 'パスワードは8文字以上で入力してください'
                // }
              })}
              placeholder="パスワードを入力"
              disabled={loading}
            />
            {errors.password && (
              <span className="field-error">{errors.password.message}</span>
            )}
          </div>

          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>

          {/* Google ログイン（将来実装）
          <button 
            type="button" 
            className="btn-google"
            disabled={loading}
          >
            Googleでログイン
          </button>
          */}

          <p className="auth-switch">
            アカウントをお持ちでない方は
            <button 
              type="button"
              onClick={handleSignUpClick}
              className="link-button"
            >
              新規アカウント登録
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}