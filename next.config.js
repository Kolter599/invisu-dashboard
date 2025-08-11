/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // allow embedding the app inside your Framer page
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Let specific parents embed this site
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://*.framer.app https://invisu.dk https://www.invisu.dk https://*.vercel.app;",
          },
          // Old header some browsers still check. ALLOWALL is non-standard but widely honored.
          { key: "X-Frame-Options", value: "ALLOWALL" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
