// ============================================================
// 场景编辑器 —— 左侧参数面板
// ============================================================

import { useSimulationStore, SceneType, SceneParams } from "../../store/simulation";
import HistoryList from "./HistoryList";
import { useState, useRef } from "react";
import { presetsByScene } from "../../engine/presets";

const sceneDescriptions: Record<SceneType, string> = {
  incline: "物体在斜面上受重力、支持力、摩擦力作用，沿斜面加速下滑或静止",
  projectile: "物体以一定初速度和角度抛出，仅受重力作用作抛物线运动",
  circular_horizontal: "物体在水平面内做圆锥摆运动，向心力由绳张力的水平分量提供",
  circular_vertical: "物体在竖直面内做圆周运动，最高点需满足绳/杆临界条件",
  connected_bodies: "两个物体通过绳子连接，桌面物体受摩擦力，悬挂物体受重力",
  free_body: "物体在水平/竖直方向受力作用，可叠加恒定外力和初速度",
  plank_block: "滑块在长木板上运动，分析块-板间和板-地面间摩擦力",
  conveyor_belt: "物体放在传送带上，摩擦力使物体加速到与传送带同速",
  spring_oscillator: "弹簧振子做简谐运动，周期 T=2π√(m/k)，能量在动能与势能间转换",
  pulley: "阿特伍德机：两个质量不同的物体通过定滑轮连接，轻的上升、重的下降",
  electric_field: "带电粒子在匀强电场中做类平抛运动，电场力 F=qE",
  magnetic_field: "带电粒子在匀强磁场中受洛伦兹力作匀速圆周运动，F=qvB",
};

const sceneOptions: { value: SceneType; label: string }[] = [
  { value: "incline", label: "斜面运动" },
  { value: "projectile", label: "抛体运动" },
  { value: "circular_horizontal", label: "水平圆周" },
  { value: "circular_vertical", label: "竖直圆周" },
  { value: "connected_bodies", label: "连接体" },
  { value: "free_body", label: "自由物体" },
  { value: "plank_block", label: "板块模型" },
  { value: "conveyor_belt", label: "传送带" },
  { value: "spring_oscillator", label: "弹簧振子" },
  { value: "pulley", label: "滑轮系统" },
  { value: "electric_field", label: "电场运动" },
  { value: "magnetic_field", label: "磁场运动" },
];

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step, unit, onChange }: SliderProps) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-slate-600 mb-1">
        <span>{label}</span>
        <span className="font-mono">{value}{unit ?? ""}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  );
}

interface NumberInputProps {
  label: string;
  value: number;
  unit?: string;
  onChange: (v: number) => void;
}

function NumberInput({ label, value, unit, onChange }: NumberInputProps) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <label className="text-xs text-slate-600 w-20 shrink-0">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      {unit && <span className="text-xs text-slate-400 w-8">{unit}</span>}
    </div>
  );
}

export default function SceneEditor() {
  const {
    sceneType, setSceneType,
    params, setParam,
    computeSimulation,
    problemText, setProblemText,
    problemImages, setProblemImages,
    saveProblem, isSaving, saveMessage,
    compareMode, setCompareMode,
    compareParams, setCompareParam,
    computeBoth,
  } =
    useSimulationStore();

  const [uploading, setUploading] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const [aiError, setAiError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setProblemImages([...problemImages, data.url]);
    } catch {
      // silently fail
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  /** 将 AI 返回的场景配置映射到 Store 参数 */
  const applyAIConfig = (config: Record<string, unknown>) => {
    const scene = (config.scene || {}) as Record<string, unknown>;
    const type = scene.type as string;
    const bodies = (scene.bodies || []) as Record<string, unknown>[];
    const constraints = (scene.constraints || []) as Record<string, unknown>[];

    // 场景类型映射
    const typeMap: Record<string, SceneType> = {
      incline: "incline",
      projectile: "projectile",
      circular_horizontal: "circular_horizontal",
      circular_vertical: "circular_vertical",
      connected_bodies: "connected_bodies",
      free_body: "free_body",
      plank_block: "plank_block",
      conveyor_belt: "conveyor_belt",
      spring_oscillator: "spring_oscillator",
      electric_field: "electric_field",
      magnetic_field: "magnetic_field",
    };

    if (typeMap[type]) setSceneType(typeMap[type]);

    // 通用参数
    if (bodies[0]) {
      const b = bodies[0];
      setParam("mass", (b.mass as number) ?? 2);
      if (b.position) {
        const [px, py] = b.position as number[];
        // 从位置反推场景参数
      }
      if (b.velocity) {
        const [vx, vy] = b.velocity as number[];
        if (type === "projectile") {
          const speed = Math.sqrt(vx * vx + vy * vy);
          const angle = Math.atan2(-vy, vx) * 180 / Math.PI;
          setParam("projSpeed", Math.round(speed * 10) / 10);
          setParam("projAngle", Math.round(angle));
        } else if (type === "incline") {
          setParam("inclineInitV", Math.abs(vx) || Math.abs(vy));
        } else if (type === "free_body") {
          setParam("freeInitV", vx);
        }
      }
      if (b.charge !== undefined) setParam("charge", b.charge as number);
    }

    // 约束参数
    for (const c of constraints) {
      const cType = c.type as string;
      if (cType === "incline_plane") {
        setParam("inclineAngle", (c.angle as number) ?? 30);
        setParam("inclineFriction", (c.friction_coeff as number) ?? 0);
        setParam("inclineLength", (c.length as number) ?? 8);
      } else if (cType === "spring") {
        setParam("springK", (c.spring_constant as number) ?? 50);
      } else if (cType === "rope") {
        setParam("circRadius", (c.length as number) ?? 3);
        const ids = c.body_ids as string[];
        if (ids && ids.length === 2) {
          // 滑轮或连接体：取第二个物体的质量
          const b2 = bodies.find((b) => b.id === ids[1]);
          if (b2) setParam("connMass2", (b2.mass as number) ?? 2);
        }
      }
    }
  };

  const handleAIParse = async () => {
    if (!problemText.trim()) {
      setAiError("请先输入题目文字");
      return;
    }
    setAiParsing(true);
    setAiError("");

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: problemText }),
      });
      const data = await res.json();

      if (data.error) {
        setAiError(data.error);
      } else if (data.scene_config && Object.keys(data.scene_config).length > 0) {
        applyAIConfig(data.scene_config);
      } else {
        setAiError("AI 未能识别场景，请手动设置参数");
      }
    } catch {
      setAiError("网络错误，请检查后端是否启动");
    } finally {
      setAiParsing(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-slate-200 overflow-y-auto">
      {/* 场景选择 */}
      <div className="p-3 border-b border-slate-100">
        <label className="block text-xs font-semibold text-slate-500 mb-2">场景类型</label>
        <select
          value={sceneType}
          onChange={(e) => setSceneType(e.target.value as SceneType)}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        >
          {sceneOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
          {sceneDescriptions[sceneType]}
        </p>

        {/* 对比模式开关 */}
        <label className="mt-2.5 flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={compareMode}
            onChange={(e) => setCompareMode(e.target.checked)}
            className="w-3.5 h-3.5 text-blue-500 rounded focus:ring-blue-400"
          />
          <span className="text-xs text-slate-600 font-medium">对比模式（A/B 双参数）</span>
        </label>

        {/* 预设模板 */}
        {presetsByScene[sceneType] && presetsByScene[sceneType].length > 0 && (
          <div className="mt-2">
            <select
              defaultValue=""
              onChange={(e) => {
                const preset = presetsByScene[sceneType]?.find((p) => p.id === e.target.value);
                if (preset?.params) {
                  const entries = Object.entries(preset.params) as [keyof SceneParams, number][];
                  for (const [key, value] of entries) {
                    setParam(key, value);
                  }
                }
                e.target.value = "";
              }}
              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white text-slate-500"
            >
              <option value="">📋 加载预设模板...</option>
              {presetsByScene[sceneType].map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.description}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 通用参数 */}
      <div className="p-3 border-b border-slate-100">
        <label className="block text-xs font-semibold text-slate-500 mb-2">
          通用参数 {compareMode && "— A"}
        </label>
        <NumberInput label="质量" value={params.mass} unit="kg" onChange={(v) => setParam("mass", v)} />
        {compareMode && (
          <NumberInput label="质量 B" value={compareParams.mass} unit="kg" onChange={(v) => setCompareParam("mass", v)} />
        )}
      </div>

      {/* 场景特定参数 */}
      <div className="p-3 border-b border-slate-100">
        <label className="block text-xs font-semibold text-slate-500 mb-2">场景参数</label>

        {/* 斜面 */}
        {sceneType === "incline" && (
          <>
            <Slider label="倾角" value={params.inclineAngle} min={0} max={85} step={1} unit="°" onChange={(v) => setParam("inclineAngle", v)} />
            <Slider label="摩擦系数" value={params.inclineFriction} min={0} max={0.8} step={0.05} onChange={(v) => setParam("inclineFriction", v)} />
            <Slider label="斜面长度" value={params.inclineLength} min={2} max={15} step={1} unit="m" onChange={(v) => setParam("inclineLength", v)} />
            <Slider label="初速度" value={params.inclineInitV} min={0} max={20} step={0.5} unit="m/s" onChange={(v) => setParam("inclineInitV", v)} />
          </>
        )}

        {/* 抛体 */}
        {sceneType === "projectile" && (
          <>
            <Slider label="初速度" value={params.projSpeed} min={1} max={50} step={1} unit="m/s" onChange={(v) => setParam("projSpeed", v)} />
            <Slider label="发射角" value={params.projAngle} min={0} max={90} step={1} unit="°" onChange={(v) => setParam("projAngle", v)} />
            <Slider label="初始高度" value={params.projHeight} min={0} max={20} step={0.5} unit="m" onChange={(v) => setParam("projHeight", v)} />
          </>
        )}

        {/* 圆周 */}
        {(sceneType === "circular_horizontal" || sceneType === "circular_vertical") && (
          <>
            <Slider label="半径" value={params.circRadius} min={0.5} max={8} step={0.5} unit="m" onChange={(v) => setParam("circRadius", v)} />
            <Slider label="最低点速度" value={params.circSpeed} min={1} max={20} step={0.5} unit="m/s" onChange={(v) => setParam("circSpeed", v)} />
          </>
        )}

        {/* 连接体 */}
        {sceneType === "connected_bodies" && (
          <>
            <NumberInput label="物体2质量" value={params.connMass2} unit="kg" onChange={(v) => setParam("connMass2", v)} />
            <Slider label="摩擦系数" value={params.connFriction} min={0} max={0.8} step={0.05} onChange={(v) => setParam("connFriction", v)} />
          </>
        )}

        {/* 自由物体 */}
        {sceneType === "free_body" && (
          <>
            <Slider label="施加力X" value={params.freeForceX} min={-50} max={50} step={1} unit="N" onChange={(v) => setParam("freeForceX", v)} />
            <Slider label="施加力Y" value={params.freeForceY} min={-50} max={50} step={1} unit="N" onChange={(v) => setParam("freeForceY", v)} />
            <Slider label="初速度" value={params.freeInitV} min={-20} max={20} step={0.5} unit="m/s" onChange={(v) => setParam("freeInitV", v)} />
          </>
        )}

        {/* 板块 */}
        {sceneType === "plank_block" && (
          <>
            <Slider label="滑块质量" value={params.plankBlockMass} min={0.1} max={10} step={0.1} unit="kg" onChange={(v) => setParam("plankBlockMass", v)} />
            <Slider label="木板质量" value={params.plankPlankMass} min={0.1} max={20} step={0.1} unit="kg" onChange={(v) => setParam("plankPlankMass", v)} />
            <Slider label="块-板摩擦" value={params.plankFriction} min={0} max={0.8} step={0.05} onChange={(v) => setParam("plankFriction", v)} />
            <Slider label="地面摩擦" value={params.plankGroundFriction} min={0} max={0.8} step={0.05} onChange={(v) => setParam("plankGroundFriction", v)} />
            <Slider label="滑块初速" value={params.plankInitSpeed} min={1} max={15} step={0.5} unit="m/s" onChange={(v) => setParam("plankInitSpeed", v)} />
          </>
        )}

        {/* 传送带 */}
        {sceneType === "conveyor_belt" && (
          <>
            <Slider label="带速" value={params.beltSpeed} min={0.5} max={10} step={0.5} unit="m/s" onChange={(v) => setParam("beltSpeed", v)} />
            <Slider label="方向" value={params.beltDirection} min={0} max={360} step={15} unit="°" onChange={(v) => setParam("beltDirection", v)} />
            <Slider label="摩擦系数" value={params.beltFriction} min={0} max={0.8} step={0.05} onChange={(v) => setParam("beltFriction", v)} />
          </>
        )}

        {/* 电场 */}
        {sceneType === "electric_field" && (
          <>
            <NumberInput label="电荷" value={params.charge} unit="C" onChange={(v) => setParam("charge", v)} />
            <NumberInput label="场强" value={params.fieldStrength} unit="N/C" onChange={(v) => setParam("fieldStrength", v)} />
            <Slider label="方向" value={params.fieldDirection} min={0} max={360} step={15} unit="°" onChange={(v) => setParam("fieldDirection", v)} />
            <NumberInput label="初速度" value={params.fieldInitSpeed} unit="m/s" onChange={(v) => setParam("fieldInitSpeed", v)} />
          </>
        )}

        {/* 磁场 */}
        {sceneType === "magnetic_field" && (
          <>
            <NumberInput label="电荷" value={params.charge} unit="C" onChange={(v) => setParam("charge", v)} />
            <NumberInput label="磁感应强度" value={params.fieldStrength} unit="T" onChange={(v) => setParam("fieldStrength", v)} />
            <NumberInput label="初速度" value={params.fieldInitSpeed} unit="m/s" onChange={(v) => setParam("fieldInitSpeed", v)} />
          </>
        )}

        {/* 弹簧振子 */}
        {sceneType === "spring_oscillator" && (
          <>
            <Slider label="劲度系数 k" value={params.springK} min={5} max={200} step={5} unit="N/m" onChange={(v) => setParam("springK", v)} />
            <Slider label="振幅 A" value={params.springAmplitude} min={0.5} max={5} step={0.5} unit="m" onChange={(v) => setParam("springAmplitude", v)} />
            <Slider label="初速度" value={params.springInitV} min={-10} max={10} step={0.5} unit="m/s" onChange={(v) => setParam("springInitV", v)} />
          </>
        )}

        {/* 滑轮系统 */}
        {sceneType === "pulley" && (
          <>
            <Slider label="物体1质量" value={params.pulleyMass1} min={0.5} max={10} step={0.5} unit="kg" onChange={(v) => setParam("pulleyMass1", v)} />
            <Slider label="物体2质量" value={params.pulleyMass2} min={0.5} max={10} step={0.5} unit="kg" onChange={(v) => setParam("pulleyMass2", v)} />
            <Slider label="物体1初始高度" value={params.pulleyHeight1} min={1} max={8} step={0.5} unit="m" onChange={(v) => setParam("pulleyHeight1", v)} />
            <Slider label="物体2初始高度" value={params.pulleyHeight2} min={1} max={8} step={0.5} unit="m" onChange={(v) => setParam("pulleyHeight2", v)} />
          </>
        )}
      </div>

      {/* B 面对比参数（对比模式下显示） */}
      {compareMode && (
        <div className="p-3 border-b border-slate-100 bg-amber-50/50">
          <label className="block text-xs font-semibold text-amber-700 mb-2">B 面对比参数</label>

          {sceneType === "incline" && (
            <>
              <Slider label="质量 B" value={compareParams.mass} min={0.5} max={10} step={0.5} unit="kg" onChange={(v) => setCompareParam("mass", v)} />
              <Slider label="倾角 B" value={compareParams.inclineAngle} min={0} max={85} step={1} unit="°" onChange={(v) => setCompareParam("inclineAngle", v)} />
              <Slider label="摩擦 B" value={compareParams.inclineFriction} min={0} max={0.8} step={0.05} onChange={(v) => setCompareParam("inclineFriction", v)} />
            </>
          )}

          {sceneType === "projectile" && (
            <>
              <Slider label="质量 B" value={compareParams.mass} min={0.5} max={10} step={0.5} unit="kg" onChange={(v) => setCompareParam("mass", v)} />
              <Slider label="初速度 B" value={compareParams.projSpeed} min={1} max={50} step={1} unit="m/s" onChange={(v) => setCompareParam("projSpeed", v)} />
              <Slider label="发射角 B" value={compareParams.projAngle} min={0} max={90} step={1} unit="°" onChange={(v) => setCompareParam("projAngle", v)} />
            </>
          )}

          {(sceneType === "circular_horizontal" || sceneType === "circular_vertical") && (
            <>
              <Slider label="质量 B" value={compareParams.mass} min={0.5} max={10} step={0.5} unit="kg" onChange={(v) => setCompareParam("mass", v)} />
              <Slider label="半径 B" value={compareParams.circRadius} min={0.5} max={8} step={0.5} unit="m" onChange={(v) => setCompareParam("circRadius", v)} />
              <Slider label="速度 B" value={compareParams.circSpeed} min={1} max={20} step={0.5} unit="m/s" onChange={(v) => setCompareParam("circSpeed", v)} />
            </>
          )}

          {sceneType === "spring_oscillator" && (
            <>
              <Slider label="质量 B" value={compareParams.mass} min={0.5} max={10} step={0.5} unit="kg" onChange={(v) => setCompareParam("mass", v)} />
              <Slider label="k B" value={compareParams.springK} min={5} max={200} step={5} unit="N/m" onChange={(v) => setCompareParam("springK", v)} />
              <Slider label="振幅 B" value={compareParams.springAmplitude} min={0.5} max={5} step={0.5} unit="m" onChange={(v) => setCompareParam("springAmplitude", v)} />
            </>
          )}

          {sceneType === "pulley" && (
            <>
              <Slider label="M1 B" value={compareParams.pulleyMass1} min={0.5} max={10} step={0.5} unit="kg" onChange={(v) => setCompareParam("pulleyMass1", v)} />
              <Slider label="M2 B" value={compareParams.pulleyMass2} min={0.5} max={10} step={0.5} unit="kg" onChange={(v) => setCompareParam("pulleyMass2", v)} />
            </>
          )}

          {!["incline", "projectile", "circular_horizontal", "circular_vertical", "spring_oscillator", "pulley"].includes(sceneType) && (
            <>
              <Slider label="质量 B" value={compareParams.mass} min={0.5} max={10} step={0.5} unit="kg" onChange={(v) => setCompareParam("mass", v)} />
            </>
          )}
        </div>
      )}

      {/* 模拟配置 */}
      <div className="p-3 border-b border-slate-100">
        <label className="block text-xs font-semibold text-slate-500 mb-2">模拟配置</label>
        <Slider label="时长" value={params.simDuration} min={1} max={20} step={0.5} unit="s" onChange={(v) => setParam("simDuration", v)} />
      </div>

      {/* 题目描述（可选） */}
      <div className="p-3 border-b border-slate-100">
        <label className="block text-xs font-semibold text-slate-500 mb-2">题目描述（可选）</label>
        <textarea
          value={problemText}
          onChange={(e) => setProblemText(e.target.value)}
          placeholder="输入题目原文，或粘贴截图后AI自动解析..."
          rows={3}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {/* AI 解析按钮 */}
        <div className="mt-2">
          <button
            onClick={handleAIParse}
            disabled={aiParsing || !problemText.trim()}
            className="w-full py-1.5 text-xs font-medium rounded-md transition-colors
              bg-violet-50 text-violet-700 border border-violet-200
              hover:bg-violet-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {aiParsing ? "⏳ AI 分析中..." : "🔮 AI 解析题目"}
          </button>
          {aiError && (
            <p className="mt-1 text-xs text-red-500">{aiError}</p>
          )}
        </div>

        {/* 图片上传区域 */}
        <div className="mt-2">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            {uploading ? (
              <p className="text-xs text-slate-400">上传中...</p>
            ) : (
              <p className="text-xs text-slate-400">
                📁 拖拽或点击上传题目截图
              </p>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* 图片预览 */}
          {problemImages.length > 0 && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {problemImages.map((url, i) => (
                <div key={i} className="relative group">
                  <img
                    src={url}
                    alt={`题目截图 ${i + 1}`}
                    className="w-16 h-16 object-cover rounded border border-slate-200"
                  />
                  <button
                    onClick={() => setProblemImages(problemImages.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] leading-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="p-3 mt-auto space-y-2">
        <button
          onClick={compareMode ? computeBoth : computeSimulation}
          className="w-full py-3 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
        >
          {compareMode ? "▶ 对比计算（A+B）" : "▶ 计算并预览受力"}
        </button>
        <button
          onClick={saveProblem}
          disabled={isSaving}
          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors text-sm disabled:opacity-50"
        >
          {isSaving ? "保存中..." : "💾 保存当前场景"}
        </button>
        {saveMessage && (
          <p className={`text-xs text-center ${saveMessage.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>
            {saveMessage}
          </p>
        )}
      </div>

      {/* 历史记录 */}
      <div className="border-t border-slate-200">
        <div className="px-3 py-2 bg-slate-50">
          <label className="text-xs font-semibold text-slate-500">历史记录</label>
        </div>
        <HistoryList />
      </div>
    </div>
  );
}
