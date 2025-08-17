import { useState } from 'react'
import { supabase } from './lib/supabase'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import { ReactNode } from 'react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Home } from './components/Home'
import { Login } from './components/Login'
// import { SignUp } from './components/SignUp'
import { LoadingSpinner } from './components/LoadingSpinner'
import './App.scss'

function App() {
  const {user, loading} = useAuth()

  // ローディング中の表示
  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <>
      <Routes>
        {/* 認証が必要なルート */}
        {/* 認証されているユーザー（userが存在）なら、これらのページに移動できる */}
        {user ? (
          <>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/home" element={<Home user={user} />} />
            {/* 未ログイン用ページにアクセスしたらホームにリダイレクト */}
            <Route path="/login" element={<Navigate to="/" replace />} />
            {/* <Route path="/signup" element={<Navigate to="/" replace />} /> */}
            {/* 将来追加予定のルート */}
            {/* <Route path="/workspace/:id" element={<Workspace user={user} />} /> */}
            {/* <Route path="/idea/:id" element={<IdeaDetail user={user} />} /> */}
          </>
        ) : (
          // 認証されていないユーザー（userがnull）なら、ログイン画面と新規登録画面のみアクセス可能
          <>
            {/* 認証が不要なルート */}
            <Route path="/login" element={<Login />} />
            {/* <Route path="/signup" element={<SignUp />} /> */}
            {/* ログイン画面以外にアクセスしたらログインにリダイレクト */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
    </>
  )
}

export default App