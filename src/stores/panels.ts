"use client"

import { create } from "zustand"

interface PanelsSignalState {
  version: number
  notifyPanelsChanged: () => void
}

export const usePanelsSignal = create<PanelsSignalState>((set) => ({
  version: 0,
  notifyPanelsChanged: () => set((state) => ({ version: state.version + 1 })),
}))
