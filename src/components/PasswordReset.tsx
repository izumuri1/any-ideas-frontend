// src/components/PasswordReset.tsx - パスワードリセット機能
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import FormField from './common/FormField'
import { useForm } from '../hooks/useForm'
import './Login.scss' // 既存のスタイルを再利用

////////////////////////////////////////////////////////////////
// パスワードリセット機能
// Supabaseの resetPasswordForEmail を使用してリセットメールを送信
////////////////////////////////////////////////////////////////

interface PasswordResetFormData {
  email: string
}

export function PasswordReset() {
  const navigate = useNavigate()
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const resetForm = useForm<PasswordResetFormData>({
    initialValues: {
      email: ''
    },
    validationRules: {
      email: {
        custom: (value) => {
          if (!value.trim()) return 'メールアドレスは必須です'
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return '正しいメールアドレスを入力してください'
          return undefined
        }
      }
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')

   if (!resetForm.validateAll()) {
      return
    }

    resetForm.setSubmitting(true)

    try {
    const { error } = await supabase.auth.resetPasswordForEmail(resetForm.values.email, {
        redirectTo: `${window.location.origin}/password-reset-confirm`
      })

      if (error) {
        console.error('Password reset error:', error)
        if (error.message.includes('Email not confirmed')) {
          setSubmitError('このメールアドレスは確認されていません。新規登録時の確認メールをご確認ください。')
        } else if (error.message.includes('Invalid email')) {
          setSubmitError('有効なメールアドレスを入力してください。')
        } else {
          setSubmitError('メール送信に失敗しました。メールアドレスをご確認ください。')
        }
      } else {
        setIsSubmitted(true)
      }
    } catch (error) {
      console.error('パスワードリセットエラー:', error)
      setSubmitError('予期しないエラーが発生しました。')
    } finally {
      resetForm.setSubmitting(false)
    }
  }

  const handleBackToLogin = () => {
    navigate('/login')
  }

  if (isSubmitted) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1 className="logo">Any ideas?</h1>
          <p className="subtitle">メールを送信しました</p>
          <p className="introduction">
            {resetForm.values.email} にパスワードリセット用のリンクを送信しました。<br />
            メールをご確認ください。
          </p>

          <div className="auth-form">
            <button 
              type="button"
              onClick={handleBackToLogin}
              className="btn-secondary"
            >
              ログイン画面に戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="logo">Any ideas?</h1>
        <p className="subtitle">パスワードリセット</p>
        <p className="introduction">パスワードリセット用のメールをお送りします</p>

        {submitError && <div className="error-message">{submitError}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <FormField
              type="email"
              label="メールアドレス"
              placeholder="メールアドレスを入力"
              disabled={resetForm.isSubmitting}
              {...resetForm.getFieldProps('email')}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary"
            disabled={resetForm.isSubmitting}
          >
            {resetForm.isSubmitting ? 'メール送信中...' : 'リセットメールを送信'}
          </button>

          <button 
            type="button"
            onClick={handleBackToLogin}
            className="btn-secondary"
          >
            ログイン画面に戻る
          </button>
        </form>
      </div>
    </div>
  )
}