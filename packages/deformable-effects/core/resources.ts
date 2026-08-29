export type ResourceHandle = string | number;

export interface TextureResource {
  handle: ResourceHandle;
  width?: number;
  height?: number;
  uv?: readonly [number, number, number, number];
}

export interface MaterialResource {
  handle: ResourceHandle;
  color?: readonly [number, number, number, number];
  texture?: TextureResource;
}

export interface VisualResource {
  handle: ResourceHandle;
  material?: MaterialResource;
  metadata?: Record<string, unknown>;
}

export interface WeightedResource<T> {
  resource: T;
  weight?: number;
}

export class ResourceSet<T> {
  readonly resources: ReadonlyArray<WeightedResource<T>>;

  constructor(resources: ReadonlyArray<T | WeightedResource<T>> = []) {
    this.resources = resources.map((entry) =>
      isWeightedResource(entry) ? entry : { resource: entry, weight: 1 }
    );
  }

  get size(): number {
    return this.resources.length;
  }

  at(index: number): T | undefined {
    return this.resources[index]?.resource;
  }

  pick(sample: number): T | undefined {
    if (this.resources.length === 0) return undefined;

    const total = this.resources.reduce((sum, entry) => sum + Math.max(0, entry.weight ?? 1), 0);
    if (total <= 0) return this.resources[0]?.resource;

    let cursor = Math.min(Math.max(sample, 0), 0.999999) * total;
    for (const entry of this.resources) {
      cursor -= Math.max(0, entry.weight ?? 1);
      if (cursor <= 0) return entry.resource;
    }

    return this.resources[this.resources.length - 1]?.resource;
  }
}

export interface AttachmentResource<T = VisualResource> {
  resource?: T;
  resourceIndex?: number;
}

function isWeightedResource<T>(entry: T | WeightedResource<T>): entry is WeightedResource<T> {
  return typeof entry === "object" && entry !== null && "resource" in entry;
}
