import { dayPlan } from "@/lib/booking";
import { adminOnly, json } from "@/lib/http";
import { localDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export const GET = (req: Request) =>
  adminOnly(async () => {
    const date = new URL(req.url).searchParams.get("date") ?? localDate(new Date());
    return json({ professionals: await dayPlan(date) });
  });
