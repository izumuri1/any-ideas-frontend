// src/pages/Home.tsx - IdeaCardコンポーネント化版（元のコードベース完全維持）
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { HamburgerMenu } from '../components/HamburgerMenu'
import { type LikeableItem } from '../components/LikeButton'
import PageHeader from '../components/PageHeader'
import { MembersList } from '../components/MembersList'
import FormField from '../components/common/FormField'  // ← 既存import
import { useForm } from '../hooks/useForm'  // ← 既存import
import IdeaCard from '../components/IdeaCard/IdeaCard' // ← 新規import（IdeaCard化のみの追加）
import { NotificationBell } from '../components/NotificationBell' // ← 追加
import './Home.scss'

// 型定義（元のまま完全維持）
interface WorkspaceInfo {
  id: string
  name: string
  owner_id: string
  owner_username: string
}

interface IdeaFormData {
  idea_name: string
  when_text: string
  who_text: string
  what_text: string
}

interface Idea extends LikeableItem {
  idea_name: string
  when_text: string | null
  who_text: string | null
  what_text: string
  creator_id: string
  status: string
  created_at: string
  profiles: {
    username: string
  }
}

export default function Home() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const tryingIdeasRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  const getCurrentYearMonth = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    return `${year}年${month}月`
  }

  const generateWhenOptions = () => {
    const options = []
    for (let year = 2025; year <= 2099; year++) {
      for (let month = 1; month <= 12; month++) {
        options.push(`${year}年${month}月`)
      }
    }
    return options
  }

  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 統一されたフォーム管理（元のまま）
  const ideaForm = useForm<IdeaFormData>({
    initialValues: {
      idea_name: '',
      when_text: getCurrentYearMonth(),
      who_text: '',
      what_text: ''
    },
    validationRules: {
      idea_name: {
        required: true,
        maxLength: 100,
        displayName: 'アイデア名'
      },
      what_text: {
        required: true,
        maxLength: 500,
        displayName: '何をしたい'
      },
      who_text: {
        maxLength: 500,
        displayName: '誰と'
      }
    }
  })

  const [ideas, setIdeas] = useState<Idea[]>([])
  const [thinkingIdeas, setThinkingIdeas] = useState<Idea[]>([])
  const [tryingIdeas, setTryingIdeas] = useState<Idea[]>([])
  const [loadingIdeas, setLoadingIdeas] = useState(false)

  const [deletingIdeaId, setDeletingIdeaId] = useState<string | null>(null)
  const [proceedingIdeaId, setProceedingIdeaId] = useState<string | null>(null)

  // 検討画面への遷移処理（元のまま）
  const handleDiscussion = (ideaId: string) => {
    navigate(`/workspace/${workspaceId}/discussion/${ideaId}`)
  }

  // 詳細画面への遷移処理（元のまま）
  const handleViewDetails = (ideaId: string) => {
    navigate(`/workspace/${workspaceId}/idea/${ideaId}/detail`)
  }

  // fetchIdeasByStatus（元のまま）
  const fetchIdeasByStatus = async (status: string): Promise<Idea[]> => {
    if (!workspaceId) throw new Error('ワークスペースIDが不正です')

    const { data, error } = await supabase
      .from('ideas')
      .select(`
        id,
        idea_name,
        when_text,
        who_text,
        what_text,
        creator_id,
        status,
        created_at,
        profiles:creator_id (username),
        idea_likes (
          id,
          idea_id,
          user_id,
          created_at,
          profiles:user_id (username)
        )
      `)
      .eq('workspace_id', workspaceId)
      .eq('status', status)
      .is('deleted_at', null)
      .order('when_text', { ascending: true, nullsFirst: false })

    if (error) {
      console.error(`${status}アイデア取得エラー:`, error)
      throw error
    }

    return (data || []).map(item => ({
      id: item.id,
      idea_name: item.idea_name,
      when_text: item.when_text,
      who_text: item.who_text,
      what_text: item.what_text,
      creator_id: item.creator_id,
      status: item.status,
      created_at: item.created_at,
      profiles: {
        username: (item.profiles as any)?.username || 'Unknown'
      },
      idea_likes: (item.idea_likes || []).map((like: any) => ({
        id: like.id,
        idea_id: like.idea_id,
        user_id: like.user_id,
        created_at: like.created_at,
        profiles: {
          username: Array.isArray(like.profiles) ? like.profiles[0]?.username || 'Unknown' : like.profiles?.username || 'Unknown'
        }
      })),
      like_count: item.idea_likes?.length || 0,
      user_has_liked: user ? item.idea_likes?.some((like: any) => like.user_id === user.id) || false : false
    }))
  }

  // handleError（元のまま）
  const handleError = (error: any, message: string) => {
    console.error(message, error)
    alert(message)
  }

  // fetchAllIdeas（元のまま）
  const fetchAllIdeas = async () => {
    if (!workspaceId) return

    try {
      setLoadingIdeas(true)
      
      const [ourIdeasData, thinkingIdeasData, tryingIdeasData] = await Promise.all([
        fetchIdeasByStatus('our_ideas'),
        fetchIdeasByStatus('thinking_about'),
        fetchIdeasByStatus('trying')
      ])

      setIdeas(ourIdeasData)
      setThinkingIdeas(thinkingIdeasData.sort((a, b) => {
        // nullや空文字の場合は最後に配置
        if (!a.when_text && !b.when_text) return 0
        if (!a.when_text) return 1
        if (!b.when_text) return -1
        // when_textの文字列比較（昇順）
        return a.when_text.localeCompare(b.when_text)
      }))
      setTryingIdeas(tryingIdeasData)

    } catch (error) {
      handleError(error, 'アイデア一覧の取得に失敗しました')
    } finally {
      setLoadingIdeas(false)
    }
  }

  // handleLikeToggle（元のまま）
  const handleLikeToggle = async (ideaId: string) => {
    if (!user) return

    try {
      // 楽観的更新：DB更新前にローカルstateを先に更新
      const updateIdeasOptimistically = (ideas: Idea[]) => 
        ideas.map(idea => {
          if (idea.id === ideaId) {
            const currentlyLiked = idea.user_has_liked
            const currentCount = idea.like_count || 0
            
            return {
              ...idea,
              user_has_liked: !currentlyLiked,
              like_count: currentlyLiked ? currentCount - 1 : currentCount + 1,
              // idea_likesも適切に更新
              idea_likes: currentlyLiked 
                ? // いいね取り消し：現在のユーザーのいいねを削除
                  idea.idea_likes?.filter(like => like.user_id !== user.id) || []
                : // いいね追加：新しいいいねを追加
                  [...(idea.idea_likes || []), { 
                    id: 'temp-' + Date.now(), // 一時的なID
                    idea_id: ideaId, 
                    user_id: user.id, 
                    created_at: new Date().toISOString(),
                    profiles: { 
                      username: user.user_metadata?.username || user.email?.split('@')[0] || 'Unknown' 
                    }
                  }]
            }
          }
          return idea
        })

      // 両方のstateを楽観的に更新（即座にUI反映）
      setIdeas(prev => updateIdeasOptimistically(prev))
      setThinkingIdeas(prev => updateIdeasOptimistically(prev))
      // 注意：tryingIdeasは更新しない（元のコード通り）

      // ここからDB更新処理（既存のロジック）
      const { data: existingLike, error: checkError } = await supabase
        .from('idea_likes')
        .select('id')
        .eq('idea_id', ideaId)
        .eq('user_id', user.id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existingLike) {
        // いいね削除
        const { error } = await supabase
          .from('idea_likes')
          .delete()
          .eq('idea_id', ideaId)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        // いいね追加
        const { error } = await supabase
          .from('idea_likes')
          .insert({
            idea_id: ideaId,
            user_id: user.id
          })

        if (error) throw error
      }

    } catch (error) {
      // エラー時のみ：全データ再取得でロールバック
      console.error('いいねの操作でエラーが発生しました:', error)
      await fetchAllIdeas()
    }
  }

  // useEffect群（元のまま）
  useEffect(() => {
    const fetchWorkspaceInfo = async () => {
      if (!workspaceId) {
        setError('ワークスペースIDが不正です')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const { data, error } = await supabase
          .from('workspaces')
          .select(`
            id,
            name,
            owner_id,
            profiles:owner_id (username)
          `)
          .eq('id', workspaceId)
          .single()

        if (error) throw error

        if (!data) {
          throw new Error('ワークスペースが見つかりません')
        }

        setWorkspaceInfo({
          id: data.id,
          name: data.name,
          owner_id: data.owner_id,
          owner_username: (data.profiles as any)?.username || 'Unknown'
        })
      } catch (error: any) {
        console.error('ワークスペース情報の取得でエラーが発生しました:', error)
        setError(error.message || 'ワークスペース情報の取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchWorkspaceInfo()
  }, [workspaceId])

  useEffect(() => {
    fetchAllIdeas()
  }, [workspaceId])

  useEffect(() => {
    const state = location.state as { scrollToIdeaId?: string; message?: string } | null;
    if (state?.scrollToIdeaId) {
      const scrollToTarget = () => {
        const targetElement = tryingIdeasRefs.current[state.scrollToIdeaId!];
        if (targetElement) {
          setTimeout(() => {
            targetElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
            
            targetElement.style.transition = 'box-shadow 0.3s ease';
            targetElement.style.boxShadow = '0 4px 20px rgba(255, 193, 7, 0.5)';
            setTimeout(() => {
              targetElement.style.boxShadow = '';
            }, 2000);
          }, 300);
          
          window.history.replaceState({}, document.title);
        }
      };

      if (tryingIdeas.length > 0) {
        scrollToTarget();
      } else {
        const timeout = setTimeout(scrollToTarget, 500);
        return () => clearTimeout(timeout);
      }
    }
  }, [location.state, tryingIdeas]);

  // handleIdeaSubmitをuseFormに合わせて修正（元のまま）
  const handleIdeaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!ideaForm.validateAll()) {
      return
    }

    if (!workspaceId || !user) return

    ideaForm.setSubmitting(true)

    try {
      const { error } = await supabase
        .from('ideas')
        .insert({
          workspace_id: workspaceId,
          creator_id: user.id,
          idea_name: ideaForm.values.idea_name.trim(),
          when_text: ideaForm.values.when_text.trim() || null,
          who_text: ideaForm.values.who_text.trim() || null,
          what_text: ideaForm.values.what_text.trim(),
          status: 'our_ideas'
        })

      if (error) throw error

      ideaForm.reset()
      await fetchAllIdeas()

    } catch (error: any) {
      console.error('アイデア登録でエラーが発生しました:', error)
      alert('アイデアの登録に失敗しました')
    } finally {
      ideaForm.setSubmitting(false)
    }
  }

  // 残りの関数（handleIdeaDelete, handleIdeaProceed）は元のまま
  const handleIdeaDelete = async (ideaId: string) => {
    if (!user) return
    
    const ideaToDelete = [...ideas, ...thinkingIdeas, ...tryingIdeas].find(idea => idea.id === ideaId)
    if (!ideaToDelete || ideaToDelete.creator_id !== user.id) {
      alert('自分が作成したアイデアのみ削除できます')
      return
    }

    setDeletingIdeaId(ideaId)
    try {
      const { error } = await supabase
        .from('ideas')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', ideaId)

      if (error) throw error
      await fetchAllIdeas()
    } catch (error) {
      console.error('アイデア削除でエラーが発生しました:', error)
    } finally {
      setDeletingIdeaId(null)
    }
  }

  const handleIdeaProceed = async (ideaId: string) => {
    if (!user) return

    setProceedingIdeaId(ideaId)
    try {
      const { error } = await supabase
        .from('ideas')
        .update({ 
          status: 'thinking_about',
          moved_to_thinking_at: new Date().toISOString()
        })
        .eq('id', ideaId)
        .eq('creator_id', user.id)

      if (error) throw error

      await fetchAllIdeas()
    } catch (error) {
      console.error('アイデア進める処理でエラーが発生しました:', error)
    } finally {
      setProceedingIdeaId(null)
    }
  }

  // ローディング・エラー表示（元のまま）
  if (loading) {
    return (
      <div className="home-container">
        <header className="home-header">
          <div className="header">
            <HamburgerMenu currentPage="home" />
            <div className="workspace-info">
              <p className="loading-text">読み込み中...</p>
            </div>
          </div>
        </header>
      </div>
    )
  }

  if (error || !workspaceInfo) {
    return (
      <div className="home-container">
        <header className="home-header">
          <div className="header">
            <HamburgerMenu currentPage="home" />
            <div className="workspace-info">
              <p className="error-text">{error}</p>
            </div>
          </div>
        </header>
      </div>
    )
  }

  // いつ頃のオプション生成（元のまま）
  const whenOptions = generateWhenOptions().map(option => ({
    value: option,
    label: option
  }))

  // メインレンダリング（元のレイアウト完全維持・IdeaCardのactionsとdisplayOptionsを正しく設定）
  return (
    <div className="home-container">
      <PageHeader className="home-header">
        <HamburgerMenu currentPage="home" />
        
        <div className="workspace-info">
          {workspaceInfo && (
            <>
              <div className="workspace-name">
                <span className="label">ワークスペース名：</span>
                <span className="value">{workspaceInfo.name}</span>
              </div>
              <div className="workspace-owner">
                <span className="label">ワークスペースオーナー：</span>
                <span className="value">{workspaceInfo.owner_username}</span>
              </div>
            </>
          )}
        </div>
        
        <NotificationBell workspaceId={workspaceId!} />
      </PageHeader>

      <main className="home-main">
        <section className="idea-form-section">
          <div className="idea-form">
            <div className="logo-title-section">
              <div className="logo-title-row">
                <img 
                  src="/icons/icon-48x48.png" 
                  alt="Any ideas? ロゴ"
                  className="app-logo"
                  width="48"
                  height="48"
                />
                <h1 className="app-title">Any ideas?</h1>
              </div>
              
              <p className="app-description">
                いつ頃？誰と？何をしたい？アイデアを登録しよう
              </p>
            </div>

            {/* FormFieldコンポーネント使用（元のまま） */}
            <form onSubmit={handleIdeaSubmit} className="idea-registration-form">
              <FormField
                type="text"
                placeholder="アイデア名"
                maxLength={100}
                required
                {...ideaForm.getFieldProps('idea_name')}
              />

              <FormField
                type="select"
                placeholder="いつ頃？"
                options={whenOptions}
                {...ideaForm.getFieldProps('when_text')}
              />

              <FormField
                type="text"
                placeholder="誰と？"
                maxLength={500}
                {...ideaForm.getFieldProps('who_text')}
              />

              <FormField
                type="textarea"
                placeholder="何をしたい？"
                maxLength={500}
                rows={3}
                required
                {...ideaForm.getFieldProps('what_text')}
              />

              <button
                type="submit"
                disabled={ideaForm.isSubmitting}
                className="btn-primary"
              >
                {ideaForm.isSubmitting ? 'アイデア登録中...' : 'アイデア登録'}
              </button>
            </form>
          </div>
        </section>

        {/* IdeaCard使用（元のEnhancedIdeaCardの表示形式を維持） */}
        <section className="ideas-zone our-ideas">
          <h2 className="zone-title">Our ideas</h2>
          <p className="zone-description">みんなの共感が得られたら検討を進めよう</p>
          <div className="ideas-cards">
            {loadingIdeas ? (
              <p>アイデア読み込み中...</p>
            ) : ideas.length === 0 ? (
              <p>まだアイデアがありません。最初のアイデアを投稿してみましょう！</p>
            ) : (
              ideas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  currentUser={user}
                  actions={{
                    onProceed: handleIdeaProceed,
                    onDelete: handleIdeaDelete,
                    onLikeToggle: handleLikeToggle
                  }}
                  loadingStates={{
                    proceedingId: proceedingIdeaId,
                    deletingId: deletingIdeaId
                  }}
                  displayOptions={{ 
                    showProceedButton: true
                  }}
                />
              ))
            )}
          </div>
        </section>

        <section className="ideas-zone thinking-about">
          <h2 className="zone-title">Ideas we're thinking about</h2>
          <p className="zone-description">アイデアを具体的に検討しよう</p>
          <div className="ideas-cards">
            {thinkingIdeas.length === 0 ? (
              <p>検討中のアイデアはありません。Our ideasから進めてみましょう！</p>
            ) : (
              thinkingIdeas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  currentUser={user}
                  actions={{
                    onDelete: handleIdeaDelete,
                    onLikeToggle: handleLikeToggle,
                    onDiscussion: handleDiscussion
                  }}
                  loadingStates={{
                    proceedingId: proceedingIdeaId,
                    deletingId: deletingIdeaId
                  }}
                  displayOptions={{ 
                    showDiscussionButton: true
                  }}
                />
              ))
            )}
          </div>
        </section>

        <section className="ideas-zone trying">
          <h2 className="zone-title">Ideas we're trying</h2>
          <p className="zone-description">これまでに検討したアイデアを確認しよう</p>
          <div className="ideas-cards">
            {tryingIdeas.length === 0 ? (
              <p>実行中のアイデアはありません。検討を進めてみましょう！</p>
            ) : (
              tryingIdeas.map((idea) => (
                <div 
                  key={idea.id}
                  ref={(el) => {
                    tryingIdeasRefs.current[idea.id] = el;
                  }}
                  className="idea-card-wrapper"
                  data-idea-id={idea.id}
                >
                  <IdeaCard
                    idea={idea}
                    currentUser={user}
                    actions={{
                      onDelete: handleIdeaDelete,
                      onLikeToggle: handleLikeToggle,
                      onViewDetails: handleViewDetails
                    }}
                    loadingStates={{
                      proceedingId: proceedingIdeaId,
                      deletingId: deletingIdeaId
                    }}
                    displayOptions={{ 
                      showDetailsButton: true
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </section>

        {workspaceId && <MembersList workspaceId={workspaceId} />}
      </main>
    </div>
  )
}