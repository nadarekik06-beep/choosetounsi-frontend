// app/hooks/useSearch.ts
"use client";

import { useState, useCallback, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface SearchProduct {
  id:               number;
  name:             string;
  slug:             string;
  description:      string | null;
  price:            number;
  stock:            number;
  views:            number;
  featured:         boolean;
  category_name:    string | null;
  category_slug:    string | null;
  subcategory_name: string | null;
  subcategory_slug: string | null;
  primary_image:    string | null;
}

export interface SearchState {
  query:     string;
  products:  SearchProduct[];
  loading:   boolean;
  error:     string | null;
  source:    "ai" | "fallback" | null;
  count:     number;
  searched:  boolean;            // true after first search
  imagePreview: string | null;   // data URL for image preview
}

const initialState: SearchState = {
  query:        "",
  products:     [],
  loading:      false,
  error:        null,
  source:       null,
  count:        0,
  searched:     false,
  imagePreview: null,
};

export function useSearch() {
  const [state, setState] = useState<SearchState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

  const setPartial = (patch: Partial<SearchState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  // ── Text Search ───────────────────────────────────────────────────────────

  const searchByText = useCallback(
    async (
      query: string,
      filters?: { category_id?: number; min_price?: number; max_price?: number }
    ) => {
      if (!query.trim()) return;

      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setPartial({ loading: true, error: null, query, imagePreview: null });

      try {
        const body: Record<string, unknown> = { query: query.trim(), limit: 20 };
        if (filters?.category_id) body.category_id = filters.category_id;
        if (filters?.min_price)   body.min_price   = filters.min_price;
        if (filters?.max_price)   body.max_price   = filters.max_price;

        const res = await fetch(`${API_URL}/api/search/text`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body:    JSON.stringify(body),
          signal:  abortRef.current.signal,
        });

        if (!res.ok) throw new Error(`Server error: ${res.status}`);

        const data = await res.json();

        setPartial({
          products: data.products ?? [],
          count:    data.count    ?? 0,
          source:   data.source   ?? "ai",
          loading:  false,
          searched: true,
        });
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") return;
        setPartial({
          error:   "Search failed. Please try again.",
          loading: false,
          searched: true,
        });
      }
    },
    []
  );

  // ── Image Search ──────────────────────────────────────────────────────────

  const searchByImage = useCallback(async (file: File) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // Generate preview URL for display
    const previewUrl = URL.createObjectURL(file);

    setPartial({
      loading:      true,
      error:        null,
      query:        "",
      imagePreview: previewUrl,
      searched:     false,
    });

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`${API_URL}/api/search/image`, {
        method: "POST",
        headers: { Accept: "application/json" },
        body:   formData,
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message ?? `Server error: ${res.status}`);
      }

      const data = await res.json();

      setPartial({
        products: data.products ?? [],
        count:    data.count    ?? 0,
        source:   "ai",
        loading:  false,
        searched: true,
      });
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      setPartial({
        error:    (err as Error).message ?? "Image search failed. Please try again.",
        loading:  false,
        searched: true,
      });
    }
  }, []);

  // ── Clear ─────────────────────────────────────────────────────────────────

  const clearSearch = useCallback(() => {
    abortRef.current?.abort();
    setState(initialState);
  }, []);

  return { state, searchByText, searchByImage, clearSearch };
}