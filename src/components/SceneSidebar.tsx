"use client";

import { ChevronDown } from "lucide-react";
import { SceneData } from "./PulseLineChart";
import { Badge } from "@/components/ui/badge";

export function SceneSidebar({ scene }: { scene: SceneData | null }) {
  if (!scene) {
    return (
      <div className="w-full h-full bg-[#18181A] rounded-xl border border-[#2a2a2e] flex flex-col items-center justify-center p-6 text-center text-[#666]">
        <h3 className="text-[15px] font-semibold text-gray-400 mb-2">Scene Analysis</h3>
        <p className="text-sm">Select a chart point to drill down.</p>
      </div>
    );
  }

  const isHighTension = scene.tension_score > 75;

  return (
    <div className="w-full h-full bg-[#18181A] rounded-xl border border-[#2a2a2e] flex flex-col overflow-hidden">
      <div className="h-14 shrink-0 px-5 flex items-center justify-between border-b border-[#2a2a2e]">
        <h3 className="font-semibold text-gray-100 text-[15px]">Scene Analysis</h3>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6">
        <h2 className="text-xl font-bold text-gray-100 mb-4">Scene {scene.scene_number}</h2>

        <div className="mb-6 flex items-baseline gap-2">
          <span className="text-sm font-semibold text-gray-400">Intensity Score:</span>
          <span className={`text-sm font-semibold ${isHighTension ? 'text-[#ef4444]' : 'text-[#f59e0b]'}`}>
            {scene.tension_score} {isHighTension && "(High)"}
          </span>
        </div>

        <div className="mb-6">
          <h3 className="text-[13px] font-semibold text-gray-300 mb-2 tracking-wide font-sans">Summary</h3>
          <p className="text-[13px] text-gray-400 leading-relaxed font-sans">
            {scene.summary}
          </p>
        </div>

        {scene.score_justification && (
          <div className="mb-6">
            <h3 className="text-[13px] font-semibold text-gray-300 mb-2 tracking-wide font-sans">Score Justification</h3>
            <p className="text-[13px] text-gray-400 italic leading-relaxed font-sans">
              {scene.score_justification}
            </p>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-[13px] font-semibold text-gray-300 mb-3 tracking-wide font-sans">Sentiment</h3>
          <Badge className="hover:bg-[#252528] bg-[#252528] text-gray-300 border-none font-normal text-[12px] px-3 py-1 rounded-full">
            {scene.sentiment}
          </Badge>
        </div>
      </div>
    </div>
  );
}
