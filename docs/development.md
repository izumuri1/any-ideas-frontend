# Any Ideas 開発ガイド

## 概要
Any Ideasアプリケーションの開発・ビルド・デプロイ手順

**開発環境:** Ubuntu + Node.js + React + TypeScript + Vite  
**デプロイ:** GitHub → Vercel

---

## 開発環境

### システム要件
- **OS:** Ubuntu (20.04+ 推奨)
- **Node.js:** 20.19.0+ または 22.12.0+
- **パッケージマネージャー:** npm
- **Git:** 最新版

### 環境確認
```bash
# バージョン確認
node --version
npm --version
git --version

# Ubuntu の場合、Node.js インストール
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 主要技術・ライブラリ
| カテゴリ | 技術 | 備考 |
|:---------|:-----|:------|
| **フレームワーク** | React 19.1.1 | 最新版での開発 |
| **言語** | TypeScript 5.8.3 | 型安全な開発 |
| **ビルドツール** | Vite 7.1.2 | 高速な開発・ビルド |
| **スタイル** | SCSS (Sass) | CSS拡張言語 |
| **認証・DB** | Supabase | BaaS（Backend as a Service） |
| **フォーム管理** | 自作useFormフック | React Hook Form からリファクタリング済み |
| **ルーティング** | React Router 7.8.1 | SPA用ルーティング |
| **PWA** | vite-plugin-pwa | Progressive Web App対応 |
| **リント** | ESLint + TypeScript ESLint | コード品質管理 |

### 1. 初期セットアップ
```bash
# リポジトリクローン
git clone [REPOSITORY_URL]
cd any-ideas-frontend

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env.local
# .env.local を編集してSupabase設定を追加
```

### 2. 開発サーバー起動
```bash
# 開発モード起動
npm run dev

# ブラウザで開発サーバーにアクセス
# 通常は http://localhost:5173
```

### 3. コード品質チェック
```bash
# ESLint によるコード検証
npm run lint

# TypeScript 型チェック
npx tsc --noEmit

# 修正可能な問題の自動修正
npm run lint -- --fix
```

---

## ビルド

### 本番ビルド
```bash
# アイコン生成 + TypeScript ビルド + Vite ビルド
npm run build

# ビルド結果は dist/ フォルダに出力
ls -la dist/
```

#### ビルドプロセス詳細
1. **アイコン生成**: `npm run build:icons`
   - `scripts/generate-icons.js` でPWA用アイコンを生成
2. **TypeScript コンパイル**: `tsc -b`
   - 型チェックとJavaScript変換
3. **Vite ビルド**: `vite build`
   - バンドル・最適化・dist出力

### ローカルプレビュー
```bash
# ビルド後のプレビュー
npm run preview

# プレビューサーバーでビルド結果を確認
# 通常は http://localhost:4173
```

---

## Git ワークフロー

### ブランチ戦略
```bash
# 新機能開発
git checkout -b feature/feature-name
git add .
git commit -m "feat: 新機能の説明"

# メインブランチへマージ
git checkout main
git merge feature/feature-name
git push origin main
```

### コミットメッセージ規約
```bash
# 機能追加
git commit -m "feat: 新機能の説明"

# バグ修正
git commit -m "fix: 修正内容の説明"

# スタイル変更
git commit -m "style: CSS/UI の変更"

# リファクタリング
git commit -m "refactor: コード整理"

# ドキュメント更新
git commit -m "docs: ドキュメント更新"
```

### GitHub プッシュ
```bash
# リモートリポジトリに反映
git push origin main

# 初回プッシュの場合
git push -u origin main
```

---

## Vercel デプロイ

### 初回設定
1. **GitHub連携**
   - [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
   - GitHubアカウントでログイン
   - リポジトリを選択してインポート

2. **プロジェクト設定**
   ```
   Framework Preset: React
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

3. **環境変数設定**
   ```
   Settings > Environment Variables で設定:
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### 自動デプロイ
```bash
# main ブランチへのプッシュで自動デプロイ
git push origin main
```

**デプロイフロー:**
1. GitHub に `git push`
2. Vercel が変更を検知
3. 自動で `npm run build` 実行
4. ビルド成功時にデプロイ完了
5. プレビューURLが生成される

### 手動デプロイ
```bash
# Vercel CLI を使用（必要に応じて）
npm install -g vercel
vercel login
vercel --prod
```

---

## プロジェクト構造

### 重要なファイル・フォルダ
```
any-ideas-frontend/
├── src/                    # ソースコード
│   ├── components/        # Reactコンポーネント
│   ├── contexts/          # React Context (認証など)
│   ├── hooks/             # カスタムフック
│   ├── pages/             # ページコンポーネント
│   ├── lib/               # ライブラリ設定 (Supabase等)
│   └── styles/            # SCSS スタイルファイル
├── public/                # 静的ファイル
├── dist/                  # ビルド出力 (Git無視)
├── scripts/               # ビルドスクリプト
├── supabase/              # データベース設計・設定
├── .env.local             # 環境変数 (Git無視)
├── vercel.json            # Vercel設定
├── package.json           # 依存関係・スクリプト
└── vite.config.ts         # Vite設定
```

### 設定ファイル
| ファイル | 用途 |
|:---------|:-----|
| `vercel.json` | SPA用ルーティング設定 |
| `vite.config.ts` | ビルド・開発サーバー設定 |
| `package.json` | 依存関係・NPMスクリプト |
| `.gitignore` | Git管理除外ファイル |
| `tsconfig.json` | TypeScript設定 |

---

## 環境変数管理

### 開発環境 (.env.local)
```env
# Supabase設定
VITE_SUPABASE_URL=https://your-dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-anon-key
```

### 本番環境 (Vercel)
```
Vercel Dashboard > Settings > Environment Variables:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
```

**重要:** 
- 開発用と本番用でSupabaseプロジェクトを分ける
- `.env.local` は Git にコミットしない
- Vercel の環境変数は Deployment でも設定可能

---

## トラブルシューティング

### ビルドエラー
```bash
# 依存関係の問題
rm -rf node_modules package-lock.json
npm install

# TypeScript エラー
npm run lint
npx tsc --noEmit

# アイコン生成エラー
npm run build:icons
```

### Vercel デプロイエラー
```bash
# ビルドログの確認
# Vercel Dashboard > Deployments > 失敗したデプロイをクリック

# 環境変数の確認
# Settings > Environment Variables

# ローカルでビルドテスト
npm run build
npm run preview
```

### Supabase接続エラー
```bash
# 環境変数の確認
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# ブラウザコンソールでの確認
console.log(import.meta.env.VITE_SUPABASE_URL)
```

---

## パフォーマンス最適化

### ビルド最適化
```bash
# バンドルサイズ分析
npm run build
npx vite-bundle-analyzer dist

# 不要な依存関係チェック
npm audit
npm outdated
```

### Vercel 最適化
- **Edge Functions**: 必要に応じて活用
- **Image Optimization**: 自動で適用
- **CDN**: 全世界に自動配信
- **Analytics**: Vercel Analytics で計測

---

## CI/CD 拡張 (オプション)

### GitHub Actions (将来的な拡張用)
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run lint
      - run: npm run build
```

---

## 開発Tips

### 効率的な開発
```bash
# ホットリロード活用
npm run dev
# ファイル変更で自動更新

# 並行開発
npm run dev &
npm run lint --watch

# デバッグ用ビルド
npm run build
npm run preview

# AI機能のテスト
# 1. Gemini APIキーを設定
echo "GEMINI_API_KEY=your-key" >> .env.local

# 2. 使用制限のリセット（開発用）
# ブラウザの開発者ツールで実行:
# localStorage.removeItem('gemini_api_usage')

```

### VS Code 拡張推奨
- TypeScript and JavaScript Language Features
- ES7+ React/Redux/React-Native snippets  
- Auto Rename Tag
- Bracket Pair Colorizer
- GitLens

---

## 関連ドキュメント
- **セットアップ**: `setup_guide.md`
- **API**: `api_reference.md`
- **データベース**: `supabase/schema.dbml`
- [Vercel Documentation](https://vercel.com/docs)
- [Vite Documentation](https://vitejs.dev/guide/)
- [Gemini API](https://developers.generativeai.google/)

---

## 更新履歴
- Ubuntu環境での開発フロー確立
- GitHub + Vercel 自動デプロイ設定
- PWA対応 (vite-plugin-pwa)