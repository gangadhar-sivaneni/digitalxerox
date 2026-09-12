import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flowbar } from "../../components/ui/Flowbar";
import { Seg } from "../../components/ui/Seg";
import { UploadIcon } from "../../components/ui/Icons";
import { useAuth } from "../auth/AuthContext";
import { useOrderFlow } from "../order/OrderFlowContext";
import { uploadDocument } from "../../services/api/documents";
import { StationeryCatalog } from "./StationeryCatalog";

const ALLOWED = ["pdf", "doc", "docx", "jpg", "jpeg", "png"];
const MAX_MB = 25;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extOf(name: string): string {
  return (name.split(".").pop() || "").toLowerCase();
}

type UpperTab = "docs" | "stationery";

export function UploadPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { documents, setDocuments, cartCount } = useOrderFlow();
  const [tab, setTab] = useState<UpperTab>("docs");
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  const hasDocuments = documents.length > 0;

  async function handleFiles(fileList: FileList | File[] | undefined | null) {
    if (!fileList || !token) return;
    const files = Array.from(fileList);
    if (!files.length) return;
    setError(null);
    setBusy(true);
    setProgress(0);
    try {
      const uploaded = [...documents];
      for (const [index, file] of files.entries()) {
        const ext = extOf(file.name);
        if (!ALLOWED.includes(ext)) throw new Error(`"${ext}" isn't supported. Upload PDF, DOC, DOCX, JPG or PNG.`);
        if (file.size <= 0) throw new Error(`"${file.name}" is empty.`);
        if (file.size > MAX_MB * 1024 * 1024) throw new Error(`"${file.name}" is too large. Maximum is ${MAX_MB} MB.`);
        const meta = await uploadDocument(file, token, (value) => setProgress(Math.round((index * 100 + value) / files.length)));
        uploaded.push({
          documentId: meta.documentId,
          fileName: meta.fileName,
          sizeBytes: meta.sizeBytes,
          sizeLabel: formatBytes(meta.sizeBytes),
          pageCount: meta.pageCount,
          exactPageCount: meta.pageCount != null,
        });
      }
      setDocuments(uploaded);
    } catch (e) {
      setError((e as Error).message || "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="spage">
      <div className="page page-narrow">
        <Flowbar step={1} />
        <div className="page-title">Upload your document</div>
        <p className="page-sub">
          Printing, stationery or both — add the files and items you need. Everything you pick is kept as you go.
        </p>

        <div style={{ marginTop: 22 }}>
          <Seg
            name="order-lane"
            value={tab}
            onChange={setTab}
            options={[
              {
                value: "docs" as const,
                title: "Upload documents",
                sub: documents.length ? `${documents.length} file${documents.length === 1 ? "" : "s"} selected` : "PDF · DOCX · images",
              },
              {
                value: "stationery" as const,
                title: "Stationery",
                sub: cartCount ? `${cartCount} item${cartCount === 1 ? "" : "s"} in cart` : "Notebooks · pens · folders",
              },
            ]}
          />
        </div>

        {tab === "docs" ? (
          !hasDocuments ? (
            <div style={{ marginTop: 24 }}>
              <div
                className={"drop" + (drag ? " drag" : "")}
                role="button"
                tabIndex={0}
                aria-label="Upload documents"
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  void handleFiles(e.dataTransfer.files);
                }}
              >
                <div className="di">{UploadIcon}</div>
                <h3>Drop your documents here</h3>
                <p>or click to browse multiple files from your device</p>
                <div className="fmts">PDF · DOCX · JPG · PNG · MAX {MAX_MB}MB</div>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 24 }}>
              <div className="upload-list">
                {documents.map((item) => (
                  <div className="filerow" key={item.documentId}>
                    <div className="fi"></div>
                    <div className="meta">
                      <b>{item.fileName}</b>
                      <small>{item.pageCount != null ? `${item.pageCount} page${item.pageCount === 1 ? "" : "s"} · ${item.sizeLabel}` : `${item.sizeLabel} · confirm total pages next`}</small>
                    </div>
                    <button className="iconbtn" aria-label={`Remove ${item.fileName}`} onClick={() => setDocuments(documents.filter((doc) => doc.documentId !== item.documentId))}>×</button>
                  </div>
                ))}
              </div>
              <div className="hint" style={{ marginTop: 10 }}>{documents.length} document{documents.length === 1 ? "" : "s"} selected</div>
              <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
                <button className="btn btn-secondary" onClick={() => inputRef.current?.click()}>Add documents</button>
              </div>
            </div>
          )
        ) : (
          <div style={{ marginTop: 24 }}>
            <StationeryCatalog />
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          style={{ display: "none" }}
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {busy ? (
          <div style={{ marginTop: 18 }}>
            <div className="filerow">
              <div className="fi"></div>
              <div className="meta">
                <b>{documents[documents.length - 1]?.fileName || "Uploading…"}</b>
                <small>{progress < 100 ? "Uploading…" : "Reading pages…"}</small>
                <div className="prog"><i style={{ width: `${Math.max(6, progress)}%` }}></i></div>
              </div>
              <span className="badge" data-st="processing" style={{ alignSelf: "flex-start" }}>
                <span className="dot"></span>{progress < 100 ? "Uploading" : "Reading…"}
              </span>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="panel panel-pad" style={{ marginTop: 18, color: "var(--st-rej)", fontWeight: 600, fontSize: 14 }}>
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
          <button
            className="btn btn-primary"
            disabled={!hasDocuments && cartCount === 0}
            onClick={() => navigate(hasDocuments ? "/student/order/configure" : "/student/order/review")}
          >
            {hasDocuments ? "Continue to configure" : "Continue to review"}
            <svg className="ico arr" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}