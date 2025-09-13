// src/components/DeleteButton.tsx
import './DeleteButton.scss'

interface DeleteButtonProps {
  ideaId: string
  currentUser: any
  creatorId: string
  isDeleting: boolean
  onDelete: (ideaId: string) => void
}

export function DeleteButton({ 
  ideaId, 
  currentUser, 
  creatorId, 
  isDeleting, 
  onDelete 
}: DeleteButtonProps) {
  const isOwner = currentUser && currentUser.id === creatorId

  if (!isOwner) {
    return null
  }

  return (
    <button 
      className="btn-delete"
      onClick={() => onDelete(ideaId)}
      disabled={isDeleting}
    >
      {isDeleting ? '削除中...' : '削除'}
    </button>
  )
}