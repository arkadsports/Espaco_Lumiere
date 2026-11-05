"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type NavItem = { href: string; label: string };

export default function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="mobile-menu">
      <button
        type="button"
        className={`burger ${open ? "open" : ""}`}
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        aria-expanded={open}
        aria-controls="menu-panel"
        onClick={() => setOpen(!open)}
      >
        <span />
        <span />
        <span />
      </button>
      {open && <div className="menu-backdrop" onClick={() => setOpen(false)} />}
      <nav id="menu-panel" className={`menu-panel ${open ? "show" : ""}`} aria-label="Menu" hidden={!open}>
        {items.map((i) => (
          <Link key={i.href} href={i.href} onClick={() => setOpen(false)}>
            {i.label}
          </Link>
        ))}
        <Link href="/agendar" className="btn btn-gold" onClick={() => setOpen(false)}>
          Agendar horário
        </Link>
      </nav>
    </div>
  );
}
