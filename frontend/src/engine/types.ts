// ============================================================
// 物理引擎核心 —— 类型定义
// ============================================================

/** 二维向量 */
export class Vec2 {
  constructor(public x: number, public y: number) {}

  static zero(): Vec2 {
    return new Vec2(0, 0);
  }

  add(v: Vec2): Vec2 {
    return new Vec2(this.x + v.x, this.y + v.y);
  }

  sub(v: Vec2): Vec2 {
    return new Vec2(this.x - v.x, this.y - v.y);
  }

  scale(s: number): Vec2 {
    return new Vec2(this.x * s, this.y * s);
  }

  /** 点积 */
  dot(v: Vec2): number {
    return this.x * v.x + this.y * v.y;
  }

  /** 叉积（标量） */
  cross(v: Vec2): number {
    return this.x * v.y - this.y * v.x;
  }

  /** 模长 */
  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /** 模长平方 */
  magnitudeSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  /** 归一化 */
  normalize(): Vec2 {
    const m = this.magnitude();
    if (m < 1e-12) return Vec2.zero();
    return this.scale(1 / m);
  }

  /** 旋转（逆时针，弧度） */
  rotate(rad: number): Vec2 {
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return new Vec2(this.x * c - this.y * s, this.x * s + this.y * c);
  }

  /** 法向量（逆时针旋转90度） */
  perpendicular(): Vec2 {
    return new Vec2(-this.y, this.x);
  }

  /** 投影到另一个向量 */
  projectOnto(v: Vec2): Vec2 {
    const n = v.normalize();
    return n.scale(this.dot(n));
  }

  /** 与另一个向量的夹角（弧度） */
  angleTo(v: Vec2): number {
    return Math.atan2(this.cross(v), this.dot(v));
  }

  /** 与x轴正方向的夹角（弧度） */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }

  toArray(): [number, number] {
    return [this.x, this.y];
  }

  static fromAngle(rad: number, magnitude: number = 1): Vec2 {
    return new Vec2(Math.cos(rad) * magnitude, Math.sin(rad) * magnitude);
  }

  /** 两向量之间的距离 */
  static distance(a: Vec2, b: Vec2): number {
    return a.sub(b).magnitude();
  }
}

/** 力的类型枚举 */
export type ForceType =
  | "gravity"
  | "normal"
  | "friction"
  | "static_friction"
  | "tension"
  | "spring"
  | "applied"
  | "electric"
  | "magnetic"
  | "drag";

/** 力 */
export interface Force {
  type: ForceType;
  vector: Vec2;
  point: Vec2; // 作用点
  label: string;
}

/** 物理体 */
export interface PhysicalBody {
  id: string;
  mass: number;
  position: Vec2;
  velocity: Vec2;
  acceleration: Vec2;
  forces: Force[];
  charge: number; // 电荷量（电磁学场景用）
  shape: "point" | "rectangle" | "circle";
  size: Vec2; // [width, height] 或 [radius, radius]
  color: string;
  angle: number; // 物体朝向（弧度）
  angularVelocity: number;
}

/** 场景配置来源 JSON */
export interface SceneConfig {
  type: string;
  gravity: [number, number];
  bodies: {
    id: string;
    mass: number;
    position: [number, number];
    velocity: [number, number];
    charge?: number;
    shape?: "point" | "rectangle" | "circle";
    size?: [number, number];
    color?: string;
  }[];
  constraints: ConstraintConfig[];
  appliedForces?: {
    body_id: string;
    vector: [number, number];
    label?: string;
  }[];
}

export type ConstraintConfig = InclineConfig | RopeConfig | SpringConfig | ConveyorBeltConfig | ElectricFieldConfig | MagneticFieldConfig | StackedConfig | PlankConfig;

export interface InclineConfig {
  type: "incline_plane";
  angle: number;
  friction_coeff?: number;
  length: number;
  pivot: [number, number];
  body_id?: string;
}

export interface RopeConfig {
  type: "rope";
  body_ids: string[];
  length: number;
  pivot?: [number, number];
}

export interface SpringConfig {
  type: "spring";
  body_id: string;
  anchor: [number, number];
  spring_constant: number;
  rest_length: number;
}

export interface ConveyorBeltConfig {
  type: "conveyor_belt";
  speed: number;
  direction: number;
  body_id?: string;
  length?: number;
  pivot?: [number, number];
}

export interface ElectricFieldConfig {
  type: "electric_field";
  field_strength: number;
  direction: number;
}

export interface MagneticFieldConfig {
  type: "magnetic_field";
  field_strength: number;
  direction: "into_page" | "out_of_page";
}

export interface StackedConfig {
  type: "stacked";
  body_ids: string[];
  friction_coeff: number;
}

export interface PlankConfig {
  type: "plank";
  body_ids: string[];
  friction_coeff: number;
  ground_friction: number;
}

/** 模拟配置 */
export interface SimulationConfig {
  duration: number;
  time_step: number;
}

/** 完整的场景定义 */
export interface SceneDefinition {
  scene: SceneConfig;
  simulation: SimulationConfig;
}

/** 单个模拟帧的状态快照 */
export interface FrameSnapshot {
  time: number;
  bodies: {
    id: string;
    position: [number, number];
    velocity: [number, number];
    acceleration: [number, number];
    forces: {
      type: ForceType;
      vector: [number, number];
      point: [number, number];
      label: string;
    }[];
    angle: number;
  }[];
}

/** 模拟结果 */
export interface SimulationResult {
  config: SceneDefinition;
  frames: FrameSnapshot[];
  totalTime: number;
  frameCount: number;
}

/** 场景渲染信息（传给可视化组件） */
export interface SceneRenderInfo {
  type: string;
  bodies: PhysicalBody[];
  constraints: ConstraintConfig[];
  time: number;
}
