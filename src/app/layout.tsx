import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/hooks/QueryClientProvider";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const inter = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "OctoDef — Cybersecurity Defense Simulator",
    template: "%s | OctoDef",
  },
  description:
    "A next-gen cybersecurity defense simulator inspired by the intelligence of the octopus.",
  keywords: [
    "Cybersecurity",
    "Simulator",
    "AI Defense",
    "Ethical Hacking",
    "OctoDef",
    "Network Security",
  ],
  authors: [{ name: "Praise Olaoye", url: "https://github.com/satoru707" }],
  creator: "Praise Olaoye",
  publisher: "Praise Olaoye",
  metadataBase: new URL(`${process.env.NEXTAUTH_URL}`),

  openGraph: {
    title: "OctoDef — Cybersecurity Defense Simulator",
    description:
      "Train your digital defense instincts through an immersive simulation inspired by the octopus.",
    url: `${process.env.NEXTAUTH_URL}`,
    siteName: "OctoDef",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "OctoDef - Cybersecurity Defense Simulator",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "OctoDef — Cybersecurity Defense Simulator",
    description: "Defend, analyze, and evolve — inspired by the octopus.",
    creator: "@iampraiez",
    images: ["/og-image.png"],
  },

  icons: {
    icon: "/icon.svg",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <QueryProvider>
        <body
          className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
        >
          <div className="dark min-h-screen flex flex-col bg-black">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: "#111",
                  color: "#f9fafb",
                  border: "1px solid #333",
                },
              }}
            />
          </div>
        </body>
      </QueryProvider>
    </html>
  );
}
