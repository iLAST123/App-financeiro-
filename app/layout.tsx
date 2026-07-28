import type { Metadata, Viewport } from "next"
import "./globals.css"
import { SwRegister } from "@/components/pwa/sw-register"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "Meu Bolso — Controle financeiro pessoal",
  description:
    "App pessoal de controle financeiro. Seus dados ficam apenas no seu aparelho.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Meu Bolso",
  },
}

export const viewport: Viewport = {
  themeColor: "#4C5AFF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-center" />
        <SwRegister />
      </body>
    </html>
  )
}
