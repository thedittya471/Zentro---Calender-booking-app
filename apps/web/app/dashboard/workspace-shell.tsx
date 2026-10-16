"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createNavigationStore } from "./navigation-store.ts";

const NavigationContext = createContext<ReturnType<
  typeof createNavigationStore
> | null>(null);

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const [store] = useState(createNavigationStore);
  const compact = useStore(store, (state) => state.compact);
  return (
    <NavigationContext.Provider value={store}>
      <div className="shell" data-navigation-compact={compact}>
        {children}
      </div>
    </NavigationContext.Provider>
  );
}

export function useNavigationStore() {
  const store = useContext(NavigationContext);
  if (!store) throw new Error("Workspace navigation requires WorkspaceShell");
  return store;
}
