import type { Metadata } from "next";
import "./globals.css";
import "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css";

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
