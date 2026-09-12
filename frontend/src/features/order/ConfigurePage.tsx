import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flowbar } from "../../components/ui/Flowbar";
import { Seg } from "../../components/ui/Seg";
import { useOrderFlow } from "./OrderFlowContext";
import { useQuote } from "./useQuote";
import { parsePageRange } from "../../utils/pages";
import { rupees } from "../../utils/format";

export function ConfigurePage() {
  const navigate = useNavigate();
  const { document, documents, documentConfigs, config, setDocumentConfig, cart, quote } = useOrderFlow();
  const [activeDocumentId, setActiveDocumentId] = useState(document?.documentId || documents[0]?.documentId || "");
  const { loading, error } = useQuote();

  const activeDocument = documents.find((item) => item.documentId === activeDocumentId) || documents[0] || document;
  const activeConfig = (activeDocument && documentConfigs[activeDocument.documentId]) || config;
  const updateConfig = (patch: Partial<typeof activeConfig>) => {
    if (activeDocument) setDocumentConfig(activeDocument.documentId, patch);
  };
  const totalPages = activeDocument?.pageCount ?? activeConfig.manualPages ?? 0;
  const range =
    activeConfig.pagesMode === "custom" ? parsePageRange(activeConfig.customRange, totalPages) : null;
  const rangeInvalid = activeConfig.pagesMode === "custom" && range && !range.ok;
  const selectedPages = activeConfig.pagesMode === "all" ? totalPages : range?.ok ? range.pageCount : 0;

  const canSubmit = !!document && !rangeInvalid && selectedPages > 0 && !loading;

  const stationeryCount = cart.reduce((s, i) => s + i.qty, 0);
  const setupLabel = `${activeConfig.paperSize} · ${
    activeConfig.colorMode === "bw" ? "B&W" : "Colour"
  } · ${activeConfig.sides === "double" ? "Double-sided" : "Single-sided"}`;

  const rate = quote ? rupees(quote.ratePaise) : "";
  const rateText = rate ? `${rate}/pg` : "—";
  const uploadedFileNames = documents.length ? documents.map((item) => item.fileName) : [document?.fileName || "Stationery"];

  return (
    <div className="spage">
      <div className="page">
        <Flowbar step={2} />
        <div className="page-title">Configure your job</div>
        <p className="page-sub">Pick the print spec. The estimate updates live — the counter sets the final price.</p>

        {documents.length > 1 ? (
          <div className="document-tabs" role="tablist" aria-label="Documents to configure">
            {documents.map((item, index) => (
              <button key={item.documentId} className={item.documentId === activeDocument?.documentId ? "on" : ""} onClick={() => setActiveDocumentId(item.documentId)} role="tab" aria-selected={item.documentId === activeDocument?.documentId}>
                {index + 1}. {item.fileName}
              </button>
            ))}
          </div>
        ) : null}

        <div className="split" style={{ marginTop: 26 }}>
          <div>
            <div className="field">
              <span className="label">Pages to print</span>
              <Seg
                name="pagesMode"
                value={activeConfig.pagesMode}
                onChange={(v) => updateConfig({ pagesMode: v })}
                options={[
                  { value: "all" as const, title: "All pages", sub: `${totalPages} page${totalPages === 1 ? "" : "s"}` },
                  { value: "custom" as const, title: "Custom range", sub: "Pick specific pages" },
                ]}
              />
              {activeConfig.pagesMode === "custom" ? (
                <div style={{ marginTop: 10 }}>
                  <input
                    className="input"
                    placeholder="e.g. 1-5, 8, 10-15"
                    value={activeConfig.customRange}
                    onChange={(e) => updateConfig({ customRange: e.target.value })}
                    aria-label="Custom page range"
                  />
                  <div className="hint" style={rangeInvalid ? { color: "var(--st-rej)" } : undefined}>
                    {rangeInvalid
                      ? range.ok === false && range.message
                      : range?.ok
                        ? `Printing ${range.pageCount} of ${totalPages} pages.`
                        : "Pages you want, e.g. 1-5, 8, 10-15."}
                  </div>
                </div>
              ) : null}
            </div>

            {document && document.pageCount == null ? (
              <div className="field">
                <span className="label">Pages in this document</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={activeConfig.manualPages ?? ""}
                  placeholder="Number of pages"
                  onChange={(e) =>
                    updateConfig({ manualPages: e.target.value ? Math.max(1, Number(e.target.value)) : null })
                  }
                />
                <div className="hint">DOCX page counts are estimated — enter the real number of pages.</div>
              </div>
            ) : null}

            <div className="field">
              <span className="label">Copies</span>
              <div className="stepper">
                <button
                  type="button"
                  aria-label="Fewer copies"
                  onClick={() => updateConfig({ copies: Math.max(1, activeConfig.copies - 1) })}
                >
                  −
                </button>
                <span className="val">{activeConfig.copies}</span>
                <button
                  type="button"
                  aria-label="More copies"
                  onClick={() => updateConfig({ copies: Math.min(99, activeConfig.copies + 1) })}
                >
                  +
                </button>
              </div>
            </div>

            <div className="field">
              <span className="label">Paper size</span>
              <Seg
                name="paper"
                value={activeConfig.paperSize}
                onChange={(v) => updateConfig({ paperSize: v })}
                options={[
                  { value: "A4" as const, title: "A4", sub: "Standard" },
                  { value: "A3" as const, title: "A3", sub: "Large" },
                ]}
              />
            </div>

            <div className="grid-2" style={{ marginTop: 2 }}>
              <div className="field">
                <span className="label">Colour</span>
                <Seg
                  name="color"
                  value={activeConfig.colorMode}
                  onChange={(v) => updateConfig({ colorMode: v })}
                  options={[
                    { value: "bw" as const, title: "B&W" },
                    { value: "color" as const, title: "Colour" },
                  ]}
                />
              </div>
              <div className="field">
                <span className="label">Sides</span>
                <Seg
                  name="sides"
                  value={activeConfig.sides}
                  onChange={(v) => updateConfig({ sides: v })}
                  options={[
                    { value: "single" as const, title: "Single" },
                    { value: "double" as const, title: "Double" },
                  ]}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
              <button
                className="btn btn-primary"
                disabled={!canSubmit}
                onClick={() => navigate("/student/order/review")}
              >
                Review order
                <svg className="ico arr" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>

            {error ? (
              <div
                className="panel panel-pad"
                style={{ marginTop: 18, color: "var(--st-rej)", fontWeight: 600, fontSize: 14 }}
              >
                {error}
              </div>
            ) : null}
          </div>

          <div className="sticky-side">
            <div className="receipt scallop">
              <div className="rc-top">
                <div className="bt">ESTIMATE</div>
                <div className="tt">{uploadedFileNames.length > 1 ? `${uploadedFileNames.length} files` : uploadedFileNames[0]}</div>
              </div>
              <div className="rc-body">
                <div className="rc-line">
                  <span className="k">Document</span>
                  <span className="v">
                    {config.serviceType === "STATIONERY"
                      ? "Stationery only"
                      : uploadedFileNames.length > 1
                        ? uploadedFileNames.join(", ")
                        : `${selectedPages}${totalPages ? ` of ${totalPages}` : ""}`}
                  </span>
                </div>
                {config.serviceType !== "STATIONERY" ? (
                  <>
                    <div className="rc-line">
                      <span className="k">Copies</span>
                        <span className="v">×{activeConfig.copies}</span>
                    </div>
                    <div className="rc-line">
                      <span className="k">Setup</span>
                      <span className="v">{setupLabel}</span>
                    </div>
                  </>
                ) : null}
                <div className="rc-sep"></div>
                {config.serviceType !== "STATIONERY" ? (
                  <div className="rc-line mono">
                    <span className="k">Printing rate</span>
                    <span className="v">{rateText}</span>
                  </div>
                ) : null}
                {config.serviceType !== "STATIONERY" ? (
                  <div className="rc-line mono">
                    <span className="k">Printing</span>
                    <span className="v">{quote ? rupees(quote.printingPaise) : "—"}</span>
                  </div>
                ) : null}
                {stationeryCount > 0 ? (
                  <div className="rc-line mono">
                    <span className="k">Stationery ({stationeryCount})</span>
                    <span className="v">{quote ? rupees(quote.stationeryPaise) : "—"}</span>
                  </div>
                ) : null}
                {quote && quote.serviceFeePaise > 0 ? (
                  <div className="rc-line mono">
                    <span className="k">Service fee</span>
                    <span className="v">{rupees(quote.serviceFeePaise)}</span>
                  </div>
                ) : null}
                <div className="rc-sep"></div>
                <div className="rc-total">
                  <span className="k">Total</span>
                  <span className="v">{quote ? rupees(quote.totalPaise) : "—"}</span>
                </div>
                <div className="hint" style={{ marginTop: 10 }}>
                  Final price is set at the counter when you collect.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}