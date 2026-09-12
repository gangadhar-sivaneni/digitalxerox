import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiClientError } from "../../services/api/client";
import { useAuth } from "./AuthContext";
import { useLive } from "../../hooks/useLive";
import { getLiveQueue } from "../../services/api/queue";
import { displayToken } from "../../utils/format";

export function LoginPage() {
  const { login } = useAuth();
  const { data: liveQueue } = useLive(getLiveQueue, { intervalMs: 8_000 });
  const hasLiveQueue = (liveQueue?.activeCount ?? 0) > 0;
  const [params] = useSearchParams();
  const [email, setEmail] = useState("gangadhar@mlrit.ac.in");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password, params.get("next") ?? undefined);
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Could not sign in. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="view" id="view-login">
      <div className="auth">
        <div className="auth-brand">
          <div className="top">
            <div className="mark">XR</div>
            <div className="wm" style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 16 }}>
              Digital Xerox
            </div>
          </div>
          <h2>Order before you arrive.</h2>
          <div className="demo-tok">
            <div className="l">LIVE QUEUE</div>
            <div className="t">{hasLiveQueue && liveQueue?.nowServing ? displayToken(liveQueue.nowServing) : "CLEAR"}</div>
            <div style={{ color: "rgba(255,255,255,.55)", fontSize: 12.5, marginTop: 8 }}>
              {hasLiveQueue ? `${liveQueue?.activeCount} active orders · avg ${liveQueue?.avgProcessingMinutes} min each` : "No active orders right now"}
            </div>
          </div>
        </div>
        <div className="auth-form">
          <div className="box">
            <h1>Welcome back</h1>
            <p className="sub">Sign in with your college account to place and track orders.</p>

            {error ? (
              <div
                className="panel"
                style={{ background: "var(--st-rej-wash)", borderColor: "transparent", padding: "10px 14px", marginBottom: 14, fontSize: 13.5, color: "var(--st-rej)", fontWeight: 600 }}
              >
                {error}
              </div>
            ) : null}

            <form onSubmit={onSubmit} noValidate>
              <div className="field">
                <label className="label" htmlFor="li-email">College email</label>
                <input
                  className="input"
                  id="li-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@mlrit.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="li-pass">Password</label>
                <input
                  className="input"
                  id="li-pass"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="hint" style={{ textAlign: "center", marginTop: 16 }}>
              Ordering requires a college account.{" "}
              <Link to="/" style={{ color: "var(--accent)", fontWeight: 600 }}>Back to home</Link>
            </p>

            <div
              className="panel panel-pad"
              style={{ marginTop: 18, fontSize: 12.5, lineHeight: 1.7 }}
            >
              <div className="label" style={{ marginBottom: 6 }}>Development credentials</div>
              <div className="muted">
                Seeded by the backend for local testing. Students sign in with the school
                directory in production.
              </div>
              <table style={{ width: "100%", marginTop: 8, fontSize: 12.5 }}>
                <tbody>
                  <tr>
                    <td className="muted">Student</td>
                    <td className="mono">gangadhar@mlrit.ac.in</td>
                  </tr>
                  <tr>
                    <td className="muted">Staff</td>
                    <td className="mono">scope@mlrit.ac.in</td>
                  </tr>
                  <tr>
                    <td className="muted">Admin</td>
                    <td className="mono">mlrit@mlrit.ac.in</td>
                  </tr>
                </tbody>
              </table>
              <div className="mono muted" style={{ marginTop: 6 }}>password · demo1234</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

