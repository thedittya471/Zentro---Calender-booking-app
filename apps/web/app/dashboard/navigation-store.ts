import { createStore } from "zustand/vanilla";

export function createNavigationStore() {
  return createStore<{ compact: boolean; toggle: () => void }>()((set) => ({
    compact: false,
    toggle: () => set((state) => ({ compact: !state.compact })),
  }));
}
