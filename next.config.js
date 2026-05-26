/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000', 'keenkids-enrichment.vercel.app'] },
  },
}

module.exports = nextConfig
