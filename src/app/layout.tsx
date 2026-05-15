import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/UserContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ErrorBoundary from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Education Bridge - Learn & Grow",
  description: "Bridging the gap between education and opportunity. Discover quality courses for Software Engineering, Data Science, Digital Literacy, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen grid grid-rows-[auto_1fr_auto]">
        <ErrorBoundary>
          <UserProvider>
            <Navbar />
              <main>{children}</main>
            <Footer />
          </UserProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
