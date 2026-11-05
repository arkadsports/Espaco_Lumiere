import type { Metadata } from "next";
import Link from "next/link";
import { getAppointmentByToken } from "@/lib/booking";
import { LOCATIONS, SITE } from "@/lib/content";
import { fmtDateLong, fmtTime, localDate } from "@/lib/time";
import { Footer, Header, waLink } from "../../_components/Chrome";
import CancelButton from "./CancelButton";

export const metadata: Metadata = { title: "Seu agendamento · Espaço Lumière", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { confirmed: "Confirmado", cancelled: "Cancelado", completed: "Concluído", no_show: "Não compareceu" };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const appt = await getAppointmentByToken(token).catch(() => null);
  const start = appt ? new Date(appt.start_at) : null;
  const loc = appt ? LOCATIONS.find((l) => l.id === appt.location_id) : null;
  const upcoming = !!start && start.getTime() > Date.now() && appt?.status === "confirmed";

  return (
    <>
      <Header />
      <main className="booking-page">
        <div className="wrap">
          <div className="booking-card center">
            {!appt || !start ? (
              <>
                <h1>Agendamento não encontrado</h1>
                <p className="hint">Confira o link ou fale conosco pelo WhatsApp.</p>
                <a className="btn btn-gold" href={waLink()}>
                  WhatsApp {SITE.whatsappDisplay}
                </a>
              </>
            ) : (
              <>
                <h1>Seu agendamento</h1>
                <p className="hint">Olá, {appt.client_name.split(" ")[0]}!</p>
                <div className="summary" style={{ textAlign: "left" }}>
                  <dl>
                    <dt>Serviço</dt>
                    <dd>
                      {appt.service_name}
                      {appt.variant ? ` · ${appt.variant}` : ""}
                    </dd>
                    <dt>Com</dt>
                    <dd>{appt.professional_name}</dd>
                    <dt>Quando</dt>
                    <dd>
                      {fmtDateLong(localDate(start))} às {fmtTime(start)}
                    </dd>
                    <dt>Onde</dt>
                    <dd>{loc?.address}</dd>
                    <dt>Situação</dt>
                    <dd>{STATUS[appt.status] ?? appt.status}</dd>
                  </dl>
                </div>
                <div className="actions-row">
                  {upcoming && <CancelButton token={token} />}
                  <Link href="/agendar" className="btn btn-gold">
                    Novo agendamento
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
