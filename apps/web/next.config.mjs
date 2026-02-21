import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: false },
  transpilePackages: ["@healthos/shared"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'loving-nash.217-154-177-201.plesk.page',
        pathname: '/**',
      },
    ],
  },

};

export default withNextIntl(nextConfig);

