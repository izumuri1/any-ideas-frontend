// src/App.tsx
import { useAuth } from './contexts/AuthContext'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './components/Login'
import { SignUp } from './components/SignUp'
import { CreateWorkspace } from './components/CreateWorkspace'
import Home from './pages/Home'
import DiscussionScreen from './pages/DiscussionScreen'
import './App.scss'

function App() {
  const { user, loading } = useAuth()

  // ローディング中の表示
  if (loading) {
    return (
      <div className="loading-container">
        <p>読み込み中...</p>
      </div>
    )
  }

  return (
    <>
      <Routes>
        {/* 認証が必要なルート */}
        {/* 認証されているユーザー（userが存在）なら、これらのページに移動できる */}
        {user ? (
          <>
            {/* ログイン後は直接ワークスペース選択画面へ */}
            <Route path="/" element={<CreateWorkspace />} />
            <Route path="/workspace" element={<CreateWorkspace />} />
            <Route path="/create-workspace" element={<CreateWorkspace />} />
            <Route path="/workspace-select" element={<CreateWorkspace />} />
            
            {/* 個別のワークスペース（Home画面） */}
            <Route path="/workspace/:workspaceId" element={<Home />} />
            
            {/* 検討画面 */}
            <Route path="/workspace/:workspaceId/discussion/:ideaId" element={<DiscussionScreen />} />
            
            {/* すでにログイン済みのユーザーをログインページから追い出したい場合 */}
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/signup" element={<Navigate to="/" replace />} />
          </>
        ) : (
          // 認証されていないユーザー（userがnull）なら、ログイン画面と新規登録画面のみアクセス可能
          <>
            {/* 認証が不要なルート */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            {/* ログイン画面以外にアクセスしたらログインにリダイレクト */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </>
  )
}

export default App