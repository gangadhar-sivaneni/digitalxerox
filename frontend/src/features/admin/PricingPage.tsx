import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useApi } from "../../hooks/useApi";
import { getPricing, getAdminProducts, updatePriceRule } from "../../services/api/admin";
import { ApiClientError } from "../../services/api/client";
import { rupees } from "../../utils/format";

export function PricingPage() {
  const { token } = useAuth();
  const pricingApi = useApi(() => getPricing(token ?? ""));
  const productsApi = useApi(() => getAdminProducts(token ?? ""));
  const [editingRule, setEditingRule] = useState<{ id: string; value: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const rules = pricingApi.data?.rules ?? [];
  const products = productsApi.data ?? [];

  async function savePrice(id: string, value: string) {
    if (!token) return;
    const rate = Number(value);
    if (!Number.isFinite(rate) || rate <= 0) {
      setNotice("Enter a rate greater than zero.");
      return;
    }
    try {
      await updatePriceRule(token, id, Math.round(rate * 100));
      setEditingRule(null);
      setNotice(null);
      pricingApi.reload();
    } catch (err) {
      setNotice(err instanceof ApiClientError ? err.message : "Could not update rate.");
    }
  }

  return (
    <div className="apage">
      <div className="page page-narrow">
        <div className="page-title">Pricing</div>
        <p className="page-sub" style={{ marginBottom: 22 }}>
          Rates apply instantly to new orders. Existing orders always keep the price
          they were quoted. We price per printed page — double-sided is included at no extra charge.
        </p>
        {notice ? <div className="panel panel-pad" style={{ color: "var(--st-rej)", fontWeight: 600, marginBottom: 16 }}>{notice}</div> : null}

        {pricingApi.error ? (
          <div className="panel panel-pad" style={{ color: "var(--st-rej)", fontWeight: 600 }}>
            {(pricingApi.error as Error).message}
          </div>
        ) : (
          <table className="pricetable">
            <thead><tr><th>Paper &amp; colour</th><th className="r">Rate / page</th><th></th></tr></thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td>{r.paper} · {r.colorMode === "bw" ? "Black &amp; White" : "Colour"}</td>
                  <td className="r mono">
                    {editingRule?.id === r.id ? (
                      <input
                        className="input"
                        style={{ width: 110, display: "inline-block", textAlign: "right" }}
                        inputMode="decimal"
                        value={editingRule.value}
                        autoFocus
                        onChange={(e) => setEditingRule({ id: r.id, value: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void savePrice(r.id, editingRule.value);
                          if (e.key === "Escape") setEditingRule(null);
                        }}
                        aria-label={`Rate for ${r.paper} ${r.colorMode}`}
                      />
                    ) : rupees(r.ratePaise, { decimals: true })}
                  </td>
                  <td className="r">
                    {editingRule?.id === r.id ? (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={() => void savePrice(r.id, editingRule.value)}>Save</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingRule(null)}>Cancel</button>
                      </>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingRule({ id: r.id, value: (r.ratePaise / 100).toString() })}>Edit</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="label" style={{ margin: "26px 0 10px" }}>Stationery</div>
        {productsApi.error ? (
          <div className="panel panel-pad" style={{ color: "var(--st-rej)", fontWeight: 600 }}>
            {(productsApi.error as Error).message}
          </div>
        ) : (
          <table className="pricetable">
            <thead><tr><th>Item</th><th className="r">Price</th><th className="r">Stock</th><th></th></tr></thead>
            <tbody>
              {products.filter((p) => p.active).map((p) => (
                <tr key={p.productId}>
                  <td>{p.name}</td>
                  <td className="r mono">{rupees(p.pricePaise)}</td>
                  <td className="r muted">{p.stock}</td>
                  <td className="r"><Link className="btn btn-ghost btn-sm" to="/admin/products">Manage</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="hint" style={{ marginTop: 14 }}>
          Add, price and restock stationery on the products page.
        </p>
      </div>
    </div>
  );
}