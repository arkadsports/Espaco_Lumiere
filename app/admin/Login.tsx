"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (r.ok) router.refresh();
    else setError((await r.json().catch(() => ({}))).error ?? "Erro ao entrar.");
  }

  return (
    <form className="login booking-card" onSubmit={submit}>
      <h1 style={{ marginBottom: 20 }}>Painel Lumière</h1>
      <div className="field">
        <label htmlFor="pw">Senha</label>
        <input id="pw" type="password" autoFocus required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <div className="nav-row">
        <span />
        <button className="btn btn-gold" disabled={busy}>
          Entrar
        </button>
      </div>
    </form>
  );
}
