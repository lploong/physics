// ============================================================
// 模拟状态管理 (Zustand Store)
// ============================================================

import { create } from "zustand";
import {
  SceneConfig,
  SimulationResult,
  FrameSnapshot,
  ConstraintConfig,
  SceneRenderInfo,
} from "../engine/types";
import { runSimulation, getRenderInfo } from "../engine/scene-builder";

export type SceneType =
  | "incline"
  | "projectile"
  | "circular_horizontal"
  | "circular_vertical"
  | "connected_bodies"
  | "free_body"
  | "plank_block"
  | "conveyor_belt"
  | "electric_field"
  | "magnetic_field"
  | "spring_oscillator"
  | "pulley";

export interface SceneParams {
  // 通用
  mass: number;
  gravity: [number, number];

  // 斜面
  inclineAngle: number;
  inclineFriction: number;
  inclineLength: number;
  inclineInitV: number;

  // 抛体
  projSpeed: number;
  projAngle: number;
  projHeight: number;
  projAirResist: number;

  // 圆周
  circRadius: number;
  circSpeed: number;

  // 连接体
  connMass2: number;
  connFriction: number;

  // 自由物体
  freeForceX: number;
  freeForceY: number;
  freeInitV: number;
  freeFriction: number;

  // 板块
  plankBlockMass: number;
  plankPlankMass: number;
  plankFriction: number;
  plankGroundFriction: number;
  plankInitSpeed: number;

  // 传送带
  beltSpeed: number;
  beltDirection: number;
  beltFriction: number;

  // 电磁场
  charge: number;
  fieldStrength: number;
  fieldDirection: number;
  fieldInitSpeed: number;

  // 弹簧振子
  springK: number;
  springAmplitude: number;
  springInitV: number;
  springAnchorX: number;
  springAnchorY: number;

  // 滑轮
  pulleyMass1: number;
  pulleyMass2: number;
  pulleyHeight1: number;
  pulleyHeight2: number;

  // 模拟
  simDuration: number;
  simTimeStep: number;
}

interface SimulationState {
  // 场景类型
  sceneType: SceneType;
  setSceneType: (type: SceneType) => void;

  // 参数
  params: SceneParams;
  setParam: <K extends keyof SceneParams>(key: K, value: SceneParams[K]) => void;

  // 模拟状态
  isRunning: boolean;
  isPaused: boolean;
  hasComputed: boolean;
  computationProgress: number;
  currentTime: number;
  currentFrameIndex: number;
  playbackSpeed: number;

  // 模拟结果
  result: SimulationResult | null;
  currentFrame: FrameSnapshot | null;
  currentRenderInfo: SceneRenderInfo | null;

  // 操作
  computeSimulation: () => void;  // 计算但不播放
  startPlayback: () => void;      // 开始/继续播放
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  resetSimulation: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setCurrentFrame: (index: number) => void;
  stepForward: () => void;         // 前进一帧
  stepBackward: () => void;        // 后退一帧

  // 题目信息
  problemText: string;
  problemImages: string[];
  setProblemText: (text: string) => void;
  setProblemImages: (images: string[]) => void;

  // 保存/加载
  isSaving: boolean;
  saveMessage: string;
  saveProblem: () => Promise<void>;
  loadHistory: () => Promise<void>;
  historyList: Array<{ id: number; scene_type: string; text: string; created_at: string }>;
  deleteHistory: (id: number) => Promise<void>;

  // 对比模式
  compareMode: boolean;
  setCompareMode: (on: boolean) => void;
  compareParams: SceneParams;
  setCompareParam: <K extends keyof SceneParams>(key: K, value: SceneParams[K]) => void;
  compareResult: SimulationResult | null;
  compareCurrentFrame: FrameSnapshot | null;
  compareRenderInfo: SceneRenderInfo | null;
  computeBoth: () => void;
}

const defaultParams: SceneParams = {
  mass: 2,
  gravity: [0, 9.8],
  inclineAngle: 30,
  inclineFriction: 0,
  inclineLength: 8,
  inclineInitV: 0,
  projSpeed: 10,
  projAngle: 45,
  projHeight: 5,
  projAirResist: 0,
  circRadius: 3,
  circSpeed: 8,
  connMass2: 1,
  connFriction: 0.2,
  freeForceX: 10,
  freeForceY: 0,
  freeInitV: 0,
  freeFriction: 0,
  plankBlockMass: 1,
  plankPlankMass: 3,
  plankFriction: 0.4,
  plankGroundFriction: 0.2,
  plankInitSpeed: 5,
  beltSpeed: 2,
  beltDirection: 0,
  beltFriction: 0.3,
  charge: 1.6e-19,
  fieldStrength: 1000,
  fieldDirection: 0,
  fieldInitSpeed: 1e6,
  springK: 50,
  springAmplitude: 2,
  springInitV: 0,
  springAnchorX: 3,
  springAnchorY: 0,
  pulleyMass1: 3,
  pulleyMass2: 2,
  pulleyHeight1: 3,
  pulleyHeight2: 5,
  simDuration: 8,
  simTimeStep: 0.03,
};

function buildSceneConfig(params: SceneParams, sceneType: SceneType): SceneConfig {
  switch (sceneType) {
    case "incline": {
      const rad = (params.inclineAngle * Math.PI) / 180;
      return {
        type: "incline",
        gravity: params.gravity,
        bodies: [
          {
            id: "block",
            mass: params.mass,
            position: [1.5 * Math.cos(rad), 1.5 * Math.sin(rad)],
            velocity: [params.inclineInitV * Math.cos(rad), params.inclineInitV * Math.sin(rad)],
            shape: "rectangle",
            size: [1.5, 1],
            color: "#3b82f6",
          },
        ],
        constraints: [
          {
            type: "incline_plane",
            angle: params.inclineAngle,
            friction_coeff: params.inclineFriction,
            length: params.inclineLength,
            pivot: [0, 0],
            body_id: "block",
          },
        ],
      };
    }

    case "projectile": {
      const rad = (params.projAngle * Math.PI) / 180;
      return {
        type: "projectile",
        gravity: params.gravity,
        bodies: [
          {
            id: "projectile",
            mass: params.mass,
            // 屏幕坐标系 y 向下，高度应取负值
            position: [0, -params.projHeight],
            velocity: [params.projSpeed * Math.cos(rad), -params.projSpeed * Math.sin(rad)],
            shape: "circle",
            size: [0.5, 0.5],
            color: "#ef4444",
          },
        ],
        constraints: [],
      };
    }

    case "circular_horizontal":
    case "circular_vertical": {
      return {
        type: sceneType,
        gravity: params.gravity,
        bodies: [
          {
            id: "ball",
            mass: params.mass,
            position: [0, params.circRadius],
            velocity: [params.circSpeed, 0],
            shape: "circle",
            size: [0.4, 0.4],
            color: "#8b5cf6",
          },
        ],
        constraints: [
          {
            type: "rope",
            body_ids: ["ball"],
            length: params.circRadius,
            pivot: [0, 0],
          },
        ],
      };
    }

    case "connected_bodies": {
      return {
        type: "connected_bodies",
        gravity: params.gravity,
        bodies: [
          {
            id: "body1",
            mass: params.mass,
            position: [3, 0],
            velocity: [0, 0],
            shape: "rectangle",
            size: [1.5, 1],
            color: "#3b82f6",
          },
          {
            id: "body2",
            mass: params.connMass2,
            position: [8, 4],
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
            length: 4,
          },
        ],
      };
    }

    case "free_body": {
      return {
        type: "free_body",
        gravity: params.gravity,
        bodies: [
          {
            id: "body",
            mass: params.mass,
            position: [0, 0],
            velocity: [params.freeInitV, 0],
            shape: "rectangle",
            size: [1.5, 1],
            color: "#3b82f6",
          },
        ],
        constraints: [],
        appliedForces: [
          {
            body_id: "body",
            vector: [params.freeForceX, params.freeForceY],
            label: `F=${Math.sqrt(params.freeForceX ** 2 + params.freeForceY ** 2).toFixed(1)}N`,
          },
        ],
      };
    }

    case "plank_block": {
      return {
        type: "plank_block",
        gravity: params.gravity,
        bodies: [
          {
            id: "block",
            mass: params.plankBlockMass,
            position: [2, -0.5],
            velocity: [params.plankInitSpeed, 0],
            shape: "rectangle",
            size: [1, 0.5],
            color: "#ef4444",
          },
          {
            id: "plank",
            mass: params.plankPlankMass,
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
            friction_coeff: params.plankFriction,
            ground_friction: params.plankGroundFriction,
          },
        ],
      };
    }

    case "conveyor_belt": {
      return {
        type: "conveyor_belt",
        gravity: params.gravity,
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
            speed: params.beltSpeed,
            direction: params.beltDirection,
            body_id: "object",
            length: 10,
            pivot: [0, 0],
          },
        ],
      };
    }

    case "electric_field": {
      return {
        type: "electric_field",
        gravity: [0, 0],
        bodies: [
          {
            id: "particle",
            mass: params.mass,
            charge: params.charge,
            position: [0, 0],
            velocity: [params.fieldInitSpeed, 0],
            shape: "circle",
            size: [0.3, 0.3],
            color: params.charge > 0 ? "#ef4444" : "#3b82f6",
          },
        ],
        constraints: [
          {
            type: "electric_field",
            field_strength: params.fieldStrength,
            direction: params.fieldDirection,
          },
        ],
      };
    }

    case "magnetic_field": {
      return {
        type: "magnetic_field",
        gravity: [0, 0],
        bodies: [
          {
            id: "particle",
            mass: params.mass,
            charge: params.charge,
            position: [0, 0],
            velocity: [params.fieldInitSpeed, 0],
            shape: "circle",
            size: [0.3, 0.3],
            color: "#8b5cf6",
          },
        ],
        constraints: [
          {
            type: "magnetic_field",
            field_strength: params.fieldStrength,
            direction: "into_page",
          },
        ],
      };
    }

    case "spring_oscillator": {
      return {
        type: "spring_oscillator",
        gravity: [0, 9.8],
        bodies: [
          {
            id: "mass",
            mass: params.mass,
            position: [params.springAnchorX + params.springAmplitude, params.springAnchorY],
            velocity: [params.springInitV, 0],
            shape: "rectangle",
            size: [1, 1],
            color: "#ec4899",
          },
        ],
        constraints: [
          {
            type: "spring",
            body_id: "mass",
            anchor: [params.springAnchorX, params.springAnchorY],
            spring_constant: params.springK,
            rest_length: 0,
          },
        ],
      };
    }

    case "pulley": {
      return {
        type: "pulley",
        gravity: [0, 9.8],
        bodies: [
          {
            id: "left_mass",
            mass: params.pulleyMass1,
            position: [3, params.pulleyHeight1],
            velocity: [0, 0],
            shape: "rectangle",
            size: [1, 1],
            color: params.pulleyMass1 > params.pulleyMass2 ? "#ef4444" : "#3b82f6",
          },
          {
            id: "right_mass",
            mass: params.pulleyMass2,
            position: [7, params.pulleyHeight2],
            velocity: [0, 0],
            shape: "rectangle",
            size: [1, 1],
            color: params.pulleyMass2 > params.pulleyMass1 ? "#ef4444" : "#3b82f6",
          },
        ],
        constraints: [
          {
            type: "rope",
            body_ids: ["left_mass", "right_mass"],
            length: 6,
          },
        ],
      };
    }
  }
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  sceneType: "incline",
  setSceneType: (type) => set({ sceneType: type }),

  params: { ...defaultParams },
  setParam: (key, value) =>
    set((state) => ({
      params: { ...state.params, [key]: value },
    })),

  isRunning: false,
  isPaused: false,
  hasComputed: false,
  computationProgress: 0,
  currentTime: 0,
  currentFrameIndex: 0,
  playbackSpeed: 1,

  result: null,
  currentFrame: null,
  currentRenderInfo: null,

  computeSimulation: () => {
    const { params, sceneType } = get();
    set({ computationProgress: 0 });
    const sceneConfig = buildSceneConfig(params, sceneType);
    const result = runSimulation(
      sceneConfig,
      { duration: params.simDuration, time_step: params.simTimeStep },
      undefined,
      undefined,
      (pct) => set({ computationProgress: pct }),
    );

    const renderInfo = result.frames.length > 0
      ? getRenderInfo(sceneConfig, result.frames[0])
      : null;

    set({
      result,
      currentFrame: result.frames[0] ?? null,
      currentRenderInfo: renderInfo,
      currentTime: 0,
      currentFrameIndex: 0,
      hasComputed: true,
      isRunning: false,
      isPaused: false,
      computationProgress: 1,
    });
  },

  startPlayback: () => {
    const { hasComputed, compareMode } = get();
    if (!hasComputed) {
      if (compareMode) {
        get().computeBoth();
      } else {
        get().computeSimulation();
      }
    }
    set({ isRunning: true, isPaused: false });
  },

  pauseSimulation: () => set({ isPaused: true }),
  resumeSimulation: () => set({ isPaused: false }),
  resetSimulation: () =>
    set({
      isRunning: false,
      isPaused: false,
      hasComputed: false,
      currentTime: 0,
      currentFrameIndex: 0,
      result: null,
      currentFrame: null,
      currentRenderInfo: null,
    }),

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  setCurrentFrame: (index) => {
    const { result, params, sceneType } = get();
    if (!result || index < 0 || index >= result.frames.length) return;

    const frame = result.frames[index];
    const sceneConfig = buildSceneConfig(params, sceneType);
    const renderInfo = getRenderInfo(sceneConfig, frame);

    set({
      currentFrame: frame,
      currentRenderInfo: renderInfo,
      currentTime: frame.time,
      currentFrameIndex: index,
    });
  },

  stepForward: () => {
    const { result, currentFrameIndex } = get();
    if (!result) return;
    const next = Math.min(currentFrameIndex + 1, result.frames.length - 1);
    get().setCurrentFrame(next);
  },

  stepBackward: () => {
    const { currentFrameIndex } = get();
    const prev = Math.max(currentFrameIndex - 1, 0);
    get().setCurrentFrame(prev);
  },

  problemText: "",
  problemImages: [],
  setProblemText: (text) => set({ problemText: text }),
  setProblemImages: (images) => set({ problemImages: images }),

  isSaving: false,
  saveMessage: "",
  historyList: [],

  saveProblem: async () => {
    const { params, sceneType, problemText, problemImages } = get();
    set({ isSaving: true, saveMessage: "" });

    try {
      const sceneConfig = buildSceneConfig(params, sceneType);
      const res = await fetch("/api/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene_type: sceneType,
          scene_json: sceneConfig,
          text: problemText || null,
          image_urls: problemImages,
          source: "manual",
        }),
      });

      if (!res.ok) throw new Error("保存失败");
      set({ isSaving: false, saveMessage: "✓ 保存成功" });
      setTimeout(() => set({ saveMessage: "" }), 3000);
    } catch {
      set({ isSaving: false, saveMessage: "✗ 保存失败" });
      setTimeout(() => set({ saveMessage: "" }), 3000);
    }
  },

  loadHistory: async () => {
    try {
      const res = await fetch("/api/problems");
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      set({ historyList: data });
    } catch {
      set({ historyList: [] });
    }
  },

  deleteHistory: async (id: number) => {
    try {
      await fetch(`/api/problems/${id}`, { method: "DELETE" });
      const { historyList } = get();
      set({ historyList: historyList.filter((h) => h.id !== id) });
    } catch {
      // ignore
    }
  },

  compareMode: false,
  setCompareMode: (on) => set({ compareMode: on }),

  compareParams: { ...defaultParams, mass: 1 },  // B面默认参数略有不同
  setCompareParam: (key, value) =>
    set((state) => ({
      compareParams: { ...state.compareParams, [key]: value },
    })),

  compareResult: null,
  compareCurrentFrame: null,
  compareRenderInfo: null,

  computeBoth: () => {
    const { params, compareParams, sceneType } = get();
    set({ computationProgress: 0 });

    // A 面
    const configA = buildSceneConfig(params, sceneType);
    const resultA = runSimulation(configA, {
      duration: params.simDuration,
      time_step: params.simTimeStep,
    }, undefined, undefined,
      (pct) => set({ computationProgress: pct * 0.5 }),
    );
    const renderA = resultA.frames.length > 0
      ? getRenderInfo(configA, resultA.frames[0])
      : null;

    set({
      result: resultA,
      currentFrame: resultA.frames[0] ?? null,
      currentRenderInfo: renderA,
      currentTime: 0,
      currentFrameIndex: 0,
      hasComputed: true,
      isRunning: false,
      isPaused: false,
    });

    // B 面
    const configB = buildSceneConfig(compareParams, sceneType);
    const resultB = runSimulation(configB, {
      duration: compareParams.simDuration,
      time_step: compareParams.simTimeStep,
    }, undefined, undefined,
      (pct) => set({ computationProgress: 0.5 + pct * 0.5 }),
    );
    const renderB = resultB.frames.length > 0
      ? getRenderInfo(configB, resultB.frames[0])
      : null;

    set({
      compareResult: resultB,
      compareCurrentFrame: resultB.frames[0] ?? null,
      compareRenderInfo: renderB,
      computationProgress: 1,
    });
  },
}));
