import type { Metadata } from 'next'
import { Fraunces, DM_Mono, Inter } from 'next/font/google'
import './globals.css'
import { UserProvider } from '@/providers/UserProvider'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '600'],
  variable: '--font-fraunces',
})
const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
})
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'NotebookLM',
  description: 'Your AI research companion',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmMono.variable} ${inter.variable}`}>
      <body className="bg-[#0c0b0a] text-[#f5f0e8] font-inter antialiased">
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  )
}
