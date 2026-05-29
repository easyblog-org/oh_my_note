import type { Metadata } from "next";
import { Toaster } from "sonner";
import Sidebar from "@/components/layout/Sidebar";
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
      <body className="min-h-full bg-page-bg text-primary-text">
        <Sidebar>{children}</Sidebar>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '0.875rem',
              fontWeight: 500,
            },
          }}
        />
      </body>
    </html>
  );
}
