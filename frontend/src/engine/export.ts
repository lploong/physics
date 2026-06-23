// ============================================================
// 模拟数据导出
// ============================================================

import { SimulationResult } from "../engine/types";

/** 导出模拟结果为 CSV 字符串 */
export function exportToCSV(result: SimulationResult): string {
  if (!result || result.frames.length === 0) return "";

  const bodyIds = [...new Set(result.frames.flatMap((f) => f.bodies.map((b) => b.id)))];

  // CSV 头部
  const headers = ["t"];
  for (const id of bodyIds) {
    headers.push(`${id}_x`, `${id}_y`, `${id}_vx`, `${id}_vy`, `${id}_ax`, `${id}_ay`, `${id}_speed`);
  }

  const rows: string[] = [headers.join(",")];

  // 数据行
  for (const frame of result.frames) {
    const row: string[] = [frame.time.toFixed(4)];
    for (const id of bodyIds) {
      const body = frame.bodies.find((b) => b.id === id);
      if (body) {
        const speed = Math.sqrt(body.velocity[0] ** 2 + body.velocity[1] ** 2);
        row.push(
          body.position[0].toFixed(4),
          body.position[1].toFixed(4),
          body.velocity[0].toFixed(4),
          body.velocity[1].toFixed(4),
          body.acceleration[0].toFixed(4),
          body.acceleration[1].toFixed(4),
          speed.toFixed(4),
        );
      } else {
        row.push("", "", "", "", "", "", "");
      }
    }
    rows.push(row.join(","));
  }

  return rows.join("\n");
}

/** 触发浏览器下载 CSV 文件 */
export function downloadCSV(result: SimulationResult, filename?: string): void {
  const csv = exportToCSV(result);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }); // BOM for Excel Chinese
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `physics-sim-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
