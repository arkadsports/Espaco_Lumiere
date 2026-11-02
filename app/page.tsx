import Link from "next/link";
import { CATEGORIES, LASH_STYLES, LOCATIONS, SERVICES, SITE } from "@/lib/content";
import { query } from "@/lib/db";
import { fmtDateShort, fmtMoney, localDate } from "@/lib/time";
import { Footer, Header, WhatsAppFloat, waLink } from "./_components/Chrome";

export const revalidate = 60;

type Price = { id: string; category: string; name: string; duration_min: number; price_cents: number | null };

async function loadData() {
  // Se o banco ainda não estiver configurado, o site continua no ar com o conteúdo padrão.
  try {
    const [services, natal] = await Promise.all([
      query<Price>(`select id, category, name, duration_min, price_cents from services where active order by sort`),
      query<{ on_date: string }>(
        `select distinct on_date::text as on_date from schedule_windows where location_id = 'natal' and on_date >= $1 order by on_date limit 12`,
        [localDate(new Date())],
      ),
    ]);
    return { services, natalDates: natal.map((n) => n.on_date) };
  } catch {
    return { services: SERVICES as Price[], natalDates: [] as string[] };
  }
}

const DURATION = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}` : `${m} min`);

function Pill({ cents }: { cents: number | null }) {
  if (cents == null) return <div className="pill" style={{ fontSize: "1.2rem" }}>Sob consulta</div>;
  const [int, dec] = (cents / 100).toFixed(2).split(".");
  return (
    <div className="pill">
      <small>R$</small> {int}
      <small>,{dec}</small>
    </div>
  );
}

export default async function Home() {
  const { services, natalDates } = await loadData();
  const lash = ["lash-aplicacao", "lash-manutencao", "lash-remocao"].map((id) => services.find((s) => s.id === id)).filter(Boolean) as Price[];
  const others = services.filter((s) => s.category !== "lash");

  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="wrap">
            <div className="eyebrow">Angicos · Natal</div>
            <h1>Espaço Lumière</h1>
            <div className="sub">Estética feminina</div>
            <div className="rule" aria-hidden>
              ✦
            </div>
            <p className="lead">
              {SITE.tagline}. Cílios, massagem, body piercing e sobrancelhas, com cuidado e atenção em cada detalhe.
            </p>
            <div className="actions">
              <Link href="/agendar" className="btn btn-gold">
                Agendar horário
              </Link>
              <a href={waLink("Olá! Gostaria de agendar um horário.")} className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
                Chamar no WhatsApp
              </a>
            </div>
          </div>
        </section>

        <section className="block alt" id="servicos">
          <div className="wrap">
            <div className="section-head">
              <div className="eyebrow">Serviços</div>
              <h2>O que fazemos</h2>
            </div>
            <div className="cats">
              {CATEGORIES.map((c) => (
                <Link key={c.id} href={`/agendar?categoria=${c.id}`} className="cat">
                  <h3>{c.name}</h3>
                  <p>{c.text}</p>
                  <span className="more">Agendar →</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="block" id="cilios">
          <div className="wrap">
            <div className="section-head">
              <div className="eyebrow">Lash designer</div>
              <h2>Realce o que te faz única</h2>
              <p>Cílios que valorizam o seu olhar, do seu jeito. Escolha o volume ideal para você.</p>
            </div>
            <div className="styles">
              {LASH_STYLES.map((s) => (
                <article className="style" key={s.slug}>
                  <div className="eyebrow">Volume</div>
                  <h3>{s.name}</h3>
                  <div className="tick" />
                  <p>{s.text}</p>
                  <div className="photo" role="img" aria-label={`Exemplo de cílios Volume ${s.name}`}>
                    <div className="img" style={{ backgroundImage: `url(/images/lash-${s.slug}.jpg)` }} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="block alt" id="valores">
          <div className="wrap">
            <div className="prices">
              <div className="title">Tabela de valores</div>
              <div className="price-grid">
                {lash.map((s) => (
                  <div className="price" key={s.id}>
                    <div className="eyebrow">{s.name.replace(" de cílios", "")}</div>
                    <Pill cents={s.price_cents} />
                    <div className="meta">duração aprox. {DURATION(s.duration_min)}</div>
                  </div>
                ))}
              </div>
              {others.length > 0 && (
                <div className="others">
                  {others.map((s) => (
                    <div key={s.id}>
                      <span>{s.name}</span>
                      <span>{fmtMoney(s.price_cents)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="center" style={{ marginTop: 30 }}>
              <Link href="/agendar" className="btn btn-gold">
                Escolher meu horário
              </Link>
            </div>
          </div>
        </section>

        <section className="block" id="locais">
          <div className="wrap">
            <div className="section-head">
              <div className="eyebrow">Onde estamos</div>
              <h2>Dois endereços</h2>
            </div>
            <div className="places">
              {LOCATIONS.map((l) => (
                <div className="place" key={l.id}>
                  <span className="tag">{l.id === "angicos" ? "Atendimento fixo" : "Datas pré-definidas"}</span>
                  <h3>{l.id === "angicos" ? "Angicos" : "Natal"}</h3>
                  <p>{l.address}</p>
                  {l.id === "natal" && (
                    <>
                      {natalDates.length > 0 ? (
                        <>
                          <p className="muted" style={{ margin: "0 0 6px" }}>Próximas datas em Natal:</p>
                          <ul>
                            {natalDates.map((d) => (
                              <li key={d}>{fmtDateShort(d)}</li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="muted">As datas em Natal são divulgadas na agenda online e no Instagram.</p>
                      )}
                    </>
                  )}
                  <a className="link" href={l.maps_url} target="_blank" rel="noopener noreferrer">
                    Ver no mapa
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="block alt cta">
          <div className="wrap">
            <h2>Pronta para se sentir ainda mais você?</h2>
            <p>Escolha o serviço, o dia e o horário. A confirmação é imediata.</p>
            <Link href="/agendar" className="btn btn-gold">
              Agendar agora
            </Link>
          </div>
        </section>
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
