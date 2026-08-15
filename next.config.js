/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'nexthorizon.life',
          },
        ],
        destination: 'https://www.nexthorizon.life/:path*',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
