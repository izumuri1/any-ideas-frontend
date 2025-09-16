/*
  vite.config.ts - Vite開発・ビルドツールの設定ファイル
  
  このファイルの役割：
  - React + TypeScriptプロジェクトの開発サーバー・ビルド処理をカスタマイズ
  - プラグインの設定・統合により、追加機能を開発環境に組み込む
  - PWA（Progressive Web App）化のための詳細設定を定義
  
  主要な設定内容：
  - plugins: Viteに追加機能を提供するプラグインを設定
    * react(): React JSX/TSXファイルの変換・Hot Module Replacement（高速リロード）を有効化
    * VitePWA(): PWA機能を自動生成・設定するプラグイン
  
  PWA設定詳細（VitePWAプラグイン）：
  - registerType: 'autoUpdate' - Service Workerを自動更新モードで登録
  - includeAssets: PWAで使用するアセットファイル（アイコン類）を指定
  - manifest: PWAマニフェスト（アプリメタデータ）の設定
    * name/short_name: アプリの正式名称・短縮名
    * description: アプリの説明文
    * theme_color/background_color: アプリのテーマカラー設定
    * display: 'standalone' - ネイティブアプリのような独立表示モード
    * icons: 各種デバイス・サイズ対応のアプリアイコン定義
  
  その他の設定：
  - resolve.alias: インポートパスの短縮記法を設定（'@' = '/src'ディレクトリ）
  
  実行タイミング：
  - 開発サーバー起動時（npm run dev）
  - プロダクションビルド時（npm run build）
  - この設定に基づいてViteが動作環境を構築する
*/



import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Any Ideas? - アイデア共有ツール',
        short_name: 'Any Ideas',
        description: '今度何する？から始めるアイデア共有ツール',
        theme_color: '#F4C14E',
        background_color: '#F4C14E',
        display: 'standalone',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
