// GITHUB_PAGES=true 时走静态导出+子路径，本地开发不受影响
const isGithubPages = process.env.GITHUB_PAGES === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isGithubPages
    ? {
        output: "export",
        basePath: "/shared-checkin",
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
