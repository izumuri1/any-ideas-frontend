// src/contexts/AuthContext.tsx


import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

// Supabaseライブラリから3つの型定義をインポート
// User = ログインしたユーザーの情報の構造を表す型（設計図）
// Session = ログイン状態・セッション情報の構造を表す型（設計図）
// AuthError = 認証でエラーが起きた時のエラー情報の構造を表す型（設計図）
import { User, Session, AuthError } from '@supabase/supabase-js'

// 自分で設定したSupabaseとの接続設定をインポート
import { supabase } from '../lib/supabase'

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
  // ログアウト中や初期状態ではnull 
  user: User | null
  // nullはセッションが未確立または切れている状態 
  session: Session | null
  // 認証処理中など「読み込み状態」を示すフラグ。true = 処理中、false = 処理完了または未処理 
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
      async (event, session) => {
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
    signInWithGoogle
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