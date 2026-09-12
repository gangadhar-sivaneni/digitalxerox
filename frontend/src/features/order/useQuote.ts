import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { buildOrderInput, useOrderFlow } from "./OrderFlowContext";
import { quoteOrder } from "../../services/api/orders";

/** Fetches a live backend quote every time the draft config/cart changes. */
export function useQuote() {
  const { token } = useAuth();
  const { config, document, documents, documentConfigs, cart, setQuote } = useOrderFlow();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const q = await quoteOrder(buildOrderInput(config, document, cart, documents, documentConfigs), token);
      setQuote(q);
    } catch (e) {
      setError((e as Error).message || "Could not fetch the estimate.");
    } finally {
      setLoading(false);
    }
  }, [token, config, document, documents, documentConfigs, cart, setQuote]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { loading, error, refresh };
}