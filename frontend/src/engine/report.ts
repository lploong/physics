// ============================================================
// 截图导出 & 实验报告生成
// ============================================================

import { SimulationResult, FrameSnapshot } from "../engine/types";
import { SceneParams, SceneType } from "../store/simulation";

/** 场景名称映射 */
const sceneNames: Record<string, string> = {
  incline: "斜面运动",
  projectile: "抛体运动",
  circular_horizontal: "水平圆周运动",
  circular_vertical: "竖直圆周运动",
  connected_bodies: "连接体",
  free_body: "自由物体",
  plank_block: "板块模型",
  conveyor_belt: "传送带",
  spring_oscillator: "弹簧振子",
  pulley: "滑轮系统",
  electric_field: "电场运动",
  magnetic_field: "磁场运动",
};

/** 导出 SVG 元素为 PNG */
export function exportSVGAsPNG(svgElement: SVGElement, filename: string): void {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const dpr = window.devicePixelRatio || 1;
    const rect = svgElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.drawImage(img, 0, 0, rect.width, rect.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
    }, "image/png");
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

/** 导出 Canvas 为 PNG */
export function exportCanvasAsPNG(canvasElement: HTMLCanvasElement, filename: string): void {
  canvasElement.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }, "image/png");
}

/** 生成实验报告文本 */
export function generateReport(
  sceneType: SceneType,
  params: SceneParams,
  result: SimulationResult | null,
  currentFrame: FrameSnapshot | null,
): string {
  const sceneName = sceneNames[sceneType] ?? sceneType;
  const lines: string[] = [
    "=" .repeat(50),
    `  物理可视化 —— 实验报告`,
    "=" .repeat(50),
    "",
    `场景类型: ${sceneName}`,
    `模拟时长: ${params.simDuration}s`,
    `时间步长: ${params.simTimeStep}s`,
    "",
    "--- 场景参数 ---",
  ];

  // 通用
  lines.push(`质量: ${params.mass} kg`);

  // 场景特定
  switch (sceneType) {
    case "incline":
      lines.push(`斜面角度: ${params.inclineAngle}°`);
      lines.push(`摩擦系数: ${params.inclineFriction}`);
      lines.push(`斜面长度: ${params.inclineLength} m`);
      lines.push(`初速度: ${params.inclineInitV} m/s`);
      break;
    case "projectile":
      lines.push(`初速度: ${params.projSpeed} m/s`);
      lines.push(`发射角: ${params.projAngle}°`);
      lines.push(`初始高度: ${params.projHeight} m`);
      break;
    case "circular_horizontal":
    case "circular_vertical":
      lines.push(`绳长: ${params.circRadius} m`);
      lines.push(`速度: ${params.circSpeed} m/s`);
      break;
    case "spring_oscillator":
      lines.push(`劲度系数: ${params.springK} N/m`);
      lines.push(`振幅: ${params.springAmplitude} m`);
      break;
    case "pulley":
      lines.push(`物体1质量: ${params.pulleyMass1} kg`);
      lines.push(`物体2质量: ${params.pulleyMass2} kg`);
      break;
  }

  // 当前帧数据
  if (currentFrame && result) {
    const body = currentFrame.bodies[0];
    if (body) {
      const vx = body.velocity[0];
      const vy = body.velocity[1];
      const speed = Math.sqrt(vx * vx + vy * vy);
      const ax = body.acceleration[0];
      const ay = body.acceleration[1];
      const origBody = result.config.scene.bodies.find((b) => b.id === body.id);
      const m = origBody?.mass ?? params.mass;
      const g = result.config.scene.gravity[1];
      const ep = m * Math.abs(g) * Math.max(0, body.position[1]);

      lines.push("");
      lines.push(`--- t = ${currentFrame.time.toFixed(3)}s ---`);
      lines.push(`位置: (${body.position[0].toFixed(4)}, ${body.position[1].toFixed(4)}) m`);
      lines.push(`速度: (${vx.toFixed(4)}, ${vy.toFixed(4)}) m/s  |v|=${speed.toFixed(4)}`);
      lines.push(`加速度: (${ax.toFixed(4)}, ${ay.toFixed(4)}) m/s²`);
      lines.push(`动能: ${(0.5 * m * speed * speed).toFixed(4)} J`);
      lines.push(`势能: ${ep.toFixed(4)} J`);
      lines.push(`机械能: ${(0.5 * m * speed * speed + ep).toFixed(4)} J`);

      if (body.forces.length > 0) {
        lines.push("");
        lines.push("受力分析:");
        for (const f of body.forces) {
          const fm = Math.sqrt(f.vector[0] ** 2 + f.vector[1] ** 2);
          if (fm < 0.001) continue;
          lines.push(`  ${f.label} → (${f.vector[0].toFixed(2)}, ${f.vector[1].toFixed(2)}) N`);
        }
      }
    }
  }

  lines.push("");
  lines.push("=" .repeat(50));
  lines.push(`生成时间: ${new Date().toLocaleString("zh-CN")}`);

  return lines.join("\n");
}

/** 下载报告为 txt 文件 */
export function downloadReport(text: string, filename?: string): void {
  const blob = new Blob(["\uFEFF" + text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename ?? `physics-report-${Date.now()}.txt`;
  a.click();
}
