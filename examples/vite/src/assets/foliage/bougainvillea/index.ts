import type {
  VineAssets,
  VisualResource,
} from "@elemental-fx/deformable-effects";

import branch01 from "./branches/branch-01-leafy-flowering-vine.png";
import branch02 from "./branches/branch-02-leafy-flowering-vine.png";
import branch03 from "./branches/branch-03-leafy-flowering-vine.png";

import flower01 from "./flowers/flower-01-bougainvillea-cluster.png";
import flower02 from "./flowers/flower-02-bougainvillea-cluster.png";
import flower03 from "./flowers/flower-03-bougainvillea-cluster.png";
import flower04 from "./flowers/flower-04-bougainvillea-cluster.png";
import flower05 from "./flowers/flower-05-bougainvillea-cluster.png";
import flower06 from "./flowers/flower-06-bougainvillea-cluster.png";

import leaf01 from "./leaves/leaf-01-bougainvillea.png";
import leaf02 from "./leaves/leaf-02-bougainvillea.png";
import leaf03 from "./leaves/leaf-03-bougainvillea.png";
import leaf04 from "./leaves/leaf-04-bougainvillea.png";
import leaf05 from "./leaves/leaf-05-bougainvillea.png";
import leaf06 from "./leaves/leaf-06-bougainvillea.png";

type AssetCategory = "branch" | "flower" | "leaf";

function resource(
  handle: string,
  category: AssetCategory,
  label: string,
  metadata: Record<string, unknown> = {},
): VisualResource {
  return {
    handle,
    metadata: {
      category,
      label,
      ...metadata,
    },
  };
}

export const bougainvilleaVineAssets = {
  branches: [
    // resource(branch01, "branch", "Leafy branch 01", { greenMask: true }),
    // resource(branch02, "branch", "Leafy branch 02", { greenMask: true }),
    // resource(branch03, "branch", "Leafy branch 03", { greenMask: true }),
    resource(branch01, "branch", "Leafy branch 01"),
    resource(branch02, "branch", "Leafy branch 02"),
    resource(branch03, "branch", "Leafy branch 03"),
  ],
  flowers: [
    resource(flower01, "flower", "Bougainvillea flower cluster 01"),
    resource(flower02, "flower", "Bougainvillea flower cluster 02"),
    resource(flower03, "flower", "Bougainvillea flower cluster 03"),
    resource(flower04, "flower", "Bougainvillea flower cluster 04"),
    resource(flower05, "flower", "Bougainvillea flower cluster 05"),
    resource(flower06, "flower", "Bougainvillea flower cluster 06"),
  ],
  leaves: [
    resource(leaf01, "leaf", "Bougainvillea leaf 01"),
    resource(leaf02, "leaf", "Bougainvillea leaf 02"),
    resource(leaf03, "leaf", "Bougainvillea leaf 03"),
    resource(leaf04, "leaf", "Bougainvillea leaf 04"),
    resource(leaf05, "leaf", "Bougainvillea leaf 05"),
    resource(leaf06, "leaf", "Bougainvillea leaf 06"),
  ],
} satisfies VineAssets;

export const bougainvilleaAssets = bougainvilleaVineAssets;
