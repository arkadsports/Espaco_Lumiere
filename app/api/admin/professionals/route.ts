import { BookingError, listProfessionals } from "@/lib/booking";
import { query } from "@/lib/db";
import { adminOnly, body, json } from "@/lib/http";

export const dynamic = "force-dynamic";

type Input = {
  id?: string;
  name?: string;
  title?: string;
  bio?: string;
  photo_url?: string | null;
  categories?: string[];
  active?: boolean;
  sort?: number;
};

const CATS = ["lash", "massagem", "piercing", "sobrancelha"];

function clean(b: Input) {
  const name = String(b.name ?? "").trim().slice(0, 80);
  if (name.length < 2) throw new BookingError("invalid", "Informe o nome da profissional.");
  const categories = (b.categories ?? []).filter((c) => CATS.includes(c));
  const photo = String(b.photo_url ?? "").trim();
  if (photo && !/^(https:\/\/|\/)/.test(photo)) throw new BookingError("invalid", "A foto deve ser um link https:// ou um caminho como /profissionais/ana.jpg.");
  return {
    name,
    title: String(b.title ?? "").trim().slice(0, 80),
    bio: String(b.bio ?? "").trim().slice(0, 400),
    photo_url: photo || null,
    categories,
    active: b.active !== false,
    sort: Number.isFinite(Number(b.sort)) ? Number(b.sort) : 100,
  };
}

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const GET = () => adminOnly(async () => json({ professionals: await listProfessionals({ includeInactive: true }) }));

export const POST = (req: Request) =>
  adminOnly(async () => {
    const v = clean(await body<Input>(req));
    let id = slug(v.name);
    const taken = await query(`select 1 from professionals where id = $1`, [id]);
    if (taken.length) id = `${id}-${Math.random().toString(36).slice(2, 6)}`;
    await query(
      `insert into professionals (id, name, title, bio, photo_url, categories, active, sort) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, v.name, v.title, v.bio, v.photo_url, v.categories, v.active, v.sort],
    );
    return json({ id }, 201);
  });

export const PATCH = (req: Request) =>
  adminOnly(async () => {
    const b = await body<Input>(req);
    if (!b.id) throw new BookingError("invalid", "Profissional não informada.");
    const v = clean(b);
    await query(
      `update professionals set name=$2, title=$3, bio=$4, photo_url=$5, categories=$6, active=$7, sort=$8 where id=$1`,
      [b.id, v.name, v.title, v.bio, v.photo_url, v.categories, v.active, v.sort],
    );
    return json({ ok: true });
  });
