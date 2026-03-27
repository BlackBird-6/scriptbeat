"use client";

import { useState } from "react";
import { SceneData } from "./PulseLineChart";
import { PulseLineChart } from "./PulseLineChart";
import { EmotionHeatmap } from "./EmotionHeatmap";
import { SceneSidebar } from "./SceneSidebar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Activity, UploadCloud, ChevronDown } from "lucide-react";

export function ScriptBeatDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<SceneData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [activeScene, setActiveScene] = useState<SceneData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const startAnalysis = async () => {
    if (!file) return;

    setIsProcessing(true);
    setData([]);
    setError(null);
    setActiveScene(null);
    setProgress({ current: 0, total: 100 });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      let totalExpectedScenes = 100;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          const parts = line.split("\n");
          let eventType = "message";
          let eventDataRaw = "";

          for (const p of parts) {
            if (p.startsWith("event:")) eventType = p.replace("event:", "").trim();
            if (p.startsWith("data:")) eventDataRaw = p.replace("data:", "").trim();
          }

          if (!eventDataRaw) continue;

          const eventData = JSON.parse(eventDataRaw);

          if (eventType === "init") {
            totalExpectedScenes = eventData.totalScenes;
            setProgress({ current: 0, total: eventData.totalBatches });
          } else if (eventType === "batch" && eventData.data) {
            setData(prev => {
              const updated = [...prev, ...eventData.data];
              return updated.sort((a, b) => a.scene_number - b.scene_number);
            });
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
          } else if (eventType === "error") {
            setError(eventData.error);
            setIsProcessing(false);
            return;
          } else if (eventType === "done") {
            setIsProcessing(false);
            // Default active to the peak element
            setData(prev => {
              if (prev.length > 0) {
                const highest = [...prev].sort((a, b) => b.tension_score - a.tension_score)[0];
                setTimeout(() => setActiveScene(highest), 100);
              }
              return prev;
            });
            return;
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setError("An error occurred during analysis.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0E0E0E] text-white font-sans overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-12 flex items-center px-6 border-b border-[#222] bg-[#111] shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" />
          <h1 className="text-[15px] font-semibold tracking-tight text-gray-200">ScriptBeat</h1>
        </div>
      </header>

      {/* Workspace */}
      <div className="flex flex-1 overflow-hidden p-8 gap-6 w-full">
        {/* Left Column: Chart Area */}
        <div className="flex-1 flex flex-col min-w-0 max-w-[1200px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[22px] font-semibold tracking-tight text-[#f2f2f2]">Narrative Arc Analysis</h2>

            <div className="flex items-center gap-3">
              <label htmlFor="file-upload" className="flex items-center gap-2 cursor-pointer bg-gray-100 hover:bg-white border-none px-3 py-1.5 text-[13px] font-medium rounded-[6px] transition-colors text-black shadow-sm">
                <UploadCloud className="w-4 h-4" />
                <span>{file ? file.name : "Load Script"}</span>
                <input id="file-upload" type="file" accept=".txt,.pdf" className="hidden" onChange={handleFileUpload} />
              </label>
              {(file || data.length > 0) && (
                <Button onClick={startAnalysis} disabled={!file || isProcessing} size="sm" className="bg-gray-100 hover:bg-white text-black text-[13px] font-medium h-[32px] rounded-[6px] px-3 border-none">
                  {isProcessing ? "Analyzing..." : "Generate Analysis"}
                </Button>
              )}
            </div>
          </div>

          {error && <div className="p-3 mb-4 bg-red-900/20 border border-red-500/50 rounded-[6px] text-red-400 text-[13px]">{error}</div>}

          {isProcessing && (
            <div className="mb-4 w-full flex items-center gap-4 text-[12px] text-gray-400">
              <span className="w-24 shrink-0 font-mono">Processing: {progress.current}/{progress.total}</span>
              <Progress value={(progress.current / Math.max(progress.total, 1)) * 100} className="w-full h-[4px] bg-[#2a2a2e] [&>div]:bg-blue-500 rounded-full" />
            </div>
          )}

          {/* Chart Card */}
          <div className="flex flex-col flex-1 bg-[#161618] border border-[#2a2a2e] rounded-xl overflow-hidden shadow-2xl">
            <div className="px-6 pt-5 pb-2 flex items-center justify-between">
              <h3 className="font-semibold text-gray-200 text-[14px]">Narrative Tension Over Time</h3>
            </div>

            <div className="flex-1 px-6 pb-2 min-h-0 flex flex-col relative w-full">
              <PulseLineChart data={data} onSceneClick={setActiveScene} activeSceneNumber={activeScene?.scene_number || null} />
            </div>

            <div className="px-6 pb-6">
              <EmotionHeatmap data={data} activeSceneNumber={activeScene?.scene_number || null} onSceneClick={setActiveScene} />
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <div className="w-[320px] shrink-0 h-full">
          <SceneSidebar scene={activeScene} />
        </div>
      </div>
    </div>
  );
}
