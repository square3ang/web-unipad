import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Web Unipad",
  description: "Unipad for the web",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
