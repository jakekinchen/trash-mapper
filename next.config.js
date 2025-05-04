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
    '*.local-origin.dev',
    'http://192.168.1.109',
    'https://192.168.1.109',
    'http://192.168.1.109:3000',
    'https://192.168.1.109:3000'
  ],
}

module.exports = nextConfig 