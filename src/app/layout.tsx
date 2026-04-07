import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "Smart Hunristan — Hackathon Platform",
  description: "Smart Hunristan Hackathon Platform — Compete. Code. Conquer.",
  keywords: ["hackathon", "competitive programming", "coding competition", "Pakistan"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <div className="scan-line" />
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "var(--card)",
                color: "var(--text)",
                border: "1px solid rgba(255,255,255,0.08)",
                fontFamily: "'Inter', sans-serif",
              },
              success: { iconTheme: { primary: "#10b981", secondary: "var(--bg)" } },
              error: { iconTheme: { primary: "#ef4444", secondary: "var(--bg)" } },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}