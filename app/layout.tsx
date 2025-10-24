import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinkWatcher Super Admin",
  description: "Super Admin Panel for LinkWatcher",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  );
}
