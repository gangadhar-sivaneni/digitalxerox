import { useState } from "react";
import { DotBadge } from "../../components/ui/Badges";
import { useAuth } from "../auth/AuthContext";
import { useApi } from "../../hooks/useApi";
import {
  createStaffUser,
  listStaffUsers,
  deleteStaffUser,
  updateStaffUser,
} from "../../services/api/admin";
import { ApiClientError } from "../../services/api/client";
import { DEV_FIXTURES } from "../../constants";
import type { StaffUser } from "../../types";

export function StaffPage() {
  const { token } = useAuth();
  const api = useApi(() => listStaffUsers(token ?? ""));
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const staff = api.data ?? [];

  async function create() {
    if (!token) return;
    setBusy(true);
    setNotice(null);
    try {
      await createStaffUser(token, { name: name.trim(), email: email.trim() });
      setShowCreate(false);
      setName("");
      setEmail("");
      setNotice({ ok: true, text: "Staff account created. They sign in with the bootstrap password and a seeded campus domain." });
      api.reload();
    } catch (err) {
      setNotice({ ok: false, text: err instanceof ApiClientError ? err.message : "Could not create staff account." });
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(u: StaffUser) {
    if (!token) return;
    setBusy(true);
    setNotice(null);
    try {
      await updateStaffUser(token, u.userId, { active: !u.active });
      setNotice({ ok: true, text: `${u.name} is now ${u.active ? "deactivated" : "active"}.` });
      api.reload();
    } catch (err) {
      setNotice({ ok: false, text: err instanceof ApiClientError ? err.message : "Could not update staff member." });
    } finally {
      setBusy(false);
    }
  }

  async function deleteStaff(u: StaffUser) {
    if (!token || !window.confirm(`Remove access for ${u.name}?`)) return;
    setBusy(true);
    setNotice(null);
    try {
      await deleteStaffUser(token, u.userId);
      setNotice({ ok: true, text: `${u.name} was removed.` });
      api.reload();
    } catch (err) {
      setNotice({ ok: false, text: err instanceof ApiClientError ? err.message : "Could not remove staff account." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="apage">
      <div className="page page-wide">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="page-title">Staff</div>
            <p className="page-sub">
              {staff.length} counter account{staff.length === 1 ? "" : "s"} · access is revoked server-side, never on the client
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add staff</button>
        </div>

        {notice ? (
          <div
            className="panel"
            style={{ marginTop: 16, padding: "10px 14px", fontSize: 13.5, fontWeight: 600, background: notice.ok ? "var(--st-ready-wash)" : "var(--st-rej-wash)", color: notice.ok ? "var(--st-ready)" : "var(--st-rej)", borderColor: "transparent" }}
          >
            {notice.text}
          </div>
        ) : null}

        {api.error ? (
          <div className="panel panel-pad" style={{ marginTop: 18, color: "var(--st-rej)", fontWeight: 600 }}>
            {(api.error as Error).message}
          </div>
        ) : api.loading ? (
          <div className="panel panel-pad" style={{ marginTop: 18 }}>Loading…</div>
        ) : (
          <table className="pricetable staff-table" style={{ marginTop: 22 }}>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {staff.map((u) => (
                <tr key={u.userId} style={u.active ? undefined : { opacity: 0.55 }}>
                  <td><b>{u.name}</b></td>
                  <td className="muted">{u.email}</td>
                  <td>
                    {u.active ? <DotBadge st="paid" label="Active" /> : <DotBadge st="rejected" label="Inactive" />}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => deleteStaff(u)}>Remove access</button>
                    <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => toggleActive(u)}>
                      {u.active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="hint" style={{ marginTop: 14 }}>
          Bootstrap password is <b>{DEV_FIXTURES.password}</b> (development fixtures only — change on first sign-in in production).
        </p>

        {showCreate ? (
          <div className="modal-scrim staff-create-scrim open" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
            <div className="modal staff-create-modal" role="dialog" aria-modal="true">
              <div className="m-head">
                <h3>Add staff</h3>
                <button className="iconbtn" aria-label="Close" onClick={() => setShowCreate(false)}>×</button>
              </div>
              <div style={{ padding: "4px 22px 4px" }}>
                <div className="field">
                  <label className="label" htmlFor="s-name">Full name</label>
                  <input id="s-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="field">
                  <label className="label" htmlFor="s-email">Email</label>
                  <input id="s-email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@college.edu" />
                </div>
              </div>
              <div className="m-foot">
                <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn btn-primary" disabled={busy || !name.trim() || !email.trim()} onClick={create}>
                  {busy ? "Creating…" : "Create staff account"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}