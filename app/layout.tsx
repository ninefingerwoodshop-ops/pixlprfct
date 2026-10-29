import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PixlPrfct",
  description: "Design workspace with a Rust document engine.",
  icons: {
    icon: "/editor/favicon.svg?v=mono",
    shortcut: "/editor/favicon.svg?v=mono",
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
