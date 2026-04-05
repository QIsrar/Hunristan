import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Smart Hunristan — Hackathon Platform",
  description: "Smart Hunristan Hackathon Platform — Compete. Code. Conquer.",
  keywords: ["hackathon", "competitive programming", "coding competition", "Pakistan"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <div className="scan-line" />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#111827",
              color: "#f1f5f9",
              border: "1px solid rgba(255,255,255,0.08)",
              fontFamily: "'Inter', sans-serif",
            },
            success: { iconTheme: { primary: "#10b981", secondary: "#060910" } },
            error: { iconTheme: { primary: "#ef4444", secondary: "#060910" } },
          }}
        />
      </body>
    </html>
  );
}