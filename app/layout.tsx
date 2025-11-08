import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProviderWrapper } from './providers/AuthProviderWrapper'
import GlobalAuthModal from './components/GlobalAuthModal'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Enchères Live Stream',
  description: 'Application d\'enchères en direct avec streaming vidéo',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <AuthProviderWrapper>
          {children}
          <GlobalAuthModal />
        </AuthProviderWrapper>
      </body>
    </html>
  )
}

