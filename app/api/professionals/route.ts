import { listProfessionals } from "@/lib/booking";
import { handle, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = (req: Request) =>
  handle(async () => {
    const category = new URL(req.url).searchParams.get("category") ?? undefined;
    return json({ professionals: await listProfessionals({ category }) });
  });
