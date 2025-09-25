// src/components/CreateWorkspace.tsx
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./CreateWorkspace.scss";

////////////////////////////////////////////////////////////////
// ◆ 実行時の流れ
// ページ読み込み → ワークスペース選択状態で表示される
// ワークスペース作成ボタンクリック → ワークスペース作成フォーム表示
// ワークスペース作成成功 → ワークスペース選択状態に戻る
// ワークスペース選択 → Home画面に遷移
////////////////////////////////////////////////////////////////

// 1. 準備・設定
// ワークスペース作成フォームの型定義
interface CreateWorkspaceFormData {
  workspaceName: string;
}

// ワークスペース型定義（Supabaseのテーブル構造に対応）
interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

// 2. 状態管理・フック初期化
export function CreateWorkspace() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [currentInviteWorkspace, setCurrentInviteWorkspace] = useState<Workspace | null>(null);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copyButtonText, setCopyButtonText] = useState("リンクをコピー");

  // React Hook Formの初期化
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateWorkspaceFormData>();

  // 3. ユーザーのワークスペース一覧を取得（修正版）
  const fetchWorkspaces = async () => {
    if (!user) {
      console.log("ユーザーが存在しません:", user);
      return;
    }

    console.log("現在のユーザーID:", user.id);

    try {
      // 1. オーナーとしてのワークスペースを取得
      const { data: ownerWorkspaces, error: ownerError } = await supabase
        .from("workspaces")
        .select("*")
        .eq("owner_id", user.id);

      console.log("オーナーワークスペース:", ownerWorkspaces);
      if (ownerError) {
        console.error("オーナークエリエラー:", ownerError);
        throw ownerError;
      }

      // 2. メンバーとしてのワークスペースを取得
      const { data: memberData, error: memberError } = await supabase
        .from("workspace_members")
        .select(
          `
          workspace_id,
          workspaces (
            id,
            name,
            owner_id,
            created_at
          )
        `
        )
        .eq("user_id", user.id);

      console.log("メンバーデータ:", memberData);
      if (memberError) {
        console.error("メンバークエリエラー:", memberError);
        throw memberError;
      }

      // 3. メンバーワークスペースを整形（型安全版）
      const memberWorkspaces: Workspace[] = [];

      if (memberData) {
        for (const item of memberData) {
          const workspace = item.workspaces as any;
          if (
            workspace &&
            workspace.id &&
            workspace.name &&
            workspace.owner_id &&
            workspace.created_at
          ) {
            memberWorkspaces.push({
              id: workspace.id,
              name: workspace.name,
              owner_id: workspace.owner_id,
              created_at: workspace.created_at,
            });
          }
        }
      }

      console.log("整形後メンバーワークスペース:", memberWorkspaces);

      // 4. 重複を除いて結合
      const allWorkspaces: Workspace[] = [...(ownerWorkspaces || [])];

      // メンバーワークスペースから、既にオーナーワークスペースに含まれていないものを追加
      memberWorkspaces.forEach((workspace: Workspace) => {
        if (!allWorkspaces.find((w) => w.id === workspace.id)) {
          allWorkspaces.push(workspace);
        }
      });

      console.log("全ワークスペース:", allWorkspaces);
      setWorkspaces(allWorkspaces);
    } catch (error) {
      console.error("ワークスペース取得エラー:", error);
      setSubmitError("ワークスペース一覧の取得に失敗しました");
    }
  };

  // 4. コンポーネント初期化時にワークスペース一覧を取得
  useEffect(() => {
    fetchWorkspaces();
  }, [user]);

  // 5. ワークスペース作成処理（Supabase連携）
  const onSubmit = async (data: CreateWorkspaceFormData) => {
    if (!user) {
      setSubmitError("ログインが必要です");
      return;
    }

    setSubmitError("");
    setIsLoading(true);

    try {
      // ワークスペースを作成
      const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .insert({
          name: data.workspaceName,
          owner_id: user.id,
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // ワークスペースメンバーとして作成者を追加
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: "owner",
        });

      if (memberError) throw memberError;

      // プロフィールの最終ワークスペースを更新
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          last_workspace_id: workspace.id,
          last_workspace_accessed_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) {
        console.warn("プロフィール更新に失敗:", profileError);
        // プロフィール更新の失敗は致命的ではないので続行
      }

      // ワークスペース一覧を再取得
      await fetchWorkspaces();

      // フォームをリセットして選択状態に戻る
      reset();
      setShowCreateForm(false);
    } catch (error: any) {
      console.error("ワークスペース作成エラー:", error);

      // エラーハンドリング
      if (error?.code) {
        switch (error.code) {
          case "23505": // unique_violation
            setSubmitError("同じ名前のワークスペースが既に存在します");
            break;
          case "23514": // check_violation
            setSubmitError("ワークスペース名が無効です");
            break;
          default:
            setSubmitError(`エラー: ${error.message}`);
        }
      } else {
        setSubmitError(
          "ワークスペースの作成に失敗しました。もう一度お試しください。"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 6. ログアウト処理
  const handleLogoutClick = async () => {
    try {
      setIsLoading(true);
      await signOut();
    } catch (error) {
      console.error("ログアウトに失敗しました:", error);
      navigate("/login");
    } finally {
      setIsLoading(false);
    }
  };

  // 7. その他の操作
  const handleShowCreateForm = () => {
    setShowCreateForm(true);
    setSubmitError("");
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setSubmitError("");
    reset();
  };

  // 招待リンク生成処理
  const generateInviteLink = async (workspace: Workspace) => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // ランダムトークンを生成 (64文字)
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // 招待トークンをDBに保存
      const { error } = await supabase
        .from('invitation_tokens')
        .insert({
          token,
          workspace_id: workspace.id,
          created_by: user.id,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24時間後
          max_uses: 1,
          used_count: 0,
          is_active: true
        });

      if (error) throw error;

      // 招待URLを生成
      const inviteUrl = `${window.location.origin}/invite/${token}`;
      
      setCurrentInviteWorkspace(workspace);
      setInviteUrl(inviteUrl);
      setShowInviteModal(true);
      setCopyButtonText("リンクをコピー");
      
    } catch (error: any) {
      console.error('招待リンク生成エラー:', error);
      setSubmitError('招待リンクの生成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 招待リンクをコピー
  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyButtonText("コピーしました！");
      setTimeout(() => setCopyButtonText("リンクをコピー"), 2000);
    } catch (error) {
      // フォールバック処理
      const textArea = document.createElement('textarea');
      textArea.value = inviteUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopyButtonText("コピーしました！");
      setTimeout(() => setCopyButtonText("リンクをコピー"), 2000);
    }
  };

  // 招待モーダルを閉じる
  const closeInviteModal = () => {
    setShowInviteModal(false);
    setCurrentInviteWorkspace(null);
    setInviteUrl("");
    setCopyButtonText("リンクをコピー");
  };

  const handleWorkspaceSelect = async (workspace: Workspace) => {
    try {
      // プロフィールの最終ワークスペースを更新
      const { error } = await supabase
        .from("profiles")
        .update({
          last_workspace_id: workspace.id,
          last_workspace_accessed_at: new Date().toISOString(),
        })
        .eq("id", user!.id);

      if (error) {
        console.warn("プロフィール更新に失敗:", error);
        // エラーがあっても画面遷移は続行
      }
    } catch (error) {
      console.warn("ワークスペース選択時のエラー:", error);
    }

    // Home画面に遷移
    navigate(`/workspace/${workspace.id}`);
  };

  // 8. レンダリング
  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="logo">Any ideas?</h1>

        {/* ワークスペース作成フォーム表示状態 */}
        {showCreateForm ? (
          <>
            <p className="subtitle">ワークスペース作成</p>
            <p className="introduction">
              アイデアを共有するワークスペースを作成しよう<br />
              作成したらアイデアを共有したいメンバーをワークスペースへ招待しよう
            </p>

            {/* エラーメッセージ */}
            {submitError && <div className="error-message">{submitError}</div>}

            {/* ワークスペース作成フォーム */}
            <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
              <div className="form-group">
                <label htmlFor="workspaceName">ワークスペース名</label>
                <input
                  type="text"
                  id="workspaceName"
                  placeholder="家族旅行の計画"
                  {...register("workspaceName", {
                    required: "ワークスペース名は必須です",
                    maxLength: {
                      value: 30,
                      message: "ワークスペース名は30文字以下で入力してください",
                    },
                    pattern: {
                      value:
                        /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s\-_]+$/,
                      message:
                        "ワークスペース名に使用できない文字が含まれています",
                    },
                  })}
                />
                {errors.workspaceName && (
                  <span className="field-error">
                    {errors.workspaceName.message}
                  </span>
                )}
              </div>

              <div className="form-buttons">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary"
                >
                  {isLoading ? "ワークスペース作成中..." : "ワークスペース作成"}
                </button>

                <button
                  type="button"
                  onClick={handleCancelCreate}
                  disabled={isLoading}
                  className="btn-secondary"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </>
        ) : (
          /* ワークスペース選択状態 */
          <>
            <p className="subtitle">ワークスペース選択</p>
            <p className="introduction">
              参加しているワークスペースを選択しよう
            </p>

            {/* エラーメッセージ */}
            {submitError && <div className="error-message">{submitError}</div>}

            {/* ワークスペース作成ボタン */}
            <button
              onClick={handleShowCreateForm}
              disabled={isLoading}
              className="btn-primary workspace-create-btn"
            >
              ワークスペース作成
            </button>

            {/* 既存ワークスペース一覧 */}
            <div className="workspace-list">
              {workspaces.length === 0 ? (
                <p className="no-workspaces">
                  まだワークスペースがありません。
                  <br />
                  最初のワークスペースを作成しましょう！
                </p>
              ) : (
                workspaces.map((workspace) => (
                  <div
                    key={workspace.id}
                    className="workspace-item"
                    onClick={() => handleWorkspaceSelect(workspace)}
                  >
                    <div className="workspace-info">
                      <h3 className="workspace-name">{workspace.name}</h3>
                      <div className="workspace-meta">
                        <span className="workspace-owner">
                          {workspace.owner_id === user?.id
                            ? "オーナー"
                            : "メンバー"}
                        </span>
                        <span className="workspace-created">
                          {new Date(workspace.created_at).toLocaleDateString(
                            "ja-JP"
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="workspace-actions">
                      {workspace.owner_id === user?.id && (
                        <button
                          className="btn-invite"
                          onClick={(e) => {
                            e.stopPropagation();
                            generateInviteLink(workspace);
                          }}
                          disabled={isLoading}
                        >
                          招待
                        </button>
                      )}
                      <div className="workspace-arrow">→</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ログアウトボタン */}
            <button
              onClick={handleLogoutClick}
              disabled={isLoading}
              className="logout-btn"
            >
              ログアウト
            </button>
          </>
        )}
      </div>
      
      {/* 招待モーダル */}
      {showInviteModal && currentInviteWorkspace && (
        <div className="invite-modal" onClick={closeInviteModal}>
          <div className="invite-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{currentInviteWorkspace.name}</h2>
              <p className="modal-subtitle">招待リンクを共有してメンバーを招待しよう</p>
            </div>
            
            <div className="invite-url-container">
              <div className="invite-url">{inviteUrl}</div>
            </div>
            
            <div className="modal-actions">
              <button className="btn-copy" onClick={copyInviteLink}>
                {copyButtonText}
              </button>
              <button className="btn-close" onClick={closeInviteModal}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
