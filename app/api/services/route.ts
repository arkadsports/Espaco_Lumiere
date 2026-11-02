import { listServices } from "@/lib/booking";
import { handle, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = () => handle(async () => json({ services: await listServices() }));
