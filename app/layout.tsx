import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "OhMyNote",
  description: "Blog article management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-page-bg text-primary-text">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              borderRadius: '9999px',
              padding: '10px 20px',
              fontSize: '0.875rem',
              fontWeight: 500,
            },
          }}
        />
      </body>
    </html>
  );
}
