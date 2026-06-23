// ============================================================
// SVG 受力分析图组件（响应式）
// ============================================================

import { useMemo } from "react";
import { SceneRenderInfo, Vec2 } from "../../engine/types";
import { useContainerSize } from "../../hooks/useContainerSize";

/** 绘制弹簧锯齿线 */
function renderSpringCoil(
  x1: number, y1: number, x2: number, y2: number,
  coils: number, amplitude: number,
): React.ReactNode {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 2) return null;

  const nx = -dy / length; // 法向量 x
  const ny = dx / length;  // 法向量 y
  const segments = coils * 2 + 1;
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    const offset = (i % 2 === 0 ? 0 : (i % 4 === 1 ? amplitude : -amplitude)) * (i > 0 && i < segments ? 1 : 0.5);
    points.push({ x: px + nx * offset, y: py + ny * offset });
  }

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return <path d={pathD} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />;
}

interface Props {
  renderInfo: SceneRenderInfo | null;
}

/** 坐标系变换：物理坐标 → SVG 像素坐标 */
function toSvg(x: number, y: number, scale: number, offsetX: number, offsetY: number) {
  return { x: x * scale + offsetX, y: y * scale + offsetY };
}

/** 力的颜色映射 */
function forceColor(type: string): string {
  switch (type) {
    case "gravity": return "#ef4444";
    case "normal": return "#22c55e";
    case "friction": return "#f59e0b";
    case "static_friction": return "#f59e0b";
    case "tension": return "#8b5cf6";
    case "spring": return "#ec4899";
    case "applied": return "#3b82f6";
    case "electric": return "#06b6d4";
    case "magnetic": return "#14b8a6";
    default: return "#94a3b8";
  }
}

export default function ForceDiagram({ renderInfo }: Props) {
  const { ref, width, height } = useContainerSize<HTMLDivElement>();

  // 根据容器大小动态计算 scale（每米像素数）
  const scale = Math.min(50, Math.max(20, Math.min(width, height) / 12));
  const offsetX = width / 2;
  const offsetY = height * 0.6;

  // 斜面绘制数据
  const inclineData = useMemo(() => {
    if (!renderInfo) return null;
    const incline = renderInfo.constraints.find((c) => c.type === "incline_plane");
    if (!incline || incline.type !== "incline_plane") return null;

    const rad = (incline.angle * Math.PI) / 180;
    const length = incline.length ?? 8;
    const pivotIncline = renderInfo.bodies[0]
      ? new Vec2(incline.pivot[0], incline.pivot[1])
      : new Vec2(0, 0);

    const endX = pivotIncline.x + length * Math.cos(rad);
    const endY = pivotIncline.y + length * Math.sin(rad);

    return { pivotIncline, endX, endY, length, angle: incline.angle, rad };
  }, [renderInfo]);

  if (!renderInfo) {
    return (
      <div ref={ref} className="flex items-center justify-center h-full text-slate-400 text-sm">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>点击"开始模拟"查看受力分析</p>
        </div>
      </div>
    );
  }

  const { bodies } = renderInfo;

  return (
    <div ref={ref} className="w-full h-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        style={{ background: "#f8fafc" }}
      >
        {/* 网格背景 */}
        <defs>
          <pattern id="grid" width={scale} height={scale} patternUnits="userSpaceOnUse">
            <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />

        {/* 坐标轴 */}
        <line x1={0} y1={offsetY} x2={width} y2={offsetY} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 2" />
        <line x1={offsetX} y1={0} x2={offsetX} y2={height} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 2" />

        {/* 地面 */}
        <line x1={0} y1={offsetY} x2={width} y2={offsetY} stroke="#78716c" strokeWidth="2" />
        <text x={10} y={offsetY - 6} fontSize="10" fill="#78716c" fontWeight="500">地面</text>

        {/* 斜面 */}
        {inclineData && (
          <g>
            <line
              x1={toSvg(inclineData.pivotIncline.x, inclineData.pivotIncline.y, scale, offsetX, offsetY).x}
              y1={toSvg(inclineData.pivotIncline.x, inclineData.pivotIncline.y, scale, offsetX, offsetY).y}
              x2={toSvg(inclineData.endX, inclineData.endY, scale, offsetX, offsetY).x}
              y2={toSvg(inclineData.endX, inclineData.endY, scale, offsetX, offsetY).y}
              stroke="#64748b"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <text
              x={toSvg(inclineData.endX / 2, inclineData.endY / 2 - 0.5, scale, offsetX, offsetY).x}
              y={toSvg(inclineData.endX / 2, inclineData.endY / 2 - 0.5, scale, offsetX, offsetY).y}
              fontSize="12" fill="#64748b" textAnchor="middle"
            >
              θ={inclineData.angle}°
            </text>
          </g>
        )}

        {/* 圆心 + 轨迹圆（圆周运动） */}
        {renderInfo.constraints.some((c) => c.type === "rope" && c.pivot) && (() => {
          const rope = renderInfo.constraints.find((c) => c.type === "rope" && c.pivot);
          if (!rope || rope.type !== "rope" || !rope.pivot) return null;
          const pivot = toSvg(rope.pivot[0], rope.pivot[1], scale, offsetX, offsetY);
          return (
            <g>
              <circle cx={pivot.x} cy={pivot.y} r="4" fill="#64748b" />
              <circle cx={pivot.x} cy={pivot.y} r={rope.length * scale}
                fill="none" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="4 2" />
              <text x={pivot.x + 8} y={pivot.y - 8} fontSize="11" fill="#64748b">r={rope.length}m</text>
            </g>
          );
        })()}

        {/* 物体及其受力 */}
        {bodies.map((body) => {
          const pos = toSvg(body.position.x, body.position.y, scale, offsetX, offsetY);

          return (
            <g key={body.id}>
              {/* 绳线 */}
              {renderInfo.constraints.some((c) => c.type === "rope" && c.pivot) && (() => {
                const rope = renderInfo.constraints.find((c) => c.type === "rope" && c.pivot);
                if (!rope || rope.type !== "rope" || !rope.pivot) return null;
                const pivot = toSvg(rope.pivot[0], rope.pivot[1], scale, offsetX, offsetY);
                return <line x1={pivot.x} y1={pivot.y} x2={pos.x} y2={pos.y} stroke="#94a3b8" strokeWidth="1.5" />;
              })()}

              {/* 弹簧线圈 */}
              {renderInfo.constraints.some((c) => c.type === "spring") && (() => {
                const spring = renderInfo.constraints.find((c) => c.type === "spring" && c.body_id === body.id);
                if (!spring || spring.type !== "spring") return null;
                const anchor = toSvg(spring.anchor[0], spring.anchor[1], scale, offsetX, offsetY);
                return (
                  <g>
                    {/* 锚点 */}
                    <line x1={anchor.x - 8} y1={anchor.y} x2={anchor.x + 8} y2={anchor.y}
                      stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
                    {/* 锯齿弹簧线 */}
                    {renderSpringCoil(anchor.x, anchor.y, pos.x, pos.y, 8, 6)}
                  </g>
                );
              })()}

              {/* 滑轮系统——定滑轮和绳子 */}
              {renderInfo.type === "pulley" && body.id === "left_mass" && (() => {
                // 滑轮圆心在中间上方
                const pulleyX = offsetX;
                const pulleyY = offsetY - 80;
                const rightBody = bodies.find((b) => b.id === "right_mass");
                const rightPos = rightBody ? toSvg(rightBody.position.x, rightBody.position.y, scale, offsetX, offsetY) : null;

                return (
                  <g>
                    {/* 轮子 */}
                    <circle cx={pulleyX} cy={pulleyY} r="18" fill="none" stroke="#64748b" strokeWidth="2.5" />
                    <circle cx={pulleyX} cy={pulleyY} r="3" fill="#64748b" />
                    {/* 左绳 */}
                    <line x1={pulleyX - 15} y1={pulleyY} x2={pos.x} y2={pos.y} stroke="#94a3b8" strokeWidth="1.5" />
                    {/* 右绳 */}
                    {rightPos && (
                      <line x1={pulleyX + 15} y1={pulleyY} x2={rightPos.x} y2={rightPos.y} stroke="#94a3b8" strokeWidth="1.5" />
                    )}
                  </g>
                );
              })()}

              {/* 物体 */}
              {body.shape === "circle" ? (
                <circle cx={pos.x} cy={pos.y} r={body.size.x * scale * 0.5}
                  fill={body.color} fillOpacity={0.8} stroke={body.color} strokeWidth="2" />
              ) : (
                <rect x={pos.x - (body.size.x * scale) / 2} y={pos.y - (body.size.y * scale) / 2}
                  width={body.size.x * scale} height={body.size.y * scale}
                  fill={body.color} fillOpacity={0.8} stroke={body.color} strokeWidth="2" rx="3" />
              )}

              {/* 力的箭头 */}
              {body.forces.map((force, i) => {
                const mag = force.vector.x ** 2 + force.vector.y ** 2;
                if (mag < 0.0001) return null;
                const fmag = Math.sqrt(mag);
                const fx = force.vector.x / fmag;
                const fy = force.vector.y / fmag;
                const arrowLen = Math.min(fmag * 0.5 * scale / 10, 100);
                const startX = pos.x; const startY = pos.y;
                const endX = pos.x + fx * arrowLen;
                const endY = pos.y + fy * arrowLen;
                const color = forceColor(force.type);
                const arrowId = `arr-${body.id}-${i}`;

                return (
                  <g key={arrowId}>
                    <defs>
                      <marker id={arrowId} viewBox="0 0 10 7" refX="10" refY="3.5"
                        markerWidth="8" markerHeight="6" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill={color} />
                      </marker>
                    </defs>
                    <line x1={startX} y1={startY} x2={endX} y2={endY}
                      stroke={color} strokeWidth="2.5"
                      markerEnd={`url(#${arrowId})`} />
                    <text x={endX + 4 * (Math.abs(fx) < 0.01 ? 0.5 : Math.sign(fx))} y={endY + 14}
                      fontSize="11" fill={color} fontWeight="600" textAnchor="middle">
                      {force.label}
                    </text>
                  </g>
                );
              })}

              {/* 速度矢量 */}
              {body.velocity.magnitude() > 0.1 && (
                <g>
                  {(() => {
                    const vDir = body.velocity.normalize();
                    const vMag = body.velocity.magnitude();
                    const vLen = Math.min(vMag * 0.8 * scale / 10, 80);
                    const vx = pos.x + vDir.x * vLen;
                    const vy = pos.y + vDir.y * vLen;
                    return (
                      <>
                        <line x1={pos.x} y1={pos.y} x2={vx} y2={vy}
                          stroke="#0ea5e9" strokeWidth="2" strokeDasharray="4 2" />
                        <text x={vx + 5} y={vy - 10} fontSize="10" fill="#0ea5e9" fontWeight="500">
                          v={vMag.toFixed(1)}m/s
                        </text>
                      </>
                    );
                  })()}
                </g>
              )}

              {/* 质量标签 */}
              <text x={pos.x} y={pos.y - body.size.y * scale * 0.5 - 10}
                fontSize="11" fill="#1e293b" fontWeight="600" textAnchor="middle">
                m={body.mass}kg
              </text>
            </g>
          );
        })}

        {/* 图例 */}
        <g transform={`translate(12, ${height - 120})`}>
          <rect x="0" y="0" width="130" height="110" fill="white" fillOpacity="0.9" rx="6" stroke="#e2e8f0" />
          {[
            { label: "重力", type: "gravity" },
            { label: "支持力", type: "normal" },
            { label: "摩擦力", type: "friction" },
            { label: "张力", type: "tension" },
            { label: "外力", type: "applied" },
          ].map((item, i) => (
            <g key={item.type} transform={`translate(10, ${18 + i * 18})`}>
              <line x1="0" y1="0" x2="20" y2="0" stroke={forceColor(item.type)} strokeWidth="2.5" />
              <text x="26" y="4" fontSize="11" fill="#475569">{item.label}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
