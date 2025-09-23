# Any Ideas セットアップガイド

## 概要
アイデア共有・検討プラットフォーム  
**技術スタック:** React + TypeScript + Vite + Supabase

---

## 前提条件
- Node.js（最新LTS推奨）
- npm または yarn  
- Supabaseアカウント
- Git

---

## セットアップ手順

### 1. リポジトリクローン
```bash
git clone [REPOSITORY_URL]
cd any-ideas-frontend
npm install
```

### 2. Supabaseプロジェクト作成
1. [Supabase Dashboard](https://app.supabase.com) → "New Project"
2. プロジェクト名を設定
3. 推奨リージョン: Asia Pacific (Tokyo)
4. データベースパスワード設定

### 3. 環境変数設定
```bash
cp .env.example .env.local
```

**`.env.local` 設定:**
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

**取得方法:** Dashboard > Settings > API

### 4. データベース構築

#### 4.1 スキーマ適用
**実行順序:**
1. `supabase/schema.dbml` → テーブル作成
2. `supabase/supabase_rls.sql` → セキュリティポリシー
3. `supabase/supabase_functions.sql` → 関数・トリガー

#### 4.2 Realtime有効化
**Database > Replication で以下を有効化:**
```
✅ ideas
✅ proposals
✅ notifications
✅ workspace_members
✅ idea_likes
✅ proposal_likes
```

### 5. 認証設定
**Authentication > URL Configuration:**
```
Site URL: http://localhost:[PORT]
Redirect URLs:
- http://localhost:[PORT]/auth/callback
- http://localhost:[PORT]/password-reset-confirm
```
※ [PORT] は開発サーバーのポート番号

### 6. AI予算提案機能設定
```env
# .env.local に追加
GEMINI_API_KEY=your-gemini-api-key

---

## 起動・動作確認

### 開発サーバー起動
```bash
npm run dev
# ブラウザで表示されるURLにアクセス
```

### 機能テスト

#### ✅ 基本機能
- [ ] **認証**: 新規登録・ログイン・ログアウト
- [ ] **ワークスペース**: 作成・招待・参加
- [ ] **アイデア**: 投稿・ステータス変更・いいね
- [ ] **提案**: 追加・採用・戻す・削除
- [ ] **通知**: リアルタイム受信・既読管理

#### 通知システム仕様
- 自分の行動 → 自分に通知しない
- 他人の行動 → ワークスペースメンバーに通知
- 対象行動: アイデア・提案の操作

---

## トラブルシューティング

### 通知が表示されない
```sql
-- データ確認
SELECT * FROM notifications WHERE user_id = '[ユーザーID]';

-- Realtime・RLS確認
SELECT * FROM pg_policies WHERE tablename = 'notifications';
```

### 環境変数エラー
```bash
# 確認
console.log(import.meta.env.VITE_SUPABASE_URL)

# 対処法
# 1. ファイル名: .env.local
# 2. プレフィックス: VITE_
# 3. サーバー再起動
```

### RLSエラー
```sql
-- 開発時の一時的対処
ALTER TABLE [テーブル名] DISABLE ROW LEVEL SECURITY;
-- 問題解決後、再有効化
ALTER TABLE [テーブル名] ENABLE ROW LEVEL SECURITY;
```

---

## 開発Tips

### デバッグ用コード例
```javascript
// 通知確認
const { data } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', user.id);

// セッション確認  
console.log(await supabase.auth.getSession());

// リアルタイム接続テスト
const channel = supabase
  .channel('notifications')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'notifications' },
    (payload) => console.log('新通知:', payload)
  )
  .subscribe();
```

---

## デプロイ

### 本番環境設定
```env
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key
```

### ビルド確認
```bash
npm run build
npm run preview
```

---

## 関連ドキュメント
- **データベース設計**: `supabase/schema.dbml`
- **セキュリティ設定**: `supabase/supabase_rls.sql`  
- **関数・トリガー**: `supabase/supabase_functions.sql`
- [Supabase公式ドキュメント](https://supabase.com/docs)

---

## 更新履歴
最新の実装状況は各SQLファイルを参照してください。