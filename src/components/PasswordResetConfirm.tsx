// src/components/PasswordResetConfirm.tsx - パスワード更新画面
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import FormField from './common/FormField'
import { useForm } from '../hooks/useForm'
import './Login.scss' // 既存のスタイルを再利用

////////////////////////////////////////////////////////////////
// パスワードリセット確認・新パスワード設定機能
// メールリンクからアクセスされ、新しいパスワードを設定する
////////////////////////////////////////////////////////////////

interface PasswordUpdateFormData {
  password: string
  confirmPassword: string
}

export function PasswordResetConfirm() {
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState('')
  const [isCompleted, setIsCompleted] = useState(false)

  const passwordForm = useForm<PasswordUpdateFormData>({
    initialValues: {
      password: '',
      confirmPassword: ''
    },
    validationRules: {
      password: {
        custom: (value) => {
          if (!value.trim()) return 'パスワードは必須です'
          if (value.length < 6) return 'パスワードは6文字以上で入力してください'
          return undefined
        }
      },
      confirmPassword: {
        custom: (value) => {
          if (!value.trim()) return 'パスワード確認は必須です'
          if (value !== passwordForm.values.password) return 'パスワードが一致しません'
          return undefined
        }
      }
    }
  })

    useEffect(() => {
        // URLのハッシュフラグメントからトークンを取得
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        if (accessToken && refreshToken) {
        // Supabaseセッションを設定
        supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
        })
        }
    }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    if (!passwordForm.validateAll()) {
      return
    }

    passwordForm.setSubmitting(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.values.password
      })

      if (error) {
        setSubmitError('パスワードの更新に失敗しました。再度お試しください。')
      } else {
        setIsCompleted(true)
      }
    } catch (error) {
      console.error('パスワード更新エラー:', error)
      setSubmitError('予期しないエラーが発生しました。')
    } finally {
      passwordForm.setSubmitting(false)
    }
  }

  const handleLoginClick = () => {
    navigate('/login')
  }

  if (isCompleted) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1 className="logo">Any ideas?</h1>
          <p className="subtitle">パスワードを更新しました</p>
          <p className="introduction">
            新しいパスワードでログインしてください。
          </p>

          <div className="auth-form">
            <button 
              type="button"
              onClick={handleLoginClick}
              className="btn-primary"
            >
              ログイン画面へ
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
        <p className="subtitle">新しいパスワードを設定</p>
        <p className="introduction">新しいパスワードを入力してください</p>

        {submitError && <div className="error-message">{submitError}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <FormField
              type="password"
              label="新しいパスワード"
              placeholder="新しいパスワードを入力"
              disabled={passwordForm.isSubmitting}
              {...passwordForm.getFieldProps('password')}
            />
          </div>

          <div className="form-group">
            <FormField
              type="password"
              label="パスワード確認"
              placeholder="パスワードをもう一度入力"
              disabled={passwordForm.isSubmitting}
              {...passwordForm.getFieldProps('confirmPassword')}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary"
            disabled={passwordForm.isSubmitting}
          >
            {passwordForm.isSubmitting ? 'パスワード更新中...' : 'パスワードを更新'}
          </button>

          <button 
            type="button"
            onClick={handleLoginClick}
            className="btn-secondary"
          >
            ログイン画面に戻る
          </button>
        </form>
      </div>
    </div>
  )
}