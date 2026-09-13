import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DotBadge } from "../../components/ui/Badges";
import { useAuth } from "../auth/AuthContext";
import { useLive } from "../../hooks/useLive";
import { getStaffOrder, setOrderStatus } from "../../services/api/staff";
import { ApiClientError } from "../../services/api/client";
import { documentDownloadUrl } from "../../services/api/documents";
import { displayToken, minutesAgo, rupees } from "../../utils/format";
import { ORDER_STATUS_ST, SERVICE_LABEL } from "../../constants";

const REJECT_REASONS = ["File won't open", "Corrupted / blank pages", "Wrong page count", "Inappropriate content"];

export function StaffOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  // Polls while the order is still live; stops once it leaves the desk.
  const api = useLive(() => getStaffOrder(token ?? "", id ?? ""), {
    intervalMs: 8000,
    active: (d) => {
      const order = (d as { order?: { status: string } } | null)?.order;
      return order ? ["RECEIVED", "PROCESSING", "READY"].includes(order.status) : true;
    },
  });
  const [reason, setReason] = useState("");
  const [preset, setPreset] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const detail = api.data;
  const documents = detail?.documents?.length ? detail.documents : detail?.document ? [detail.document] : [];
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const selectedDocument = documents.find((doc) => doc.documentId === selectedDocumentId) || documents[0] || null;

  function getRejectReason() {
    return (preset || reason || "Requested by staff.").trim() || "Requested by staff.";
  }

  async function act(status: "PROCESSING" | "READY" | "COMPLETED" | "REJECTED") {
    if (!token || !detail?.order) return;
    setBusy(status);
    setNotice(null);
    try {
      const next = await setOrderStatus(
        token,
        detail.order.token,
        status,
        status === "REJECTED" ? getRejectReason() : undefined
      );
      setNotice({ ok: true, text: `Order ${displayToken(next.token)} is now ${next.status.toLowerCase()}.` });
    } catch (err) {
      setNotice({ ok: false, text: err instanceof ApiClientError ? err.message : "Update failed." });
    } finally {
      setShowReject(false);
      setPreset("");
      setReason("");
      setBusy(null);
      try {
        await api.reload();
      } catch {
        // The notice above already explains the outcome; never mask it with a reload failure.
      }
    }
  }

  if (api.loading) {
    return (
      <div className="fpage"><div className="page page-wide"><div className="panel panel-pad">Loading…</div></div></div>
    );
  }
  if (api.error || !detail?.order) {
    return (
      <div className="fpage">
        <div className="page page-wide">
          <Link className="btn btn-ghost btn-sm" to="/staff" style={{ marginBottom: 16 }}>← Back to queue</Link>
          <div className="panel panel-pad" style={{ color: "var(--st-rej)", fontWeight: 600 }}>
            {(api.error as Error)?.message || "Order not found."}
          </div>
        </div>
      </div>
    );
  }

  const order = detail.order;
  const status = order.status;
  const isRejected = status === "REJECTED";

  const previewUrl = selectedDocument ? (token ? documentDownloadUrl(selectedDocument.accessUrl, token) : selectedDocument.accessUrl) : null;
  const previewIsImage = !!selectedDocument?.mimeType?.startsWith("image/");
  const previewIsInline = previewIsImage || selectedDocument?.mimeType === "application/pdf";

  const actions: { status: "PROCESSING" | "READY" | "COMPLETED" | "REJECTED"; label: string; primary?: boolean }[] = [];
  if (status === "RECEIVED") {
    actions.push({ status: "PROCESSING", label: "Start processing", primary: true });
    actions.push({ status: "REJECTED", label: "Reject" });
  } else if (status === "PROCESSING") {
    actions.push({ status: "READY", label: "Mark ready", primary: true });
    actions.push({ status: "REJECTED", label: "Reject" });
  } else if (status === "READY") {
    actions.push({ status: "COMPLETED", label: "Mark completed", primary: true });
  }

  const payableCash = order.paymentStatus !== "PAID" && order.paymentMethod === "CASH";

  return (
    <div className="fpage">
      <div className="page page-wide">
        <Link className="btn btn-ghost btn-sm" to="/staff" style={{ marginBottom: 16 }}>← Back to queue</Link>

        {notice ? (
          <div
            className="panel"
            style={{ marginBottom: 14, padding: "10px 14px", fontSize: 13.5, fontWeight: 600, background: notice.ok ? "var(--st-ready-wash)" : "var(--st-rej-wash)", color: notice.ok ? "var(--st-ready)" : "var(--st-rej)", borderColor: "transparent" }}
          >
            {notice.text}
          </div>
        ) : null}

        <div className="staff-split">
          <div className="docpane">
            <div className="dp-head">
              <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
                {documents.length > 1 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    {documents.map((doc) => (
                      <button
                        key={doc.documentId}
                        type="button"
                        onClick={() => setSelectedDocumentId(doc.documentId)}
                        style={{
                          textAlign: "left",
                          background: "#fff",
                          border: doc.documentId === selectedDocument?.documentId ? "1px solid rgba(17,17,17,.3)" : "1px solid rgba(17,17,17,.16)",
                          borderRadius: 6,
                          padding: "6px 10px",
                          color: "#111",
                          fontWeight: doc.documentId === selectedDocument?.documentId ? 700 : 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                          maxWidth: "100%",
                          boxShadow: doc.documentId === selectedDocument?.documentId ? "0 0 0 1px rgba(17,17,17,.08)" : "none"
                        }}
                      >
                        {doc.fileName}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span>{selectedDocument?.fileName || order.fileName || "Stationery order"}</span>
                )}
                <span className="muted">
                  {documents.length ? (
                    <>
                      {selectedDocument?.pageCount ?? order.pageCount} page{(selectedDocument?.pageCount ?? order.pageCount) === 1 ? "" : "s"}
                      {selectedDocument?.sizeLabel ? " · " + selectedDocument.sizeLabel : ""}
                    </>
                  ) : (
                    "No paper printing selected"
                  )}
                </span>
              </div>
              {documents.length ? null : null}
            </div>
            <div className="dp-scroll">
              {selectedDocument && previewUrl ? (
                previewIsImage ? (
                  <img
                    src={previewUrl}
                    alt={selectedDocument.fileName}
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 6 }}
                  />
                ) : previewIsInline ? (
                  <iframe
                    src={previewUrl}
                    title={selectedDocument.fileName}
                    style={{ width: "100%", height: "100%", border: "none", background: "#fff", borderRadius: 6 }}
                  />
                ) : (
                  <div className="panel panel-pad" style={{ maxWidth: 420, textAlign: "center", alignSelf: "center" }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{selectedDocument.fileName}</div>
                    <p className="muted" style={{ marginBottom: 12 }}>
                      This file type can't be previewed in the browser.
                    </p>
                    <a className="btn btn-primary" href={previewUrl} download={selectedDocument.fileName}>Download to view</a>
                  </div>
                )
              ) : (
                <div className="panel panel-pad" style={{ maxWidth: 420, textAlign: "center" }}>
                  Stationery-only order — no documents to preview.
                </div>
              )}
            </div>
            <div className="dp-foot">
              Preview only
            </div>
          </div>

          <div className="opane">
            <div className="op-tok">
              <div>
                <div className="lbl">TOKEN</div>
                <div className="tok" style={{ fontFamily: "var(--f-mono)", fontWeight: 700, fontSize: 30 }}>
                  {displayToken(order.token)}
                </div>
              </div>
              <DotBadge st={ORDER_STATUS_ST[status]} label={status.charAt(0) + status.slice(1).toLowerCase()} />
            </div>

            <div className="kv"><span className="k">Student</span><span className="v">{detail.student ? detail.student.name + (detail.student.studentId ? " · " + detail.student.studentId : "") : "—"}</span></div>
            <div className="kv"><span className="k">Service</span><span className="v">{SERVICE_LABEL[order.serviceType]}</span></div>
            {documents.length ? (
              <>
                <div className="kv"><span className="k">Pages</span><span className="v">{order.pageCount} ({order.pageRange})</span></div>
                <div className="kv"><span className="k">Copies</span><span className="v">{order.copies}</span></div>
                <div className="kv"><span className="k">Setup</span><span className="v">{order.paperSize} · {order.colorMode === "color" ? "Colour" : "B&W"} · {order.sides === "double" ? "Double-sided" : "Single-sided"}</span></div>
              </>
            ) : null}
            <div className="kv"><span className="k">Placed</span><span className="v">{minutesAgo(order.createdAt)} ago</span></div>
            <div className="kv">
              <span className="k">Payment</span>
              <span className="v">
                <DotBadge st={order.paymentStatus === "PAID" ? "paid" : "unpaid"} label={order.paymentStatus === "PAID" ? "Paid · " + rupees(order.totalPaise) + (order.paymentMethod ? " · " + order.paymentMethod : "") : "Unpaid"} />
              </span>
            </div>
            {order.items.length ? (
              <div className="kv"><span className="k">Stationery</span><span className="v">{order.items.map((i) => i.name + " ×" + i.qty).join(", ")}</span></div>
            ) : null}
            {isRejected && order.rejectionReason ? (
              <div className="kv"><span className="k">Reason</span><span className="v" style={{ color: "var(--st-rej)" }}>{order.rejectionReason}</span></div>
            ) : null}
            <div className="kv total"><span className="k">Amount</span><span className="v mono">{rupees(order.totalPaise, { decimals: true })}</span></div>

            <div className="op-actions">
              {actions.map((a) => (
                <button
                  key={a.status}
                  type="button"
                  className={"btn " + (a.primary ? "btn-primary" : "btn-danger") + " btn-block"}
                  disabled={Boolean(busy)}
                  onClick={() => (a.status === "REJECTED" ? setShowReject(true) : void act(a.status))}
                >
                  {busy === a.status ? "Working…" : a.label}
                </button>
              ))}
              {payableCash ? (
                <button
                  className="btn btn-secondary btn-block"
                  disabled={Boolean(busy)}
                  onClick={() => act("COMPLETED")}
                >
                  Cash received at counter
                </button>
              ) : null}
            </div>

            {showReject ? (
              <div className="modal-scrim open" style={{ display: "flex" }}>
                <div className="modal" role="dialog" aria-modal="true">
                  <div className="m-head">
                    <h3>Reject order {displayToken(order.token)}</h3>
                    <button type="button" className="iconbtn" aria-label="Close" onClick={() => { setShowReject(false); setPreset(""); setReason(""); }}>×</button>
                  </div>
                  <p className="m-sub">The student is notified and refunded automatically. Tell them what went wrong.</p>
                  <div className="reason-chips">
                    {REJECT_REASONS.map((r) => (
                      <button key={r} type="button" className={"chipf" + (preset === r ? " on" : "")} onClick={() => setPreset(preset === r ? "" : r)}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="reason"
                    placeholder="Add a note for the student (optional)…"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  ></textarea>
                  <div className="m-foot">
                    <button type="button" className="btn btn-ghost" onClick={() => { setShowReject(false); setPreset(""); setReason(""); }}>Cancel</button>
                    <button type="button" className="btn btn-danger" disabled={Boolean(busy)} onClick={() => void act("REJECTED")}>Reject &amp; refund</button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}