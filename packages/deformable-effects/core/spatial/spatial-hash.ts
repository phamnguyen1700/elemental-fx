import type { Node } from "../../engines/constraint-graph";
import type { Vec3 } from "../math/vec3";

export class SpatialHash {
  cellSize: number;
  cells: Map<string, Node[]>;

  constructor(cellSize = 20) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  private hash(v: Vec3): string {
    const x = Math.floor(v.x / this.cellSize);
    const y = Math.floor(v.y / this.cellSize);
    const z = Math.floor(v.z / this.cellSize);
    return `${x},${y},${z}`;
  }

  update(nodes: Node[]) {
    this.cells.clear();
    for (const node of nodes) {
      const key = this.hash(node.position);
      let cell = this.cells.get(key);
      if (!cell) {
        cell = [];
        this.cells.set(key, cell);
      }
      cell.push(node);
    }
  }

  clear(): void {
    this.cells.clear();
  }

  getNearby(position: Vec3, radius: number): Node[] {
    const minX = Math.floor((position.x - radius) / this.cellSize);
    const maxX = Math.floor((position.x + radius) / this.cellSize);
    const minY = Math.floor((position.y - radius) / this.cellSize);
    const maxY = Math.floor((position.y + radius) / this.cellSize);
    const minZ = Math.floor((position.z - radius) / this.cellSize);
    const maxZ = Math.floor((position.z + radius) / this.cellSize);

    const result: Node[] = [];
    const radiusSq = radius * radius;

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const key = `${x},${y},${z}`;
          const cell = this.cells.get(key);
          if (cell) {
            for (const node of cell) {
              if (node.position.distanceToSq(position) <= radiusSq) {
                result.push(node);
              }
            }
          }
        }
      }
    }

    return result;
  }
}
