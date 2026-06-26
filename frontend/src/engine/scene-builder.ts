// ============================================================
// 物理引擎核心 —— 场景构建器 & 模拟运行器
// ============================================================

import { Vec2, PhysicalBody, Force, SceneConfig, ConstraintConfig, FrameSnapshot, SimulationResult, SceneDefinition, SceneRenderInfo } from "./types";
import { calculateForces } from "./forces";
import { rk4StepAll } from "./integrator";

/** 从 SceneConfig 构建 PhysicalBody 数组 */
export function buildBodies(config: SceneConfig): PhysicalBody[] {
  return config.bodies.map((b) => ({
    id: b.id,
    mass: b.mass,
    position: new Vec2(b.position[0], b.position[1]),
    velocity: new Vec2(b.velocity[0], b.velocity[1]),
    acceleration: Vec2.zero(),
    forces: [],
    charge: b.charge ?? 0,
    shape: b.shape ?? "point",
    size: new Vec2(b.size?.[0] ?? 1, b.size?.[1] ?? 1),
    color: b.color ?? "#3b82f6",
    angle: 0,
    angularVelocity: 0,
  }));
}

/** 运行完整模拟，返回所有帧的快照 */
export function runSimulation(
  config: SceneConfig,
  simConfig: { duration: number; time_step: number },
  constraints?: ConstraintConfig[],
  appliedForces?: { body_id: string; vector: [number, number]; label?: string }[],
  onProgress?: (pct: number) => void,
): SimulationResult {
  const dt = simConfig.time_step;
  const totalSteps = Math.ceil(simConfig.duration / dt);
  const gravity = new Vec2(config.gravity[0], config.gravity[1]);
  const constraintList = constraints ?? config.constraints;
  const appliedForceList = (appliedForces ?? config.appliedForces ?? []).map(
    (af) => ({
      type: "applied" as const,
      vector: new Vec2(af.vector[0], af.vector[1]),
      point: Vec2.zero(), // 会被 calculateForces 忽略
      label: af.label ?? "F",
    }),
  );

  let bodies = buildBodies(config);
  const frames: FrameSnapshot[] = [];

  // 初始帧
  for (const body of bodies) {
    body.forces = calculateForces(body, bodies, constraintList, gravity, appliedForceList);
  }
  frames.push(snapshot(bodies, 0));

  // 模拟循环
  for (let step = 1; step <= totalSteps; step++) {
    const time = step * dt;

    // 进度回调（每 5% 通知一次）
    if (onProgress && step % Math.max(1, Math.floor(totalSteps / 20)) === 0) {
      onProgress(step / totalSteps);
    }

    // 对所有物体同时进行 RK4 积分（多体系统的正确做法）
    bodies = rk4StepAll(bodies, dt, constraintList, gravity, appliedForceList);

    // 地面碰撞检测
    bodies = applyGroundCollision(bodies, config);

    // 应用额外约束（斜面约束、绳子约束等位置修正）
    bodies = applyConstraints(bodies, constraintList, config);

    // 更新力信息（确保 forces 反映最新状态）
    for (const body of bodies) {
      body.forces = calculateForces(body, bodies, constraintList, gravity, appliedForceList);
    }

    frames.push(snapshot(bodies, time));
  }

  return {
    config: { scene: config, simulation: simConfig },
    frames,
    totalTime: totalSteps * dt,
    frameCount: frames.length,
  };
}

/** 创建帧快照 */
function snapshot(bodies: PhysicalBody[], time: number): FrameSnapshot {
  return {
    time,
    bodies: bodies.map((b) => ({
      id: b.id,
      position: b.position.toArray(),
      velocity: b.velocity.toArray(),
      acceleration: b.acceleration.toArray(),
      forces: b.forces.map((f) => ({
        type: f.type,
        vector: f.vector.toArray(),
        point: f.point.toArray(),
        label: f.label,
      })),
      angle: b.angle,
    })),
  };
}

/** 应用约束到物体状态 */
function applyConstraints(
  bodies: PhysicalBody[],
  constraints: ConstraintConfig[],
  config: SceneConfig,
): PhysicalBody[] {
  return bodies.map((body) => {
    let newBody = { ...body };

    for (const c of constraints) {
      switch (c.type) {
        case "incline_plane": {
          if (c.body_id && c.body_id !== body.id) break;
          // 约束物体在斜面上
          const rad = (c.angle * Math.PI) / 180;
          const pivot = new Vec2(c.pivot[0], c.pivot[1]);
          const relPos = body.position.sub(pivot);
          // 沿斜面方向的位移
          const alongDir = new Vec2(Math.cos(rad), Math.sin(rad));
          // 屏幕坐标系 (y向下): 斜面法线修正为垂直于斜面且指向面外
          const normalDir = new Vec2(Math.sin(rad), -Math.cos(rad));
          const along = relPos.dot(alongDir);
          const normal = relPos.dot(normalDir);

          // 限制在斜面上（物体在斜面表面上方 normalDir 方向）
          if (normal > 0) {
            // 物体脱离了斜面
            // 不限制
          }
          // 限制沿斜面不超过斜面长度且在斜面范围内
          if (along < 0 || along > c.length) {
            // 超出斜面范围
          }

          break;
        }
        case "rope": {
          if (!c.body_ids.includes(body.id)) break;
          const pivot = c.pivot ? new Vec2(c.pivot[0], c.pivot[1]) : null;

          if (pivot) {
            // 绳一端固定：保持距离约束
            const dir = pivot.sub(body.position);
            const dist = dir.magnitude();
            if (dist > c.length) {
              const dirNorm = dir.normalize();
              newBody.position = pivot.sub(dirNorm.scale(c.length));
              const radialVel = newBody.velocity.projectOnto(dirNorm);
              newBody.velocity = newBody.velocity.sub(radialVel);
            }
          } else {
            // 两物体绳连接：当距离远超绳长时拉回
            const otherId = c.body_ids.find((id) => id !== body.id);
            if (otherId) {
              // 处理在下面的 force 计算中，这里只做安全修正
            }
          }
          break;
        }
        case "spring": {
          // 弹簧无位置硬约束，力已计算
          break;
        }
      }
    }

    return newBody;
  });
}

/** 地面碰撞检测：防止物体穿过地面无限下落 */
function applyGroundCollision(
  bodies: PhysicalBody[],
  config: SceneConfig,
): PhysicalBody[] {
  // 取每个物体尺寸的 y 分量作为半高度估算
  // 地面基准线 y = 0（屏幕坐标中的地面，y 向下为正，重力 gy > 0）
  const groundY = 0;

  return bodies.map((body) => {
    const halfHeight = body.size.y / 2;
    const bottom = body.position.y + halfHeight;

    // 物体底部穿过地面
    if (bottom > groundY && body.velocity.y > 0) {
      // 修正位置：放在地面上
      const newPosition = new Vec2(body.position.x, groundY - halfHeight);
      // 反转 y 方向速度（带摩擦衰减）
      // 弹性系数取 0.2（硬地面，主要为非弹性碰撞）
      const restitution = 0.2;
      const newVelocity = new Vec2(
        body.velocity.x * 0.8,     // 水平速度摩擦力衰减
        -Math.abs(body.velocity.y) * restitution,  // 反向小幅度弹跳
      );

      // 如果速度很小，直接停住
      if (Math.abs(newVelocity.y) < 0.1) {
        newVelocity.y = 0;
        newVelocity.x = 0;
      }

      return {
        ...body,
        position: newPosition,
        velocity: newVelocity,
      };
    }

    return body;
  });
}

/** 获取指定帧的渲染信息 */
export function getRenderInfo(
  config: SceneConfig,
  frame: FrameSnapshot,
  constraints?: ConstraintConfig[],
): SceneRenderInfo {
  const constraintList = constraints ?? config.constraints;
  const bodies = frame.bodies.map((b) => {
    const origBody = config.bodies.find((ob) => ob.id === b.id);
    return {
      id: b.id,
      mass: origBody?.mass ?? 1,
      position: new Vec2(b.position[0], b.position[1]),
      velocity: new Vec2(b.velocity[0], b.velocity[1]),
      acceleration: new Vec2(b.acceleration[0], b.acceleration[1]),
      forces: b.forces.map((f) => ({
        type: f.type,
        vector: new Vec2(f.vector[0], f.vector[1]),
        point: new Vec2(f.point[0], f.point[1]),
        label: f.label,
      })),
      charge: origBody?.charge ?? 0,
      shape: origBody?.shape ?? "point",
      size: new Vec2(origBody?.size?.[0] ?? 1, origBody?.size?.[1] ?? 1),
      color: origBody?.color ?? "#3b82f6",
      angle: b.angle,
      angularVelocity: 0,
    };
  });

  return {
    type: config.type,
    bodies,
    constraints: constraintList,
    time: frame.time,
  };
}
