import React from "react";
import type { GrowthStage } from "@/lib/growthEngine";
import {
  SingleSproutIllustration,
  SproutSmallIllustration,
  SmallGardenIllustration,
  FlourishingGardenIllustration,
  GardenRevealIllustration,
} from "@/components/illustrations";

interface GrowthPlantIllustrationProps {
  stage: GrowthStage;
  size?: number;
}

export default function GrowthPlantIllustration({
  stage,
  size = 44,
}: GrowthPlantIllustrationProps) {
  switch (stage) {
    case "seed":
      return <SingleSproutIllustration size={size} />;
    case "sprout":
      return <SproutSmallIllustration size={size + 6} />;
    case "youngPlant":
      return <SmallGardenIllustration size={size + 4} />;
    case "mature":
      return <FlourishingGardenIllustration size={size + 6} />;
    case "blooming":
      return <FlourishingGardenIllustration size={size + 10} />;
    case "tree":
      return <GardenRevealIllustration size={size + 14} />;
  }
}
