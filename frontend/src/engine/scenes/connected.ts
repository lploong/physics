// ============================================================
// 连接体场景
// ============================================================

import { SceneConfig } from "../types";

export interface ConnectedBodiesParams {
  mass1: number;      // 物体1质量 (kg)
  mass2: number;      // 物体2质量 (kg)
  frictionCoeff: number; // 桌面摩擦系数
}

/**
 * 绳连接体：物体1在桌面上，物体2悬挂
 * 桌面高度 = 0（默认），悬挂物体从桌面边缘垂下
 */
export function createConnectedBodies(params: ConnectedBodiesParams): SceneConfig {
  return {
    type: "connected_bodies",
    gravity: [0, 9.8],
    bodies: [
      {
        id: "body1", // 桌面上的物体
        mass: params.mass1,
        position: [2, 0],
        velocity: [0, 0],
        shape: "rectangle",
        size: [1.5, 1],
        color: "#3b82f6",
      },
      {
        id: "body2", // 悬挂物体
        mass: params.mass2,
        position: [7, 3],
        velocity: [0, 0],
        shape: "rectangle",
        size: [1, 1],
        color: "#ef4444",
      },
    ],
    constraints: [
      {
        type: "rope",
        body_ids: ["body1", "body2"],
        length: 3,
      },
    ],
    appliedForces: [
      // body1 受到桌面的支持力和摩擦力（通过自定义）
    ],
  };
}

/** 板块模型 */
export interface PlankBlockParams {
  blockMass: number;   // 滑块质量 (kg)
  plankMass: number;   // 木板质量 (kg)
  frictionCoeff: number; // 块-板间摩擦系数
  groundFriction: number; // 板-地面摩擦系数
  initialBlockSpeed: number; // 滑块初速度 (m/s)
}

export function createPlankBlock(params: PlankBlockParams): SceneConfig {
  return {
    type: "plank_block",
    gravity: [0, 9.8],
    bodies: [
      {
        id: "block",
        mass: params.blockMass,
        position: [2, -0.5],
        velocity: [params.initialBlockSpeed, 0],
        shape: "rectangle",
        size: [1, 0.5],
        color: "#ef4444",
      },
      {
        id: "plank",
        mass: params.plankMass,
        position: [1, 0],
        velocity: [0, 0],
        shape: "rectangle",
        size: [4, 0.5],
        color: "#78716c",
      },
    ],
    constraints: [
      {
        type: "plank",
        body_ids: ["block", "plank"],
        friction_coeff: params.frictionCoeff,
        ground_friction: params.groundFriction,
      },
    ],
  };
}

/** 传送带场景 */
export interface ConveyorBeltParams {
  mass: number;
  speed: number;
  direction: number; // 度，0=向右
  frictionCoeff: number;
}

export function createConveyorBelt(params: ConveyorBeltParams): SceneConfig {
  return {
    type: "conveyor_belt",
    gravity: [0, 9.8],
    bodies: [
      {
        id: "object",
        mass: params.mass,
        position: [0, 0],
        velocity: [0, 0],
        shape: "rectangle",
        size: [1, 0.8],
        color: "#f59e0b",
      },
    ],
    constraints: [
      {
        type: "conveyor_belt",
        speed: params.speed,
        direction: params.direction,
        body_id: "object",
        length: 10,
        pivot: [0, 0],
      },
    ],
  };
}
