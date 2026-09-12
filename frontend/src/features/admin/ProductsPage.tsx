import { useEffect, useState } from "react";
import { DotBadge } from "../../components/ui/Badges";
import { useAuth } from "../auth/AuthContext";
import { useApi } from "../../hooks/useApi";
import {
  createProduct,
  deleteProduct,
  getAdminProducts,
  updateProduct,
  type ProductInput,
} from "../../services/api/admin";
import { ApiClientError } from "../../services/api/client";
import { rupees } from "../../utils/format";
import type { Product } from "../../types";

interface EditorState {
  product?: Product;
  name: string;
  description: string;
  price: string;
  stock: string;
  minStock: string;
  reserved: number;
  active: boolean;
}

function emptyEditor(): EditorState {
  return { name: "", description: "", price: "", stock: "0", minStock: "0", reserved: 0, active: true };
}

function editorFrom(p: Product): EditorState {
  return {
    product: p,
    name: p.name,
    description: p.description || "",
    price: (p.pricePaise / 100).toString(),
    stock: String(p.stock),
    minStock: String(p.minStock ?? 0),
    reserved: p.reserved ?? 0,
    active: p.active ?? true,
  };
}

export function ProductsPage() {
  const { token } = useAuth();
  const api = useApi(() => getAdminProducts(token ?? ""));
  const [editing, setEditing] = useState<EditorState | null>(null);
  const [editingPrice, setEditingPrice] = useState<{ id: string; value: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const products = api.data ?? [];

  useEffect(() => {
    if (!editing) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setEditing(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [editing]);

  function toInput(e: EditorState): ProductInput {
    return {
      name: e.name.trim(),
      description: e.description.trim(),
      pricePaise: Math.round(Number(e.price) * 100),
      stock: Number(e.stock),
      minStock: Number(e.minStock),
      active: e.active,
    };
  }

  async function save() {
    if (!token || !editing) return;
    const input = toInput(editing);
    if (
      !input.name ||
      !Number.isFinite(input.pricePaise) || input.pricePaise < 0 ||
      !Number.isInteger(input.stock) || input.stock < 0 ||
      !Number.isInteger(input.minStock ?? 0) || (input.minStock ?? 0) < 0
    ) {
      setNotice({ ok: false, text: "Enter a name, valid price, available stock, and minimum quantity." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      if (editing.product) {
        await updateProduct(token, editing.product.productId, input);
        setNotice({ ok: true, text: `${input.name} updated.` });
      } else {
        await createProduct(token, input);
        setNotice({ ok: true, text: `${input.name} added to the catalogue.` });
      }
      setEditing(null);
      api.reload();
    } catch (err) {
      setNotice({ ok: false, text: err instanceof ApiClientError ? err.message : "Could not save product." });
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(p: Product) {
    if (!token) return;
    setBusy(true);
    setNotice(null);
    try {
      await updateProduct(token, p.productId, { active: !(p.active ?? true) });
      setNotice({ ok: true, text: `${p.name} ${p.active ? "deactivated" : "reactivated"}.` });
      api.reload();
    } catch (err) {
      setNotice({ ok: false, text: err instanceof ApiClientError ? err.message : "Could not update product." });
    } finally {
      setBusy(false);
    }
  }

  async function savePrice(p: Product) {
    if (!token || !editingPrice) return;
    const pricePaise = Math.round(Number(editingPrice.value) * 100);
    if (!Number.isFinite(pricePaise) || pricePaise < 0) {
      setNotice({ ok: false, text: "Enter a valid price." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await updateProduct(token, p.productId, { pricePaise });
      setEditingPrice(null);
      setNotice({ ok: true, text: `${p.name} price updated.` });
      api.reload();
    } catch (err) {
      setNotice({ ok: false, text: err instanceof ApiClientError ? err.message : "Could not update price." });
    } finally {
      setBusy(false);
    }
  }

  async function removeProduct(p: Product) {
    if (!token || !window.confirm(`Delete ${p.name} from the catalogue?`)) return;
    setBusy(true);
    setNotice(null);
    try {
      await deleteProduct(token, p.productId);
      setNotice({ ok: true, text: `${p.name} was deleted.` });
      api.reload();
    } catch (err) {
      setNotice({ ok: false, text: err instanceof ApiClientError ? err.message : "Could not delete product." });
    } finally {
      setBusy(false);
    }
  }

  const low = products.filter((p) => p.active && (p.low ?? p.stock <= (p.minStock ?? 0))).length;

  return (
    <div className="apage">
      <div className="page page-wide">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="page-title">Products</div>
            <p className="page-sub">
              {products.length} item{products.length === 1 ? "" : "s"} · {low} below reorder point
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setEditing(emptyEditor())}
          >
            + New product
          </button>
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
          <table className="pricetable" style={{ marginTop: 22 }}>
            <thead>
              <tr>
                <th>Item</th><th className="r">Price</th><th className="r">Available</th>
                <th className="r">Reserved</th><th className="r">Min</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.productId} style={p.active ? undefined : { opacity: 0.55 }}>
                  <td>
                    <b>{p.name}</b>
                    {p.description ? <div className="det">{p.description}</div> : null}
                  </td>
                  <td className="r mono">
                    {editingPrice?.id === p.productId ? (
                      <input
                        className="input"
                        style={{ width: 100, display: "inline-block", textAlign: "right" }}
                        inputMode="decimal"
                        value={editingPrice.value}
                        autoFocus
                        onChange={(e) => setEditingPrice({ id: p.productId, value: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void savePrice(p);
                          if (e.key === "Escape") setEditingPrice(null);
                        }}
                        aria-label={`Price for ${p.name}`}
                      />
                    ) : rupees(p.pricePaise)}
                  </td>
                  <td className="r mono">{p.stock}</td>
                  <td className="r muted">{p.reserved ?? 0}</td>
                  <td className="r muted">{p.minStock ?? 0}</td>
                  <td>
                    {!p.active ? (
                      <DotBadge st="rejected" label="Inactive" />
                    ) : p.low || p.stock <= (p.minStock ?? 0) ? (
                      <DotBadge st="rejected" label="Low" />
                    ) : (
                      <DotBadge st="paid" label="OK" />
                    )}
                  </td>
                  <td>
                    {editingPrice?.id === p.productId ? (
                      <>
                        <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => void savePrice(p)}>Save</button>
                        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setEditingPrice(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setEditingPrice({ id: p.productId, value: (p.pricePaise / 100).toString() })}>Edit price</button>
                        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setEditing(editorFrom(p))}>Edit product</button>
                      </>
                    )}
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={busy}
                      onClick={() => toggleActive(p)}
                    >
                      {p.active ? "Deactivate" : "Activate"}
                    </button>
                    <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void removeProduct(p)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {editing ? (
          <div
            className="modal-scrim product-editor-scrim open"
            onMouseDown={(e) => { if (e.target === e.currentTarget) setEditing(null); }}
          >
            <div className="modal product-editor" role="dialog" aria-modal="true" aria-labelledby="product-editor-title">
              <div className="m-head">
                <h3 id="product-editor-title">{editing.product ? "Edit product" : "New product"}</h3>
                <button className="iconbtn" aria-label="Close" onClick={() => setEditing(null)}>×</button>
              </div>

              <div style={{ padding: "8px 22px 4px" }}>
                <div className="field">
                  <label className="label" htmlFor="p-name">Name</label>
                  <input id="p-name" className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div className="field">
                  <label className="label" htmlFor="p-desc">Description</label>
                  <input id="p-desc" className="input" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="e.g. Ball point · 0.7mm" />
                </div>
                <div className="product-editor-grid">
                  <div className="field">
                    <label className="label" htmlFor="p-price">Price (₹)</label>
                    <input id="p-price" className="input" inputMode="decimal" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="p-stock">Stock</label>
                    <input id="p-stock" className="input" inputMode="numeric" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: e.target.value.replace(/[^0-9]/g, "") })} />
                    <div className="hint">Available quantity</div>
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="p-min">Reorder at</label>
                    <input id="p-min" className="input" inputMode="numeric" value={editing.minStock} onChange={(e) => setEditing({ ...editing, minStock: e.target.value.replace(/[^0-9]/g, "") })} />
                    <div className="hint">Minimum quantity</div>
                  </div>
                  <div className="field">
                    <label className="label" htmlFor="p-reserved">Reserved</label>
                    <input id="p-reserved" className="input" value={editing.reserved} readOnly aria-describedby="p-reserved-hint" />
                    <div className="hint" id="p-reserved-hint">From active orders</div>
                  </div>
                </div>
                <div className="field" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <label className="label" style={{ margin: 0 }}>Active in catalogue</label>
                  <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                </div>
              </div>

              <div className="m-foot">
                <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                <button className="btn btn-primary" disabled={busy} onClick={save}>
                  {busy ? "Saving…" : editing.product ? "Save changes" : "Add product"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}