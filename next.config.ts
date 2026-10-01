import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/Passphra.si",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;