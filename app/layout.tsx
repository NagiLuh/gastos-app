import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gastos App',
  description: 'Control de gastos personales',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}
