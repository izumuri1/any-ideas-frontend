/*
  AuthContext.tsx - 認証状態のグローバル管理・共有システム
  
  このファイルの役割：
  - アプリ全体でユーザーの認証状態（ログイン/ログアウト）を一元管理
  - React Context APIを使用して、全コンポーネントから認証情報にアクセス可能にする
  - Supabase認証サービスとの連携・認証処理の抽象化を提供
  
  主要な構成要素：
  - AuthContext: 認証データを格納・運搬するためのReact Context（データの入れ物）
  - AuthProvider: 認証状態を管理し、子コンポーネントにデータを提供するプロバイダー
  - useAuth: 任意のコンポーネントから認証情報を取得するためのカスタムフック
  
  提供する認証機能：
  - signUp: 新規ユーザー登録（メールアドレス・パスワード・ユーザー名）
  - signIn: ログイン処理（メールアドレス・パスワード認証）
  - signOut: ログアウト処理
  - 認証状態の自動監視・リアルタイム更新（onAuthStateChange）
  
  管理する状態データ：
  - user: 現在ログイン中のユーザー情報（User | null）
  - session: ログインセッション情報（Session | null）
  - loading: 認証状態確認中の読み込み状態（boolean）
  
  使用方法：
  1. main.tsxでAuthProviderをアプリ全体にラップ
  2. 各コンポーネントでuseAuth()を呼び出して認証情報にアクセス
  3. 認証状態の変化は自動的に全コンポーネントに反映される
  
  技術的特徴：
  - TypeScript完全対応で型安全な認証処理を実現
  - Supabase Auth APIとの完全統合
  - リアルタイムでの認証状態変化検知・自動更新機能
*/



// src/contexts/AuthContext.tsx

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// 自分で設定したSupabaseとの接続設定をインポート
import { supabase } from '../lib/supabase'

// auth.ts から3つの型定義をインポート
// User = ログインしたユーザーの情報の構造を表す型（設計図）
// Session = ログイン状態・セッション情報の構造を表す型（設計図）
// AuthError = 認証でエラーが起きた時のエラー情報の構造を表す型（設計図）
// AuthChangeEvent = 認証状態の変化を表す型（設計図）
import type { User, Session, AuthError, AuthChangeEvent} from '@supabase/auth-js'


//////////////////////////////////////////////////////////////
// このファイルの仕組み
// AuthContext = データを運ぶための「箱・入れ物」
// AuthProvider = 実際にデータを作って「箱に詰めて配る人」
// useAuth = 「箱からデータを取り出すための道具」
// 認証にかかわるあらゆるロジックをこのファイルに集約するため、関数を自作
//////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////
// ◆ AuthContextの作成
// AuthContext = データを運ぶための「箱・入れ物」
//////////////////////////////////////////////////////////////
// 1. Context の型定義(interfaceは型定義の宣言)。型安全性を確保するためにまず型を定義
// 自作変数としてAuthContextを作成。userなどの中身も自作
interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, username: string) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
//   signInWithGoogle: () => Promise<{ error: AuthError | null }>
}

// 2. Context作成。箱を作る
// createContext とはReactが提供するAPI。コンポーネントツリー全体でデータを共有するための仕組みを作成
// <>でcontextの型を設定
// undefinedの可能性を型に含めることで、undefinedが発生した場合を適切に検出・処理できるようにする
// ()で初期値を設定。ここではundefinedを設定
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 3. Provider のPropsの型定義。型安全性を確保するためにまず型を定義
// AuthProviderProps = 「AuthProviderが何を受け取るか」の型定義
    // <AuthProvider>          {/* ← AuthProviderコンポーネント */}
    //   <App />               {/* ← これが children として渡される */}
    // </AuthProvider>
// children: ReactNode = 「子要素として、Reactで表示可能な任意の要素を受け取る」
// ReactNode とはReactで表示可能な全てのものを表す型
interface AuthProviderProps {
  children: ReactNode
}


//////////////////////////////////////////////////////////////
// ◆ AuthProviderの作成
// AuthProvider = データを作って「箱に詰めて配る人」
// AuthContext.Provider を使って、AuthContextにデータを提供するコンポーネント
//////////////////////////////////////////////////////////////
export function AuthProvider({ children }: AuthProviderProps) {

// 1. useState - 初期化・状態管理の準備
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

// 2. useEffect - アプリ起動時の処理
  useEffect(() => {
    // 初期セッション取得
    const getSession = async () => {
    // Supabaseが提供するsupabase.auth.getSession() を使って、現在のセッション情報を取得
      const { data: { session } } = await supabase.auth.getSession()
        // セッション情報を状態に保存
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getSession()

    // 認証状態の変化を監視
    // onAuthStateChange - Supabaseが提供する「認証状態の変化を監視する」機能
    // アプリの起動以降、useEffectで監視を開始し、３つの状態(以下)に遷移する場合を除き、ずっと監視を継続
    // 認証状態に変化があれば、コールバック（async 以下）を実行し状態を更新。その後も監視を継続
    // 1. コンポーネントがアンマウント（削除）される時　➡　returnで監視を解除
    // 2. useEffectの依存配列が変わってuseEffectが再実行される時
    // 3. ページを閉じる時
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
        // asyncはなくても良いが、将来の拡張性確保のため記載
      async (_: AuthChangeEvent, session: Session | null) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

// 3. 認証機能の関数定義
// サインアップ
// サインアップの処理を関数化したもので、signUpは自作関数
// 引数をemail等とし、Supabaseのメソッドsupabase.auth.signUpが終わるまで次の処理には進まない
// supabase.auth.signUpでemail、password、username（オプション）を取得、errorに格納、戻り値としてerrorを返す
// サインアップ成功時のdataは返さない。onAuthStateChangeでユーザー情報を取得するため
  const signUp = async (email: string, password: string, username: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username
        }
      }
    })
    return { error }
  }

  // サインイン
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { error }
  }

  // サインアウト
  const signOut = async () => {
    await supabase.auth.signOut()
  }

//   // Googleサインイン
//   const signInWithGoogle = async () => {
//     const { error } = await supabase.auth.signInWithOAuth({
//       provider: 'google'
//     })
//     return { error }
//   }

// 4. 子コンポーネントへのデータ提供に向けて渡すデータをまとめる
  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    // signInWithGoogle
  }

// 5. 子コンポーネントにデータを提供
// AuthContext.Provider を使って、AuthContextにデータを提供する
  return (
    // Reactが提供するContext APIのProviderを利用
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}


//////////////////////////////////////////////////////////////
// ◆ useAuthの作成
// useAuth = 「箱からデータを取り出すための道具」
// useContextを使ってAuthContextからデータを取り出す
// 各コンポーネントでAuthContextで認証管理されているかのエラーチェックを行う機能
//////////////////////////////////////////////////////////////
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}