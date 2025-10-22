import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinkWatcher Super Admin",
  description: "Super Admin Panel for LinkWatcher",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%235b21b6'/><path d='M30 35h15v5H30z M55 35h15v5H55z M45 45h10v20H45z M35 65h30v5H35z' fill='white'/></svg>",
        type: "image/svg+xml",
      },
    ],
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
