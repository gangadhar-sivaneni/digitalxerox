import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ArrowIcon } from "../../components/ui/Icons";
import { useLive } from "../../hooks/useLive";
import { getPublicPricing } from "../../services/api/pricing";
import { listProducts } from "../../services/api/products";
import { getLiveQueue } from "../../services/api/queue";
import { rupees } from "../../utils/format";

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function LandingPage() {
  const navigate = useNavigate();
  const { authenticated } = useAuth();
  const pricingApi = useLive(getPublicPricing, { intervalMs: 30_000 });
  const productsApi = useLive(listProducts, { intervalMs: 30_000 });
  const queueApi = useLive(getLiveQueue, { intervalMs: 8_000 });
  const rules = pricingApi.data?.rules ?? [];
  const a4Bw = rules.find((r) => r.paper === "A4" && r.colorMode === "bw")?.ratePaise;
  const stationeryStart = productsApi.data?.length
    ? Math.min(...productsApi.data.map((product) => product.pricePaise))
    : undefined;
  const liveQueue = queueApi.data;
  const hasLiveQueue = (liveQueue?.activeCount ?? 0) > 0;

  const startOrder = () => {
    if (authenticated) navigate("/student/order");
    else navigate("/login?next=" + encodeURIComponent("/student/order"));
  };
  const trackOrder = () => navigate("/login?next=" + encodeURIComponent("/student/track"));
  const login = () => navigate("/login");

  return (
    <main id="view-landing">
      <header className="head" id="pub-head">
        <div className="head-in">
          <div className="brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="mark">XR</div>
            <div className="wm">
              <b>Digital</b> <span>Xerox</span>
            </div>
          </div>
          <nav className="nav">
            <a style={{ cursor: "pointer" }} onClick={() => scrollTo("how")}>How it works</a>
            <a style={{ cursor: "pointer" }} onClick={() => scrollTo("services")}>Services</a>
          </nav>
          <div className="head-cta">
            <button className="btn btn-primary" onClick={login}>Login</button>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="live"></span> Live at the Central Xerox counter · Mon–Sat
            </div>
            <h1>
              Print before<br />you arrive.
            </h1>
            <p className="lede">
              Upload your documents, choose exactly how you want them printed, pay, and get a
              token. Skip the queue — collect only when your order is ready.
            </p>
            <div className="cta-row">
              <button className="btn btn-primary btn-lg" onClick={startOrder}>
                Start an Order {ArrowIcon}
              </button>
              <button className="btn btn-secondary btn-lg" onClick={trackOrder}>
                Track an Order
              </button>
            </div>
            <div className="meta">
              <div><b>{hasLiveQueue ? `~${liveQueue?.avgProcessingMinutes} min` : "Queue clear"}</b><small>{hasLiveQueue ? "live average turnaround" : "no active orders"}</small></div>
              <div><b>{a4Bw == null ? "—" : rupees(a4Bw)}<span style={{ fontFamily: "var(--f-ui)", fontWeight: 600 }}>/page</span></b><small>A4 black &amp; white</small></div>
              <div><b>{hasLiveQueue ? liveQueue?.activeCount : 0}</b><small>live orders in queue</small></div>
            </div>
          </div>

          <div className="ticket-stage">
            <div className="ticket">
              <div className="tk-head">
                <span className="tk-brand">DIGITAL·XEROX</span>
                <span className="tk-live"><i></i> LIVE</span>
              </div>
              <div className="tk-token">
                <div className="lbl">ORDER TOKEN</div>
                <div className="tok">Q1</div>
              </div>
              <div className="tk-body">
                <div className="tk-file">
                  <div className="fi"></div>
                  <div><b>Assignment.pdf</b><small>20 pages · 2 copies</small></div>
                </div>
                <div className="tk-specs"><span>A4</span><span>Black &amp; White</span><span>Double-sided</span></div>
                <div className="tk-perf"><i className="l"></i><i className="r"></i></div>
                <div className="tk-price">
                  <span className="k">Total paid</span>
                  <span className="v">₹120</span>
                </div>
              </div>
              <div className="tk-status">
                <div className="tk-steps" id="tk-steps">
                  <div className="stp done" data-s="0"><div className="bar"></div><div className="rd"></div><div className="nm">RECEIVED</div></div>
                  <div className="stp active" data-s="1"><div className="bar"></div><div className="rd"></div><div className="nm">PROCESSING</div></div>
                  <div className="stp" data-s="2"><div className="rd"></div><div className="nm">READY</div></div>
                </div>
                <div className="tk-eta">
                  <span className="lab">Estimated ready in</span>
                  <span className="val">6 min</span>
                </div>
                <div className="tk-progress"><i></i></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="section" id="how">
        <div className="wrap">
          <div className="flow">
            <div className="flow-line">
              <div className="section-h" style={{ marginBottom: 28 }}>
                <div className="section-k">How it works</div>
                <h2>Four steps, one visit.</h2>
                <p>The whole order happens on your phone. The only time you walk over is to collect.</p>
              </div>
              <ol className="steps-list">
                <li className="step on"><div className="no">01</div><div><h3>Upload</h3><p>Drop a PDF, DOC, or image. We read the page count automatically.</p></div></li>
                <li className="step"><div className="no">02</div><div><h3>Configure</h3><p>Choose pages, copies, colour and sides. The price updates as you go.</p></div></li>
                <li className="step"><div className="no">03</div><div><h3>Pay</h3><p>Review the receipt and pay by UPI, card, or at the counter.</p></div></li>
                <li className="step"><div className="no">04</div><div><h3>Collect</h3><p>Get your token, track the queue, and come by when it says <em>Ready</em>.</p></div></li>
              </ol>
            </div>
            <div className="flow-aside">
              <div className="receipt scallop" style={{ maxWidth: 340, marginLeft: "auto" }}>
                <div className="rc-top"><div className="bt">DIGITAL·XEROX</div><div className="tt">Order Receipt</div></div>
                <div className="rc-body">
                  <div className="rc-line"><span className="k">Assignment.pdf</span><span className="v">20 pp</span></div>
                  <div className="rc-line"><span className="k">Copies</span><span className="v">2</span></div>
                  <div className="rc-line"><span className="k">A4 · B&amp;W · Double</span><span className="v">—</span></div>
                  <div className="rc-sep"></div>
                  <div className="rc-line mono"><span className="k">Printing</span><span className="v">₹120</span></div>
                  <div className="rc-line mono"><span className="k">Stationery</span><span className="v">₹0.00</span></div>
                  <div className="rc-sep"></div>
                  <div className="rc-total"><span className="k">TOTAL</span><span className="v">₹120</span></div>
                </div>
                <div className="rc-foot" style={{ textAlign: "center" }}>
                  <span className="tokchip">Q184</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ SERVICES ============ */}
      <section className="section" id="services" style={{ paddingTop: 20 }}>
        <div className="wrap">
          <div className="section-h">
            <div className="section-k">Services</div>
            <h2>Everything the counter does.</h2>
          </div>
          <div className="svc">
            <div className="svc-row">
              <div className="idx">01</div>
              <h3>Printing</h3>
              <div className="desc">Upload and print documents in A4 or A3, colour or black &amp; white, single or double-sided.</div>
              <div className="price"><b>from {a4Bw == null ? "—" : rupees(a4Bw)}</b><small>per page</small></div>
            </div>
            <div className="svc-row">
              <div className="idx">02</div>
              <h3>Stationery</h3>
              <div className="desc">Pens, notebooks, record books, files and A4 sheets — add them to the same order.</div>
              <div className="price"><b>from {stationeryStart == null ? "—" : rupees(stationeryStart)}</b><small>per item</small></div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA STRIP ============ */}
      <section className="section" style={{ paddingTop: 20 }}>
        <div className="wrap">
          <div className="strip reveal">
            <div>
              <h2>Your next print is<br />already in the queue.</h2>
              <p>Start an order in under a minute. No account queue, no counter queue.</p>
            </div>
            <div className="cta-row" style={{ margin: 0 }}>
              <button className="btn btn-primary btn-lg" onClick={startOrder}>Start an Order</button>
              <button className="btn btn-ghost btn-lg" onClick={login}>Student login</button>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="foot">
        <div className="wrap foot-in">
          <div>
            <div
              className="brand"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              style={{ marginBottom: 14, cursor: "pointer" }}
            >
              <div className="mark">XR</div>
              <div className="wm"><b>Digital</b> <span>Xerox</span></div>
            </div>
            <p className="fine">Digital infrastructure for the everyday campus. Central Xerox counter, Block C.</p>
          </div>
          <div className="cols">
            <div>
              <h4>Product</h4>
              <a style={{ cursor: "pointer" }} onClick={() => scrollTo("how")}>How it works</a>
              <a style={{ cursor: "pointer" }} onClick={() => scrollTo("services")}>Services</a>
              <a style={{ cursor: "pointer" }} onClick={trackOrder}>Track order</a>
            </div>
            <div>
              <h4>Account</h4>
              <a style={{ cursor: "pointer" }} onClick={login}>Student login</a>
              <a style={{ cursor: "pointer" }} onClick={startOrder}>Start an order</a>
              <a style={{ cursor: "pointer" }} onClick={login}>Staff console</a>
            </div>
            <div>
              <h4>Shop</h4>
              <a>Mon–Sat · 9:00–18:00</a>
              <a>Block C, Ground floor</a>
              <a>help@xerox.college.edu</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}