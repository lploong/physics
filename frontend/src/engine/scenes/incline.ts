// ============================================================
// 斜面场景
// ============================================================

import { SceneConfig } from "../types";

export interface InclineParams {
  mass: number;        // 质量 (kg)
  angle: number;       // 倾角 (度)
  frictionCoeff: number; // 摩擦系数
  initialVelocity: number; // 初速度 (m/s)，沿斜面向上为正
  length: number;      // 斜面长度 (m)
}

export function createInclineScene(params: InclineParams): SceneConfig {
  const rad = (params.angle * Math.PI) / 180;
  // 物体初始位置在斜面顶端（沿斜面方向 length 处）
  const startX = params.length * Math.cos(rad);
  const startY = -params.length * Math.sin(rad);
  const vx = params.initialVelocity * Math.cos(rad);
  const vy = -params.initialVelocity * Math.sin(rad);

  return {
    type: "incline",
    gravity: [0, 9.8],
    bodies: [
      {
        id: "block",
        mass: params.mass,
        position: [startX, startY],
        velocity: [vx, vy],
        shape: "rectangle",
        size: [1.5, 1],
        color: "#3b82f6",
      },
    ],
    constraints: [
      {
        type: "incline_plane",
        angle: params.angle,
        friction_coeff: params.frictionCoeff,
        length: params.length,
        pivot: [0, 0],
        body_id: "block",
      },
    ],
  };
}

/** 光滑斜面（无摩擦） */
export function createFrictionlessIncline(mass: number, angle: number, length: number): SceneConfig {
  return createInclineScene({
    mass,
    angle,
    frictionCoeff: 0,
    initialVelocity: 0,
    length,
  });
}

/** 粗糙斜面 */
export function createRoughIncline(mass: number, angle: number, mu: number, length: number): SceneConfig {
  return createInclineScene({
    mass,
    angle,
    frictionCoeff: mu,
    initialVelocity: 0,
    length,
  });
}
