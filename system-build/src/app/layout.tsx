// Root Layout with Global Metadata
// V3 Aesthetic System

import type { Metadata } from 'next'
import './globals.css'

// Global metadata base
export const metadata: Metadata = {
  metadataBase: new URL('https://clients.bertrandbrands.com'),

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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#F7F6F3" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1C1C1E" media="(prefers-color-scheme: dark)" />
        <meta name="color-scheme" content="light dark" />

        {/* Theme detection and application */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function getTheme() {
                  const stored = localStorage.getItem('theme');
                  if (stored === 'dark' || stored === 'light') return stored;
                  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                document.documentElement.setAttribute('data-theme', getTheme());
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
