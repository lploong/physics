// ============================================================
// 弹簧振子场景（简谐运动）
// ============================================================

import { SceneConfig } from "../types";

export interface SpringOscillatorParams {
  mass: number;           // 质量 (kg)
  springConstant: number; // 劲度系数 k (N/m)
  amplitude: number;      // 振幅 (m)，即初始位移
  initialVelocity: number; // 初速度 (m/s)
  anchorX?: number;       // 弹簧锚点 x
  anchorY?: number;       // 弹簧锚点 y
  horizontal?: boolean;   // true=水平振动, false=竖直振动
}

export function createSpringOscillator(params: SpringOscillatorParams): SceneConfig {
  const anchorX = params.anchorX ?? 0;
  const anchorY = params.anchorY ?? 0;
  const horizontal = params.horizontal ?? true;

  // 初始位置：平衡位置 + 振幅偏移
  const startX = horizontal ? anchorX + params.amplitude : anchorX;
  const startY = horizontal ? anchorY : anchorY + params.amplitude;

  return {
    type: "spring_oscillator",
    gravity: horizontal ? [0, 0] : [0, 9.8],
    bodies: [
      {
        id: "mass",
        mass: params.mass,
        position: [startX, startY],
        velocity: horizontal
          ? [params.initialVelocity, 0]
          : [0, params.initialVelocity],
        shape: "rectangle",
        size: [1, 1],
        color: "#ec4899",
      },
    ],
    constraints: [
      {
        type: "spring",
        body_id: "mass",
        anchor: [anchorX, anchorY],
        spring_constant: params.springConstant,
        rest_length: 0, // 以锚点为平衡位置
      },
    ],
  };
}

/** 竖直弹簧振子 */
export function createVerticalSpring(mass: number, k: number, amplitude: number): SceneConfig {
  return createSpringOscillator({
    mass,
    springConstant: k,
    amplitude,
    initialVelocity: 0,
    anchorX: 3,
    anchorY: -3,
    horizontal: false,
  });
}
