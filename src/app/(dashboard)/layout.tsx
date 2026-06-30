import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import DashboardShell from './components/DashboardShell'
import BackgroundVideo from '@/components/BackgroundVideo'
import Envelope from '@/components/envelope/Envelope'
import { WelcomeProvider } from '@/lib/envelope/WelcomeContext'
import WelcomeLayoutWrapper from './components/WelcomeLayoutWrapper'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("LAYOUT USER:", user)

  if (!user) {
    redirect('/login')
  }

  // Get user profile name or fall back to email prefix
  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <WelcomeProvider>
      <WelcomeLayoutWrapper>
        {/* Private Background Video Stream */}
        <BackgroundVideo />

        {/* Responsive Shell:
            - /dashboard (chat): renders children directly, no outer chrome
            - All other routes: renders desktop sidebar + mobile header + bottom nav */}
        <DashboardShell userName={userName} userInitial={userInitial}>
          {children}
        </DashboardShell>

        {/* Surprise Letter from Munch — fixed overlay, always present */}
        <Envelope />
      </WelcomeLayoutWrapper>
    </WelcomeProvider>
  )
}
