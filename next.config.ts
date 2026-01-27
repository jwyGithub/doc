import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    allowedDevOrigins: ['http://172.30.51.97:3000'],
    // 实验性功能优化
    experimental: {
        // 优化打包大小 - 自动 tree-shake 这些包
        optimizePackageImports: [
            'lucide-react',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-visually-hidden',
            'cmdk',
            'class-variance-authority',
            'clsx',
            'tailwind-merge',
            'sonner',
            'minisearch',
            'idb'
        ]
    }
};

export default nextConfig;

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();

