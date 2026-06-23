// ============================================================
// 模拟控制栏
// ============================================================

import { useSimulationStore } from "../../store/simulation";
import { downloadCSV } from "../../engine/export";

export default function SimulationControl() {
  const {
    isRunning,
    isPaused,
    hasComputed,
    computationProgress,
    currentTime,
    currentFrameIndex,
    result,
    playbackSpeed,
    startPlayback,
    pauseSimulation,
    resumeSimulation,
    resetSimulation,
    setPlaybackSpeed,
    stepForward,
    stepBackward,
  } = useSimulationStore();

  const totalTime = result?.totalTime ?? 0;
  const progress = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;
  const totalFrames = result?.frames.length ?? 0;

  return (
    <div className="flex items-center gap-2 md:gap-3 px-2 md:px-4 py-1.5 md:py-2 bg-white border-b border-slate-200 shrink-0">
      {/* 计算进度 */}
      {computationProgress > 0 && computationProgress < 1 && (
        <div className="flex items-center gap-2 flex-1">
          <span className="text-[10px] text-blue-500 animate-pulse">⏳ 计算中...</span>
          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${computationProgress * 100}%` }}
            />
          </div>
        </div>
      )}
      {/* 时间进度条 */}
      <div className="flex-1 flex items-center gap-2 md:gap-3">
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          readOnly
          className="flex-1 h-1 md:h-1.5 bg-slate-200 rounded-full appearance-none
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 md:[&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-2.5 md:[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-blue-500"
        />
        <span className="text-[10px] md:text-xs text-slate-500 font-mono w-20 md:w-32 text-right whitespace-nowrap">
          {currentTime.toFixed(1)}s / {totalTime.toFixed(1)}s
          {totalFrames > 0 && <span className="hidden md:inline"> ({currentFrameIndex + 1}/{totalFrames})</span>}
        </span>
      </div>

      {/* 控制按钮 */}
      <div className="flex items-center gap-0.5 md:gap-1">
        <button
          onClick={stepBackward}
          disabled={!hasComputed}
          className="px-1 md:px-2 py-1 md:py-1.5 text-slate-500 hover:bg-slate-100 rounded text-xs md:text-sm disabled:opacity-30"
          title="后退一帧"
        >
          ⏮
        </button>

        {!isRunning ? (
          <button
            onClick={startPlayback}
            className="px-2 md:px-3 py-1 md:py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs md:text-sm rounded-md transition-colors"
          >
            {hasComputed ? "▶" : "▶"}
          </button>
        ) : isPaused ? (
          <button
            onClick={resumeSimulation}
            className="px-2 md:px-3 py-1 md:py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs md:text-sm rounded-md"
          >
            ▶
          </button>
        ) : (
          <button
            onClick={pauseSimulation}
            className="px-2 md:px-3 py-1 md:py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs md:text-sm rounded-md"
          >
            ⏸
          </button>
        )}

        <button
          onClick={stepForward}
          disabled={!hasComputed}
          className="px-1 md:px-2 py-1 md:py-1.5 text-slate-500 hover:bg-slate-100 rounded text-xs md:text-sm disabled:opacity-30"
          title="前进一帧"
        >
          ⏭
        </button>

        <button
          onClick={resetSimulation}
          className="px-2 md:px-3 py-1 md:py-1.5 bg-slate-500 hover:bg-slate-600 text-white text-xs md:text-sm rounded-md disabled:opacity-30"
          disabled={!hasComputed}
        >
          ↺
        </button>

        <div className="flex items-center gap-0.5 ml-1 md:ml-2">
          {[0.5, 1, 2].map((speed) => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`px-1 py-0.5 text-[10px] md:text-xs rounded ${
                playbackSpeed === speed
                  ? "bg-blue-100 text-blue-700 font-semibold"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {result && (
          <button
            onClick={() => downloadCSV(result)}
            className="px-1.5 md:px-2 py-1 md:py-1.5 text-[10px] md:text-xs text-slate-600 hover:bg-slate-100 rounded-md ml-1 md:ml-2"
            title="导出 CSV"
          >
            📥
          </button>
        )}
      </div>
    </div>
  );
}
