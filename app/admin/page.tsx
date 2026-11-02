import type { Metadata } from "next";
import { isAdmin } from "@/lib/auth";
import AdminPanel from "./AdminPanel";
import Login from "./Login";

export const metadata: Metadata = { title: "Painel · Espaço Lumière", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  return (await isAdmin()) ? <AdminPanel /> : <Login />;
}
