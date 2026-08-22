/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @lmd/shared ships as workspace TypeScript/JS; let Next transpile it.
  transpilePackages: ['@lmd/shared'],
};

export default nextConfig;
