import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PixlPrfct",
  description: "Design workspace with a Rust document engine.",
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
