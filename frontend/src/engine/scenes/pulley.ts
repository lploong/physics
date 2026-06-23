// ============================================================
// 滑轮系统场景
// ============================================================

import { SceneConfig } from "../types";

export interface PulleyParams {
  mass1: number;          // 左物体质量 (kg)
  mass2: number;          // 右物体质量 (kg)
  initialHeight1: number; // 左物体初始高度 (m)
  initialHeight2: number; // 右物体初始高度 (m)
  frictionCoeff?: number; // 轴承摩擦系数（简化）
}

/**
 * 阿特伍德机：两个质量不同的物体通过定滑轮连在一起
 * 滑轮在 (pivotX, pivotY) 处
 */
export function createPulley(params: PulleyParams): SceneConfig {
  return {
    type: "connected_bodies",
    gravity: [0, 9.8],
    bodies: [
      {
        id: "left_mass",
        mass: params.mass1,
        position: [3, params.initialHeight1],
        velocity: [0, 0],
        shape: "rectangle",
        size: [1, 1],
        color: params.mass1 > params.mass2 ? "#ef4444" : "#3b82f6",
      },
      {
        id: "right_mass",
        mass: params.mass2,
        position: [7, params.initialHeight2],
        velocity: [0, 0],
        shape: "rectangle",
        size: [1, 1],
        color: params.mass2 > params.mass1 ? "#ef4444" : "#3b82f6",
      },
    ],
    constraints: [
      {
        type: "rope",
        body_ids: ["left_mass", "right_mass"],
        length: 6, // 总绳长
      },
    ],
  };
}
