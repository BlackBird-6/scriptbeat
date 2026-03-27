"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot } from "recharts";

export interface SceneData {
  scene_number: number;
  tension_score: number;
  primary_emotion: string;
  summary: string;
  score_justification: string;
  sentiment: string;
}

interface PulseLineChartProps {
  data: SceneData[];
  onSceneClick: (scene: SceneData) => void;
  activeSceneNumber: number | null;
}

export function PulseLineChart({ data, onSceneClick, activeSceneNumber }: PulseLineChartProps) {
  const processedData = data.map((d) => ({
    ...d,
    durationLabel: `${(d.scene_number * 3)}min`
  }));

  return (
    <div className="w-full h-full relative z-10">
      {data.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-[#555] text-sm font-medium">
          Load a script to view narrative tension
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={processedData} margin={{ top: 20, right: 10, left: -25, bottom: 0 }} onClick={(e: any) => {
            if (e && e.activePayload && e.activePayload.length > 0) {
              onSceneClick(e.activePayload[0].payload as SceneData);
            }
          }}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="30%" stopColor="#f97316" />
                <stop offset="60%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15}/>
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2e" vertical={true} horizontal={true} />
            <XAxis 
              dataKey="durationLabel" 
              tick={{ fill: "#666", fontSize: 11 }} 
              axisLine={{ stroke: "#2a2a2e" }} 
              tickLine={false} 
              interval="preserveStartEnd"
              minTickGap={30}
            />
            <YAxis 
              domain={[0, 100]} 
              tick={{ fill: "#666", fontSize: 11 }} 
              axisLine={false} 
              tickLine={false} 
            />
            <Tooltip 
              cursor={{ stroke: '#666', strokeWidth: 1, strokeDasharray: '3 3' }}
              content={({ active, payload, label }: any) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-[#111] border border-[#333] rounded-[6px] text-white text-[12px] px-3 py-2 shadow-xl">
                      <div className="font-semibold mb-1">{label}</div>
                      <div className="text-gray-300">Tension: <span className="text-white font-bold">{payload[0].value}</span></div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area 
              type="monotone" 
              dataKey="tension_score" 
              stroke="url(#colorGradient)" 
              fill="url(#fillGradient)"
              strokeWidth={3}
              dot={false}
              activeDot={{ 
                r: 6, fill: "#fff", stroke: "#ef4444", strokeWidth: 2,
                onClick: (_: any, payload: any) => {
                  if (payload && payload.payload) {
                    onSceneClick(payload.payload as SceneData);
                  }
                }
              }}
            />
            {activeSceneNumber !== null && processedData.find(d => d.scene_number === activeSceneNumber) && (
              <>
                <ReferenceLine 
                  x={processedData.find(d => d.scene_number === activeSceneNumber)?.durationLabel} 
                  stroke="#555" 
                  strokeDasharray="3 3" 
                  style={{ pointerEvents: 'none' }}
                />
                <ReferenceDot 
                  x={processedData.find(d => d.scene_number === activeSceneNumber)?.durationLabel} 
                  y={processedData.find(d => d.scene_number === activeSceneNumber)?.tension_score} 
                  r={5} 
                  fill="#fff" 
                  stroke="#ec4899" 
                  strokeWidth={2} 
                  style={{ pointerEvents: 'none' }}
                />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
