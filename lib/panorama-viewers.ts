"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { ViewerProps } from "./use-tile-angles";

// Re-export so consumers only need one import
export type { ViewerProps };

// Dynamic imports: Three.js loads only when BallViewer is actually rendered.
// SectorViewer and BallViewer are not created yet — dynamic() resolves at runtime.
const SectorViewer = dynamic(
  // @ts-ignore - modules created in Tasks 6 & 7
  () => import("@/components/detail/SectorViewer"),
  { ssr: false },
) as ComponentType<ViewerProps>;

const BallViewer = dynamic(
  // @ts-ignore - modules created in Tasks 6 & 7
  () => import("@/components/detail/BallViewer"),
  { ssr: false },
) as ComponentType<ViewerProps>;

const VIEWERS: Partial<Record<string, ComponentType<ViewerProps>>> = {
  sector: SectorViewer,
  ball: BallViewer,
};

/**
 * Returns the viewer component for the given panorama mode string,
 * or null if the mode is not yet supported.
 * To add a new mode: one dynamic import + one line in VIEWERS.
 */
export function getViewer(mode: string): ComponentType<ViewerProps> | null {
  return VIEWERS[mode] ?? null;
}
