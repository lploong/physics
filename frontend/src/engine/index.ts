// 物理引擎统一导出

export { Vec2 } from "./types";
export type {
  ForceType,
  Force,
  PhysicalBody,
  SceneConfig,
  ConstraintConfig,
  SimulationConfig,
  SceneDefinition,
  FrameSnapshot,
  SimulationResult,
  SceneRenderInfo,
} from "./types";

export { calculateForces, gravityForce } from "./forces";
export { rk4Step, eulerStep } from "./integrator";
export { buildBodies, runSimulation, getRenderInfo } from "./scene-builder";

export * from "./scenes";
