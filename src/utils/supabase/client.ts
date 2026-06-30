import { createBrowserClient } from '@supabase/ssr'
import { clientEnv } from '@/lib/env'

export function createClient() {
  const client = createBrowserClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  // Dev-mode QA bypass
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true') {
    const originalGetUser = client.auth.getUser.bind(client.auth)
    client.auth.getUser = async (jwt?: string) => {
      const res = await originalGetUser(jwt)
      if (!res.data.user) {
        return {
          data: {
            user: {
              id: '00000000-0000-0000-0000-000000000000',
              email: 'qa-user@munchpick.com',
              user_metadata: { full_name: 'QA Preview User' },
              created_at: new Date().toISOString(),
              app_metadata: {},
              aud: 'authenticated',
              role: 'authenticated',
            } as any,
          },
          error: null,
        }
      }
      return res
    }
  }

  return client
}
