// src/components/MembersList/MembersList.tsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './MembersList.scss'

interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: string
  joined_at: string
  profiles: {
    username: string
  }
}

interface MembersListProps {
  workspaceId: string
}

export function MembersList({ workspaceId }: MembersListProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkspaceMembers = async () => {
    try {
      setLoading(true)
      setError(null)

      // RPC関数を使用してワークスペースメンバーを取得（RLS回避）
      const { data, error: rpcError } = await supabase
        .rpc('get_workspace_members_safe', { workspace_id_param: workspaceId })

      if (rpcError) {
        throw rpcError
      }

      if (data) {
        const formattedMembers: WorkspaceMember[] = data.map((item: any) => ({
          id: item.id || `${item.user_id}_member`,
          workspace_id: workspaceId,
          user_id: item.user_id,
          role: item.role || 'member',
          joined_at: item.joined_at || new Date().toISOString(),
          profiles: {
            username: item.username || 'Unknown'
          }
        }))

        setMembers(formattedMembers)
      }
    } catch (err: any) {
      console.error('メンバー取得エラー:', err)
      setError(err.message || 'メンバー情報の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspaceMembers()
    }
  }, [workspaceId])

  if (loading) {
    return (
      <section className="members-section">
        <h2 className="members-title">Members sharing ideas</h2>
        <div className="members-list">
          <p>メンバー情報を読み込み中...</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="members-section">
        <h2 className="members-title">Members sharing ideas</h2>
        <div className="members-list">
          <p>エラー: {error}</p>
        </div>
      </section>
    )
  }

  if (members.length === 0) {
    return (
      <section className="members-section">
        <h2 className="members-title">Members sharing ideas</h2>
        <div className="members-list">
          <p>まだメンバーがいません</p>
        </div>
      </section>
    )
  }

  return (
    <section className="members-section">
      <h2 className="members-title">Members sharing ideas</h2>
      <div className="members-list">
        {members.map((member, index) => (
          <div key={member.id} className="member-card">
            #{index + 1} {member.profiles.username} {member.role === 'owner' ? 'オーナー' : 'メンバー'} {new Date(member.joined_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' })}
          </div>
        ))}
      </div>
    </section>
  )
}