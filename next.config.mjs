/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  experimental: {
    // Allow 30s cache for static pages, 5s for dynamic pages.
    // This makes navigation feel instant after the first visit.
    staleTimes: {
      dynamic: 5,
      static: 30,
    },
  },
};

export default nextConfig;
