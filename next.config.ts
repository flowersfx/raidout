import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer", "@sparticuz/chromium-min"],
};

export default nextConfig;
