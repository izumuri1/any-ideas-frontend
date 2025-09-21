# Supabase設定ガイド

## 概要
Any Ideasアプリのデータベース設定手順

## 前提条件
- Supabaseアカウント
- プロジェクト作成済み
- 環境変数設定済み（`.env.local`）

---

## セットアップ手順

### 1. データベーススキーマ作成
```bash
# 以下の順序で実行
1. supabase/schema.dbml の内容に基づいてテーブル作成
2. supabase/supabase_rls.sql でセキュリティポリシー設定
3. supabase/supabase_functions.sql で関数・トリガー設定
```

**ファイル参照:**
- **テーブル設計**: `supabase/schema.dbml`
- **セキュリティ**: `supabase/supabase_rls.sql`
- **通知機能**: `supabase/supabase_functions.sql`

### 2. Realtime有効化
Database > Replication で以下を有効化:
```
✅ ideas
✅ proposals  
✅ notifications
✅ workspace_members
✅ idea_likes
✅ proposal_likes
```

### 3. 認証設定
Authentication > URL Configuration:
```
Site URL: http://localhost:5173
Redirect URLs:
- http://localhost:5173/auth/callback
- http://localhost:5173/password-reset-confirm
```

---

## 主要機能

### 通知システム（2025年9月実装完了）
**自動実行トリガー:**
- アイデア投稿・移動時の通知
- 提案追加・採用・戻し時の通知

**仕様:**
- 自分の行動 → 自分に通知しない
- 他人の行動 → 全ワークスペースメンバーに通知

### セキュリティ（RLS）
- ワークスペース単位での厳格なアクセス制御
- 最小権限の原則
- 詳細は `supabase/supabase_rls.sql` 参照

### データベース設計
- UUID主キー使用
- 論理削除対応
- 外部キー制約による整合性確保
- 詳細は `supabase/schema.dbml` 参照

---

## トラブルシューティング

### よくある問題

#### 通知が表示されない
```sql
-- 通知データ確認
SELECT * FROM notifications WHERE user_id = '[ユーザーID]';

-- Realtime確認: notifications テーブルが有効か確認
```

#### RLSエラー
```sql
-- ポリシー確認
SELECT * FROM pg_policies WHERE tablename = '[テーブル名]';

-- 現在のユーザー確認
SELECT auth.uid();
```

#### 環境変数エラー
```bash
# 確認
console.log(import.meta.env.VITE_SUPABASE_URL)

# 対処: .env.local確認、サーバー再起動
npm run dev
```

---

## メンテナンス

### 定期クリーンアップ
```sql
-- 古い通知削除（30日経過した既読通知）
SELECT cleanup_old_notifications();

-- 期限切れトークン削除
DELETE FROM invitation_tokens WHERE expires_at < NOW();
```

### パフォーマンス確認
```sql
-- テーブルサイズ確認
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename) DESC;
```

---

## 参考リンク
- [データベース設計詳細](./schema.dbml)
- [セキュリティポリシー](./supabase_rls.sql)
- [関数・トリガー](./supabase_functions.sql)
- [Supabase公式ドキュメント](https://supabase.com/docs)

---

## 更新履歴
- 2025-09-21: 通知機能実装完了版対応
- 2025-09-20: 通知システム完全実装