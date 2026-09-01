import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PokéTiers — Rate every Pokémon",
  description:
    "Rate every Pokémon from SS to F and build your complete National Pokédex tier list.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
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
