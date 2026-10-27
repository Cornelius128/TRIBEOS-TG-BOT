import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TribeOS — Community Management Platform",
    template: "%s | TribeOS",
  },
  description:
    "Modular Telegram community management platform for Web3 DAOs, token projects, and ambassador programs.",
  keywords: ["telegram", "community", "web3", "dao", "referral", "moderation"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
