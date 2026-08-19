/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cms/blocks', '@cms/shared'],

  async rewrites() {
    // Same-origin: /api API server pe jaata hai (D-12)
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL ?? 'http://localhost:4000'}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
