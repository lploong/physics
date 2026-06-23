// ============================================================
// App 主组件 — 响应式桌面/移动端布局
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { useSimulation } from "./hooks/useSimulation";
import { useSimulationStore, SceneParams } from "./store/simulation";
import SceneEditor from "./components/SceneEditor";
import ForceDiagram from "./components/ForceDiagram";
import TrajectoryView from "./components/TrajectoryView";
import MotionCharts from "./components/MotionCharts";
import NumericPanel from "./components/NumericPanel";
import QuickExamples from "./components/QuickExamples";
import SimulationControl from "./components/SimulationControl";
import { encodeSceneToURL, decodeSceneFromURL, copyShareURL } from "./engine/share-url";
import { exportSVGAsPNG, exportCanvasAsPNG, generateReport, downloadReport } from "./engine/report";

/** 可视化面板 */
function VizPanel({
  title,
  titleIcon,
  extra,
  children,
}: {
  title: string;
  titleIcon: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <div className="px-3 md:px-4 py-1.5 md:py-2 bg-slate-50 border-b border-slate-100 shrink-0 flex items-center justify-between">
        <h2 className="text-xs md:text-sm font-semibold text-slate-600 flex items-center gap-1.5 md:gap-2">
          {titleIcon}
          {title}
        </h2>
        {extra}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

export default function App() {
  const { currentRenderInfo, currentTime } = useSimulation();
  const {
    result, currentFrame, currentFrameIndex,
    compareMode,
    compareRenderInfo, compareResult, compareCurrentFrame,
  } = useSimulationStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const forceRef = useRef<HTMLDivElement>(null);
  const trajRef = useRef<HTMLDivElement>(null);

  const screenshotForce = () => {
    const el = forceRef.current?.querySelector("svg");
    if (el) exportSVGAsPNG(el as SVGElement, "force-diagram.png");
  };
  const screenshotTraj = () => {
    const el = trajRef.current?.querySelector("canvas");
    if (el) exportCanvasAsPNG(el as HTMLCanvasElement, "trajectory.png");
  };
  const handleReport = () => {
    const store = useSimulationStore.getState();
    const text = generateReport(store.sceneType, store.params, store.result, store.currentFrame);
    downloadReport(text);
  };

  // 页面加载时从 URL 恢复场景
  useEffect(() => {
    const decoded = decodeSceneFromURL();
    if (decoded) {
      const store = useSimulationStore.getState();
      store.setSceneType(decoded.sceneType);
      for (const [key, value] of Object.entries(decoded.params)) {
        if (value !== undefined) {
          (store.setParam as (k: keyof SceneParams, v: number) => void)(key as keyof SceneParams, value as number);
        }
      }
    }
  }, []);

  // 更新 URL（参数变化时）
  const updateShareURL = () => {
    const store = useSimulationStore.getState();
    encodeSceneToURL(store.sceneType, store.params);
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 不在输入框内时响应
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) return;

      const store = useSimulationStore.getState();

      switch (e.key) {
        case " ":
          e.preventDefault();
          if (!store.hasComputed) {
            store.startPlayback();
          } else if (store.isRunning && !store.isPaused) {
            store.pauseSimulation();
          } else {
            store.resumeSimulation();
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          store.stepForward();
          break;
        case "ArrowLeft":
          e.preventDefault();
          store.stepBackward();
          break;
        case "r":
        case "R":
          store.resetSimulation();
          break;
        case "f":
        case "F":
          setFullscreen((f) => !f);
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const PanelIcon = (
    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );

  const ForceIcon = (
    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  );

  const TrajIcon = (
    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
  );

  const ChartIcon = (
    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  );

  return (
    <div className="h-full flex flex-col">
      {/* 顶部标题栏 */}
      <header className="flex items-center justify-between px-3 md:px-6 py-2 md:py-3 bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center gap-2 md:gap-3">
          {/* 移动端侧边栏按钮 */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 rounded hover:bg-slate-100"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <svg className="w-3.5 h-3.5 md:w-5 md:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm md:text-lg font-bold text-slate-800">物理可视化</h1>
            <p className="text-[10px] md:text-xs text-slate-400 hidden sm:block">
              受力分析 · 运动轨迹 · 数据图表
              {compareMode && " · 对比"}
            </p>
          </div>
        </div>
        <div className="text-[10px] md:text-xs text-slate-400 flex items-center gap-2">
          <button
            onClick={async () => {
              updateShareURL();
              const ok = await copyShareURL();
              if (ok) { setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); }
            }}
            className="px-1.5 py-0.5 rounded hover:bg-slate-100 text-slate-500 text-xs"
            title="复制分享链接"
          >
            {shareCopied ? "✓已复制" : "🔗"}
          </button>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="px-1.5 py-0.5 rounded hover:bg-slate-100 text-slate-500 text-xs"
            title={fullscreen ? "退出全屏 (F)" : "全屏演示 (F)"}
          >
            {fullscreen ? "⊠" : "⛶"}
          </button>
          t={currentTime.toFixed(1)}s | RK4
        </div>
      </header>

      {/* 模拟控制栏 —— 全屏时隐藏 */}
      {!fullscreen && <SimulationControl />}

      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 桌面端左侧面板（md+），全屏时隐藏 */}
        {!fullscreen && (
          <div className={`hidden md:flex ${compareMode ? "w-96" : "w-72"} shrink-0`}>
            <SceneEditor />
          </div>
        )}

        {/* 移动端侧边栏抽屉 */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="flex-1 bg-black/30"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="w-72 max-w-[85vw] bg-white shadow-xl overflow-y-auto z-50">
              <div className="flex items-center justify-between p-3 border-b">
                <span className="text-sm font-semibold text-slate-700">场景设置</span>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded hover:bg-slate-100">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <SceneEditor />
            </div>
          </div>
        )}

        {/* 可视化区域 */}
        {compareMode ? (
          <div className="flex-1 flex flex-col md:flex-row p-1 md:p-2 bg-slate-100 gap-1 md:gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex-1">
                <VizPanel title="A 受力分析" titleIcon={ForceIcon}>
                  <ForceDiagram renderInfo={currentRenderInfo} />
                </VizPanel>
              </div>
              <div className="flex-1">
                <VizPanel title="A 运动轨迹" titleIcon={TrajIcon}>
                  <TrajectoryView result={result} currentFrame={currentFrame} currentFrameIndex={currentFrameIndex} />
                </VizPanel>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex-1">
                <VizPanel title="B 受力分析" titleIcon={ForceIcon}>
                  <ForceDiagram renderInfo={compareRenderInfo} />
                </VizPanel>
              </div>
              <div className="flex-1">
                <VizPanel title="B 运动轨迹" titleIcon={TrajIcon}>
                  <TrajectoryView result={compareResult} currentFrame={compareCurrentFrame} currentFrameIndex={currentFrameIndex} />
                </VizPanel>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-1 p-1 md:p-2 bg-slate-100 relative">
            <QuickExamples />
            <div className="flex-1" ref={forceRef}>
              <VizPanel title="受力分析图" titleIcon={ForceIcon}
                extra={
                  <div className="flex gap-1">
                    <button onClick={screenshotForce} className="text-[10px] px-1.5 py-0.5 rounded hover:bg-white text-slate-400 hover:text-slate-600" title="截图受力图">📷</button>
                    <button onClick={handleReport} className="text-[10px] px-1.5 py-0.5 rounded hover:bg-white text-slate-400 hover:text-slate-600" title="导出报告">📄</button>
                  </div>
                }
              >
                <ForceDiagram renderInfo={currentRenderInfo} />
              </VizPanel>
            </div>
            <div className="flex-1 flex flex-col sm:flex-row gap-1">
              <div className="flex-1 sm:flex-[3]" ref={trajRef}>
                <VizPanel title="运动轨迹" titleIcon={TrajIcon}
                  extra={<button onClick={screenshotTraj} className="text-[10px] px-1.5 py-0.5 rounded hover:bg-white text-slate-400 hover:text-slate-600" title="截图轨迹">📷</button>}
                >
                  <TrajectoryView result={result} currentFrame={currentFrame} currentFrameIndex={currentFrameIndex} />
                </VizPanel>
              </div>
              <div className="flex-1 sm:flex-[2]">
                <VizPanel title="x-t/v-t/a-t 曲线" titleIcon={ChartIcon}>
                  <MotionCharts result={result} currentTime={currentTime} />
                </VizPanel>
              </div>
              <div className="w-36 md:w-44 shrink-0 hidden md:block">
                <VizPanel title="实时数值" titleIcon={ChartIcon}>
                  <NumericPanel result={result} currentFrame={currentFrame} />
                </VizPanel>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
