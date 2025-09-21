/*
  main.tsx - Reactアプリケーションのエントリーポイント（起動ファイル）
  
  このファイルの役割：
  - index.htmlの#root要素にReactアプリケーション全体をマウント（描画）する
  - アプリケーション全体に必要なプロバイダー（Context）とルーティング機能を初期設定
  
  主要な処理内容：
  - createRoot: React 18の新しいルートAPI。index.htmlの#root要素を取得し、
    Reactアプリの描画先として指定する
  - StrictMode: 開発時にReactの問題を早期発見するためのモード。
    コンポーネントの副作用やライフサイクルの問題を検出する
  - BrowserRouter: react-router-domが提供するルーティング機能。
    URLの変化に応じて異なるページコンポーネントを表示する
  - AuthProvider: 認証状態（ログイン/ログアウト）をアプリ全体で管理・共有する
    Contextプロバイダー。全てのコンポーネントから認証情報にアクセス可能になる
  - App: メインのアプリケーションコンポーネント。実際のページ切り替えロジックを含む
  - index.scss: アプリ全体の基本スタイル（CSS）を読み込み
  
  実行タイミング：
  - ブラウザがindex.htmlを読み込んだ際に、このファイルが自動実行される
  - ここでセットアップされた構成が、アプリ全体の基盤となる
*/


import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.scss'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')!).render(
  import.meta.env.DEV ? (
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>
  ) : (
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  )
)
