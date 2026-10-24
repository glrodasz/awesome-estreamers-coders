import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // lib/streamers.ts and lib/live.ts read these at runtime (ISR revalidation), so ship them with every route.
  outputFileTracingIncludes: {
    '/*': ['./streamers.yml', './discover.yml', './generated/*.json'],
  },
}

export default nextConfig
