import type { Star } from "./star";

export interface Constellation {
  name: string;
  stars: Star[];
  connections: number[][]; // Pairs of star indices to connect
  redirect: string;
  icon?: string;
  description: string;
  id: string;
}
