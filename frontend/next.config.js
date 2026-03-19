/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-ada201ec5fb84401a3b36b7b21e6ed0f.r2.dev',
        pathname: '**',
      },
    ],
  },
  // Это позволит корректно подгружать воркеры для PDF
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
