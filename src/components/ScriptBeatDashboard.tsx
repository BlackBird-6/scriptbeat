"use client";

import { useState } from "react";
import { SceneData } from "./PulseLineChart";
import { PulseLineChart } from "./PulseLineChart";
import { EmotionHeatmap } from "./EmotionHeatmap";
import { SceneSidebar } from "./SceneSidebar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Activity, UploadCloud, ChevronDown, HelpCircle, X } from "lucide-react";

export function ScriptBeatDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<SceneData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [activeScene, setActiveScene] = useState<SceneData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [smoothness, setSmoothness] = useState(0.6);
  const [showHelp, setShowHelp] = useState(true);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const loadExample = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const exampleFile = new File([blob], filename, { type: "application/pdf" });
      setFile(exampleFile);
    } catch (err) {
      console.error("Failed to load example script:", err);
      setError("Failed to load example script.");
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

      let totalExpectedScenes = 0;

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
      <header className="h-12 flex items-center justify-between px-6 border-b border-[#222] bg-[#111] shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" />
          <h1 className="text-[15px] font-semibold tracking-tight text-gray-200">ScriptBeat</h1>
        </div>
        <button onClick={() => setShowHelp(true)} className="text-gray-400 hover:text-white transition-colors" title="How to use ScriptBeat">
          <HelpCircle className="w-[18px] h-[18px]" />
        </button>
      </header>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#111] border border-[#333] rounded-xl w-full max-w-[480px] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between bg-[#161618]">
              <h2 className="text-[16px] font-semibold text-gray-200">How to use ScriptBeat</h2>
              <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-[#222] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 text-[14px] text-gray-300 space-y-5 leading-relaxed">
              <p>
                <strong className="text-gray-100">1. Load a Script</strong><br />
                Click <em>"Load Script"</em> to upload a screenplay (.pdf or .txt) from your computer, or pick one of the sample scripts to get started instantly.
              </p>
              <p>
                <strong className="text-gray-100">2. Generate Analysis</strong><br />
                Once loaded, click <em>"Generate Analysis"</em>. Our narrative engine will break down the script scene by scene and evaluate tension, dominant emotions, and narrative flow.
              </p>
              <p>
                <strong className="text-gray-100">3. Interactive Chart & Heatmap</strong><br />
                Explore the generated pulse line chart. The higher the peak, the higher the tension. You can click anywhere on the emotion heatmap below to view detailed AI reasoning and summaries per scene in the right-hand inspection sidebar.
              </p>
              <p>
                <strong className="text-gray-100">4. Smoothing</strong><br />
                Use the <em>"Smoothness"</em> slider to adjust how much context carries over from adjacent scenes to form a cohesive narrative arc curve versus raw scene-by-scene intensity.
              </p>
            </div>
            <div className="px-6 py-4 bg-[#161618] border-t border-[#222] flex justify-end">
              <button onClick={() => setShowHelp(false)} className="bg-gray-100 hover:bg-white text-black text-[13px] font-medium h-[32px] rounded-[6px] px-5 transition-colors">
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workspace */}
      <div className="flex flex-1 overflow-hidden p-8 gap-6 w-full">
        {/* Left Column: Chart Area */}
        <div className="flex-1 flex flex-col min-w-0 max-w-[1200px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[22px] font-semibold tracking-tight text-[#f2f2f2]">Narrative Arc Analysis</h2>

            <div className="flex items-center gap-3">
              <button
                onClick={() => loadExample('/examples/Bee_Movie.pdf', 'Bee_Movie.pdf')}
                className="bg-[#222] hover:bg-[#333] text-gray-300 border border-[#444] text-[12px] font-medium h-[32px] rounded-[6px] px-3 transition-colors shrink-0"
              >
                Bee Movie (Warning: BIG FILE)
              </button>
              <button
                onClick={() => loadExample("/examples/Fogg's%20Millions.pdf", "Fogg's Millions.pdf")}
                className="bg-[#222] hover:bg-[#333] text-gray-300 border border-[#444] text-[12px] font-medium h-[32px] rounded-[6px] px-3 transition-colors shrink-0"
              >
                Fogg's Millions
              </button>
              <button
                onClick={() => loadExample("/examples/Monsters%20are%20Due%20on%20Maple%20Street.pdf", "Monsters are Due on Maple Street.pdf")}
                className="bg-[#222] hover:bg-[#333] text-gray-300 border border-[#444] text-[12px] font-medium h-[32px] rounded-[6px] px-3 transition-colors shrink-0"
              >
                Monsters on Maple Street
              </button>
              <label htmlFor="file-upload" className="flex items-center gap-2 cursor-pointer bg-gray-100 hover:bg-white border-none px-3 py-1.5 text-[13px] font-medium rounded-[6px] transition-colors text-black shadow-sm shrink-0">
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
              <div className="flex items-center gap-6">
                <h3 className="font-semibold text-gray-200 text-[14px]">Narrative Tension Over Time</h3>
                <div className="flex items-center gap-3">
                  <label htmlFor="smoothness" className="text-[12px] text-gray-400 font-medium tracking-wide">
                    Smoothness: {smoothness.toFixed(2)}
                  </label>
                  <input
                    id="smoothness"
                    type="range"
                    min="0" max="0.8" step="0.01"
                    value={smoothness}
                    onChange={(e) => setSmoothness(parseFloat(e.target.value))}
                    className="w-28 h-1 bg-[#333] rounded-lg appearance-none cursor-pointer accent-blue-500 hover:bg-[#444] transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 px-6 pb-2 min-h-0 flex flex-col relative w-full">
              <PulseLineChart data={data} onSceneClick={setActiveScene} activeSceneNumber={activeScene?.scene_number || null} smoothness={smoothness} />
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
