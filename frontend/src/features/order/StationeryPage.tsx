import { useNavigate } from "react-router-dom";
import { Flowbar } from "../../components/ui/Flowbar";
import { useOrderFlow } from "./OrderFlowContext";
import { StationeryCatalog } from "./StationeryCatalog";

export function StationeryPage() {
  const navigate = useNavigate();
  const { documents, cartCount } = useOrderFlow();

  return (
    <div className="spage">
      <div className="page">
        <Flowbar step={2} />
        <div className="page-title">Stationery</div>
        <p className="page-sub">Add essentials to go with your print job. Quantities are reserved when you pay.</p>

        <div style={{ marginTop: 22 }}><StationeryCatalog /></div>

        <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button className="btn btn-secondary" onClick={() => navigate(documents.length ? "/student/order/configure" : "/student/order")}>
            {documents.length ? "Back to printing" : "Back to upload"}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/student/order/review")}
          >
            {cartCount > 0 ? `Done · review order (${cartCount})` : "Done · review order"}
          </button>
        </div>
      </div>
    </div>
  );
}