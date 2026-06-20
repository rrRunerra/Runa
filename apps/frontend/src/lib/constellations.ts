import type { Constellation } from "@/types/constellation";

export const REFERENCE_CONSTELLATIONS: Constellation[] = [
  {
    name: "Lynx",
    description: "Web interface for discord bot.",
    redirect: "/lynx",
    id: "lynx",
    stars: [
      { ra: 5.41, dec: 11.91, magnitude: 3, name: "Star 0" },
      { ra: 5.45, dec: 13.11, magnitude: 3, name: "Star 1" },
      { ra: 5.55, dec: 13.74, magnitude: 3, name: "Star 2" },
      { ra: 5.62, dec: 15.54, magnitude: 3, name: "Star 3" },
      { ra: 5.88, dec: 15.71, magnitude: 3, name: "Star 4" },
      { ra: 6.24, dec: 19.04, magnitude: 3, name: "Star 5" },
      { ra: 6.35, dec: 24.57, magnitude: 3, name: "Star 6" },
      { ra: 6.52, dec: 25.61, magnitude: 3, name: "Star 7" },
    ],
    connections: [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]
    ]
  },
  {
    name: "Aquila",
    description: "Media tracking app.",
    redirect: "/aquila",
    id: "aquila",
    stars: [
      { ra: 25.3, dec: 1.83, magnitude: 3, name: "Star 0" },
      { ra: 25.24, dec: 2.67, magnitude: 3, name: "Star 1" },
      { ra: 24.9, dec: 6.27, magnitude: 3, name: "Star 2" },
      { ra: 24.53, dec: 7.5, magnitude: 3, name: "Star 3" },
      { ra: 25.06, dec: 8.83, magnitude: 3, name: "Star 4" },
      { ra: 25.33, dec: 15.5, magnitude: 3, name: "Star 5" },
      { ra: 25.24, dec: 2.67, magnitude: 3, name: "Star 6" },
      { ra: 25.06, dec: 8.87, magnitude: 3, name: "Star 7" },
      { ra: 24.87, dec: 14.53, magnitude: 3, name: "Star 8" },
      { ra: 24.8, dec: 13.1, magnitude: 3, name: "Star 9" },
      { ra: 24.74, dec: 11.57, magnitude: 3, name: "Star 10" },
    ],
    connections: [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10]
    ]
  },
  {
  name: "Pegasus",
  description: "Email client",
  redirect: "/pegasus",
  id: "pegasus",
  stars: [
    {
      ra: -3.28,
      dec: 96.14,
      magnitude: 3.0,
      name: "Star 0",
    },
    {
      ra: -3.44,
      dec: 95.74,
      magnitude: 3.0,
      name: "Star 1",
    },
    {
      ra: -3.70,
      dec: 95.07,
      magnitude: 3.0,
      name: "Star 2",
    },
    {
      ra: -3.74,
      dec: 95.60,
      magnitude: 3.0,
      name: "Star 3",
    },
    {
      ra: -3.83,
      dec: 97.14,
      magnitude: 3.0,
      name: "Star 4",
    },
    {
      ra: -3.68,
      dec: 98.10,
      magnitude: 3.0,
      name: "Star 5",
    },
    {
      ra: -3.47,
      dec: 99.30,
      magnitude: 3.0,
      name: "Star 6",
    },
    {
      ra: -4.25,
      dec: 98.20,
      magnitude: 3.0,
      name: "Star 7",
    },
    {
      ra: -4.35,
      dec: 91.90,
      magnitude: 3.0,
      name: "Star 8",
    },
    {
      ra: -3.84,
      dec: 91.27,
      magnitude: 3.0,
      name: "Star 9",
    },
    {
      ra: -3.68,
      dec: 89.30,
      magnitude: 3.0,
      name: "Star 10",
    },
    {
      ra: -3.45,
      dec: 87.30,
      magnitude: 3.0,
      name: "Star 11",
    },
    {
      ra: -3.25,
      dec: 88.94,
      magnitude: 3.0,
      name: "Star 12",
    },
  ],
  connections: [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 4],
    [4, 7],
    [7, 8],
    [8, 9],
    [9, 4],
    [9, 10],
    [10, 11],
    [11, 12],
  ],
}
];
