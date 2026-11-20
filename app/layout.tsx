import './globals.css'
import './extra.css'
import { SPRITE } from '@/components/sprite'
export const metadata = { title: 'ARIA – The AI Research Verification Engineer', description: 'Turn scientific claims into testable evidence.' }
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' as const }
const THEME = "try{var t=localStorage.getItem('aria-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}"
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&display=swap" />
        <script dangerouslySetInnerHTML={{ __html: THEME }} />
      </head>
      <body><div dangerouslySetInnerHTML={{ __html: SPRITE }} />{children}</body>
    </html>
  )
}
