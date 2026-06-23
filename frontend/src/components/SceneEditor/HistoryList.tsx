// ============================================================
// 历史记录列表组件
// ============================================================

import { useEffect } from "react";
import { useSimulationStore } from "../../store/simulation";

export default function HistoryList() {
  const { historyList, loadHistory, deleteHistory } = useSimulationStore();

  useEffect(() => {
    loadHistory();
  }, []);

  if (historyList.length === 0) {
    return (
      <div className="p-3 text-xs text-slate-400 text-center">
        暂无保存的记录
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
      {historyList.slice(0, 10).map((item) => (
        <div key={item.id} className="px-3 py-2 flex items-center justify-between hover:bg-slate-50">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-700 truncate">
              {item.text || item.scene_type}
            </p>
            <p className="text-[10px] text-slate-400">
              {new Date(item.created_at).toLocaleString("zh-CN")}
            </p>
          </div>
          <button
            onClick={() => deleteHistory(item.id)}
            className="ml-2 text-slate-400 hover:text-red-500 text-xs shrink-0"
            title="删除"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
