import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { Seg } from "../../components/ui/Seg";
import { updateProfile } from "../../services/api/auth";

function initials(name: string): string {
  return (name || "?").charAt(0).toUpperCase();
}

export function ProfilePage() {
  const { user, logout, token, refreshUser } = useAuth();
  const [saving, setSaving] = useState<"paperSize" | "colorMode" | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;

  async function setPref(key: "paperSize" | "colorMode", value: string) {
    if (!token) return;
    setSaving(key);
    setSaved(false);
    setError(null);
    try {
      await updateProfile(key === "paperSize" ? { paperSize: value as "A4" | "A3" } : { colorMode: value as "bw" | "color" }, token);
      await refreshUser();
      setSaved(true);
    } catch (e) {
      setError((e as Error).message || "Couldn't save your preference.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="spage">
      <div className="page page-narrow">
        <div className="page-title">Profile</div>
        <p className="page-sub" style={{ marginBottom: 22 }}>Your account and defaults.</p>

        <div className="panel panel-pad" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
          <span className="av" style={{ width: 54, height: 54, fontSize: 22, borderRadius: "50%", background: "var(--accent-wash)", color: "var(--accent)", display: "grid", placeItems: "center", fontFamily: "var(--f-display)", fontWeight: 700 }}>
            {initials(user.name)}
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{user.name}</div>
            <div className="muted" style={{ fontSize: 13.5 }}>
              {user.email}
              {user.studentId ? " · Student ID " + user.studentId : ""}
              {user.counter ? " · " + user.counter : " · " + user.role.charAt(0) + user.role.slice(1).toLowerCase()}
            </div>
          </div>
        </div>

        <div className="field">
          <label className="label">Default paper size</label>
          <Seg
            name="pref-paper"
            value={user.preferences?.paperSize ?? "A4"}
            onChange={(v) => void setPref("paperSize", v)}
            options={[
              { value: "A4" as const, title: "A4" },
              { value: "A3" as const, title: "A3" },
            ]}
          />
        </div>
        <div className="field">
          <label className="label">Default colour</label>
          <Seg
            name="pref-color"
            value={user.preferences?.colorMode ?? "bw"}
            onChange={(v) => void setPref("colorMode", v)}
            options={[
              { value: "bw" as const, title: "Black & White" },
              { value: "color" as const, title: "Colour" },
            ]}
          />
        </div>

        <p className="hint" style={{ marginTop: 14 }}>
          These defaults are pre-selected when you place a new order.
        </p>

        <div style={{ marginTop: 16, minHeight: 20 }}>
          {saving ? (
            <span className="hint">Saving…</span>
          ) : saved ? (
            <span className="hint" style={{ color: "var(--st-ready)" }}>Saved.</span>
          ) : error ? (
            <span className="hint" style={{ color: "var(--st-rej)" }}>{error}</span>
          ) : null}
        </div>

        <button className="btn btn-ghost" onClick={logout} style={{ marginTop: 8, color: "var(--st-rej)" }}>
          Sign out
        </button>
      </div>
    </div>
  );
}