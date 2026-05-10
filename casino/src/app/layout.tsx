import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Casino",
  description: "Licensed online casino — CZ & SK",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg text-white min-h-screen">{children}</body>
    </html>
  );
}
