import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./add-games.css";
import "./dashboard-home.css";
import "./library-pages.css";
import "./product-polish.css";
import "./authenticated-overhaul.css";
import "./playnext-final.css";
import "./decide-ai.css";
import "./collection-final.css";
import "./radius-consistency.css";

export const metadata: Metadata = {
  title: "PlayNext",
  description: "One clear game recommendation for the session you have right now.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#101520",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
