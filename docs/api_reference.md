# Any Ideas API リファレンス

## 概要
Any IdeasアプリケーションのAPI・関数・フック参考資料

---

## 認証API

### AuthContext
**ファイル:** `src/contexts/AuthContext.tsx`

```typescript
// 使用方法
import { useAuth } from '../contexts/AuthContext'

const { user, session, loading, signUp, signIn, signOut } = useAuth()
```

#### 提供される状態

| プロパティ | 型 | 説明 |
|:-----------|:-----|:------|
| `user` | `User \| null` | 現在ログイン中のユーザー情報<br>未ログイン時は `null` |
| `session` | `Session \| null` | 認証セッション情報<br>JWT トークンやメタデータを含む |
| `loading` | `boolean` | 認証状態の確認中フラグ<br>初期化時やページ読み込み時に `true` |

#### 提供される関数

| 関数 | 型 | 説明 |
|:-----|:-----|:------|
| `signUp` | `(email, password, username) => Promise<{error}>` | 新規ユーザー登録<br>成功時は自動でメール認証が送信される |
| `signIn` | `(email, password) => Promise<{error}>` | メールアドレス・パスワードでログイン<br>成功時は認証状態が自動更新される |
| `signOut` | `() => Promise<void>` | ログアウト処理<br>セッション情報をクリアする |

---

## データベースAPI

### Supabaseクライアント
**ファイル:** `src/lib/supabase.ts`

```typescript
import { supabase } from '../lib/supabase'
```

#### 基本操作パターン
```typescript
// 読み取り
const { data, error } = await supabase
  .from('テーブル名')
  .select('カラム名')
  .eq('条件カラム', '値')

// 作成
const { data, error } = await supabase
  .from('テーブル名')
  .insert({ カラム: '値' })

// 更新
const { data, error } = await supabase
  .from('テーブル名')
  .update({ カラム: '新しい値' })
  .eq('id', 'UUID')

// 削除（論理削除推奨）
const { data, error } = await supabase
  .from('テーブル名')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', 'UUID')
```

---

## フォーム管理

### useFormフック
**ファイル:** `src/hooks/useForm.ts`

```typescript
import { useForm } from '../hooks/useForm'

// 使用例
const form = useForm<FormDataType>({
  initialValues: {
    field1: '',
    field2: ''
  },
  validationRules: {
    field1: {
      custom: (value) => {
        if (!value.trim()) return 'エラーメッセージ'
        return undefined
      }
    }
  }
})
```

#### 提供される機能

| プロパティ | 型 | 説明 |
|:-----------|:-----|:------|
| `values` | `T` | フォームの現在の値<br>すべてのフィールドの状態を保持 |
| `errors` | `Record<string, string>` | バリデーションエラーメッセージ<br>フィールド名をキーとしたエラー情報 |
| `isValid` | `boolean` | フォーム全体の妥当性<br>すべてのフィールドが有効な場合 `true` |
| `handleChange` | `(field, value) => void` | 値変更ハンドラー<br>入力時の状態更新と検証を実行 |
| `validateField` | `(field) => void` | 個別フィールド検証<br>特定フィールドのみバリデーション |
| `validateAll` | `() => boolean` | 全フィールド検証<br>送信前の最終チェック用 |

### FormFieldコンポーネント
**ファイル:** `src/components/common/FormField.tsx`

```typescript
import FormField from '../components/common/FormField'

<FormField
  label="ラベル"
  type="text"
  value={form.values.field}
  onChange={(value) => form.handleChange('field', value)}
  error={form.errors.field}
  required
/>
```

---

## テーブル操作

### 主要テーブル
詳細なスキーマは `supabase/schema.dbml` 参照

#### profiles
```typescript
// プロフィール取得
const { data } = await supabase
  .from('profiles')
  .select('id, username')
  .eq('id', userId)
```

#### workspaces
```typescript
// ワークスペース作成
const { data } = await supabase
  .from('workspaces')
  .insert({
    name: 'ワークスペース名',
    owner_id: userId
  })
```

#### ideas
```typescript
// アイデア投稿
const { data } = await supabase
  .from('ideas')
  .insert({
    workspace_id: workspaceId,
    creator_id: userId,
    idea_name: 'アイデア名',
    what_text: '内容'
  })

// ステータス更新
const { data } = await supabase
  .from('ideas')
  .update({ status: 'thinking_about' })
  .eq('id', ideaId)
```

#### proposals
```typescript
// 提案追加
const { data } = await supabase
  .from('proposals')
  .insert({
    idea_id: ideaId,
    proposer_id: userId,
    proposal_type: 'todo',
    content: '提案内容'
  })

// 提案採用
const { data } = await supabase
  .from('proposals')
  .update({ 
    is_adopted: true,
    adopted_at: new Date().toISOString(),
    adopted_by: userId
  })
  .eq('id', proposalId)

// 提案を戻す（採用を取り消し）
const { data } = await supabase
  .from('proposals')
  .update({ 
    is_adopted: false,
    adopted_at: null,
    adopted_by: null
  })
  .eq('id', proposalId)
```

#### notifications
```typescript
// 通知取得
const { data } = await supabase
  .from('notifications')
  .select(`
    *,
    profiles!actor_user_id(username)
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false })

// 既読更新
const { data } = await supabase
  .from('notifications')
  .update({ is_read: true })
  .eq('id', notificationId)
```

---

## リアルタイム機能

### 基本パターン
```typescript
useEffect(() => {
  const channel = supabase
    .channel('channel-name')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'テーブル名'
    }, (payload) => {
      // 新しいデータの処理
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])
```

### 有効化テーブル
以下のテーブルでリアルタイム更新が利用可能：
- `ideas`
- `proposals`
- `notifications`
- `workspace_members`
- `idea_likes`
- `proposal_likes`

---

## ルーティング

### React Router
**設定ファイル:** `src/App.tsx`

```typescript
import { useNavigate, useParams } from 'react-router-dom'

// ナビゲーション
const navigate = useNavigate()
navigate('/path')

// パラメータ取得
const { workspaceId } = useParams<{ workspaceId: string }>()
```

#### 主要ルート

| パス | コンポーネント | 説明 |
|:-----|:---------------|:------|
| `/login` | `Login` | ログイン画面<br>既存ユーザーの認証フォーム |
| `/signup` | `SignUp` | 新規登録画面<br>新規ユーザー作成フォーム |
| `/workspace/:workspaceId` | `Home` | ワークスペース画面<br>アイデア一覧・投稿・管理 |
| `/workspace/:workspaceId/idea/:ideaId` | `DiscussionScreen` | 検討画面<br>提案追加・採用・詳細表示 |

---

## エラーハンドリング

### 基本パターン
```typescript
const handleApiCall = async () => {
  try {
    const { data, error } = await supabase
      .from('table')
      .select()
    
    if (error) {
      console.error('APIエラー:', error)
      // エラー処理
      return
    }
    
    // 成功処理
  } catch (error) {
    console.error('予期しないエラー:', error)
    // エラー処理
  }
}
```

### 認証エラー
```typescript
const { error } = await signIn(email, password)
if (error) {
  // エラーメッセージを表示
  setErrorMessage(error.message)
}
```

---

## 型定義

### 主要インターフェース
主要な型定義は各コンポーネントファイル内で定義されています。

```typescript
// 例：アイデア型
interface Idea {
  id: string
  workspace_id: string
  creator_id: string
  idea_name: string
  what_text: string
  status: 'our_ideas' | 'thinking_about' | 'trying'
  created_at: string
  profiles: {
    username: string
  }
}
```

---

## AI予算提案機能

### 概要
Gemini APIを使用した予算見積もり機能。想定予算タブで利用可能。

### 使用方法
```typescript
// AI予算提案の実行
const response = await fetch('/api/generate-budget', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    planType: '旅行', // 必須
    participants: '4人', // 必須  
    duration: '2泊3日', // 必須
    location: '沖縄', // 必須
    budget_range: '10-20万円', // 任意
    preferences: '高級ホテル希望', // 任意
    userId: user.id // 必須
  })
});

---

## 開発Tips

### デバッグ用コード
```typescript
// Supabaseセッション確認
console.log(await supabase.auth.getSession())

// データ確認
console.log({ data, error })

// リアルタイム接続確認
console.log('Channel subscribed:', channel)
```

### パフォーマンス最適化
```typescript
// 必要なカラムのみ選択
.select('id, name, created_at')

// インデックス活用
.eq('workspace_id', workspaceId)  // インデックス有り

// ページネーション
.range(0, 9)  // 最初の10件
```

---

## 関連ドキュメント
- **データベース設計**: `supabase/schema.dbml`
- **セキュリティ**: `supabase/supabase_rls.sql`
- **関数・トリガー**: `supabase/supabase_functions.sql`
- **セットアップ**: `setup_guide.md`
- [Supabase JavaScript SDK](https://supabase.com/docs/reference/javascript/introduction)
- [Gemini API Documentation](https://developers.generativeai.google/)

---

## 更新履歴
実装の変更に応じて、適宜各ファイルを参照してください。