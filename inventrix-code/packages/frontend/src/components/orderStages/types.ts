import type { OrderTier } from "../../fx/orderFx/tiers";

export interface StageProps {
  tier: OrderTier;
  reduced: boolean;
  imageUrl: string | null;
}
