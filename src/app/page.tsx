import React from 'react'
import { createClient } from '@/utils/supabase/server'
import LandingPageClient from '@/app/components/LandingPageClient'
import HomePageClient from '@/app/components/HomePageClient'

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    return <HomePageClient />
  }

  return <LandingPageClient />
}
