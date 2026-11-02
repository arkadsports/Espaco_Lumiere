import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-serif" });
const sans = Jost({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-sans" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://espacolumiere.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Espaço Lumière · Lash designer, massagem, body piercing e sobrancelhas",
  description:
    "Espaço de estética feminina em Angicos e Natal. Extensão de cílios, massagem, body piercing e design de sobrancelhas. Agende seu horário online.",
  openGraph: { title: "Espaço Lumière", description: "Realce o que te faz única. Agende online.", type: "website", locale: "pt_BR" },
};

export const viewport: Viewport = { themeColor: "#f6ebdd" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
