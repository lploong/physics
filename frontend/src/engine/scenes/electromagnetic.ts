// ============================================================
// 电磁学场景
// ============================================================

import { SceneConfig } from "../types";

export interface ElectricFieldParams {
  mass: number;         // 质量 (kg)
  charge: number;       // 电荷 (C)，正电荷为正，负电荷为负
  fieldStrength: number; // 电场强度 (N/C)
  direction: number;     // 电场方向 (度)
  initialSpeed: number;  // 初速度 x 分量 (m/s)
}

/** 带电粒子在匀强电场中的运动 */
export function createElectricField(params: ElectricFieldParams): SceneConfig {
  return {
    type: "electric_field",
    gravity: [0, 0], // 忽略重力（通常电子质量很小）
    bodies: [
      {
        id: "particle",
        mass: params.mass,
        charge: params.charge,
        position: [0, 0],
        velocity: [params.initialSpeed, 0],
        shape: "circle",
        size: [0.3, 0.3],
        color: params.charge > 0 ? "#ef4444" : "#3b82f6",
      },
    ],
    constraints: [
      {
        type: "electric_field",
        field_strength: params.fieldStrength,
        direction: params.direction,
      },
    ],
  };
}

export interface MagneticFieldParams {
  mass: number;
  charge: number;
  fieldStrength: number;  // 磁感应强度 (T)
  direction: "into_page" | "out_of_page";
  initialSpeed: number;   // 初速度大小 (m/s)
  angle: number;          // 初速度方向 (度)
}

/** 带电粒子在匀强磁场中的运动 */
export function createMagneticField(params: MagneticFieldParams): SceneConfig {
  const rad = (params.angle * Math.PI) / 180;
  return {
    type: "magnetic_field",
    gravity: [0, 0],
    bodies: [
      {
        id: "particle",
        mass: params.mass,
        charge: params.charge,
        position: [0, 0],
        velocity: [params.initialSpeed * Math.cos(rad), -params.initialSpeed * Math.sin(rad)],
        shape: "circle",
        size: [0.3, 0.3],
        color: "#8b5cf6",
      },
    ],
    constraints: [
      {
        type: "magnetic_field",
        field_strength: params.fieldStrength,
        direction: params.direction,
      },
    ],
  };
}
