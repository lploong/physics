// 场景工厂统一导出

export {
  createInclineScene,
  createFrictionlessIncline,
  createRoughIncline,
} from "./incline";
export type { InclineParams } from "./incline";

export {
  createProjectileScene,
  createHorizontalProjectile,
  createObliqueProjectile,
} from "./projectile";
export type { ProjectileParams } from "./projectile";

export {
  createCircularScene,
  createConicalPendulum,
  createVerticalRope,
  createVerticalRod,
} from "./circular";
export type { CircularParams, CircularType } from "./circular";

export {
  createConnectedBodies,
  createPlankBlock,
  createConveyorBelt,
} from "./connected";
export type { ConnectedBodiesParams, PlankBlockParams, ConveyorBeltParams } from "./connected";

export {
  createFreeBody,
  createUniformAcceleration,
} from "./free-body";
export type { FreeBodyParams } from "./free-body";

export {
  createElectricField,
  createMagneticField,
} from "./electromagnetic";
export type { ElectricFieldParams, MagneticFieldParams } from "./electromagnetic";

export {
  createSpringOscillator,
  createVerticalSpring,
} from "./spring-oscillator";
export type { SpringOscillatorParams } from "./spring-oscillator";

export {
  createPulley,
} from "./pulley";
export type { PulleyParams } from "./pulley";
