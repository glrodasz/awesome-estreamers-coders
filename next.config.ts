import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // lib/streamers.ts reads these at runtime (ISR revalidation), so ship them with every route.
  outputFileTracingIncludes: {
    '/*': ['./streamers.yml', './generated/*.json'],
  },
}

export default nextConfig
