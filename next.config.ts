import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    poweredByHeader: false,
    devIndicators: false,
    typescript: {
        ignoreBuildErrors: true
    },
    productionBrowserSourceMaps: false,
    turbopack: {
        root: __dirname
    },
    experimental: {
        optimizePackageImports: ['lucide-react'],
        cpus: 1,
        workerThreads: false
    }
}

export default nextConfig