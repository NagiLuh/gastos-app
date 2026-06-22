import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Registro de Gastos — Survey Corps',
  description: 'Control de gastos personales',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet" />
      </head>
      <body className="snk-bg min-h-screen">{children}</body>
    </html>
  )
}
