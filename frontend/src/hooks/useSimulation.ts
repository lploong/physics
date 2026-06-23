// ============================================================
// 模拟动画 Hook
// ============================================================

import { useEffect, useRef } from "react";
import { useSimulationStore } from "../store/simulation";

export function useSimulation() {
  const {
    result,
    isRunning,
    isPaused,
    currentTime,
    playbackSpeed,
    setCurrentFrame,
    currentFrame,
    currentRenderInfo,
  } = useSimulationStore();

  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!result || !isRunning || isPaused) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
      return;
    }

    const fps = 60;
    const dtPerFrame = (1 / fps) * playbackSpeed;

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = (timestamp - lastTimeRef.current) / 1000;

      if (elapsed >= dtPerFrame) {
        lastTimeRef.current = timestamp;
        const store = useSimulationStore.getState();
        const r = store.result;
        if (!r) return;

        const newTime = store.currentTime + dtPerFrame;
        const total = store.compareMode
          ? Math.max(r.totalTime, store.compareResult?.totalTime ?? r.totalTime)
          : r.totalTime;

        if (newTime >= total) {
          store.pauseSimulation();
          const lastIdx = Math.max(
            r.frames.length - 1,
            (store.compareResult?.frames.length ?? r.frames.length) - 1,
          );
          store.setCurrentFrame(lastIdx);
          return;
        }

        const frameIndex = Math.floor(newTime / (r.totalTime / (r.frames.length - 1)));
        store.setCurrentFrame(Math.min(frameIndex, r.frames.length - 1));

        // 对比模式：同步更新 B 面的帧
        if (store.compareMode && store.compareResult) {
          const cr = store.compareResult;
          const cbIdx = Math.min(
            Math.floor(newTime / (cr.totalTime / (cr.frames.length - 1))),
            cr.frames.length - 1,
          );
          useSimulationStore.setState({
            compareCurrentFrame: cr.frames[cbIdx],
          });
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      lastTimeRef.current = 0;
    };
  }, [result, isRunning, isPaused, playbackSpeed]);

  return { currentFrame, currentRenderInfo, currentTime };
}
