import type { AssetNode } from "../types/api";

export interface FlatAsset {
  id: string;
  name: string;
  codename: string | null;
  assetLevelId: number;
  depth: number;
}

export function flattenAssets(nodes: AssetNode[], depth = 0): FlatAsset[] {
  return nodes.flatMap((node) => [
    {
      id: node.id,
      name: node.name,
      codename: node.codename,
      assetLevelId: node.assetlevel_id,
      depth,
    },
    ...flattenAssets(node.children ?? [], depth + 1),
  ]);
}

export function assetLevelIds(assets: FlatAsset[]): number[] {
  return [...new Set(assets.map((asset) => asset.assetLevelId))].sort(
    (a, b) => b - a,
  );
}
