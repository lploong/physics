// ============================================================
// URL 分享：将场景参数编码到 URL hash
// ============================================================

import { SceneParams, SceneType } from "../store/simulation";

/** 将场景编码为 URL hash */
export function encodeSceneToURL(
  sceneType: SceneType,
  params: SceneParams,
): void {
  const data = JSON.stringify({ t: sceneType, p: params });
  const encoded = btoa(encodeURIComponent(data));
  window.location.hash = encoded;
}

/** 从 URL hash 解码场景 */
export function decodeSceneFromURL(): { sceneType: SceneType; params: SceneParams } | null {
  try {
    const hash = window.location.hash.slice(1);
    if (!hash) return null;
    const decoded = JSON.parse(decodeURIComponent(atob(hash)));
    if (decoded.t && decoded.p) {
      return { sceneType: decoded.t as SceneType, params: decoded.p as SceneParams };
    }
  } catch {
    // 解码失败
  }
  return null;
}

/** 获取当前完整分享链接 */
export function getShareURL(): string {
  const url = new URL(window.location.href);
  url.hash = window.location.hash;
  return url.toString();
}

/** 复制到剪贴板 */
export async function copyShareURL(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(getShareURL());
    return true;
  } catch {
    return false;
  }
}
