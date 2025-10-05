// src/components/EmailConfirmationWaiting.tsx
import { useNavigate, useLocation } from 'react-router-dom'
import './Login.scss' // 既存のスタイルを再利用

export function EmailConfirmationWaiting() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''
  const inviteToken = location.state?.inviteToken
  const workspaceName = location.state?.workspaceName

  const handleLoginClick = () => {
    // 招待トークンがある場合はログイン画面にも渡す
    if (inviteToken) {
      navigate(`/login?inviteToken=${inviteToken}&workspaceName=${encodeURIComponent(workspaceName || '')}`)
    } else {
      navigate('/login')
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="logo">Any ideas?</h1>
        <p className="subtitle">メール確認をお願いします</p>
        <p className="introduction">
          {email && `${email} に確認メールを送信しました。`}
          {!email && '登録したメールアドレスに確認メールを送信しました。'}
          <br /><br />
          メール内のリンクをクリックしてアカウントを有効化してください。
          <br /><br />
          {inviteToken && workspaceName && (
            <>
              確認後、ログインすると「{workspaceName}」ワークスペースに参加できます。
              <br /><br />
            </>
          )}
          確認後、ログイン画面からログインしてください。
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