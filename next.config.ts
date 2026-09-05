import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default (1MB) is too small for a scanned bank slip photo submitted
      // as a base64 form field alongside the donation entry.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
