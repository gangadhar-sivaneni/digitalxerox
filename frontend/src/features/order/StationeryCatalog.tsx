import { listProducts } from "../../services/api/products";
import { useApi } from "../../hooks/useApi";
import { rupees } from "../../utils/format";
import { useOrderFlow } from "./OrderFlowContext";

/** Reusable stationery picker — qty steppers bound to the shared order cart. */
export function StationeryCatalog() {
  const { cart, setCartItem } = useOrderFlow();
  const { data: products, loading, error } = useApi(() => listProducts());

  const qtyOf = (id: string) => cart.find((c) => c.productId === id)?.qty ?? 0;

  if (loading) return <div className="panel panel-pad" style={{ marginTop: 22 }}>Loading catalogue…</div>;
  if (error) return <div className="panel panel-pad" style={{ marginTop: 22, color: "var(--st-rej)", fontWeight: 600 }}>{(error as Error).message}</div>;
  if (!products?.length) return <div className="panel panel-pad" style={{ marginTop: 22 }}>No stationery listed yet.</div>;

  return (
    <div className="cat">
      {products.map((p, i) => {
        const qty = qtyOf(p.productId);
        const stock = p.stock;
        const maxed = qty >= stock;
        return (
          <div className="cat-row" key={p.productId}>
            <span className="idx">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h4>{p.name}</h4>
              <small>{p.description}</small>
              {maxed ? <span className="stock-note">Only {stock} in stock</span> : null}
            </div>
            <span className="cp">{rupees(p.pricePaise)}</span>
            <div className="qty">
              <button type="button" aria-label="Remove one" disabled={qty === 0} onClick={() => setCartItem(p.productId, qty - 1)}>
                −
              </button>
              <span className="qv">{qty}</span>
              <button type="button" aria-label="Add one" disabled={maxed} onClick={() => setCartItem(p.productId, qty + 1)}>
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}