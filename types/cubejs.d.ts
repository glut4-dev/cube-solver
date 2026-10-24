declare module "cubejs" {
  export default class Cube {
    constructor(state?: unknown);
    static fromString(facelets: string): Cube;
    static random(): Cube;
    static initSolver(): void;
    static inverse(alg: string): string;
    move(alg: string): this;
    asString(): string;
    isSolved(): boolean;
    solve(maxDepth?: number): string;
  }
}
