import { useNavigate } from "react-router-dom";
import { Flowbar } from "../../components/ui/Flowbar";
import { useOrderFlow } from "./OrderFlowContext";
import { useQuote } from "./useQuote";
import { rupees } from "../../utils/format";

export function ReviewPage() {
  const navigate = useNavigate();
  const { document, documents, config, cart, quote, totalDocumentPages } = useOrderFlow();
  const { loading, error } = useQuote();
  const uploadedFileNames = documents.length ? documents.map((item) => item.fileName) : [document?.fileName || "Stationery"];

  const stationeryCount = cart.reduce((s, i) => s + i.qty, 0);
  const setupLabel = `${config.paperSize} · ${
    config.colorMode === "bw" ? "B&W" : "Colour"
  } · ${config.sides === "double" ? "Double-sided" : "Single-sided"}`;

  return (
    <div className="spage">
      <div className="page">
        <Flowbar step={3} />
        <div className="page-title">Review your order</div>
        <p className="page-sub">We re-check the price right before payment, so the total is exactly what the counter will charge.</p>

        <div style={{ maxWidth: 460, margin: "26px auto 0" }}>
          <div className="receipt scallop">
            <div className="rc-top">
              <div className="bt">Digital Xerox · REVIEW</div>
              <div className="tt">{uploadedFileNames.length > 1 ? `${uploadedFileNames.length} files` : uploadedFileNames[0]}</div>
            </div>
            <div className="rc-body">
              <div className="rc-line">
                <span className="k">Service</span>
                <span className="v">
                  {config.serviceType === "PRINTING"
                    ? "Printing"
                    : config.serviceType === "XEROX"
                      ? "Xerox"
                      : "Stationery"}
                </span>
              </div>
              {config.serviceType !== "STATIONERY" ? (
                <>
                  <div className="rc-line">
                    <span className="k">Pages</span>
                    <span className="v">
                      {config.pagesMode === "all"
                        ? "All · " + totalDocumentPages
                        : `${config.customRange} · ${totalDocumentPages} total`}
                    </span>
                  </div>
                  <div className="rc-line">
                    <span className="k">Copies</span>
                    <span className="v">×{config.copies}</span>
                  </div>
                  <div className="rc-line">
                    <span className="k">Setup</span>
                    <span className="v">{setupLabel}</span>
                  </div>
                </>
              ) : null}
              <div className="rc-sep"></div>

              {loading && !quote ? (
                <div className="rc-line">
                  <span className="k">Checking price…</span>
                  <span className="v">—</span>
                </div>
              ) : quote ? (
                <>
                  {config.serviceType !== "STATIONERY" ? (
                    <div className="rc-line mono">
                      <span className="k">Printing</span>
                      <span className="v">{rupees(quote.printingPaise)}</span>
                    </div>
                  ) : null}
                  {stationeryCount > 0 ? (
                    <div className="rc-line mono">
                      <span className="k">Stationery</span>
                      <span className="v">{rupees(quote.stationeryPaise)}</span>
                    </div>
                  ) : null}
                  {quote.serviceFeePaise > 0 ? (
                    <div className="rc-line mono">
                      <span className="k">Service fee</span>
                      <span className="v">{rupees(quote.serviceFeePaise)}</span>
                    </div>
                  ) : null}
                  <div className="rc-sep"></div>
                  <div className="rc-total">
                    <span className="k">Total</span>
                    <span className="v">{rupees(quote.totalPaise)}</span>
                  </div>
                </>
              ) : (
                <div className="rc-line">
                  <span className="k"></span>
                  <span className="v" style={{ color: "var(--st-rej)" }}>
                    Couldn't fetch price
                  </span>
                </div>
              )}
            </div>
            <div className="rc-foot">
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => navigate(documents.length ? "/student/order/configure" : "/student/order")}>
                  Edit
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={!quote || loading || !!error}
                  onClick={() => navigate("/student/order/pay")}
                >
                  Continue to payment
                </button>
              </div>
            </div>
          </div>

          <div className="hint" style={{ textAlign: "center", marginTop: 18 }}>
            This choice is final. After payment the job enters the queue and can't be cancelled.
          </div>

          {error ? (
            <div
              className="panel panel-pad"
              style={{ marginTop: 16, color: "var(--st-rej)", fontWeight: 600, fontSize: 14 }}
            >
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

