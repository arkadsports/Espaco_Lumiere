import type { Metadata } from "next";
import Link from "next/link";
import { listServices, type Service } from "@/lib/booking";
import { CATEGORIES, LOCATIONS, SERVICES } from "@/lib/content";
import { Footer, Header } from "../_components/Chrome";
import BookingFlow from "./BookingFlow";

export const metadata: Metadata = { title: "Agendar horário · Espaço Lumière" };
export const dynamic = "force-dynamic";

export default async function Agendar({ searchParams }: { searchParams: Promise<{ servico?: string; categoria?: string }> }) {
  const sp = await searchParams;
  let services: Service[] = [];
  let failed = false;
  try {
    services = await listServices();
  } catch {
    failed = true;
  }

  return (
    <>
      <Header />
      <main className="booking-page">
        <div className="wrap">
          {failed ? (
            <div className="booking-card center">
              <h1>Agenda indisponível</h1>
              <p className="hint">Não conseguimos carregar a agenda agora. Tente novamente em instantes ou fale conosco pelo WhatsApp.</p>
              <Link href="/" className="btn btn-ghost">
                Voltar ao início
              </Link>
            </div>
          ) : (
            <BookingFlow
              services={services}
              categories={CATEGORIES}
              locations={LOCATIONS.map(({ id, name, address }) => ({ id, name, address }))}
              initialService={SERVICES.some((s) => s.id === sp.servico) ? sp.servico : undefined}
              initialCategory={sp.categoria}
            />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
