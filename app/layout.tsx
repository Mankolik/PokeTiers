import type { Metadata } from "next";
import "./globals.css";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "PokeTiers";
const iconPath = isGitHubPages ? `/${repositoryName}/favicon.svg` : "/favicon.svg";

export const metadata: Metadata = {
  title: "PokéTiers — Rate every Pokémon",
  description:
    "Rate every Pokémon from SS to F and build your complete National Pokédex tier list.",
  icons: {
    icon: iconPath,
    shortcut: iconPath,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
