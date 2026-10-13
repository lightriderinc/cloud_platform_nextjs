import createMDX from '@next/mdx';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  // Pins the deployed git branch into the client bundle at build time, for the
  // "Open in Colab" links (see src/lib/colab.ts).
  //
  // Read here rather than straight from the component because the plain
  // VERCEL_GIT_COMMIT_REF is a server-only variable: Next inlines only
  // NEXT_PUBLIC_* into browser code, and every consumer is a client component.
  // Vercel also publishes NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF itself, but only
  // when "Automatically expose System Environment Variables" is enabled on the
  // project. Mapping it here works either way and removes that dependency, so
  // the links cannot quietly regress to `main` because of a dashboard toggle.
  env: {
    NEXT_PUBLIC_COLAB_BRANCH:
      process.env.VERCEL_GIT_COMMIT_REF ??
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF ??
      '',
  },
  async redirects() {
    return [
      {
        source: '/legal',
        destination: '/legal/privacy',
        permanent: true,
      },
      {
        source: '/settings',
        destination: '/settings/account',
        permanent: true,
      },
      {
        source: '/settings/usage',
        destination: '/settings/balance',
        permanent: true,
      },
      {
        source: '/settings/:section(purchases|credits|manage-credits)/quantum-compute',
        destination: '/settings/manage-credits/purchase',
        permanent: true,
      },
      {
        source: '/settings/purchases/:path*',
        destination: '/settings/manage-credits/:path*',
        permanent: true,
      },
      {
        source: '/settings/credits/:path*',
        destination: '/settings/manage-credits/:path*',
        permanent: true,
      },
      {
        source: '/settings/share-credits',
        destination: '/settings/manage-credits/share',
        permanent: true,
      },
      {
        source: '/settings/refer-earn',
        destination: '/settings/rewards',
        permanent: true,
      },
      {
        source: '/settings/purchase-history',
        destination: '/settings/payment-and-history',
        permanent: true,
      },
    ];
  },
}

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: ['remark-gfm'],
    rehypePlugins: [],
  },
})

export default withMDX(nextConfig)
