import { create } from "zustand";
import type { Interest, BridgeResult } from "./types";

interface EunoiaState {
  // Data
  interests: Interest[];
  selectedInterest: Interest | null;
  knowledgeTree: Record<string, any> | null;

  // UI state
  bridgeMode: boolean;
  bridgeSelections: [string | null, string | null];
  bridgeResult: BridgeResult | null;
  inputPanelOpen: boolean;
  sidePanelOpen: boolean;
  loading: boolean;
  loadingMessage: string;

  // Actions
  setInterests: (interests: Interest[]) => void;
  selectInterest: (interest: Interest | null) => void;
  setKnowledgeTree: (tree: Record<string, any> | null) => void;
  toggleBridgeMode: () => void;
  setBridgeSelection: (id: string) => void;
  setBridgeResult: (result: BridgeResult | null) => void;
  toggleInputPanel: () => void;
  setSidePanelOpen: (open: boolean) => void;
  setLoading: (loading: boolean, message?: string) => void;

  // API actions
  fetchInterests: () => Promise<void>;
  addInput: (content: string, type: string) => Promise<void>;
  exploreInterest: (id: string) => Promise<void>;
  bridgeInterests: (idA: string, idB: string) => Promise<void>;
}

export const useStore = create<EunoiaState>((set, get) => ({
  interests: [],
  selectedInterest: null,
  knowledgeTree: null,
  bridgeMode: false,
  bridgeSelections: [null, null],
  bridgeResult: null,
  inputPanelOpen: false,
  sidePanelOpen: false,
  loading: false,
  loadingMessage: "",

  setInterests: (interests) => set({ interests }),
  selectInterest: (interest) =>
    set({ selectedInterest: interest, sidePanelOpen: !!interest, knowledgeTree: null }),
  setKnowledgeTree: (tree) => set({ knowledgeTree: tree }),
  toggleBridgeMode: () =>
    set((s) => ({
      bridgeMode: !s.bridgeMode,
      bridgeSelections: [null, null],
      bridgeResult: null,
    })),
  setBridgeSelection: (id) =>
    set((s) => {
      if (s.bridgeSelections[0] === null) {
        return { bridgeSelections: [id, null] };
      }
      if (s.bridgeSelections[0] === id) return {};
      return { bridgeSelections: [s.bridgeSelections[0], id] };
    }),
  setBridgeResult: (result) => set({ bridgeResult: result }),
  toggleInputPanel: () => set((s) => ({ inputPanelOpen: !s.inputPanelOpen })),
  setSidePanelOpen: (open) =>
    set({ sidePanelOpen: open, ...(!open ? { selectedInterest: null } : {}) }),
  setLoading: (loading, message) =>
    set({ loading, loadingMessage: message || "" }),

  fetchInterests: async () => {
    const res = await fetch("/api/interests");
    const data = await res.json();
    set({ interests: data });
  },

  addInput: async (content, type) => {
    set({ loading: true, loadingMessage: "Parsing your input..." });
    try {
      const res = await fetch("/api/input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Input parsing failed:", err);
      }
      set({ loading: false });
      await get().fetchInterests();
    } catch (error) {
      console.error("Input parsing error:", error);
      set({ loading: false });
    }
  },

  exploreInterest: async (id) => {
    set({ loading: true, loadingMessage: "Exploring with taste..." });
    const res = await fetch(`/api/interests/${id}/explore`, {
      method: "POST",
    });
    const tree = await res.json();
    set({ knowledgeTree: tree, loading: false });
  },

  bridgeInterests: async (idA, idB) => {
    set({ loading: true, loadingMessage: "Finding intellectual bridges..." });
    const res = await fetch("/api/bridge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interestAId: idA, interestBId: idB }),
    });
    const result = await res.json();
    set({ bridgeResult: result, loading: false });
    await get().fetchInterests();
  },
}));
