// ============================================================
// 实时物理量数值显示面板
// ============================================================

import { FrameSnapshot, SimulationResult } from "../../engine/types";

interface Props {
  result: SimulationResult | null;
  currentFrame: FrameSnapshot | null;
}

function formatNum(v: number, decimals = 3): string {
  if (Math.abs(v) < 1e-10) return "0";
  if (Math.abs(v) < 0.001 || Math.abs(v) > 9999) return v.toExponential(decimals);
  return v.toFixed(decimals);
}

export default function NumericPanel({ result, currentFrame }: Props) {
  if (!result || !currentFrame) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <p className="text-xs text-center px-2">运行模拟后<br />显示实时数值</p>
      </div>
    );
  }

  const body = currentFrame.bodies[0];
  if (!body) return null;

  const vx = body.velocity[0];
  const vy = body.velocity[1];
  const ax = body.acceleration[0];
  const ay = body.acceleration[1];
  const speed = Math.sqrt(vx * vx + vy * vy);

  // 动能
  const origBody = result.config.scene.bodies.find((b) => b.id === body.id);
  const mass = origBody?.mass ?? 1;
  const ek = 0.5 * mass * speed * speed;

  // 重力势能（以 y=0 为参考面）
  const g = result.config.scene.gravity[1];
  const ep = mass * Math.abs(g) * Math.max(0, body.position[1]);

  return (
    <div className="h-full overflow-y-auto p-2 md:p-3 font-mono text-xs" style={{ background: "#fafafa" }}>
      <div className="mb-2 pb-2 border-b border-slate-200">
        <span className="text-slate-500">t = </span>
        <span className="text-blue-600 font-bold">{currentFrame.time.toFixed(3)} s</span>
      </div>

      <table className="w-full text-left">
        <thead>
          <tr className="text-slate-400 text-[10px]">
            <th className="pb-1">物理量</th>
            <th className="pb-1 text-right">x</th>
            <th className="pb-1 text-right">y</th>
            <th className="pb-1 text-right">模</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-100">
            <td className="py-0.5 text-slate-500">位置</td>
            <td className="py-0.5 text-right text-blue-600">{formatNum(body.position[0])}</td>
            <td className="py-0.5 text-right text-blue-600">{formatNum(body.position[1])}</td>
            <td className="py-0.5 text-right text-slate-400">m</td>
          </tr>
          <tr className="border-b border-slate-100">
            <td className="py-0.5 text-slate-500">速度</td>
            <td className="py-0.5 text-right text-green-600">{formatNum(vx)}</td>
            <td className="py-0.5 text-right text-green-600">{formatNum(vy)}</td>
            <td className="py-0.5 text-right text-green-600 font-semibold">{formatNum(speed)}</td>
          </tr>
          <tr className="border-b border-slate-100">
            <td className="py-0.5 text-slate-500">加速度</td>
            <td className="py-0.5 text-right text-red-600">{formatNum(ax)}</td>
            <td className="py-0.5 text-right text-red-600">{formatNum(ay)}</td>
            <td className="py-0.5 text-right text-red-600">{formatNum(Math.sqrt(ax * ax + ay * ay))}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-3 pt-2 border-t border-slate-200">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">动能 Eₖ</span>
          <span className="text-purple-600 font-semibold">{formatNum(ek)} J</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-slate-500">势能 Eₚ</span>
          <span className="text-purple-600 font-semibold">{formatNum(ep)} J</span>
        </div>
        <div className="flex justify-between text-xs mt-1 pt-1 border-t border-slate-100">
          <span className="text-slate-500">机械能 E</span>
          <span className="text-purple-700 font-bold">{formatNum(ek + ep)} J</span>
        </div>
      </div>

      {/* 力信息 */}
      <div className="mt-3 pt-2 border-t border-slate-200">
        <div className="text-[10px] text-slate-400 mb-1">当前受力</div>
        {body.forces.map((f, i) => {
          const fmag = Math.sqrt(f.vector[0] * f.vector[0] + f.vector[1] * f.vector[1]);
          if (fmag < 0.001) return null;
          return (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-slate-500">{f.label}</span>
              <span className="text-slate-700 font-medium">
                ({formatNum(f.vector[0])}, {formatNum(f.vector[1])}) N
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
