import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LandingClient } from './LandingClient'

export default async function LoginPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get('connect.sid')
  
  if (session) {
    redirect('/dashboard')
  }

  return <LandingClient />
}
