import { EmptyState } from "../../components/ui/Badges";
import { useNavigate } from "react-router-dom";

/** Phase placeholder — the full upload → configure → review → pay flow lands in Phase 2. */
export function PlaceholderPage({ title, sub }: { title: string; sub: string }) {
  const navigate = useNavigate();
  return (
    <div className="spage">
      <div className="page page-narrow">
        <div className="page-title">{title}</div>
        <p className="page-sub" style={{ marginBottom: 20 }}>{sub}</p>
        <EmptyState
          title={title}
          body="This part of the app ships in the next phase."
          action={<button className="btn btn-secondary" onClick={() => navigate("/student")}>Back to dashboard</button>}
        />
      </div>
    </div>
  );
}