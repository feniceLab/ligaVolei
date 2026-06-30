import type { Metadata } from "next";
import { Montserrat, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://liga.fenicelab.com.br"),
  title: "Liga Catarinense de Voleibol — Gestão de Árbitros",
  description: "Sistema de gerenciamento de árbitros da Liga Catarinense de Voleibol",
  openGraph: {
    title: "Liga Catarinense de Voleibol — Gestão de Árbitros",
    description: "Sistema de gerenciamento de árbitros da Liga Catarinense de Voleibol",
    url: "https://liga.fenicelab.com.br",
    siteName: "LCV Arbitragem",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Liga Catarinense de Voleibol" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Liga Catarinense de Voleibol — Gestão de Árbitros",
    description: "Sistema de gerenciamento de árbitros da Liga Catarinense de Voleibol",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${jakarta.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-surface text-on-surface">
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
