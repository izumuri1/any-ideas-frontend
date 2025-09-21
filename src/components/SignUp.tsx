// src/components/SignUp.tsx - useForm + FormFieldリファクタリング版
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import FormField from './common/FormField'  // 追加
import { useForm } from '../hooks/useForm'   // 追加（React Hook Form → 自作useFormに変更）
import './Login.scss'

////////////////////////////////////////////////////////////////
// ◆ 実行時の流れ
// ページ読み込み → コンポーネントが表示される
// ユーザーが入力 → 自作useFormがリアルタイムでバリデーション
// 新規アカウント登録ボタンクリック → onSubmit関数が実行される
// 登録成功 → AuthContextが状態を更新 → App.tsxがHome画面に切り替え
// 登録失敗 → エラーメッセージを表示
////////////////////////////////////////////////////////////////

// 1. 準備・設定
// 新規アカウント登録フォームの型定義（inviteCodeを削除）
interface SignUpFormData {
  email: string
  password: string
  confirmPassword: string
  username: string
}

// 2. 状態管理・フック初期化
export function SignUp() {
  const { signUp, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [submitError, setSubmitError] = useState('')
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [workspaceName, setWorkspaceName] = useState<string | null>(null)
  const [isInviteMode, setIsInviteMode] = useState(false)

  // URLパラメータから招待情報を取得
  useEffect(() => {
    const token = searchParams.get('inviteToken')
    const wsName = searchParams.get('workspaceName')
    
    if (token) {
      setInviteToken(token)
      setWorkspaceName(wsName)
      setIsInviteMode(true)
    }
  }, [searchParams])

  // リファクタリング：React Hook Form → 自作useFormフックに変更
  const signUpForm = useForm<SignUpFormData>({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
      username: ''
    },
    validationRules: {
      email: {
        custom: (value) => {
          if (!value.trim()) return 'メールアドレスは必須です'
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return '正しいメールアドレスを入力してください'
          return undefined
        }
      },
      username: {
        custom: (value) => {
          if (!value.trim()) return 'ユーザー名は必須です'
          if (value.length < 2) return 'ユーザー名は2文字以上で入力してください'
          if (value.length > 20) return 'ユーザー名は20文字以下で入力してください'
          return undefined
        }
      },
      password: {
        custom: (value) => {
          if (!value.trim()) return 'パスワードは必須です'
          if (value.length < 8) return 'パスワードは8文字以上で入力してください'
          return undefined
        }
      },
      confirmPassword: {
        custom: (value) => {
          // パスワード確認のカスタムバリデーション
          if (!value.trim()) return 'パスワードの確認は必須です'
          if (value !== signUpForm.values.password) {
            return 'パスワードが一致しません'
          }
          return undefined
        }
      }
    }
  })

  // 3. 新規アカウント登録処理ロジック
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // バリデーション実行
    if (!signUpForm.validateAll()) {
      return
    }

    setSubmitError('')
    signUpForm.setSubmitting(true)
    
    try {
      const { error } = await signUp(
        signUpForm.values.email, 
        signUpForm.values.password, 
        signUpForm.values.username
      )
      
      if (error) {
      console.error('SignUp error details:', error); // デバッグ用ログ追加
      
      // エラーコードとメッセージで判定を強化
      switch (error.code) {
        case 'user_already_exists':
        case 'email_already_exists':  // 追加：別のエラーコードパターン
          setSubmitError('このメールアドレスは既に使用されています。')
          break
        case 'weak_password':
          setSubmitError('パスワードは8文字以上で入力してください。')
          break
        case 'email_address_invalid':
        case 'invalid_email':  // 追加：別のエラーコードパターン
          setSubmitError('正しいメールアドレスを入力してください。')
          break
        default:
          // エラーメッセージも確認して適切なメッセージを表示
          if (error.message?.toLowerCase().includes('already') || 
              error.message?.toLowerCase().includes('exists')) {
            setSubmitError('このメールアドレスは既に使用されています。')
          } else {
            setSubmitError(`アカウント登録に失敗しました。${error.message ? ': ' + error.message : ''}`)
          }
      }
      return
    }

      // 招待トークンがある場合の処理
      if (isInviteMode && inviteToken) {
        await handleInviteTokenProcessing()
      }
      
    } catch (err) {
      console.error('SignUp error:', err)
      setSubmitError('アカウント登録に失敗しました。')
    } finally {
      signUpForm.setSubmitting(false)
    }
  }

  // 招待トークン処理関数
  const handleInviteTokenProcessing = async () => {
    try {
      // 現在のユーザーを取得（新規登録直後なのでAuthContextから取得）
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      if (!currentUser) {
        setSubmitError('ユーザー情報の取得に失敗しました')
        return
      }

      // 招待トークンの検証と取得
      const { data: tokenData, error: tokenError } = await supabase
        .from('invitation_tokens')
        .select(`
          id,
          workspace_id,
          used_count,
          max_uses,
          expires_at,
          is_active
        `)
        .eq('token', inviteToken)
        .eq('is_active', true)
        .single()

      if (tokenError) {
        console.error('招待トークン取得エラー:', tokenError)
        setSubmitError('招待リンクが無効です')
        return
      }

      // トークンの有効性チェック
      const now = new Date()
      const expiresAt = new Date(tokenData.expires_at)
      
      if (now > expiresAt) {
        setSubmitError('招待リンクの有効期限が切れています')
        return
      }

      if (tokenData.used_count >= tokenData.max_uses) {
        setSubmitError('この招待リンクは既に使用されています')
        return
      }

      // ワークスペースメンバーとして追加
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: tokenData.workspace_id,
          user_id: currentUser.id,
          role: 'member'
        })

      if (memberError) {
        console.error('メンバー追加エラー:', memberError)
        setSubmitError('ワークスペースへの参加に失敗しました')
        return
      }

      // トークンを使用済みに更新
      const { error: tokenUpdateError } = await supabase
        .from('invitation_tokens')
        .update({
          used_count: tokenData.used_count + 1,
          used_by: currentUser.id,
          used_at: new Date().toISOString(),
          is_active: tokenData.used_count + 1 >= tokenData.max_uses ? false : true
        })
        .eq('id', tokenData.id)

      if (tokenUpdateError) {
        console.warn('トークン更新エラー:', tokenUpdateError)
        // トークン更新失敗は致命的ではないので続行
      }

      // ワークスペースに直接遷移
      navigate(`/workspace/${tokenData.workspace_id}`)

    } catch (error: any) {
      console.error('招待トークン処理エラー:', error)
      setSubmitError('ワークスペースへの参加処理中にエラーが発生しました')
    }
  }

  const handleLoginClick = () => {
    // 現在のクエリパラメータを保持してログイン画面に遷移
    const inviteToken = searchParams.get('inviteToken')
    const workspaceName = searchParams.get('workspaceName')
    
    if (inviteToken) {
      navigate(`/login?inviteToken=${inviteToken}&workspaceName=${workspaceName || ''}`)
    } else {
      navigate('/login')
    }
  }

  // 4. レンダリング（画面処理）
  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="logo">Any ideas?</h1>
        <p className="subtitle">{isInviteMode ? 'ワークスペースへの招待' : 'はじめまして'}</p>
        <p className="introduction">
          {isInviteMode 
            ? `${workspaceName} への参加にはアカウント作成が必要です`
            : 'アカウントを作成して始めましょう'
          }
        </p>

        {/* エラーメッセージ */}
        {submitError && <div className="error-message">{submitError}</div>}

        {/* リファクタリング：新規アカウント登録フォーム */}
        <form onSubmit={handleSubmit} className="auth-form">
          {/* メールアドレス */}
          <div className="form-group">
            <FormField
              type="email"
              label="メールアドレス"
              placeholder="メールアドレスを入力"
              disabled={loading || signUpForm.isSubmitting}
              {...signUpForm.getFieldProps('email')}
            />
          </div>

          {/* ユーザー名 */}
          <div className="form-group">
            <FormField
              type="text"
              label="ユーザー名"
              placeholder="ユーザー名を入力"
              disabled={loading || signUpForm.isSubmitting}
              {...signUpForm.getFieldProps('username')}
            />
          </div>

          {/* パスワード */}
          <div className="form-group">
            <FormField
              type="password"
              label="パスワード"
              placeholder="パスワードを入力"
              disabled={loading || signUpForm.isSubmitting}
              {...signUpForm.getFieldProps('password')}
            />
          </div>

          {/* パスワード確認 */}
          <div className="form-group">
            <FormField
              type="password"
              label="パスワード確認"
              placeholder="パスワードを再入力"
              disabled={loading || signUpForm.isSubmitting}
              {...signUpForm.getFieldProps('confirmPassword')}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading || signUpForm.isSubmitting}
          >
            {loading || signUpForm.isSubmitting 
              ? (isInviteMode ? 'ワークスペースに参加中...' : 'アカウント作成中...') 
              : (isInviteMode ? 'ワークスペースに参加する' : '新規アカウント登録')
            }
          </button>

          {/* Google ログイン（将来実装）
          <button 
            type="button" 
            className="btn-google"
            disabled={loading || signUpForm.isSubmitting}
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