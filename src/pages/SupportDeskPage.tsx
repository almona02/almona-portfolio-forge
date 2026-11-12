import React from 'react'
import { Navigate } from 'react-router-dom'
import { AdminTicketDashboard } from '@/components/support/AdminTicketDashboard'
import { useAuth } from '@/context/AuthContext'

/**
 * Staff ticket desk for admin/support. Lists tickets via RLS-backed getAllTickets
 * (owner/assignee/admin|support SELECT). Customers remain on /support.
 */
const SupportDeskPage: React.FC = () => {
  const { user, loading, isProfileResolved } = useAuth()

  if (loading || (user && !isProfileResolved)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!user || (user.role !== 'admin' && user.role !== 'support')) {
    return <Navigate to="/support" replace />
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Support desk</h1>
        <p className="text-sm text-muted-foreground">
          Staff ticket queue — create and assign service jobs from each ticket.
        </p>
      </div>
      <AdminTicketDashboard
        currentUserId={user.id}
        userRole={user.role === 'support' ? 'support' : 'admin'}
      />
    </div>
  )
}

export default SupportDeskPage
