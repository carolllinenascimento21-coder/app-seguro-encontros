import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  devIndicators: false,

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'unsplash.com' },

      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.com' },

      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },

      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: '*.cloudfront.net' },
      { protocol: 'https', hostname: 's3.amazonaws.com' },

      { protocol: 'https', hostname: '*.vercel-storage.com' },
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },

      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.cloudinary.com' },

      { protocol: 'https', hostname: 'images.pexels.com' },

      { protocol: 'https', hostname: 'pixabay.com' },
      { protocol: 'https', hostname: 'cdn.pixabay.com' },

      { protocol: 'https', hostname: 'github.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },

      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: 'imgur.com' },

      { protocol: 'https', hostname: 'drive.google.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },

      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },

      { protocol: 'https', hostname: 'i.vimeocdn.com' },

      { protocol: 'https', hostname: 'cdn.jsdelivr.net' },
      { protocol: 'https', hostname: 'unpkg.com' },

      { protocol: 'https', hostname: '*.uploadthing.com' },
      { protocol: 'https', hostname: '*.imagekit.io' },
      { protocol: 'https', hostname: '*.sanity.io' },

      { protocol: 'https', hostname: 'assets.vercel.com' },

      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'localhost' },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
}

export default nextConfig
