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
    // Disable client-side router cache — without this Next.js caches pages
    // for 30 seconds, causing deleted items to reappear after navigation
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
};

export default nextConfig;
