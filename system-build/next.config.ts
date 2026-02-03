import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enforce trailing slash policy (consistent URLs)
  trailingSlash: false,

  // Headers for security and SEO
  async headers() {
    // Check if this is a preview/non-production environment
    const isPreview = process.env.VERCEL_ENV === 'preview' ||
                      process.env.NODE_ENV === 'development';
    const isProduction = process.env.VERCEL_ENV === 'production';

    // CSP: More restrictive in production, allow unsafe-eval in dev for Next.js hot reload
    const scriptSrc = isProduction
      ? "script-src 'self' 'unsafe-inline'"  // Production: no unsafe-eval
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";  // Dev/Preview: Next.js needs unsafe-eval

    return [
      {
        // Security headers for all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
              "font-src 'self'",
              "connect-src 'self' https://api.pushover.net https://*.upstash.io",
              "frame-ancestors 'self'",
              "form-action 'self'",
              "base-uri 'self'",
            ].join('; '),
          },
          // Prevent preview environments from being indexed
          ...(isPreview ? [{
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          }] : []),
        ],
      },
      {
        // Cache static assets aggressively
        source: '/assets/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Redirects for canonical domain enforcement
  async redirects() {
    return [
      // HTTP to HTTPS (handled by Vercel, but explicit)
      // www to non-www
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.scottbertrand.com',
          },
        ],
        destination: 'https://scottbertrand.com/:path*',
        permanent: true,
      },
    ];
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'prod-files-secure.s3.us-west-2.amazonaws.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // TypeScript
  typescript: {
    // Allow production builds even with type errors (for gradual migration)
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
