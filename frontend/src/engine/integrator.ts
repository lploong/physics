// ============================================================
// 物理引擎核心 —— RK4 数值积分器
// ============================================================
// 支持多体系统的正确 RK4 积分
// 在每一步的四个子步中，所有物体的力都从同一时刻的全局状态计算

import { Vec2, PhysicalBody, Force, ConstraintConfig } from "./types";
import { calculateForces, setIntegrationMode } from "./forces";

interface Derivative {
  dv: Vec2; // 加速度
  dp: Vec2; // 速度
}

/**
 * 为所有物体在给定状态下计算导数
 * 这是关键：所有物体的力在同一时刻一起计算
 */
function evaluateAll(
  bodies: PhysicalBody[],
  _dt: number,
  constraints: ConstraintConfig[],
  gravity: Vec2,
  appliedForces: Force[],
): Derivative[] {
  // 先为每个物体计算所受的力（此时所有物体的状态是一致的）
  for (const body of bodies) {
    body.forces = calculateForces(body, bodies, constraints, gravity, appliedForces);
  }

  return bodies.map((body) => {
    const netForce = body.forces.reduce(
      (acc, f) => acc.add(f.vector),
      Vec2.zero(),
    );
    const acceleration = body.mass > 0
      ? netForce.scale(1 / body.mass)
      : Vec2.zero();

    return {
      dv: acceleration,
      dp: body.velocity.clone(),
    };
  });
}

/**
 * 用导数推进所有物体的状态
 * @returns 新的身体状态（浅拷贝）
 */
function advanceAll(
  bodies: PhysicalBody[],
  dt: number,
  derivatives: Derivative[],
): PhysicalBody[] {
  return bodies.map((body, i) => ({
    ...body,
    position: body.position.add(derivatives[i].dp.scale(dt)),
    velocity: body.velocity.add(derivatives[i].dv.scale(dt)),
  }));
}

/**
 * 加权组合导数
 */
function combineDerivatives(a: Derivative[], b: Derivative[], c: Derivative[], d: Derivative[]): Derivative[] {
  return a.map((_, i) => ({
    dv: new Vec2(
      (1 / 6) * (a[i].dv.x + 2 * b[i].dv.x + 2 * c[i].dv.x + d[i].dv.x),
      (1 / 6) * (a[i].dv.y + 2 * b[i].dv.y + 2 * c[i].dv.y + d[i].dv.y),
    ),
    dp: new Vec2(
      (1 / 6) * (a[i].dp.x + 2 * b[i].dp.x + 2 * c[i].dp.x + d[i].dp.x),
      (1 / 6) * (a[i].dp.y + 2 * b[i].dp.y + 2 * c[i].dp.y + d[i].dp.y),
    ),
  }));
}

/**
 * 对所有物体执行一个完整的 RK4 步
 * @returns 所有物体的新状态（含最终的力信息）
 */
export function rk4StepAll(
  bodies: PhysicalBody[],
  dt: number,
  constraints: ConstraintConfig[],
  gravity: Vec2,
  appliedForces: Force[],
): PhysicalBody[] {
  setIntegrationMode(true);
  try {
    // 保存初始状态用于 k2/k3/k4
    const original = bodies.map((b) => ({ ...b }));

    // k1: 当前状态的导数
    const k1 = evaluateAll(bodies, 0, constraints, gravity, appliedForces);

    // k2: 用 k1 推进半步
    const halfStep1 = advanceAll(bodies, dt * 0.5, k1);
    const k2 = evaluateAll(halfStep1, dt * 0.5, constraints, gravity, appliedForces);

    // k3: 用 k2 再推进半步
    const halfStep2 = advanceAll(bodies, dt * 0.5, k2);
    const k3 = evaluateAll(halfStep2, dt * 0.5, constraints, gravity, appliedForces);

    // k4: 用 k3 推进整步
    const fullStep = advanceAll(bodies, dt, k3);
    const k4 = evaluateAll(fullStep, dt, constraints, gravity, appliedForces);

    // 加权平均
    const combined = combineDerivatives(k1, k2, k3, k4);

    // 更新所有物体
    return bodies.map((body, i) => {
      const newPosition = original[i].position.add(combined[i].dp.scale(dt));
      const newVelocity = original[i].velocity.add(combined[i].dv.scale(dt));

      const newBody: PhysicalBody = {
        ...body,
        position: newPosition,
        velocity: newVelocity,
        acceleration: combined[i].dv,
      };

      return newBody;
    });
  } finally {
    setIntegrationMode(false);
  }
}

/**
 * 单物体 RK4（简化版，用于只有单个物体的场景）
 */
export function rk4Step(
  body: PhysicalBody,
  dt: number,
  getForces: (b: PhysicalBody) => Force[],
): { position: Vec2; velocity: Vec2; acceleration: Vec2; forcesAtEnd: Force[] } {
  function evaluate(b: PhysicalBody, d: Derivative | null): Derivative {
    const temp: PhysicalBody = {
      ...b,
      position: d ? b.position.add(d.dp.scale(dt)) : b.position,
      velocity: d ? b.velocity.add(d.dv.scale(dt)) : b.velocity,
    };
    const forces = getForces(temp);
    const netF = forces.reduce((acc, f) => acc.add(f.vector), Vec2.zero());
    return { dv: b.mass > 0 ? netF.scale(1 / b.mass) : Vec2.zero(), dp: temp.velocity };
  }

  const a = evaluate(body, null);
  const bd = evaluate(body, a);
  const c = evaluate(body, bd);
  const d = evaluate(body, c);

  const dv = new Vec2(
    (a.dv.x + 2 * bd.dv.x + 2 * c.dv.x + d.dv.x) / 6,
    (a.dv.y + 2 * bd.dv.y + 2 * c.dv.y + d.dv.y) / 6,
  );
  const dp = new Vec2(
    (a.dp.x + 2 * bd.dp.x + 2 * c.dp.x + d.dp.x) / 6,
    (a.dp.y + 2 * bd.dp.y + 2 * c.dp.y + d.dp.y) / 6,
  );

  const newPos = body.position.add(dp.scale(dt));
  const newVel = body.velocity.add(dv.scale(dt));
  const finalForces = getForces({ ...body, position: newPos, velocity: newVel });

  return { position: newPos, velocity: newVel, acceleration: dv, forcesAtEnd: finalForces };
}

/**
 * 欧拉法积分（备用）
 */
export function eulerStep(
  body: PhysicalBody,
  dt: number,
  getForces: (b: PhysicalBody) => Force[],
): { position: Vec2; velocity: Vec2; acceleration: Vec2; forcesAtEnd: Force[] } {
  const forces = getForces(body);
  const netF = forces.reduce((acc, f) => acc.add(f.vector), Vec2.zero());
  const acc = body.mass > 0 ? netF.scale(1 / body.mass) : Vec2.zero();
  return {
    position: body.position.add(body.velocity.scale(dt)),
    velocity: body.velocity.add(acc.scale(dt)),
    acceleration: acc,
    forcesAtEnd: forces,
  };
}
