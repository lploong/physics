// ============================================================
// 经典场景预设模板
// ============================================================

import { SceneType, SceneParams } from "../store/simulation";

export interface PresetTemplate {
  id: string;
  name: string;
  description: string;
  sceneType: SceneType;
  params: Partial<SceneParams>;
}

/** 按场景类型分组的预设列表 */
export const presetsByScene: Record<string, PresetTemplate[]> = {
  incline: [
    {
      id: "incline_frictionless",
      name: "光滑斜面",
      description: "无摩擦，物体从30°斜面自由下滑",
      sceneType: "incline",
      params: { inclineAngle: 30, inclineFriction: 0, inclineLength: 8, mass: 2, simDuration: 6 },
    },
    {
      id: "incline_rough",
      name: "粗糙斜面（可静止）",
      description: "μ=0.5，倾角30°，物体可能静止不动（tan30°=0.58>0.5）",
      sceneType: "incline",
      params: { inclineAngle: 30, inclineFriction: 0.5, inclineLength: 5, mass: 2, simDuration: 5 },
    },
    {
      id: "incline_with_init_v",
      name: "斜面初速度（上滑）",
      description: "物体沿30°斜面以5m/s初速度向上滑，μ=0.2",
      sceneType: "incline",
      params: { inclineAngle: 30, inclineFriction: 0.2, inclineInitV: 5, inclineLength: 10, mass: 1, simDuration: 6 },
    },
  ],
  projectile: [
    {
      id: "proj_45deg",
      name: "45°最佳射程",
      description: "初速度10m/s，45°发射，求最大水平射程",
      sceneType: "projectile",
      params: { projSpeed: 10, projAngle: 45, projHeight: 0, mass: 1, simDuration: 4 },
    },
    {
      id: "proj_flat",
      name: "平抛运动",
      description: "从5m高处水平抛出，v₀=8m/s",
      sceneType: "projectile",
      params: { projSpeed: 8, projAngle: 0, projHeight: 5, mass: 1, simDuration: 3 },
    },
    {
      id: "proj_30_60",
      name: "30°和60°互补角",
      description: "初速度相同，30°和60°发射，射程相同",
      sceneType: "projectile",
      params: { projSpeed: 15, projAngle: 30, projHeight: 0, mass: 1, simDuration: 4 },
    },
  ],
  circular_horizontal: [
    {
      id: "circ_h_standard",
      name: "圆锥摆",
      description: "绳长3m，速度8m/s，求绳与竖直方向夹角",
      sceneType: "circular_horizontal",
      params: { circRadius: 3, circSpeed: 8, mass: 1, simDuration: 6 },
    },
  ],
  circular_vertical: [
    {
      id: "circ_v_min",
      name: "竖直面临界速度",
      description: "绳长2m，速度5m/s，检查能否通过最高点（vₘᵢₙ=√(5g)=~4.4m/s）",
      sceneType: "circular_vertical",
      params: { circRadius: 2, circSpeed: 5, mass: 1, simDuration: 4 },
    },
    {
      id: "circ_v_fast",
      name: "竖直面安全通过",
      description: "绳长2m，速度8m/s（>临界值），完整圆周运动",
      sceneType: "circular_vertical",
      params: { circRadius: 2, circSpeed: 8, mass: 1, simDuration: 4 },
    },
  ],
  connected_bodies: [
    {
      id: "conn_standard",
      name: "标准连接体",
      description: "桌上m₁=2kg，悬挂m₂=1kg，桌面μ=0.2",
      sceneType: "connected_bodies",
      params: { mass: 2, connMass2: 1, connFriction: 0.2, simDuration: 4 },
    },
  ],
  free_body: [
    {
      id: "free_uniform_acc",
      name: "匀加速直线运动",
      description: "物体受力F=10N水平向右，v₀=0",
      sceneType: "free_body",
      params: { mass: 2, freeForceX: 10, freeInitV: 0, simDuration: 5 },
    },
  ],
  plank_block: [
    {
      id: "plank_classic",
      name: "经典板块模型",
      description: "滑块1kg初速5m/s滑上3kg长木板，块-板μ=0.4，地面光滑",
      sceneType: "plank_block",
      params: { plankBlockMass: 1, plankPlankMass: 3, plankFriction: 0.4, plankGroundFriction: 0, plankInitSpeed: 5, simDuration: 6 },
    },
  ],
  conveyor_belt: [
    {
      id: "belt_up",
      name: "向上传送",
      description: "物体放在向上的传送带上，带速2m/s，μ=0.3",
      sceneType: "conveyor_belt",
      params: { mass: 1, beltSpeed: 2, beltDirection: 300, beltFriction: 0.3, simDuration: 5 },
    },
  ],
  spring_oscillator: [
    {
      id: "spring_T_check",
      name: "验证周期公式",
      description: "m=1kg, k=50N/m, T=2π√(m/k)≈0.89s",
      sceneType: "spring_oscillator",
      params: { mass: 1, springK: 50, springAmplitude: 2, simDuration: 5 },
    },
    {
      id: "spring_double_k",
      name: "劲度系数加倍",
      description: "k=100N/m（比第一个大），对比周期变化",
      sceneType: "spring_oscillator",
      params: { mass: 1, springK: 100, springAmplitude: 2, simDuration: 5 },
    },
  ],
  pulley: [
    {
      id: "pulley_atwood",
      name: "阿特伍德机",
      description: "m₁=3kg, m₂=2kg, a=g(3-2)/(3+2)=1.96m/s²",
      sceneType: "pulley",
      params: { pulleyMass1: 3, pulleyMass2: 2, pulleyHeight1: 3, pulleyHeight2: 5, simDuration: 4 },
    },
  ],
  electric_field: [
    {
      id: "efield_parabolic",
      name: "类平抛（电场）",
      description: "电子水平进入匀强电场，作类平抛运动",
      sceneType: "electric_field",
      params: { mass: 9.1e-31, charge: -1.6e-19, fieldStrength: 1000, fieldInitSpeed: 2e6, simDuration: 5 },
    },
  ],
  magnetic_field: [
    {
      id: "bfield_circle",
      name: "匀速圆周（磁场）",
      description: "带电粒子垂直进入匀强磁场，做匀速圆周运动",
      sceneType: "magnetic_field",
      params: { mass: 1.67e-27, charge: 1.6e-19, fieldStrength: 0.5, fieldInitSpeed: 1e7, simDuration: 4 },
    },
  ],
};
