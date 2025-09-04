/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pg'],
  outputFileTracingRoot: __dirname,
    i18n: {
    locales: ['de', 'en', 'fr', 'nl', 'es', 'it'], // Deine unterstützten Sprachen
    defaultLocale: 'de',        // Die Standardsprache
  },
}

module.exports = nextConfig
