// src/components/Login.tsx - useForm + FormFieldリファクタリング版
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import FormField from './common/FormField'  // 追加
import { useForm } from '../hooks/useForm'   // 追加（React Hook Form → 自作useFormに変更）
import './Login.scss'

////////////////////////////////////////////////////////////////
// ◆ 実行時の流れ
// ページ読み込み → コンポーネントが表示される
// ユーザーが入力 → 自作useFormがリアルタイムでバリデーション
// ログインボタンクリック → handleSubmit関数が実行される
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
export function Login() {
  const { signIn, loading } = useAuth()
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState('')

  // リファクタリング：React Hook Form → 自作useFormフックに変更
  const loginForm = useForm<LoginFormData>({
    initialValues: {
      email: '',
      password: ''
    },
    validationRules: {
      email: {
        custom: (value) => {
          if (!value.trim()) return 'メールアドレスは必須です'
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return '正しいメールアドレスを入力してください'
          return undefined
        }
      },
      password: {
        custom: (value) => {
          if (!value.trim()) return 'パスワードは必須です'
          return undefined
        }
      }
    }
  })

  // 3. ログイン処理ロジック
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // バリデーション実行
    if (!loginForm.validateAll()) {
      return
    }

    setSubmitError('')
    loginForm.setSubmitting(true)
    
    try {
      const { error } = await signIn(loginForm.values.email, loginForm.values.password)
      
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
    } catch (err) {
      console.error('Login error:', err)
      setSubmitError('ログインに失敗しました。')
    } finally {
      loginForm.setSubmitting(false)
    }
  }

  const handleSignUpClick = () => {
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
        {submitError && <div className="error-message">{submitError}</div>}

        {/* リファクタリング：ログインフォーム */}
        <form onSubmit={handleSubmit} className="auth-form">
          {/* メールアドレス */}
          <div className="form-group">
            <FormField
              type="email"
              label="メールアドレス"
              placeholder="メールアドレスを入力"
              disabled={loading || loginForm.isSubmitting}
              {...loginForm.getFieldProps('email')}
            />
          </div>

          {/* パスワード */}
          <div className="form-group">
            <FormField
              type="password"
              label="パスワード"
              placeholder="パスワードを入力"
              disabled={loading || loginForm.isSubmitting}
              {...loginForm.getFieldProps('password')}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading || loginForm.isSubmitting}
          >
            {loading || loginForm.isSubmitting ? 'ログイン中...' : 'ログイン'}
          </button>

          {/* Google ログイン（将来実装）
          <button 
            type="button" 
            className="btn-google"
            disabled={loading || loginForm.isSubmitting}
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