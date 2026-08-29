import type { NetworksConfig } from "../../topologies";
import type { FoliageLayerConfig, FoliagePreset, FoliagePresetOverrides } from "./types";

export function mergeFoliagePreset(
  base: FoliagePreset,
  overrides: FoliagePresetOverrides = {}
): FoliagePreset {
  const network = cloneNetworkConfig({ ...base.network, ...overrides.network });
  const wind =
    overrides.wind === undefined
      ? cloneWind(base.wind)
      : overrides.wind === null
        ? null
        : {
            ...(base.wind ?? {}),
            ...overrides.wind,
            ...(overrides.wind.direction
              ? { direction: overrides.wind.direction.clone() }
              : base.wind?.direction
                ? { direction: base.wind.direction.clone() }
                : {})
          };

  return {
    network,
    growth: { ...base.growth, ...overrides.growth },
    interaction: { ...base.interaction, ...overrides.interaction },
    wind,
    gravity:
      overrides.gravity === undefined
        ? (base.gravity?.clone() ?? null)
        : (overrides.gravity?.clone() ?? null),
    depth: { ...base.depth, ...overrides.depth },
    distribution: { ...base.distribution, ...overrides.distribution },
    render: { ...base.render, ...overrides.render }
  };
}

export function resolveFoliageLayerPreset(
  base: FoliagePreset,
  config: FoliageLayerConfig
): FoliagePreset {
  const preset = mergeFoliagePreset(base, config);

  if (config.seed !== undefined) {
    preset.network.seed = config.seed;
    preset.growth.seed = config.seed + 37;
    preset.distribution.seed = config.seed;
    if (preset.wind) preset.wind.seed = config.seed + 101;
  }

  return preset;
}

function cloneNetworkConfig(network: Partial<NetworksConfig>): Partial<NetworksConfig> {
  return {
    ...network,
    ...(network.bounds
      ? {
          bounds: {
            min: network.bounds.min.clone(),
            max: network.bounds.max.clone()
          }
        }
      : {}),
    ...(network.centerPos ? { centerPos: network.centerPos.clone() } : {}),
    ...(network.depth ? { depth: [network.depth[0], network.depth[1]] as const } : {}),
    ...(network.preferredDirection
      ? { preferredDirection: network.preferredDirection.clone() }
      : {})
  };
}

function cloneWind(wind: FoliagePreset["wind"]): FoliagePreset["wind"] {
  if (!wind) return null;
  return {
    ...wind,
    ...(wind.direction ? { direction: wind.direction.clone() } : {})
  };
}
