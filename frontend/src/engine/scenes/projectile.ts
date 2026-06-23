// ============================================================
// 抛体运动场景
// ============================================================

import { SceneConfig } from "../types";

export interface ProjectileParams {
  mass: number;        // 质量 (kg)
  speed: number;       // 初速度大小 (m/s)
  angle: number;       // 发射角 (度)，水平向右为正方向
  startHeight: number; // 初始高度 (m)
  airResistance?: number; // 空气阻力系数 k (f=-kv)，0 表示无阻力
}

export function createProjectileScene(params: ProjectileParams): SceneConfig {
  const rad = (params.angle * Math.PI) / 180;
  const vx = params.speed * Math.cos(rad);
  const vy = -params.speed * Math.sin(rad); // 屏幕坐标 y 向下，所以 vy 为负表示向上

  const scene: SceneConfig = {
    type: "projectile",
    gravity: [0, 9.8],
    bodies: [
      {
        id: "projectile",
        mass: params.mass,
        position: [0, params.startHeight],
        velocity: [vx, vy],
        shape: "circle",
        size: [0.5, 0.5],
        color: "#ef4444",
      },
    ],
    constraints: [],
  };

  // 空气阻力：通过外加力实现（需要后续在 forces.ts 中添加 drag 支持）
  if (params.airResistance && params.airResistance > 0) {
    // 预留：拖拽力需要动态计算，这里标记为有空气阻力
    (scene as any).airResistance = params.airResistance;
  }

  return scene;
}

/** 平抛运动 */
export function createHorizontalProjectile(mass: number, speed: number, height: number): SceneConfig {
  return createProjectileScene({ mass, speed, angle: 0, startHeight: height });
}

/** 斜抛运动 */
export function createObliqueProjectile(mass: number, speed: number, angle: number, height: number = 0): SceneConfig {
  return createProjectileScene({ mass, speed, angle, startHeight: height });
}
