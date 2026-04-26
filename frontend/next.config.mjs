/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/__unwritten_api/:path*",
        destination: "http://127.0.0.1:8787/:path*",
      },
    ];
  },
};

export default nextConfig;
