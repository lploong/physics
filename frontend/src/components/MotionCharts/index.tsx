// ============================================================
// 运动学数据图表：x-t, v-t, a-t 实时曲线
// ============================================================

import { useMemo, useEffect, useRef } from "react";
import { SimulationResult } from "../../engine/types";
import { useContainerSize } from "../../hooks/useContainerSize";

interface Props {
  result: SimulationResult | null;
  currentTime: number;
}

interface SeriesData {
  times: number[];
  x: number[];
  y: number[];
  vx: number[];
  vy: number[];
  ax: number[];
  ay: number[];
  speed: number[];
  accMag: number[];
}

function extractSeries(result: SimulationResult, bodyId: string): SeriesData | null {
  const frames = result.frames;
  if (frames.length === 0) return null;

  const data: SeriesData = {
    times: [],
    x: [], y: [],
    vx: [], vy: [],
    ax: [], ay: [],
    speed: [],
    accMag: [],
  };

  for (const frame of frames) {
    const body = frame.bodies.find((b) => b.id === bodyId);
    if (!body) continue;
    data.times.push(frame.time);
    data.x.push(body.position[0]);
    data.y.push(body.position[1]);
    data.vx.push(body.velocity[0]);
    data.vy.push(body.velocity[1]);
    data.ax.push(body.acceleration[0]);
    data.ay.push(body.acceleration[1]);
    data.speed.push(Math.sqrt(body.velocity[0] ** 2 + body.velocity[1] ** 2));
    data.accMag.push(Math.sqrt(body.acceleration[0] ** 2 + body.acceleration[1] ** 2));
  }

  return data;
}

function drawLineChart(
  ctx: CanvasRenderingContext2D,
  data: SeriesData,
  key: keyof SeriesData,
  color: string,
  label: string,
  chartX: number, chartY: number, chartW: number, chartH: number,
  currentTime: number,
  yLabel: string,
) {
  const allVals = data[key] as number[];
  if (allVals.length < 2 || data.times.length < 2) return;

  // 找到当前时间对应的数据截止索引
  let endIndex = allVals.length;
  for (let i = 0; i < data.times.length; i++) {
    if (data.times[i] > currentTime + 0.001) {
      endIndex = i + 1;
      break;
    }
  }

  // 截取到当前时间的数据
  const vals = allVals.slice(0, endIndex);
  const times = data.times.slice(0, endIndex);
  if (vals.length < 1) return;

  const tMax = data.times[data.times.length - 1];  // x轴用完整时间范围
  const margin = { top: 25, right: 15, bottom: 30, left: 50 };
  const pw = chartW - margin.left - margin.right;
  const ph = chartH - margin.top - margin.bottom;

  // 计算 Y 范围（用切片后的数据，但也要考虑全量数据让图表更稳定）
  let yMin = Infinity, yMax = -Infinity;
  const fullVals = allVals;  // 使用全量数据计算范围，让轴不跳
  for (const v of fullVals) {
    if (v < yMin) yMin = v;
    if (v > yMax) yMax = v;
  }
  const yRange = yMax - yMin || 1;
  yMin -= yRange * 0.1;
  yMax += yRange * 0.1;

  const toX = (t: number) => margin.left + (t / tMax) * pw;
  const toY = (v: number) => margin.top + ph - ((v - yMin) / (yMax - yMin)) * ph;

  // 背景
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(chartX, chartY, chartW, chartH);

  // 网格
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = margin.top + (ph * i) / 4;
    ctx.beginPath(); ctx.moveTo(chartX + margin.left, chartY + y); ctx.lineTo(chartX + chartW - margin.right, chartY + y); ctx.stroke();
  }

  // 数据线
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < vals.length; i++) {
    const px = chartX + toX(times[i]);
    const py = chartY + toY(vals[i]);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // 当前时间指示线
  if (currentTime > 0 && currentTime <= tMax) {
    const cx = chartX + toX(currentTime);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, chartY + margin.top);
    ctx.lineTo(cx, chartY + margin.top + ph);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 轴
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(chartX + margin.left, chartY + margin.top); ctx.lineTo(chartX + margin.left, chartY + margin.top + ph); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(chartX + margin.left, chartY + margin.top + ph); ctx.lineTo(chartX + margin.left + pw, chartY + margin.top + ph); ctx.stroke();

  // 标签
  ctx.font = "10px sans-serif";
  ctx.fillStyle = "#475569";
  ctx.textAlign = "center";
  ctx.fillText(label, chartX + chartW / 2, chartY + 14);
  ctx.fillText("t (s)", chartX + chartW / 2, chartY + chartH - 4);

  // Y 标签
  ctx.save();
  ctx.translate(chartX + 10, chartY + margin.top + ph / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();

  // Y 轴刻度
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const val = yMin + (yMax - yMin) * (i / 4);
    ctx.fillText(val.toFixed(1), chartX + margin.left - 4, chartY + toY(val) + 4);
  }
}

export default function MotionCharts({ result, currentTime }: Props) {
  const { ref, width, height } = useContainerSize<HTMLDivElement>();

  const series = useMemo(() => {
    if (!result) return null;
    // 取第一个物体
    const bodyIds = [...new Set(result.frames.flatMap((f) => f.bodies.map((b) => b.id)))];
    if (bodyIds.length === 0) return null;
    return extractSeries(result, bodyIds[0]);
  }, [result]);

  if (!series || !result) {
    return (
      <div ref={ref} className="flex items-center justify-center h-full text-slate-400 text-sm">
        <div className="text-center">
          <svg className="w-10 h-10 mx-auto mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <p className="text-xs">运行模拟后显示数据图表</p>
        </div>
      </div>
    );
  }

  // 分成三个等宽子图
  const chartW = width / 3;
  const chartH = height;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0 || !series || !result) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const cw = width / 3;
    drawLineChart(ctx, series, "x", "#3b82f6", "位移 x (m)", 0, 0, cw, chartH, currentTime, "x (m)");
    drawLineChart(ctx, series, "speed", "#ef4444", "速度 |v| (m/s)", cw, 0, cw, chartH, currentTime, "v (m/s)");
    drawLineChart(ctx, series, "accMag", "#f59e0b", "加速度 |a| (m/s²)", cw * 2, 0, cw, chartH, currentTime, "a (m/s²)");
  }, [series, result, width, height, currentTime]);

  return (
    <div ref={ref} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ background: "#f8fafc" }}
      />
    </div>
  );
}
