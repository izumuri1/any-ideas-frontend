// src/components/PageHeader.tsx
import React from 'react'
import './PageHeader.scss'

interface PageHeaderProps {
  children: React.ReactNode
  className?: string
}

export default function PageHeader({ children, className = '' }: PageHeaderProps) {
  return (
    <header className={`page-header ${className}`}>
      <div className="header">
        {children}
      </div>
    </header>
  )
}