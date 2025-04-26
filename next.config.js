/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://localhost',
    'http://172.20.10.4',
    'https://172.20.10.4',
    'http://172.20.10.4:3000',
    'https://172.20.10.4:3000',
    'local-origin.dev', 
    '*.local-origin.dev'
  ],
}

module.exports = nextConfig 