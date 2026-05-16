import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { Providers } from '@/components/Providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TrueVow Customer Portal',
  description: 'Law Firm Dashboard for TrueVow Services',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider 
      publishableKey={process.env.CLERK_APP_3_PUBLISHABLE_KEY}
    >
      <html lang="en">
        <body className={inter.className}>
          <Providers>
            {children}
            <ToastProvider />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
