import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminTicketDashboard } from '@/components/support/AdminTicketDashboard'
import { Toaster } from 'sonner'

// Create a query client for the demo
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const AdminDashboard: React.FC = () => {
  // Mock current user data - in real app this would come from auth context
  const currentUserId = 'admin1'
  const userRole = 'admin' as const

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-6">
          <AdminTicketDashboard 
            currentUserId={currentUserId}
            userRole={userRole}
          />
        </div>
        <Toaster position="top-right" />
      </div>
    </QueryClientProvider>
  )
}

export default AdminDashboard
