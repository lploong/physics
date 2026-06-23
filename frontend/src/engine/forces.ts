// ============================================================
// 物理引擎核心 —— 受力计算器
// ============================================================
// 每帧重新计算所有力，因为摩擦力方向等依赖当前速度

import { Vec2, Force, PhysicalBody, ConstraintConfig } from "./types";

/** 用于跳过标签生成的标志，积分阶段设为 true */
let integrationMode = false;
export function setIntegrationMode(mode: boolean) { integrationMode = mode; }

const GRAVITY_DIR = new Vec2(0, 9.8);

/** 计算单个物体受到的力 */
export function calculateForces(
  body: PhysicalBody,
  allBodies: PhysicalBody[],
  constraints: ConstraintConfig[],
  gravity: Vec2,
  appliedForces: Force[],
): Force[] {
  const forces: Force[] = [];

  // 1. 重力
  forces.push(gravityForce(body, gravity));

  // 2. 约束产生的力
  for (const c of constraints) {
    switch (c.type) {
      case "incline_plane": {
        const inclineForces = inclineForcesFor(body, c, gravity);
        forces.push(...inclineForces);
        break;
      }
      case "rope": {
        const ropeForce = ropeForceFor(body, allBodies, c);
        if (ropeForce) forces.push(ropeForce);
        break;
      }
      case "spring": {
        const springForce = springForceFor(body, c);
        if (springForce) forces.push(springForce);
        break;
      }
      case "conveyor_belt": {
        const beltForces = conveyorForces(body, c, gravity);
        forces.push(...beltForces);
        break;
      }
      case "electric_field": {
        const ef = electricForce(body, c);
        if (ef) forces.push(ef);
        break;
      }
      case "magnetic_field": {
        const mf = magneticForce(body, c);
        if (mf) forces.push(mf);
        break;
      }
      case "stacked": {
        const stackedForces = stackedForcesFor(body, allBodies, c, gravity);
        forces.push(...stackedForces);
        break;
      }
      case "plank": {
        const plankForces = plankForcesFor(body, allBodies, c, gravity);
        forces.push(...plankForces);
        break;
      }
    }
  }

  // 3. 外加力
  forces.push(...appliedForces.filter((f) => f.point === body.position));

  return forces;
}

// ---- 各个力的计算函数 ----

/** 重力 G = mg */
export function gravityForce(body: PhysicalBody, gravity: Vec2): Force {
  return {
    type: "gravity",
    vector: gravity.scale(body.mass),
    point: body.position.clone(),
    label: integrationMode ? "" : `G=${(body.mass * gravity.magnitude()).toFixed(1)}N`,
  };
}

/** 斜面上的力：支持力 + 摩擦力 */
function inclineForcesFor(
  body: PhysicalBody,
  config: { type: "incline_plane"; angle: number; friction_coeff?: number; length?: number; pivot?: [number, number]; body_id?: string },
  gravity: Vec2,
): Force[] {
  if (config.body_id && config.body_id !== body.id) return [];

  const angle = config.angle;
  const rad = (angle * Math.PI) / 180;

  // 检查物体是否仍在斜面上
  const pivot = config.pivot ? new Vec2(config.pivot[0], config.pivot[1]) : new Vec2(0, 0);
  const inclineLength = config.length ?? 10;
  const alongDir = new Vec2(Math.cos(rad), Math.sin(rad));
  const normalDir = new Vec2(-Math.sin(rad), -Math.cos(rad));
  const relPos = body.position.sub(pivot);
  const along = relPos.dot(alongDir);
  const normal = relPos.dot(normalDir);

  // 物体脱离斜面（抬起或滑出范围）
  const halfHeight = body.size.y / 2;
  if (normal > halfHeight || along < -0.5 || along > inclineLength + 0.5) {
    return []; // 不施斜面力
  }

  const forces: Force[] = [];
  const mu = config.friction_coeff ?? 0;

  // 重力沿斜面和垂直斜面的分量
  const gMag = gravity.magnitude();
  const weight = body.mass * gMag;

  // 垂直斜面分量
  const normalMag = weight * Math.cos(rad);
  // 沿斜面分量（向下）
  const alongMag = weight * Math.sin(rad);

  // 支持力：垂直斜面向上
  forces.push({
    type: "normal",
    vector: normalDir.scale(normalMag),
    point: body.position.clone(),
    label: `N=${normalMag.toFixed(1)}N`,
  });

  // 摩擦力
  if (mu > 0) {
    const speed = body.velocity.magnitude();

    if (speed < 0.001) {
      // 静止：静摩擦力，平衡沿斜面分量
      const staticFrictionMax = mu * normalMag;
      const frictionMag = Math.min(alongMag, staticFrictionMax);
      if (frictionMag > 0.001) {
        forces.push({
          type: "static_friction",
          vector: alongDir.scale(-frictionMag), // 沿斜面向上
          point: body.position.clone(),
          label: `f_s=${frictionMag.toFixed(1)}N`,
        });
      }
    } else {
      // 运动：动摩擦力，与速度方向相反
      const frictionMag = mu * normalMag;
      const velDir = body.velocity.normalize();
      forces.push({
        type: "friction",
        vector: velDir.scale(-frictionMag),
        point: body.position.clone(),
        label: `f=${frictionMag.toFixed(1)}N`,
      });
    }
  }

  return forces;
}

/** 重力在径向（绳方向）上的分量 */
function calculateGravityRadial(body: PhysicalBody, radialDir: Vec2): number {
  // gravity is the first force applied via gravityForce
  // But we don't have direct access to gravity here. We compute the actual gravitational force.
  // In the screen coordinate system, gravity is (0, gy) where gy > 0 points down
  // The radicalDir is pointing from body to pivot (toward center)
  const g = new Vec2(0, 9.8); // standard gravity
  const gravForce = g.scale(body.mass);
  // Radial component: dot product of gravity force with direction toward center
  // If gravity pulls away from center (body at top), this is negative
  return gravForce.dot(radialDir);
}

/** 绳的张力 */
function ropeForceFor(
  body: PhysicalBody,
  allBodies: PhysicalBody[],
  config: { type: "rope"; body_ids: string[]; length: number; pivot?: [number, number] },
): Force | null {
  if (!config.body_ids.includes(body.id)) return null;

  const pivot = config.pivot ? new Vec2(config.pivot[0], config.pivot[1]) : null;

  if (pivot) {
    // 圆周运动：绳一端固定
    const dir = body.position.sub(pivot);
    const dist = dir.magnitude();

    if (dist > config.length) {
      // 绳绷紧，计算向心力
      const dirNorm = dir.normalize();
      const vPerp = body.velocity.sub(body.velocity.projectOnto(dirNorm));
      const vPerpSq = vPerp.magnitudeSq();

      // 需要的向心力
      const centripetalNeeded = (body.mass * vPerpSq) / Math.max(dist, 0.01);

      // 重力在径向的分量（沿绳方向朝外的分量为正）
      const gravityRadial = calculateGravityRadial(body, dirNorm);

      // 绳张力 = 向心力 - 重力径向分量
      // 如果为负，绳松弛（只有杆才支持负张力）
      const tension = centripetalNeeded - gravityRadial;

      if (tension <= 0.01) {
        // 绳松弛，位置约束放开（在 applyConstraints 中处理）
        return null;
      }

      return {
        type: "tension",
        vector: dirNorm.scale(-tension),
        point: body.position.clone(),
        label: `T=${tension.toFixed(1)}N`,
      };
    }
    // 物体在绳长范围内：绳松弛，无张力
    return null;
  }

  // 两物体之间的绳：保持固定距离
  const otherId = config.body_ids.find((id) => id !== body.id);
  if (!otherId) return null;
  const other = allBodies.find((b) => b.id === otherId);
  if (!other) return null;

  const dir = other.position.sub(body.position);
  const dist = dir.magnitude();
  if (dist > config.length) {
    // 绳拉紧，计算张力
    const dirNorm = dir.normalize();
    // 简化：使用强弹簧来模拟不可伸长绳
    const stiffness = 5000;
    const tensionMag = stiffness * (dist - config.length);
    return {
      type: "tension",
      vector: dirNorm.scale(tensionMag),
      point: body.position.clone(),
      label: `T=${tensionMag.toFixed(1)}N`,
    };
  }

  return null;
}

/** 弹簧力 F = -k(x - x0) */
function springForceFor(
  body: PhysicalBody,
  config: { type: "spring"; body_id: string; anchor: [number, number]; spring_constant: number; rest_length: number },
): Force | null {
  if (config.body_id !== body.id) return null;

  const anchor = new Vec2(config.anchor[0], config.anchor[1]);
  const displacement = body.position.sub(anchor);
  const currentLength = displacement.magnitude();
  const stretch = currentLength - config.rest_length;

  if (Math.abs(stretch) < 0.0001) return null;

  // F = -k * stretch，方向指向平衡位置
  const forceMag = config.spring_constant * Math.abs(stretch);
  const dir = anchor.sub(body.position).normalize(); // 指向锚点

  return {
    type: "spring",
    vector: dir.scale(forceMag),
    point: body.position.clone(),
    label: `F_s=${forceMag.toFixed(1)}N`,
  };
}

/** 传送带上的力 */
function conveyorForces(
  body: PhysicalBody,
  config: { type: "conveyor_belt"; speed: number; direction: number; body_id?: string },
  gravity: Vec2,
): Force[] {
  if (config.body_id && config.body_id !== body.id) return [];

  const forces: Force[] = [];
  const dirRad = (config.direction * Math.PI) / 180;
  const gMag = gravity.magnitude();

  // 支持力
  const normalMag = body.mass * gMag;
  forces.push({
    type: "normal",
    vector: new Vec2(0, -gMag).scale(body.mass),
    point: body.position.clone(),
    label: `N=${normalMag.toFixed(1)}N`,
  });

  // 传送带摩擦力（使物体加速到传送带速度）
  const beltVelocity = Vec2.fromAngle(dirRad, config.speed);
  const relativeVel = body.velocity.sub(beltVelocity);
  const relSpeed = relativeVel.magnitude();

  if (relSpeed > 0.01) {
    const frictionMag = 0.3 * normalMag; // 假设摩擦系数 0.3
    const frictionDir = relativeVel.normalize().scale(-1);
    forces.push({
      type: "friction",
      vector: frictionDir.scale(frictionMag),
      point: body.position.clone(),
      label: `f=${frictionMag.toFixed(1)}N`,
    });
  }

  return forces;
}

/** 电场力 F = qE */
function electricForce(
  body: PhysicalBody,
  config: { type: "electric_field"; field_strength: number; direction: number },
): Force | null {
  if (body.charge === 0) return null;

  const dirRad = (config.direction * Math.PI) / 180;
  const eDir = Vec2.fromAngle(dirRad, 1);
  const forceMag = body.charge * config.field_strength;

  return {
    type: "electric",
    vector: eDir.scale(forceMag),
    point: body.position.clone(),
    label: `F_e=${Math.abs(forceMag).toFixed(2)}N`,
  };
}

/** 洛伦兹力 F = qv × B */
function magneticForce(
  body: PhysicalBody,
  config: { type: "magnetic_field"; field_strength: number; direction: "into_page" | "out_of_page" },
): Force | null {
  if (body.charge === 0) return null;

  const speed = body.velocity.magnitude();
  if (speed < 0.001) return null;

  const forceMag = Math.abs(body.charge) * speed * config.field_strength;
  // v × B: 垂直纸面的磁场
  const vDir = body.velocity.normalize();
  const sign = config.direction === "into_page" ? -1 : 1;
  const fDir = new Vec2(-vDir.y * sign, vDir.x * sign); // 旋转 ±90度

  return {
    type: "magnetic",
    vector: fDir.scale(forceMag),
    point: body.position.clone(),
    label: `F_B=${forceMag.toFixed(2)}N`,
  };
}

/** 叠放物体的力 */
function stackedForcesFor(
  body: PhysicalBody,
  allBodies: PhysicalBody[],
  config: { type: "stacked"; body_ids: string[]; friction_coeff: number },
  gravity: Vec2,
): Force[] {
  const forces: Force[] = [];
  const idx = config.body_ids.indexOf(body.id);
  if (idx === -1) return forces;

  const gMag = gravity.magnitude();

  if (idx === config.body_ids.length - 1) {
    // 最底层物体：支持力 = 所有上层物体重力 + 自身重力
    let totalMass = body.mass;
    for (let i = 0; i < config.body_ids.length - 1; i++) {
      const above = allBodies.find((b) => b.id === config.body_ids[i]);
      if (above) totalMass += above.mass;
    }
    const normalMag = totalMass * gMag;
    forces.push({
      type: "normal",
      vector: new Vec2(0, -gravity.y).scale(totalMass),
      point: body.position.clone(),
      label: `N=${normalMag.toFixed(1)}N`,
    });
  } else {
    // 上层物体：受下层支持力
    const normalMag = body.mass * gMag;
    forces.push({
      type: "normal",
      vector: new Vec2(0, -gravity.y).scale(body.mass),
      point: body.position.clone(),
      label: `N=${normalMag.toFixed(1)}N`,
    });
  }

  return forces;
}

/** 板块模型的力 */
function plankForcesFor(
  body: PhysicalBody,
  allBodies: PhysicalBody[],
  config: { type: "plank"; body_ids: string[]; friction_coeff: number; ground_friction: number },
  gravity: Vec2,
): Force[] {
  const forces: Force[] = [];
  const isBlock = body.id === config.body_ids[0]; // 第一个是滑块
  const isPlank = body.id === config.body_ids[1]; // 第二个是木板
  if (!isBlock && !isPlank) return forces;

  const plank = allBodies.find((b) => b.id === config.body_ids[1]);
  const block = allBodies.find((b) => b.id === config.body_ids[0]);
  if (!plank || !block) return forces;

  const gMag = gravity.magnitude();

  if (isBlock) {
    // 滑块：重力、支持力、与木板的摩擦力
    const normalMag = block.mass * gMag;
    forces.push({
      type: "normal",
      vector: new Vec2(0, -gravity.y).scale(block.mass),
      point: block.position.clone(),
      label: `N=${normalMag.toFixed(1)}N`,
    });

    // 与木板的摩擦力
    const relativeVel = block.velocity.sub(plank.velocity);
    const relSpeed = relativeVel.magnitude();
    if (relSpeed > 0.001) {
      const frictionMag = config.friction_coeff * normalMag;
      forces.push({
        type: "friction",
        vector: relativeVel.normalize().scale(-frictionMag),
        point: block.position.clone(),
        label: `f=${frictionMag.toFixed(1)}N`,
      });
    }
  }

  if (isPlank) {
    // 木板：滑块的重力压在木板上
    const normalMag = (plank.mass + block.mass) * gMag;
    forces.push({
      type: "normal",
      vector: new Vec2(0, -gravity.y).scale(plank.mass + block.mass),
      point: plank.position.clone(),
      label: `N=${normalMag.toFixed(1)}N`,
    });

    // 地面摩擦力（与速度相反）
    const speed = plank.velocity.magnitude();
    if (speed > 0.001) {
      const groundFriction = config.ground_friction * normalMag;
      forces.push({
        type: "friction",
        vector: plank.velocity.normalize().scale(-groundFriction),
        point: plank.position.clone(),
        label: `f_g=${groundFriction.toFixed(1)}N`,
      });
    }

    // 滑块对木板的摩擦力（反作用力）
    const relativeVel = block.velocity.sub(plank.velocity);
    const relSpeed = relativeVel.magnitude();
    if (relSpeed > 0.001) {
      const frictionMag = config.friction_coeff * block.mass * gMag;
      forces.push({
        type: "friction",
        vector: relativeVel.normalize().scale(frictionMag), // 反作用力
        point: plank.position.clone(),
        label: `f'=${frictionMag.toFixed(1)}N`,
      });
    }
  }

  return forces;
}
