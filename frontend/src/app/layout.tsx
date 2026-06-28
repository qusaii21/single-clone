import type { Metadata } from "next";
import "./globals.css";
import { ToastContainer } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Signal Web",
  description: "Private messaging for everyone — end-to-end encrypted (simulated)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#111213] text-[#e9edef] antialiased h-screen overflow-hidden">
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
