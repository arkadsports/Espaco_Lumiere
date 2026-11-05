// Fonte única de conteúdo: usada pelo site e pelo seed do banco (scripts/db-setup.mjs).
// Preços, durações e horários abaixo podem ser editados depois no painel /admin.

export const SITE = {
  name: "Espaço Lumière",
  tagline: "Realce o que te faz única",
  instagram: "espacolumiiere",
  whatsappNumber: "5584996644614",
  whatsappDisplay: "(84) 99664-4614",
};

export const LASH_STYLES = [
  { slug: "brasileiro", name: "Brasileiro", text: "Efeito natural e super elegante." },
  { slug: "egipcio", name: "Egípcio", text: "Mais volume e um olhar marcante." },
  { slug: "glamour", name: "Glamour", text: "O equilíbrio perfeito entre naturalidade e intensidade." },
  { slug: "luxo", name: "Luxo", text: "Máximo de volume para um olhar irresistível." },
];

export const CATEGORIES = [
  { id: "lash", name: "Lash Designer", text: "Extensão de cílios em volume, do natural ao máximo." },
  { id: "massagem", name: "Massagem", text: "Momentos de pausa para relaxar corpo e mente." },
  { id: "piercing", name: "Body Piercing", text: "Aplicação segura, com atenção a cada detalhe." },
  { id: "sobrancelha", name: "Sobrancelhas", text: "Design que valoriza o seu olhar." },
];

export const LOCATIONS = [
  {
    id: "angicos",
    name: "Espaço Lumière · Angicos",
    address: "Praça José da Penha, 79 · Angicos/RN · CEP 59515-000",
    maps_url: "https://www.google.com/maps/search/?api=1&query=Pra%C3%A7a+Jos%C3%A9+da+Penha+79+Angicos+RN",
  },
  {
    id: "natal",
    name: "Espaço Lumière · Natal",
    address: "Av. das Brancas Dunas, 3650 · Candelária · Natal/RN (próximo ao Natal Shopping)",
    maps_url:
      "https://www.google.com/maps/search/?api=1&query=Av.+das+Brancas+Dunas+3650+Candel%C3%A1ria+Natal+RN",
  },
];

export type ServiceSeed = {
  id: string;
  category: string;
  name: string;
  description: string;
  duration_min: number;
  price_cents: number | null;
  variants: string[];
  variant_label: string | null;
  sort: number;
};

const lashVariants = LASH_STYLES.map((s) => `Volume ${s.name}`);

export const SERVICES: ServiceSeed[] = [
  {
    id: "lash-aplicacao",
    category: "lash",
    name: "Aplicação de cílios",
    description: "Extensão de cílios no estilo de volume que você escolher.",
    duration_min: 150,
    price_cents: 15000,
    variants: lashVariants,
    variant_label: "Estilo",
    sort: 10,
  },
  {
    id: "lash-manutencao",
    category: "lash",
    name: "Manutenção de cílios",
    description: "Reposição dos fios para manter o olhar sempre impecável.",
    duration_min: 90,
    price_cents: 10000,
    variants: lashVariants,
    variant_label: "Estilo",
    sort: 20,
  },
  {
    id: "lash-remocao",
    category: "lash",
    name: "Remoção de cílios",
    description: "Remoção cuidadosa das extensões.",
    duration_min: 30,
    price_cents: 3000,
    variants: [],
    variant_label: null,
    sort: 30,
  },
  {
    id: "massagem",
    category: "massagem",
    name: "Massagem",
    description: "Sessão de massagem para aliviar tensões e relaxar.",
    duration_min: 60,
    price_cents: null,
    variants: [],
    variant_label: null,
    sort: 40,
  },
  {
    id: "body-piercing",
    category: "piercing",
    name: "Body piercing",
    description: "Aplicação de piercing com biossegurança.",
    duration_min: 30,
    price_cents: null,
    variants: [],
    variant_label: null,
    sort: 50,
  },
  {
    id: "sobrancelhas",
    category: "sobrancelha",
    name: "Design de sobrancelhas",
    description: "Design personalizado para o formato do seu rosto.",
    duration_min: 45,
    price_cents: null,
    variants: [],
    variant_label: null,
    sort: 60,
  },
];

export type ProfessionalSeed = {
  id: string;
  name: string;
  title: string;
  bio: string;
  photo_url: string | null;
  categories: string[];
  sort: number;
};

// Cadastre as demais profissionais (massagem, piercing, sobrancelhas) no painel /admin > Profissionais.
export const PROFESSIONALS: ProfessionalSeed[] = [
  {
    id: "livia-melo",
    name: "Livia Melo",
    title: "Lash designer",
    bio: "Especialista em extensão de cílios, com atenção ao olhar de cada cliente.",
    photo_url: null,
    categories: ["lash"],
    sort: 10,
  },
];

// Horário semanal inicial (terça a sábado, em Angicos). Ajuste no painel /admin.
export const DEFAULT_WINDOWS = PROFESSIONALS.flatMap((p) =>
  [2, 3, 4, 5, 6].flatMap((weekday) => [
    { professional_id: p.id, location_id: "angicos", weekday, start_time: "09:00", end_time: "12:00" },
    { professional_id: p.id, location_id: "angicos", weekday, start_time: "14:00", end_time: "18:00" },
  ]),
);

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
