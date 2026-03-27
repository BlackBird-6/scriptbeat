"use client";

import { SceneData } from "./PulseLineChart";

const EmotionColors: Record<string, string> = {
  Fear: "bg-[#ef4444]",
  Suspense: "bg-[#f97316]",
  Sadness: "bg-[#3b82f6]",
  Anger: "bg-[#a855f7]",
  Calm: "bg-[#10b981]",
  Joy: "bg-[#eab308]",
  Surprise: "bg-[#ec4899]",
  Anticipation: "bg-[#06b6d4]",
};

export function EmotionHeatmap({ data, activeSceneNumber, onSceneClick }: { data: SceneData[], activeSceneNumber: number | null, onSceneClick?: (scene: SceneData) => void }) {
  if (data.length === 0) return null;

  return (
    <div className="w-full mt-6">
      <h3 className="text-[14px] font-semibold text-gray-200 mb-3 tracking-wide">Dominant Emotion</h3>
      <div className="flex w-full h-4 rounded-[4px] overflow-hidden bg-[#2a2a2e] gap-[2px]">
        {data.map((scene, idx) => {
          const colorClass = EmotionColors[scene.primary_emotion] || "bg-[#555]";
          const isActive = activeSceneNumber === scene.scene_number;
          return (
            <div
              key={idx}
              className={`flex-1 ${colorClass} transition-all duration-300 ${isActive ? 'opacity-100 ring-1 ring-white' : 'opacity-80 hover:opacity-100 cursor-pointer'}`}
              title={`Scene ${scene.scene_number} - ${scene.primary_emotion}`}
              onClick={() => onSceneClick && onSceneClick(scene)}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex justify-start mt-4 text-[12px] text-gray-400 gap-6 border-t border-[#2a2a2e] pt-4">
        {Object.keys(EmotionColors).map(emotion => (
          <div key={emotion} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-[2px] ${EmotionColors[emotion]}`} />
            <span className="font-medium text-gray-300">{emotion}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
