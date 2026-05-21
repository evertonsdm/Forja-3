import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Sliders, Database } from "lucide-react";

export interface CapsuleNodeData extends Record<string, unknown> {
  title: string;
  subtitle?: string;
  req_tags?: string[];
  add_tags?: string[];
  peso_base?: string | number;
  color?: string; // "amber", "blue", "purple", "emerald", "rose"
}

export function CustomCapsuleNode({ data, selected }: NodeProps<any>) {
  const capsuleData = data as CapsuleNodeData;
  const color = capsuleData.color || "amber";
  
  // Choose themes based on color
  let accentColorClass = "border-amber-500 text-amber-400 bg-amber-500/10";
  let activeGlow = "shadow-[0_0_15px_rgba(245,158,11,0.25)]";
  let pinColor = "bg-amber-400 border-amber-500";
  
  if (color === "blue") {
    accentColorClass = "border-blue-500 text-blue-400 bg-blue-500/10";
    activeGlow = "shadow-[0_0_15px_rgba(59,130,246,0.25)]";
    pinColor = "bg-blue-400 border-blue-500";
  } else if (color === "purple") {
    accentColorClass = "border-purple-500 text-purple-400 bg-purple-500/10";
    activeGlow = "shadow-[0_0_15px_rgba(168,85,247,0.25)]";
    pinColor = "bg-purple-400 border-purple-500";
  } else if (color === "emerald") {
    accentColorClass = "border-emerald-500 text-emerald-400 bg-emerald-500/10";
    activeGlow = "shadow-[0_0_15px_rgba(16,185,129,0.25)]";
    pinColor = "bg-emerald-400 border-emerald-500";
  } else if (color === "rose") {
    accentColorClass = "border-rose-500 text-rose-400 bg-rose-500/10";
    activeGlow = "shadow-[0_0_15px_rgba(244,63,94,0.25)]";
    pinColor = "bg-rose-400 border-rose-500";
  }

  return (
    <div className={`rounded-xl bg-slate-950/95 border-2 ${selected ? `${accentColorClass} ${activeGlow}` : 'border-slate-800 hover:border-slate-700'} text-slate-200 w-72 flex flex-col relative shadow-2xl transition-all duration-200 select-none`}>
      
      {/* Node Header */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800/80 bg-slate-900/60 rounded-t-xl">
        <div className="flex flex-col text-left">
          {capsuleData.subtitle && (
            <span className="text-[7px] tracking-wider uppercase font-mono text-slate-500 font-bold">
              {capsuleData.subtitle}
            </span>
          )}
          <span className="text-xs font-black text-white font-sans leading-tight">
            {capsuleData.title}
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[8px] px-1.5 py-0.5 rounded bg-slate-900/95 border border-slate-800/80 text-slate-400">
          <span>PESO:</span>
          <span className="font-bold text-slate-200">{capsuleData.peso_base ?? "1.0"}</span>
        </div>
      </div>

      {/* Target Handle representing Inputs */}
      <Handle
        type="target"
        position={Position.Left}
        id="inputs"
        className={`w-3 h-3 border-2 border-slate-950 rounded-full ${pinColor} cursor-pointer hover:scale-125 transition-transform shadow-[0_0_6px_rgba(0,0,0,0.6)]`}
        style={{ left: "-6px" }}
      />

      {/* Source Handle representing Outputs */}
      <Handle
        type="source"
        position={Position.Right}
        id="outputs"
        className={`w-3 h-3 border-2 border-slate-950 rounded-full ${pinColor} cursor-pointer hover:scale-125 transition-transform shadow-[0_0_6px_rgba(0,0,0,0.6)]`}
        style={{ right: "-6px" }}
      />

      {/* Node Body with structural attributes */}
      <div className="p-3 flex flex-col gap-2 text-xs">
        {/* Requirements (Inputs) */}
        {capsuleData.req_tags && capsuleData.req_tags.length > 0 ? (
          <div className="flex flex-col text-left gap-1">
            <span className="text-[7.5px] uppercase tracking-wider font-mono text-slate-500 font-bold flex items-center gap-1 font-sans">
              <Sliders className="w-2.5 h-2.5 text-amber-500/80" /> REQUISITOS (INPUT)
            </span>
            <div className="flex flex-wrap gap-1 px-1.5 py-1 bg-slate-900/40 rounded border border-slate-800/25">
              {capsuleData.req_tags.map((tag) => (
                <span key={tag} className="text-[8px] font-mono bg-slate-900/90 text-slate-400 border border-slate-800/60 px-1 py-0.5 rounded leading-none">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-left">
            <span className="text-[7.5px] uppercase tracking-wider font-mono text-slate-600 font-bold flex items-center gap-1 font-sans">
              <Sliders className="w-2.5 h-2.5 text-slate-600" /> SEM REQUISITOS (ENTRADA LIVRE)
            </span>
          </div>
        )}

        {/* Generated tags (Outputs) */}
        {capsuleData.add_tags && capsuleData.add_tags.length > 0 && (
          <div className="flex flex-col text-left gap-1 mt-1">
            <span className="text-[7.5px] uppercase tracking-wider font-mono text-slate-500 font-bold flex items-center gap-1 font-sans">
              <Database className="w-2.5 h-2.5 text-emerald-500/80" /> INJETA NA MEMÓRIA (OUTPUT)
            </span>
            <div className="flex flex-wrap gap-1 px-1.5 py-1 bg-slate-900/40 rounded border border-slate-800/25">
              {capsuleData.add_tags.map((tag) => (
                <span key={tag} className="text-[8px] font-mono bg-emerald-950/20 text-emerald-400 border border-emerald-900/20 px-1 py-0.5 rounded leading-none">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(CustomCapsuleNode);
