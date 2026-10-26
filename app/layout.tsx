import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Murshid · Your Virtual Tour Guide",
  description: "Travel operations and your journey, together.",
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
