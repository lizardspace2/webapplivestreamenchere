import type { Metadata } from 'next'
import App from './App'

export const metadata: Metadata = {
  title: 'Enchères Live Stream',
  description: 'Application d\'enchères en direct avec streaming vidéo',
}

/**
 * Layout racine minimal - toute la logique est dans App.tsx
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>
        <App>
          {children}
        </App>
      </body>
    </html>
  )
}

