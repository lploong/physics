// ============================================================
// API 客户端
// ============================================================

const BASE_URL = "/api";

export interface ProblemRecord {
  id: number;
  scene_type: string;
  scene_json: string;
  text: string;
  image_urls: string[];
  source: string;
  created_at: string;
}

export async function saveProblem(data: {
  scene_type: string;
  scene_json: object;
  text?: string;
  image_urls?: string[];
}): Promise<ProblemRecord> {
  const res = await fetch(`${BASE_URL}/problems`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("保存失败");
  return res.json();
}

export async function getProblems(): Promise<ProblemRecord[]> {
  const res = await fetch(`${BASE_URL}/problems`);
  if (!res.ok) throw new Error("获取列表失败");
  return res.json();
}

export async function getProblem(id: number): Promise<ProblemRecord> {
  const res = await fetch(`${BASE_URL}/problems/${id}`);
  if (!res.ok) throw new Error("获取详情失败");
  return res.json();
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("上传失败");
  return res.json();
}

// AI 解析接口（预留）
export async function parseProblem(input: {
  text?: string;
  image_url?: string;
}): Promise<{ scene_config: object }> {
  const res = await fetch(`${BASE_URL}/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("解析失败");
  return res.json();
}
