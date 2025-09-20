/*
  App.tsx - アプリケーションのルーティング制御・画面遷移管理コンポーネント
  
  このファイルの役割：
  - URLパスに応じて適切なページコンポーネントを表示する（ルーティング）
  - ユーザーの認証状態（ログイン済み/未ログイン）に基づいてアクセス可能な画面を制御
  - 認証が必要な画面への不正アクセスを防ぐ認可機能を提供
  
  主要な処理内容：
  - useAuth: AuthContextから現在のログインユーザー情報と読み込み状態を取得
  - loading状態: 認証状態の確認中は「読み込み中...」を表示
  - Routes/Route: react-router-domを使用してURLパスとコンポーネントをマッピング
  - 条件分岐ルーティング:
    * ログイン済み（user存在）: ワークスペース、アイデア管理画面などにアクセス可能
    * 未ログイン（user=null）: ログイン・新規登録画面のみアクセス可能
  - Navigate: 不正なアクセスや認証状態に応じた自動リダイレクト処理
  
  画面遷移フロー：
  1. 未認証ユーザー → /login または /signup のみアクセス可能
  2. 認証済みユーザー → 全ての機能画面にアクセス可能
  3. 認証状態と異なるURLアクセス時 → 適切なページに自動リダイレクト
  
  管理する主要画面：
  - 認証系: Login（ログイン）、SignUp（新規登録）
  - ワークスペース系: CreateWorkspace（ワークスペース作成・選択）、Home（アイデア一覧）
  - アイデア系: DiscussionScreen（アイデア検討）、ProposalDetailScreen（提案詳細）
*/


// src/App.tsx
import { useAuth } from './contexts/AuthContext'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './components/Login'
import { SignUp } from './components/SignUp'
import { PasswordReset } from './components/PasswordReset'
import { PasswordResetConfirm } from './components/PasswordResetConfirm'
import { CreateWorkspace } from './components/CreateWorkspace'
import { InviteHandler } from './components/InviteHandler'
import Home from './pages/Home'
import DiscussionScreen from './pages/DiscussionScreen'
import { ProposalDetailScreen } from './pages/ProposalDetailScreen'
import { LoadingSpinner } from './components/LoadingSpinner'
import './App.scss'

function App() {
  const { user, loading } = useAuth()

  // ローディング中の表示
  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <>
      <Routes>
        {/* 招待URL用ルート - 認証状態に関係なく常にアクセス可能 */}
        <Route path="/invite/:token" element={<InviteHandler />} />
        
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
            
            {/* 検討詳細画面 - 新規追加 */}
            <Route path="/workspace/:workspaceId/idea/:ideaId/detail" element={<ProposalDetailScreen />} />
            
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
            <Route path="/password-reset" element={<PasswordReset />} />
            <Route path="/password-reset-confirm" element={<PasswordResetConfirm />} />
            {/* ログイン画面以外にアクセスしたらログインにリダイレクト */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </>
  )
}

export default App