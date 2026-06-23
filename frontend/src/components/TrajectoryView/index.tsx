// ============================================================
// Canvas 运动轨迹组件（响应式）
// ============================================================

import { useEffect, useRef } from "react";
import { SimulationResult, FrameSnapshot } from "../../engine/types";
import { Vec2 } from "../../engine/types";
import { useContainerSize } from "../../hooks/useContainerSize";

interface Props {
  result: SimulationResult | null;
  currentFrame: FrameSnapshot | null;
  currentFrameIndex: number;
}

/** 坐标转换 */
function toCanvas(x: number, y: number, scale: number, offX: number, offY: number) {
  return { x: x * scale + offX, y: y * scale + offY };
}

export default function TrajectoryView({ result, currentFrame, currentFrameIndex }: Props) {
  const { ref: containerRef, width: cw, height: ch } = useContainerSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 高 DPI 适配
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const canvasW = cw * dpr;
  const canvasH = ch * dpr;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cw === 0 || ch === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvas 物理尺寸 = CSS 尺寸 * DPR
    canvas.width = canvasW;
    canvas.height = canvasH;
    ctx.scale(dpr, dpr);

    const scale = Math.min(50, Math.max(20, Math.min(cw, ch) / 12));
    const offX = cw / 2;
    const offY = ch * 0.6;

    // 清空画布
    ctx.clearRect(0, 0, cw, ch);

    // 背景网格
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 0.5;
    for (let x = offX % scale; x < cw; x += scale) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
    }
    for (let y = offY % scale; y < ch; y += scale) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
    }

    // 坐标轴
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 2]);
    ctx.beginPath(); ctx.moveTo(0, offY); ctx.lineTo(cw, offY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(offX, 0); ctx.lineTo(offX, ch); ctx.stroke();
    ctx.setLineDash([]);

    // 地面线
    ctx.strokeStyle = "#78716c";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, offY); ctx.lineTo(cw, offY); ctx.stroke();
    ctx.font = "10px sans-serif";
    ctx.fillStyle = "#78716c";
    ctx.fillText("地面", 6, offY - 6);

    if (!result) {
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "center";
      ctx.fillText('点击"开始模拟"查看运动轨迹', cw / 2, ch / 2);
      return;
    }

    // 绘制完整轨迹
    const bodyIds = [...new Set(result.frames.flatMap((f) => f.bodies.map((b) => b.id)))];
    const colors = ["#3b82f6", "#ef4444", "#8b5cf6", "#f59e0b", "#22c55e"];

    bodyIds.forEach((bodyId, idx) => {
      const color = colors[idx % colors.length];

      // 只绘制到当前帧为止的轨迹（动画效果）
      const maxFrame = Math.min(currentFrameIndex, result.frames.length - 1);

      for (let i = 1; i <= maxFrame; i++) {
        const prev = result.frames[i - 1].bodies.find((b) => b.id === bodyId);
        const curr = result.frames[i].bodies.find((b) => b.id === bodyId);
        if (!prev || !curr) continue;

        const alpha = 0.3 + 0.7 * (i / Math.max(maxFrame, 1));
        const p1 = toCanvas(prev.position[0], prev.position[1], scale, offX, offY);
        const p2 = toCanvas(curr.position[0], curr.position[1], scale, offX, offY);

        ctx.strokeStyle = `rgba(${hexToRgb(color)}, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    });

    // 当前帧物体位置
    if (currentFrame) {
      currentFrame.bodies.forEach((body, idx) => {
        const origBody = result.config.scene.bodies.find((b) => b.id === body.id);
        const color = origBody?.color ?? colors[idx % colors.length];
        const pos = toCanvas(body.position[0], body.position[1], scale, offX, offY);
        const size = origBody?.size ?? [1, 1];
        const shape = origBody?.shape ?? "point";

        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.9;

        const sx = size[0] * scale;
        const sy = size[1] * scale;

        if (shape === "circle") {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, sx * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          const rx = 3 * scale / 40;
          roundRect(ctx, pos.x - sx / 2, pos.y - sy / 2, sx, sy, rx);
          ctx.fill();
          ctx.stroke();
        }

        ctx.globalAlpha = 1;

        // 速度矢量
        const v = new Vec2(body.velocity[0], body.velocity[1]);
        const vMag = v.magnitude();
        if (vMag > 0.05) {
          const vDir = v.normalize();
          const vLen = Math.min(vMag * 0.8 * scale / 10, 80);
          const vx = pos.x + vDir.x * vLen;
          const vy = pos.y + vDir.y * vLen;

          ctx.strokeStyle = "#0ea5e9";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 2]);
          ctx.beginPath(); ctx.moveTo(pos.x, pos.y); ctx.lineTo(vx, vy); ctx.stroke();
          ctx.setLineDash([]);

          const angle = Math.atan2(vDir.y, vDir.x);
          drawArrowHead(ctx, vx, vy, angle, "#0ea5e9");

          ctx.font = "10px sans-serif";
          ctx.fillStyle = "#0ea5e9";
          ctx.fillText(`v=${vMag.toFixed(1)}m/s`, vx + 5, vy - 5);
        }

        if (idx === 0) {
          ctx.font = "12px sans-serif";
          ctx.fillStyle = "#64748b";
          ctx.fillText(`t=${currentFrame.time.toFixed(2)}s`, 10, 20);
        }
      });
    }
  }, [result, currentFrame, currentFrameIndex, cw, ch, canvasW, canvasH, dpr]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas
        ref={canvasRef}
        width={canvasW}
        height={canvasH}
        className="w-full h-full"
        style={{ background: "#f8fafc" }}
      />
    </div>
  );
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "59, 130, 246";
}

function drawArrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string) {
  const headLen = 8;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(
    x - headLen * Math.cos(angle - Math.PI / 6),
    y - headLen * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    x - headLen * Math.cos(angle + Math.PI / 6),
    y - headLen * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
