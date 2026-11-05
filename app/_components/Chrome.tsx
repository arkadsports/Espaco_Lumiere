import Link from "next/link";
import { SITE } from "@/lib/content";
import Lotus from "./Lotus";
import MobileMenu, { type NavItem } from "./MobileMenu";

export const waLink = (text?: string) =>
  `https://wa.me/${SITE.whatsappNumber}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

const NAV: NavItem[] = [
  { href: "/#servicos", label: "Serviços" },
  { href: "/#profissionais", label: "Profissionais" },
  { href: "/#cilios", label: "Cílios" },
  { href: "/#manutencao", label: "Manutenção" },
  { href: "/#valores", label: "Valores" },
  { href: "/#contato", label: "Contato" },
];

export function Brand({ size = 34 }: { size?: number }) {
  return (
    <Link href="/" className="brand" aria-label="Espaço Lumière, página inicial">
      <Lotus size={size} />
      <span className="brand-text">
        <small>Espaço</small>
        <span>Lumière</span>
      </span>
    </Link>
  );
}

export function Header() {
  return (
    <header className="site-header">
      <div className="wrap">
        <Brand />
        <nav className="nav" aria-label="Principal">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
          <Link href="/agendar" className="btn btn-gold btn-sm">
            Agendar
          </Link>
        </nav>
        <div className="header-mobile">
          <Link href="/agendar" className="btn btn-gold btn-sm">
            Agendar
          </Link>
          <MobileMenu items={NAV} />
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <Lotus size={40} className="gold" />
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
