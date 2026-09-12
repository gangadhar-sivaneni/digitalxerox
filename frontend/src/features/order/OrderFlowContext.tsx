import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ColorMode, PaperSize, Order, Quote, ServiceType, Sides } from "../../types";
import type { CreateOrderInput } from "../../services/api/orders";
import { useAuth } from "../auth/AuthContext";

export type RangeMode = "all" | "custom";

export interface DraftDocument {
  documentId: string;
  fileName: string;
  sizeBytes: number;
  sizeLabel: string;
  pageCount: number | null;
  exactPageCount: boolean;
}

export interface DraftConfig {
  serviceType: ServiceType;
  pagesMode: RangeMode;
  customRange: string;
  copies: number;
  paperSize: PaperSize;
  colorMode: ColorMode;
  sides: Sides;
  manualPages: number | null;
}

export interface CartItem {
  productId: string;
  qty: number;
}

const DEFAULT_CONFIG: DraftConfig = {
  serviceType: "PRINTING",
  pagesMode: "all",
  customRange: "",
  copies: 1,
  paperSize: "A4",
  colorMode: "bw",
  sides: "double",
  manualPages: null,
};

interface OrderFlowValue {
  document: DraftDocument | null;
  documents: DraftDocument[];
  documentConfigs: Record<string, DraftConfig>;
  setDocument: (d: DraftDocument | null) => void;
  setDocuments: (docs: DraftDocument[]) => void;
  setDocumentConfig: (documentId: string, patch: Partial<DraftConfig>) => void;
  config: DraftConfig;
  setConfig: (patch: Partial<DraftConfig>) => void;
  cart: CartItem[];
  setCartItem: (productId: string, qty: number) => void;
  cartCount: number;
  quote: Quote | null;
  setQuote: (q: Quote | null) => void;
  order: Order | null;
  setOrder: (o: Order | null) => void;
  createKey: string;
  reset: () => void;
  totalDocumentPages: number;
}

const OrderFlowContext = createContext<OrderFlowValue | undefined>(undefined);

export function OrderFlowProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [document, setDocumentRaw] = useState<DraftDocument | null>(null);
  const [documents, setDocumentsRaw] = useState<DraftDocument[]>([]);
  const [documentConfigs, setDocumentConfigs] = useState<Record<string, DraftConfig>>({});
  const [config, setConfigState] = useState<DraftConfig>(() => ({
    ...DEFAULT_CONFIG,
    serviceType: "PRINTING",
    paperSize: user?.preferences?.paperSize || "A4",
    colorMode: user?.preferences?.colorMode || "bw",
  }));
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [createKey] = useState(() =>
    (typeof crypto !== "undefined" && crypto.randomUUID)
      ? "ord-" + crypto.randomUUID()
      : "ord-" + Math.random().toString(36).slice(2)
  );

  const setConfig = useCallback((patch: Partial<DraftConfig>) => {
    setConfigState((c) => ({ ...c, ...patch }));
  }, []);

  // Swapping the uploaded file invalidates any drafted/placed order and quote.
  const setDocument = useCallback((d: DraftDocument | null) => {
    setDocumentRaw(d);
    setDocumentsRaw(d ? [d] : []);
    setDocumentConfigs(d ? { [d.documentId]: config } : {});
    setOrder(null);
    setQuote(null);
  }, [config]);

  // The service type follows the content: print jobs need a document, and a
  // document-less order with stationery in the cart is a stationery-only order.
  const applyServiceType = useCallback((docs: DraftDocument[], nextCart: CartItem[]) => {
    const nextService: ServiceType = docs.length > 0 ? "PRINTING" : nextCart.length > 0 ? "STATIONERY" : "PRINTING";
    setConfigState((current) => (current.serviceType === nextService ? current : { ...current, serviceType: nextService }));
  }, []);

  const setDocuments = useCallback((docs: DraftDocument[]) => {
    setDocumentsRaw(docs);
    setDocumentRaw(docs[0] || null);
    setDocumentConfigs((current) => Object.fromEntries(docs.map((doc) => [doc.documentId, current[doc.documentId] || config])));
    applyServiceType(docs, cart);
    setOrder(null);
    setQuote(null);
  }, [config, cart, applyServiceType]);

  const setDocumentConfig = useCallback((documentId: string, patch: Partial<DraftConfig>) => {
    setDocumentConfigs((current) => ({
      ...current,
      [documentId]: { ...(current[documentId] || config), ...patch },
    }));
    setConfigState((current) => documentId === documents[0]?.documentId ? { ...current, ...patch } : current);
    setQuote(null);
  }, [config, documents]);

  const setCartItem = useCallback((productId: string, qty: number) => {
    const existing = cart.find((i) => i.productId === productId);
    let next: CartItem[];
    if (qty <= 0) next = cart.filter((i) => i.productId !== productId);
    else if (!existing) next = [...cart, { productId, qty }];
    else next = cart.map((i) => (i.productId === productId ? { ...i, qty } : i));
    setCart(next);
    applyServiceType(documents, next);
  }, [cart, documents, applyServiceType]);

  const reset = useCallback(() => {
    setDocument(null);
    setConfigState({
      ...DEFAULT_CONFIG,
      paperSize: user?.preferences?.paperSize || "A4",
      colorMode: user?.preferences?.colorMode || "bw",
    });
    setCart([]);
    setDocumentConfigs({});
    setQuote(null);
    setOrder(null);
  }, [user, setDocument]);

  const totalDocumentPages =
    document?.pageCount != null ? document.pageCount : config.manualPages;

  const value = useMemo<OrderFlowValue>(
    () => ({
      document,
      documents,
      documentConfigs,
      setDocument,
      setDocuments,
      setDocumentConfig,
      config,
      setConfig,
      cart,
      setCartItem,
      cartCount: cart.reduce((s, i) => s + i.qty, 0),
      quote,
      setQuote,
      order,
      setOrder,
      createKey,
      reset,
      totalDocumentPages: totalDocumentPages ?? 0,
    }),
    [document, documents, documentConfigs, setDocument, setDocuments, setDocumentConfig, config, setConfig, cart, setCartItem, quote, order, createKey, reset, totalDocumentPages]
  );

  return <OrderFlowContext.Provider value={value}>{children}</OrderFlowContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOrderFlow(): OrderFlowValue {
  const ctx = useContext(OrderFlowContext);
  if (!ctx) throw new Error("useOrderFlow must be used inside <OrderFlowProvider>.");
  return ctx;
}

/** Builds the backend CreateOrderInput from the draft (what the backend receives). */
export function buildOrderInput(
  config: DraftConfig,
  document: DraftDocument | null,
  cart: CartItem[],
  documents: DraftDocument[] = document ? [document] : [],
  documentConfigs: Record<string, DraftConfig> = {}
): CreateOrderInput {
  const manualPages =
    document && document.pageCount == null && config.manualPages ? config.manualPages : undefined;
  return {
    serviceType: config.serviceType,
    documentId: document?.documentId,
    documentIds: documents.length ? documents.map((item) => item.documentId) : undefined,
    documentConfigs: documents.length
      ? documents.map((item) => {
          const itemConfig = documentConfigs[item.documentId] || config;
          return {
            documentId: item.documentId,
            pageRange: itemConfig.pagesMode === "all" ? "all" : itemConfig.customRange || "all",
            copies: itemConfig.copies,
            paperSize: itemConfig.paperSize,
            colorMode: itemConfig.colorMode,
            sides: itemConfig.sides,
            manualPages: itemConfig.manualPages ?? undefined,
          };
        })
      : undefined,
    pageRange:
      config.serviceType === "STATIONERY"
        ? undefined
        : config.pagesMode === "all"
          ? "all"
          : config.customRange || "all",
    copies: config.copies,
    paperSize: config.paperSize,
    colorMode: config.colorMode,
    sides: config.sides,
    manualPages,
    items: cart.map((i) => ({ productId: i.productId, qty: i.qty })),
  };
}