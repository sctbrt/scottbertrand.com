// Root Layout with Global Metadata
// V13 Aesthetic Alignment

import type { Metadata } from 'next'
import './globals.css'

// Global metadata base
export const metadata: Metadata = {
  metadataBase: new URL('https://clients.bertrandbrands.ca'),

  title: {
    default: 'Bertrand System',
    template: '%s | Bertrand System',
  },

  description: 'Internal management system for Bertrand Brands',

  robots: {
    index: false,
    follow: false,
  },

  icons: {
    icon: '/assets/sb-monogram-light.png',
    apple: '/assets/sb-monogram-light.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Inter font (V13 body typography) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

        {/* Halyard Display (V13 display typography — Adobe Fonts / Typekit) */}
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://use.typekit.net/dmk8daz.css" />

        {/* Theme color for mobile browsers — dark only (BB is dark-only across the ecosystem) */}
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="color-scheme" content="dark" />
      </head>
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
