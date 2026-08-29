export interface Constraint {
  solve(dt: number, invSubsteps: number): void;
}
