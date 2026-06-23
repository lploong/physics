// ============================================================
// 圆周运动场景
// ============================================================

import { SceneConfig } from "../types";

export type CircularType = "horizontal_conical" | "vertical_rope" | "vertical_rod";

export interface CircularParams {
  type: CircularType;
  mass: number;        // 质量 (kg)
  radius: number;      // 半径 / 绳长 (m)
  initialSpeed: number; // 最低点速度 (m/s)
  pivotX?: number;     // 圆心 x (默认 0)
  pivotY?: number;     // 圆心 y (默认低于初始位置)
}

export function createCircularScene(params: CircularParams): SceneConfig {
  const pivotX = params.pivotX ?? 0;
  const pivotY = params.pivotY ?? 0;

  // 初始位置：最低点（竖直圆周）或右侧（水平圆周）
  let startX: number, startY: number;

  switch (params.type) {
    case "horizontal_conical":
      // 圆锥摆：起始位置在右侧
      startX = pivotX + params.radius;
      startY = pivotY;
      break;
    case "vertical_rope":
    case "vertical_rod":
      // 竖直面圆周：起始位置在最低点
      startX = pivotX;
      startY = pivotY + params.radius;
      break;
  }

  // 圆周运动初始速度
  let vx: number, vy: number;
  switch (params.type) {
    case "horizontal_conical":
      vx = 0;
      vy = params.initialSpeed; // 切向速度
      break;
    case "vertical_rope":
    case "vertical_rod":
      vx = params.initialSpeed; // 水平向右
      vy = 0;
      break;
  }

  return {
    type: params.type === "horizontal_conical" ? "circular_horizontal" : "circular_vertical",
    gravity: [0, 9.8],
    bodies: [
      {
        id: "ball",
        mass: params.mass,
        position: [startX, startY],
        velocity: [vx, vy],
        shape: "circle",
        size: [0.4, 0.4],
        color: "#8b5cf6",
      },
    ],
    constraints: [
      {
        type: "rope",
        body_ids: ["ball"],
        length: params.radius,
        pivot: [pivotX, pivotY],
      },
    ],
  };
}

/** 圆锥摆 */
export function createConicalPendulum(mass: number, radius: number, speed: number): SceneConfig {
  return createCircularScene({ type: "horizontal_conical", mass, radius, initialSpeed: speed });
}

/** 竖直面圆周（绳模型） */
export function createVerticalRope(mass: number, radius: number, speed: number): SceneConfig {
  return createCircularScene({ type: "vertical_rope", mass, radius, initialSpeed: speed });
}

/** 竖直面圆周（杆模型） */
export function createVerticalRod(mass: number, radius: number, speed: number): SceneConfig {
  return createCircularScene({ type: "vertical_rod", mass, radius, initialSpeed: speed });
}
