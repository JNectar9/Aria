import './globals.css'
import { SPRITE } from '@/components/sprite'
export const metadata = { title: 'ARIA – The AI Research Verification Engineer' }
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' as const }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" /></head>
      <body><div dangerouslySetInnerHTML={{ __html: SPRITE }} />{children}</body>
    </html>
  )
}
