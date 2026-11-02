import Link from "next/link";
import { SITE } from "@/lib/content";

export const waLink = (text?: string) =>
  `https://wa.me/${SITE.whatsappNumber}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export function Header() {
  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/" className="logo">
          Lumière<small>Espaço de estética</small>
        </Link>
        <nav className="nav" aria-label="Principal">
          <Link href="/#servicos">Serviços</Link>
          <Link href="/#cilios">Cílios</Link>
          <Link href="/#valores">Valores</Link>
          <Link href="/#locais">Onde estamos</Link>
          <Link href="/agendar" className="btn btn-gold btn-sm">
            Agendar
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="logo">Lumière</div>
        <div className="links">
          <a href={`https://instagram.com/${SITE.instagram}`} target="_blank" rel="noopener noreferrer">
            @{SITE.instagram}
          </a>
          <a href={waLink()} target="_blank" rel="noopener noreferrer">
            WhatsApp {SITE.whatsappDisplay}
          </a>
          <Link href="/agendar">Agendar</Link>
        </div>
        <div className="motto">Beleza · Confiança · Autoestima</div>
      </div>
    </footer>
  );
}

export function WhatsAppFloat() {
  return (
    <a className="wa-float" href={waLink("Olá! Gostaria de saber mais sobre os serviços do Espaço Lumière.")} target="_blank" rel="noopener noreferrer">
      Falar no WhatsApp
    </a>
  );
}
