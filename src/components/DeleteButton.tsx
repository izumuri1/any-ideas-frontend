// src/components/DeleteButton.tsx
import './DeleteButton.scss'

interface DeleteButtonProps {
  item: { id: string }  // アイデアでも提案でも使える
  currentUser: any
  creatorId: string     // アイデアのcreator_idまたは提案のproposer_id
  isDeleting: boolean
  onDelete: (itemId: string) => void
  deleteText?: string   // オプション
  deletingText?: string // オプション
}

export function DeleteButton({ 
  item, 
  currentUser, 
  creatorId, 
  isDeleting, 
  onDelete,
  deleteText = "削除",
  deletingText = "削除中..."
}: DeleteButtonProps) {
  const isOwner = currentUser && currentUser.id === creatorId

  if (!isOwner) {
    return null
  }

  return (
    <button 
      className="btn-delete"
      onClick={() => onDelete(item.id)}
      disabled={isDeleting}
    >
      {isDeleting ? deletingText : deleteText}
    </button>
  )
}