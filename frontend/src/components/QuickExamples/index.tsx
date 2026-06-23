// ============================================================
// 快速示例卡片——一键加载+计算
// ============================================================

import { useSimulationStore, SceneType, SceneParams } from "../../store/simulation";

interface QuickExample {
  icon: string;
  title: string;
  desc: string;
  sceneType: SceneType;
  params: Partial<SceneParams>;
}

const examples: QuickExample[] = [
  {
    icon: "📐",
    title: "斜面运动",
    desc: "2kg 物体从 30° 斜面自由下滑",
    sceneType: "incline",
    params: { inclineAngle: 30, inclineFriction: 0, inclineLength: 8, mass: 2, simDuration: 5 },
  },
  {
    icon: "🎯",
    title: "抛体运动",
    desc: "10m/s, 45° 发射，求最大射程",
    sceneType: "projectile",
    params: { projSpeed: 10, projAngle: 45, projHeight: 0, mass: 1, simDuration: 4 },
  },
  {
    icon: "🔄",
    title: "弹簧振子",
    desc: "m=1kg, k=50N/m, T≈0.89s",
    sceneType: "spring_oscillator",
    params: { mass: 1, springK: 50, springAmplitude: 2, simDuration: 5 },
  },
  {
    icon: "🔵",
    title: "竖直圆周",
    desc: "绳长 2m, v=8m/s 完整圆周",
    sceneType: "circular_vertical",
    params: { circRadius: 2, circSpeed: 8, mass: 1, simDuration: 4 },
  },
];

export default function QuickExamples() {
  const hasComputed = useSimulationStore((s) => s.hasComputed);

  const handleClick = (ex: QuickExample) => {
    const store = useSimulationStore.getState();
    store.setSceneType(ex.sceneType);
    for (const [key, value] of Object.entries(ex.params)) {
      if (value !== undefined) {
        store.setParam(key as keyof SceneParams, value);
      }
    }
    // 自动计算
    setTimeout(() => store.computeSimulation(), 50);
  };

  if (hasComputed) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
      <div className="pointer-events-auto bg-white/95 backdrop-blur rounded-xl shadow-lg border border-slate-200 p-4 max-w-2xl w-full mx-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3 text-center">
          选择一个快速示例开始
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {examples.map((ex) => (
            <button
              key={ex.sceneType}
              onClick={() => handleClick(ex)}
              className="p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
            >
              <div className="text-xl mb-1">{ex.icon}</div>
              <div className="text-xs font-semibold text-slate-700 group-hover:text-blue-600">{ex.title}</div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{ex.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
