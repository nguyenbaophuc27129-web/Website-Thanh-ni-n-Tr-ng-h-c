import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gói bản build tối giản vào .next/standalone để chạy trong Docker (deploy/)
  output: "standalone",
};

export default nextConfig;
