"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelButton({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    if (!confirm("Tem certeza que deseja cancelar este agendamento?")) return;
    setBusy(true);
    setError("");
    const r = await fetch("/api/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setBusy(false);
    if (r.ok) router.refresh();
    else setError((await r.json().catch(() => ({}))).error ?? "Não foi possível cancelar.");
  }

  return (
    <>
      <button className="btn btn-ghost" onClick={cancel} disabled={busy}>
        {busy ? "Cancelando…" : "Cancelar agendamento"}
      </button>
      {error && (
        <p className="err" role="alert" style={{ width: "100%" }}>
          {error}
        </p>
      )}
    </>
  );
}
