import { api } from "./client";
import type { AssetNode, Shift } from "../types/api";

export const ASSET_TREE_KEY = ["core", "assets", "tree"] as const;
export const SHIFTS_KEY = ["core", "shifts"] as const;

export function fetchAssetTree(): Promise<AssetNode[]> {
  return api.get<AssetNode[]>("/core/assets/tree");
}

export function fetchShifts(): Promise<Shift[]> {
  return api.get<Shift[]>("/core/shifts");
}
