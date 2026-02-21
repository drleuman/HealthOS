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
      {
        protocol: 'https',
        hostname: 'mithohacks.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lanutricionadora.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },

};

import { withSentryConfig } from '@sentry/nextjs';

export default withSentryConfig(
  withNextIntl(nextConfig),
  {
    silent: true,
    org: "healthos",
    project: "healthos-web",
    widenClientFileUpload: true,
    transpileClientSDK: true,
    hideSourceMaps: true,
    disableLogger: true,
    automaticVercelMonitors: true,
  }
);
