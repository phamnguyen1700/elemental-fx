import { ResourceSet } from "../../core/resources";
import type { VineAsset, VineAssets } from "./types";

export interface ResolvedVineAssets {
  branches: ResourceSet<VineAsset>;
  flowers: ResourceSet<VineAsset>;
  leaves: ResourceSet<VineAsset>;
}

/** @deprecated Use `ResolvedVineAssets`. */
export type ResolvedFoliageAssets = ResolvedVineAssets;

export function resolveVineAssets(assets: VineAssets): ResolvedVineAssets {
  const branchEntries = assets.branches ?? assets.baseFoliage ?? [];
  const branches = new ResourceSet(branchEntries);
  if (branches.size === 0) {
    throw new Error("VineLayer requires at least one branches asset.");
  }

  return {
    branches,
    flowers: new ResourceSet(assets.flowers ?? []),
    leaves: new ResourceSet(assets.leaves ?? [])
  };
}

/** @deprecated Use `resolveVineAssets`. */
export const resolveFoliageAssets = resolveVineAssets;

export function listVineResources(assets: ResolvedVineAssets): ReadonlyArray<VineAsset> {
  const resources: VineAsset[] = [];
  const seen = new Set<string>();

  for (const set of [assets.branches, assets.flowers, assets.leaves]) {
    for (const entry of set.resources) {
      const key = String(entry.resource.handle);
      if (seen.has(key)) continue;
      seen.add(key);
      resources.push(entry.resource);
    }
  }

  return resources;
}

/** @deprecated Use `listVineResources`. */
export const listFoliageResources = listVineResources;
