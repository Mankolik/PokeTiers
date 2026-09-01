import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "PokeTiers";
const pagesBasePath = `/${repositoryName}`;

const nextConfig: NextConfig = {
  output: isGitHubPages ? "export" : undefined,
  basePath: isGitHubPages ? pagesBasePath : undefined,
  assetPrefix: isGitHubPages ? `${pagesBasePath}/` : undefined,
  trailingSlash: isGitHubPages,
  images: {
    unoptimized: true,
  },
  typescript: isGitHubPages
    ? {
        tsconfigPath: "tsconfig.pages.json",
      }
    : undefined,
};

export default nextConfig;
