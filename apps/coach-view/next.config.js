/** @type {import('next').NextConfig} */
module.exports = {
  transpilePackages: ['@repo/ui'],
  env: {
    API_ENDPOINT: 'http://20.198.250.250:8001',
  },
};
