/*
  eslint.config.js - ESLintコード品質チェックツールの設定ファイル
  
  このファイルの役割：
  - TypeScript・ReactプロジェクトにおけるESLintの動作を定義
  - コードの品質、一貫性、潜在的なバグを自動検出するルールを設定
  
  主要な設定内容：
  - globalIgnores: 検証対象から除外するディレクトリ（dist = ビルド成果物）を指定
  - files: 検証対象ファイルの拡張子パターン（.ts, .tsx = TypeScriptファイル）を指定
  - extends: 適用する事前定義されたルール設定セットを指定
    * js.configs.recommended: JavaScript基本ルール
    * tseslint.configs.recommended: TypeScript推奨ルール  
    * reactHooks.configs['recommended-latest']: React Hooks使用ルール
    * reactRefresh.configs.vite: Vite環境でのReact高速リロード対応ルール
  - languageOptions: JavaScriptバージョン（ES2020）とブラウザ環境用グローバル変数を設定
  
  実行タイミング：
  - 開発時のファイル保存時やコマンド実行時（npm run lint）にコードを自動検証
  - ビルド前の品質チェックとしても使用される
*/


import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
