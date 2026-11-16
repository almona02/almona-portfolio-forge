import React from 'react'
import { Navigate } from 'react-router-dom'
import { ServiceRoutineReviewPanel } from '@/components/support/ServiceRoutineReviewPanel'
import { useAuth } from '@/context/AuthContext'

/**
 * Support/Admin entry for Lane A independent review (F-01).
 * Separate from /admin — Support does not receive general Admin access.
 */
const SupportRoutineReviewPage: React.FC = () => {
  const { user, loading, isProfileResolved } = useAuth()

  if (loading || (user && !isProfileResolved)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!user || (user.role !== 'admin' && user.role !== 'support')) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="container mx-auto space-y-4 px-4 py-6" data-testid="support-routine-review-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Service routine review</h1>
        <p className="text-sm text-muted-foreground">
          Record independent feasibility review for Admin-authored drafts. Publishing remains Admin-only.
        </p>
      </div>
      <ServiceRoutineReviewPanel />
    </div>
  )
}

export default SupportRoutineReviewPage
