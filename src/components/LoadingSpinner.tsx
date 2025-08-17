// src/components/LoadingSpinner.tsx
import './LoadingSpinner.scss'

export function LoadingSpinner() {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>読み込み中...</p>
    </div>
  )
}