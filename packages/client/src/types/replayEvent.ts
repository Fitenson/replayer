export type ReplayEvent =
  | { type: "click"; x: number; y: number; timestamp: number }
  | { type: "input"; value: string; timestamp: number }
  | { type: "scroll"; scrollY: number; timestamp: number };