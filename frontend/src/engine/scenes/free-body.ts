// ============================================================
// 自由物体 / 匀变速直线运动场景
// ============================================================

import { SceneConfig } from "../types";

export interface FreeBodyParams {
  mass: number;
  initialVelocity: number; // 初速度 x 分量 (m/s)
  appliedForceX: number;   // 施加力 x 分量 (N)
  appliedForceY: number;   // 施加力 y 分量 (N)
  frictionCoeff?: number;  // 可选摩擦力
  startY?: number;
}

/** 自由物体（水平面或竖直方向） */
export function createFreeBody(params: FreeBodyParams): SceneConfig {
  const y = params.startY ?? 0;
  const config: SceneConfig = {
    type: "free_body",
    gravity: [0, 9.8],
    bodies: [
      {
        id: "body",
        mass: params.mass,
        position: [0, y],
        velocity: [params.initialVelocity, 0],
        shape: "rectangle",
        size: [1.5, 1],
        color: "#3b82f6",
      },
    ],
    constraints: [],
    appliedForces: [],
  };

  // 施加力
  if (params.appliedForceX !== 0 || params.appliedForceY !== 0) {
    config.appliedForces = [
      {
        body_id: "body",
        vector: [params.appliedForceX, params.appliedForceY],
        label: `F=${Math.sqrt(params.appliedForceX ** 2 + params.appliedForceY ** 2).toFixed(1)}N`,
      },
    ];
  }

  // 摩擦力（通过施加反方向的力来模拟）
  if (params.frictionCoeff && params.frictionCoeff > 0) {
    // 这里只是示意，实际摩擦力在 forces.ts 中处理
    // 可以通过自定义 force 或者标记来实现
    (config as any).frictionCoeff = params.frictionCoeff;
  }

  return config;
}

/** 匀加速直线运动 */
export function createUniformAcceleration(mass: number, force: number, initialV: number = 0): SceneConfig {
  return createFreeBody({ mass, initialVelocity: initialV, appliedForceX: force, appliedForceY: 0 });
}
