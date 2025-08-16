/// <reference types="vite/client" />
// Gitに上げる対象のファイル
// このファイルは、Viteの型定義を提供し、TypeScriptでViteを使用する際に必要な型情報を含む

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}