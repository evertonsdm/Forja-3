import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  DndContext, 
  useSensor, 
  useSensors, 
  TouchSensor, 
  MouseSensor, 
  DragEndEvent, 
  useDraggable, 
  useDroppable,
  DragOverlay,
  DragStartEvent
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Demografia, Socioeconomico, Estado, TagDef, NomeDef, CidadeDef } from "../types";
import { useStealthMode } from "../context/StealthModeContext";
import { 
  Sparkles, 
  HelpCircle, 
  Search, 
  Plus, 
  X, 
  FlaskConical, 
  Pocket, 
  Sliders, 
  Database,
  Lock,
  Copy,
  ShieldAlert,
  SlidersHorizontal,
  Flame,
  Scale,
  Clipboard,
  Terminal
} from "lucide-react";

// 1. DOCK CATEGORY COLORS AND LABELS HELPER
export function getTagColorScheme(tag: string) {
  const t = tag.toLowerCase();
  
  // Demografia
  if (
    t.includes("jovem") || t.includes("idoso") || t.includes("crianca") || 
    t.includes("adulto") || t.includes("genero") || t.includes("macho") || 
    t.includes("femea") || t.includes("idade") || t.includes("escolaridade") ||
    t.includes("homem") || t.includes("mulher") || t.includes("masculino") || t.includes("feminino")
  ) {
    return {
      bg: "bg-gradient-to-br from-blue-950/90 to-blue-900/60",
      border: "border-blue-500/30 hover:border-blue-400",
      text: "text-blue-300 hover:text-blue-200",
      ring: "ring-blue-500/20",
      indicator: "🔵",
      label: "Demografia"
    };
  }
  
  // Socioeconômico
  if (
    t.includes("rico") || t.includes("pobre") || t.includes("miseravel") || 
    t.includes("classe") || t.includes("renda") || t.includes("trabalho") || 
    t.includes("profissao") || t.includes("carreira") || t.includes("dinheiro") ||
    t.includes("salario") || t.includes("carteira")
  ) {
    return {
      bg: "bg-gradient-to-br from-amber-950/90 to-amber-900/40",
      border: "border-amber-500/20 hover:border-amber-400/80",
      text: "text-amber-300 hover:text-amber-200",
      ring: "ring-amber-500/20",
      indicator: "🟡",
      label: "Socioeconômico"
    };
  }
  
  // Psicológica / Personalidade
  if (
    t.includes("estressado") || t.includes("feliz") || t.includes("triste") || 
    t.includes("bravo") || t.includes("calmo") || t.includes("introvertido") || 
    t.includes("extrovertido") || t.includes("ansioso") || t.includes("doente") ||
    t.includes("forte") || t.includes("saude") || t.includes("atleta")
  ) {
    return {
      bg: "bg-gradient-to-br from-purple-950/90 to-fuchsia-950/60",
      border: "border-purple-500/20 hover:border-fuchsia-400/80",
      text: "text-fuchsia-300 hover:text-fuchsia-200",
      ring: "ring-fuchsia-500/20",
      indicator: "🟣",
      label: "Psicológico"
    };
  }
  
  // Geográfico
  if (
    t.includes("frio") || t.includes("quente") || t.includes("nordeste") || 
    t.includes("sul") || t.includes("cidade") || t.includes("estado") || 
    t.includes("interior") || t.includes("metropole") || t.includes("litoraneo") ||
    t.includes("floresta")
  ) {
    return {
      bg: "bg-gradient-to-br from-emerald-950/90 to-teal-900/60",
      border: "border-emerald-500/20 hover:border-teal-400/80",
      text: "text-teal-300 hover:text-teal-200",
      ring: "ring-teal-500/20",
      indicator: "🟢",
      label: "Geográfico"
    };
  }
  
  // Default
  return {
    bg: "bg-gradient-to-br from-indigo-950/90 to-indigo-900/60",
    border: "border-indigo-500/20 hover:border-indigo-400",
    text: "text-indigo-300 hover:text-indigo-200",
    ring: "ring-indigo-500/10",
    indicator: "💎",
    label: "Geral"
  };
}

// MUTUAL EXCLUSION PARADOXES
const PARADOXED_PAIRS: [string, string][] = [
  ["Rico", "Miseravel"],
  ["Rico", "Pobre"],
  ["Jovem", "Idoso"],
  ["Saude_Forte", "Doente"],
  ["Frio", "Quente"],
  ["Feliz", "Triste"]
];

// PREDEFINED MASTER TEMPLATES (Cristais Mestres)
const MASTER_CRYSTALS = [
  {
    id: "master::bluecol",
    name: "Cristal: Operário Braçal",
    icon: "💎",
    tags: ["Pobre", "Trabalho_Pesado", "Estressado"],
    color: "from-sky-950/90 via-blue-900/40 to-indigo-950/90 border-blue-500/40 text-blue-200 hover:border-blue-400",
    description: "Injeta simultaneamente as essências do trabalhador de esforço físico e baixa renda."
  },
  {
    id: "master::elite_corp",
    name: "Cristal: Alta Sociedade",
    icon: "🔱",
    tags: ["Rico", "Trabalho_Leve", "Saude_Forte"],
    color: "from-amber-950/90 via-yellow-950/40 to-slate-950/90 border-yellow-500/40 text-yellow-200 hover:border-yellow-400",
    description: "Injeta as essências de alta renda, esforço mental e bem-estar saudável."
  },
  {
    id: "master::nobre_jovem",
    name: "Cristal: Herdeiro Jovem",
    icon: "🔮",
    tags: ["Jovem", "Rico", "Feliz"],
    color: "from-purple-950/90 via-fuchsia-950/40 to-slate-950/90 border-pink-500/40 text-pink-200 hover:border-pink-400",
    description: "Injeta as essências de juventude, alta herança e satisfação extrema."
  },
  {
    id: "master::nordeste_quente",
    name: "Cristal: Clima Tropical",
    icon: "❇️",
    tags: ["Quente", "Nordeste", "Feliz"],
    color: "from-emerald-950/90 via-teal-950/40 to-emerald-950/90 border-emerald-500/40 text-teal-200 hover:border-emerald-400",
    description: "Injeta atributos regionais tropicais de alta temperatura e felicidade."
  }
];

// DND-KIT DROPZONE COMPONENT
interface DroppableSlotProps {
  id: string;
  className: string;
  children: React.ReactNode;
}

const DroppableSlot: React.FC<DroppableSlotProps> = ({ id, className, children }) => {
  const { isOver, setNodeRef } = useDroppable({ id });
  
  return (
    <div 
      ref={setNodeRef} 
      className={`${className} transition-all duration-300 ${
        isOver 
          ? "ring-4 ring-fuchsia-500/80 border-fuchsia-500 bg-fuchsia-950/30 scale-[1.02] shadow-[0_0_25px_rgba(240,46,170,0.4)]" 
          : ""
      }`}
    >
      {children}
    </div>
  );
};

// DND-KIT DRAGGABLE SHELF GEM COMPONENT WITH PRESET LIMIT VALUES, IMPACT TOOLTIP, AND STYLING
interface DraggableGemProps {
  id: string;
  tag: string;
  weight: number | undefined;
  onWeightChange: (newWeight: number | undefined) => void;
  isSelected: boolean;
  onClick: () => void;
  tagDefList: TagDef[];
}

const DraggableGem: React.FC<DraggableGemProps> = ({ 
  id, 
  tag, 
  weight, 
  onWeightChange, 
  isSelected, 
  onClick,
  tagDefList
}) => {
  const { isStealthMode } = useStealthMode();
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState(weight !== undefined ? String(weight) : "");
  const [showTooltip, setShowTooltip] = useState(false);
  const [triggerGlint, setTriggerGlint] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ 
    id,
    data: {
      tagName: tag,
      weight: weight !== undefined && weight !== null ? weight : null
    }
  });
  
  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    touchAction: "none",
    zIndex: 9999
  } : {
    touchAction: "none"
  };

  const handleConfirmWeight = () => {
    const val = parseFloat(tempVal);
    if (!isNaN(val)) {
      onWeightChange(val);
    } else {
      onWeightChange(undefined);
    }
    setIsEditing(false);
    
    // Trigger confirm Glint laser scan
    setTriggerGlint(true);
    setTimeout(() => setTriggerGlint(false), 500);
  };

  const hasWeight = weight !== undefined && weight !== null;
  const colors = getTagColorScheme(tag);

  // Look up modifiers
  const modifiers = useMemo(() => {
    const found = tagDefList.find(t => t.tag?.toLowerCase() === tag.toLowerCase());
    if (!found) return null;
    return {
      saude: found.mod_saude !== undefined ? found.mod_saude : 1.0,
      felicidade: found.mod_felicidade !== undefined ? found.mod_felicidade : 1.0,
      renda: found.mod_renda_mensal !== undefined ? found.mod_renda_mensal : 1.0,
    };
  }, [tagDefList, tag]);

  return (
    <div className="relative group/gem shrink-0">
      {/* 2. O HOLOFOTE E BACKDROP BLUR (Focus Mode Overlay) */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(false);
            }}
            className={`fixed inset-0 z-[1000] cursor-pointer pointer-events-auto ${
              isStealthMode ? "bg-black/20" : "bg-indigo-950/80 backdrop-blur-md"
            }`}
          />
        )}
      </AnimatePresence>

      <motion.div
        ref={setNodeRef}
        style={isEditing ? { ...style, zIndex: 1050 } : style}
        layout
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className={`text-[10px] font-mono font-bold px-2.5 py-2 select-none flex flex-col justify-between gap-1 transition-all duration-200 border cursor-grab active:cursor-grabbing relative overflow-hidden ${
          isStealthMode 
            ? "rounded-none bg-white border-gray-300 text-gray-750" 
            : "rounded-xl"
        } ${
          isDragging ? (isStealthMode ? "opacity-30 border-gray-400" : "opacity-30 border-fuchsia-500 scale-95") : ""
        } ${
          isEditing 
            ? (isStealthMode ? "z-[1050] relative border-gray-400 bg-white text-gray-800 shadow-sm" : "z-[1050] relative scale-110 !shadow-[0_0_30px_rgba(168,85,247,0.7)] border-fuchsia-400 bg-slate-950 text-white")
            : hasWeight 
              ? (isStealthMode ? "border-gray-500 bg-gray-50 text-gray-800 font-extrabold" : "ring-2 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] border-yellow-400 bg-gradient-to-br from-yellow-950 to-amber-900/60 text-yellow-300 font-extrabold")
              : isSelected 
                ? (isStealthMode ? "bg-gray-200 text-gray-900 font-black border-gray-400 animate-none" : "bg-gradient-to-br from-fuchsia-600 to-purple-800 text-white shadow-[0_0_15px_rgba(168,85,247,0.8)] scale-102 ring-2 ring-white border-fuchsia-400")
                : isStealthMode 
                  ? "bg-white text-gray-700 border-gray-300"
                  : `${colors.bg} ${colors.text} ${colors.border} hover:scale-[1.03] shadow-lg`
        }`}
      >
        {/* 3. O REFLEXO DINÂMICO (Glint laser shine) */}
        {triggerGlint && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-20">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12"
            />
          </div>
        )}

        <div 
          {...listeners} 
          {...attributes}
          className="flex items-center gap-1 cursor-grab"
          onClick={(e) => {
            if (isEditing) return;
            setIsEditing(true);
            onClick();
          }}
        >
          <span>{colors.indicator} {tag}</span>
          {hasWeight && (
            <span className="text-[8px] bg-yellow-400 text-[#090b14] px-1 py-[1px] rounded font-extrabold ml-1 leading-none">
              [{weight}x]
            </span>
          )}
        </div>

        <AnimatePresence>
          {isEditing && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-col gap-1.5 bg-[#030408]/95 p-2 rounded-lg border border-indigo-500/30 mt-1 cursor-default relative z-30"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  autoFocus
                  value={tempVal}
                  onChange={(e) => setTempVal(e.target.value)}
                  placeholder="Peso"
                  className="w-12 bg-slate-950 border border-indigo-500/30 outline-none text-[8.5px] px-1.5 py-0.5 rounded text-white font-bold font-mono text-center"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirmWeight();
                  }}
                />
                <button
                  type="button"
                  onClick={handleConfirmWeight}
                  className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 rounded text-[8px] text-white font-bold cursor-pointer"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTempVal("");
                    onWeightChange(undefined);
                    setIsEditing(false);
                  }}
                  className="px-1.5 py-0.5 bg-rose-900/80 hover:bg-rose-800 rounded text-[8px] text-rose-350 font-bold cursor-pointer"
                >
                  C
                </button>
              </div>

              {/* AAA QoL PRESET WEIGHT BUTTONS */}
              <div className="flex gap-1 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setTempVal("0.5");
                    onWeightChange(0.5);
                    setIsEditing(false);
                    // Trigger Glint laser scan
                    setTriggerGlint(true);
                    setTimeout(() => setTriggerGlint(false), 500);
                  }}
                  className="px-1 py-[2px] bg-[#111221] hover:bg-slate-800 rounded text-[7.5px] text-yellow-400 hover:text-white font-mono font-black cursor-pointer"
                >
                  x0.5
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTempVal("2.0");
                    onWeightChange(2.0);
                    setIsEditing(false);
                    // Trigger Glint laser scan
                    setTriggerGlint(true);
                    setTimeout(() => setTriggerGlint(false), 500);
                  }}
                  className="px-1 py-[2px] bg-[#111221] hover:bg-slate-800 rounded text-[7.5px] text-yellow-400 hover:text-white font-mono font-black cursor-pointer"
                >
                  x2.0
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTempVal("");
                    onWeightChange(undefined);
                    setIsEditing(false);
                    // Trigger Glint laser scan
                    setTriggerGlint(true);
                    setTimeout(() => setTriggerGlint(false), 500);
                  }}
                  className="px-1 py-[2px] bg-red-950/60 hover:bg-red-900 rounded text-[7.5px] text-red-300 font-mono font-black border border-red-500/20 cursor-pointer"
                >
                  Zerar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* DRAG-FREE RICH TOOLTIP: LUPA DO ALQUIMISTA PREVIEW DE IMPACTO */}
      <AnimatePresence>
        {showTooltip && !isDragging && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-[#04050a] border border-indigo-500/30 p-2.5 rounded-xl shadow-2xl z-[99999] pointer-events-none text-left"
          >
            <div className="text-[10px] font-mono font-black text-indigo-300 flex items-center justify-between mb-1.5 pb-1 border-b border-indigo-900/35">
              <span>🔬 Lupa do Impacto</span>
              <span className="text-[8px] opacity-70 uppercase font-bold">{colors.label}</span>
            </div>
            {modifiers ? (
              <div className="space-y-1 font-mono text-[8.5px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Saúde:</span>
                  <span className={modifiers.saude > 1.0 ? "text-emerald-400 font-bold" : modifiers.saude < 1.0 ? "text-red-400 font-bold" : "text-indigo-400"}>
                    {modifiers.saude.toFixed(2)}x ({modifiers.saude >= 1.0 ? "+" : ""}{Math.round((modifiers.saude - 1) * 100)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Felicidade:</span>
                  <span className={modifiers.felicidade > 1.0 ? "text-emerald-400 font-bold" : modifiers.felicidade < 1.0 ? "text-red-400 font-bold" : "text-indigo-400"}>
                    {modifiers.felicidade.toFixed(2)}x ({modifiers.felicidade >= 1.0 ? "+" : ""}{Math.round((modifiers.felicidade - 1) * 100)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Renda:</span>
                  <span className={modifiers.renda > 1.0 ? "text-emerald-400 font-bold" : modifiers.renda < 1.0 ? "text-red-400 font-bold" : "text-indigo-400"}>
                    {modifiers.renda.toFixed(2)}x ({modifiers.renda >= 1.0 ? "+" : ""}{Math.round((modifiers.renda - 1) * 100)}%)
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-[8px] font-mono text-slate-500 italic">
                Nenhum modificador customizado ativo (Efeito Neutro ×1.0).
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// CRISTAL MESTRE DRAGGABLE COMPONENT
interface MasterCrystalProps {
  id: string;
  name: string;
  icon: string;
  tags: string[];
  color: string;
  description: string;
}

const MasterCrystal: React.FC<MasterCrystalProps> = ({ id, name, icon, tags, color, description }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ 
    id,
    data: {
      tagName: name,
      isMasterCrystal: true,
      masterTags: tags
    }
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    touchAction: "none",
    zIndex: 9999
  } : {
    touchAction: "none"
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="shrink-0 relative group">
      <motion.div
        className={`border-4 rounded-3xl p-3 flex flex-col justify-center items-center text-center select-none bg-gradient-to-br cursor-grab active:cursor-grabbing w-32 aspect-square scale-95 transition-all duration-300 ${color} ${
          isDragging ? "opacity-30 scale-90 border-fuchsia-500" : "hover:scale-[1.01]"
        }`}
        style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
      >
        <span className="text-xl mb-1 filter drop-shadow-[0_2px_4px_rgba(255,255,255,0.2)] animate-bounce">{icon}</span>
        <span className="text-[9px] font-sans font-black tracking-tight leading-tight line-clamp-2 max-w-[85px]">{name}</span>
        <span className="text-[7.5px] font-mono text-fuchsia-300 font-extrabold mt-1 uppercase tracking-tighter">[{tags.length} Essências]</span>
      </motion.div>

      {/* Crystals tooltip descriptions */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 bg-[#05060c] border border-indigo-500/30 p-2.5 rounded-xl text-left hidden group-hover:block w-48 pointer-events-none z-[99999] shadow-2xl">
        <div className="text-[10px] font-bold text-yellow-400 font-sans mb-1">{name}</div>
        <p className="text-[8.5px] text-slate-350 leading-tight mb-2 font-mono">{description}</p>
        <div className="text-[8px] font-mono text-fuchsia-300 uppercase font-black tracking-widest pb-1 border-b border-indigo-950">Injeta no Crisol:</div>
        <div className="flex flex-wrap gap-1 mt-1">
          {tags.map(t => (
            <span key={t} className="text-[8px] px-1 py-[2px] bg-indigo-950 text-indigo-300 rounded font-mono font-bold">
              +{t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// DND-KIT DRAGGABLE SOCKETED GEM COMPONENT
interface SocketedGemProps {
  id: string;
  tag: string;
  weight?: number | null;
  slotType: "req" | "add";
  onRemove: () => void;
}

const SocketedGem: React.FC<SocketedGemProps> = ({ id, tag, weight, slotType, onRemove }) => {
  const { isStealthMode } = useStealthMode();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ 
    id,
    data: {
      tagName: tag,
      weight: weight !== undefined && weight !== null ? weight : null
    }
  });
  
  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    touchAction: "none",
    zIndex: 9999
  } : {
    touchAction: "none"
  };

  const hasWeight = weight !== undefined && weight !== null;
  const colors = getTagColorScheme(tag);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`text-[10px] font-mono font-bold transition-all duration-150 border px-2.5 py-1.5 select-none ${
        isStealthMode 
          ? "rounded-none bg-white text-gray-750 border-gray-300 hover:scale-100" 
          : "rounded-xl cursor-grab active:cursor-grabbing hover:scale-105 ring-1"
      } ${
        isDragging ? "opacity-45" : ""
      } ${
        isStealthMode 
          ? "" 
          : hasWeight
            ? "from-yellow-950 to-amber-900/80 text-yellow-250 border-yellow-500 shadow-[0_0_12px_rgba(250,204,21,0.35)] ring-yellow-400/25"
            : slotType === "req" 
              ? "from-[#200e05] to-[#120601] text-orange-300 border-orange-500/50 shadow-[0_0_8px_rgba(249,115,22,0.2)] ring-orange-500/10" 
              : "from-cyan-950 to-blue-950 text-cyan-200 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.25)] ring-cyan-500/25"
      }`}
    >
      <span>
        {isStealthMode ? "📎" : (hasWeight ? "🔱" : slotType === "req" ? "🔹" : "🔮")} {tag}
        {hasWeight && (
          <span className={`text-[8px] px-1 py-[1px] rounded font-extrabold ml-1 leading-none ${
            isStealthMode ? "bg-gray-200 text-gray-800" : "bg-yellow-400 text-[#090b14]"
          }`}>
            {weight}x
          </span>
        )}
      </span>
      <button
        type="button"
        onMouseDown={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="text-slate-400 hover:text-rose-400 shrink-0 select-none cursor-pointer duration-100 font-extrabold ml-1"
      >
        <X className="w-3 h-3 stroke-[3]" />
      </button>
    </div>
  );
};

interface AlchemyPanelProps {
  demografia: Demografia[];
  setDemografia: React.Dispatch<React.SetStateAction<Demografia[]>>;
  socioeconomico: Socioeconomico[];
  setSocioeconomico: React.Dispatch<React.SetStateAction<Socioeconomico[]>>;
  tagDef: TagDef[];
  setTagDef: React.Dispatch<React.SetStateAction<TagDef[]>>;
  estados: Estado[];
  setEstados: React.Dispatch<React.SetStateAction<Estado[]>>;
  nomes: NomeDef[];
  setNomes: React.Dispatch<React.SetStateAction<NomeDef[]>>;
  cidades: CidadeDef[];
  setCidades: React.Dispatch<React.SetStateAction<CidadeDef[]>>;
}

export const AlchemyPanel: React.FC<AlchemyPanelProps> = ({
  demografia,
  setDemografia,
  socioeconomico,
  setSocioeconomico,
  tagDef,
  setTagDef,
  estados,
  setEstados,
  nomes,
  setNomes,
  cidades,
  setCidades
}) => {
  const { isStealthMode } = useStealthMode();
  // Alchemy shelf and crucible state managers
  const [selectedCategory, setSelectedCategory] = useState<"demografia" | "socioeconomico" | "cidade" | "estado" | "nome">("socioeconomico");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [cabinetSearchQuery, setCabinetSearchQuery] = useState("");
  const [newCustomTagName, setNewCustomTagName] = useState("");
  const [shelfWeights, setShelfWeights] = useState<Record<string, number>>({});
  const [activeSelectedGem, setActiveSelectedGem] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [bubbleAnimate, setBubbleAnimate] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Multi-selection states for batch editing
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [smartPasteText, setSmartPasteText] = useState("");
  const [isSmartPasteExpanded, setIsSmartPasteExpanded] = useState(false);

  // Advanced Injection states
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);
  const [advancedText, setAdvancedText] = useState("");
  const [advancedField, setAdvancedField] = useState<"req_tags" | "add_tags">("add_tags");

  // Dynamic Property Editor states
  const [newModName, setNewModName] = useState("");
  const [newModPrefix, setNewModPrefix] = useState<"mult_" | "mod_">("mult_");
  const [newModVal, setNewModVal] = useState("1.0");

  const updateRawItemProperty = (id: string, key: string, value: any) => {
    const isVazia = value === undefined || value === null || (typeof value === "string" && value.trim() === "") || (typeof value === "number" && isNaN(value));
    
    const updateFn = (item: any) => {
      const updated = { ...item };
      if (isVazia) {
        delete updated[key];
      } else {
        updated[key] = value;
      }
      return updated;
    };

    switch (selectedCategory) {
      case "demografia":
        setDemografia(prev => prev.map(d => d.id_demo === id ? updateFn(d) : d));
        break;
      case "socioeconomico":
        setSocioeconomico(prev => prev.map(s => s.id_socio === id ? updateFn(s) : s));
        break;
      case "cidade":
        setCidades(prev => prev.map(c => c.id_cidade === id ? updateFn(c) : c));
        break;
      case "estado":
        setEstados(prev => prev.map(e => e.id_estado === id ? updateFn(e) : e));
        break;
      case "nome":
        setNomes(prev => prev.map(n => n.id_nome === id ? updateFn(n) : n));
        break;
    }
  };

  // Filter Pill state for the gems shelf ("geral" means all, others match categories)
  const [activeShelfFilter, setActiveShelfFilter] = useState<"todos" | "demo" | "socio" | "psi" | "geo" | "cristais">("todos");

  // Retroactive paradox alert results and interactive scanner layout
  const [scannerOpen, setScannerOpen] = useState(false);
  const [anomalies, setAnomalies] = useState<{ id: string; name: string; type: string; category: "demografia" | "socioeconomico" | "cidade" | "estado" | "nome"; conflicts: string[] }[]>([]);
  const [activeToast, setActiveToast] = useState<{ message: string; sub: string; isError: boolean; type?: "error" | "success" | "warning" } | null>(null);
  
  // Cauldron visual shaking triggers to react to paradox blockages
  const [isCauldronParadoxShaked, setIsCauldronParadoxShaked] = useState(false);

  // Trigger brief visual popup feedback message
  const triggerToast = (message: string, sub: string, isError: boolean, type?: "error" | "success" | "warning") => {
    setActiveToast({ message, sub, isError, type: type || (isError ? "error" : "success") });
    setTimeout(() => {
      setActiveToast(null);
    }, 6000);
  };

  const handleSmartPaste = (rawText: string) => {
    if (!rawText || !rawText.trim()) return;
    
    // Split by commas, semicolons, or line breaks to be highly resilient
    const parts = rawText.split(/[,;\n\r]+/).map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) {
      triggerToast("Erro de leitura", "Nenhum item válido encontrado no texto colado.", true, "error");
      return;
    }

    // Normalization helper to strip accents/diacritics and normalize casing safely
    const normalizeStr = (str: string) => {
      if (!str) return "";
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    };

    const matchedIdsSet = new Set<string>();
    const matchedNamesSet = new Set<string>();
    
    let foundPartsCount = 0;
    const collisionsList: string[] = [];

    parts.forEach(p => {
      let mainName = p;
      let filterTag: string | null = null;

      if (p.includes('/')) {
        const index = p.indexOf('/');
        mainName = p.substring(0, index).trim();
        filterTag = p.substring(index + 1).trim();
      }

      const normMainName = normalizeStr(mainName);

      // Find all matches in alchemyItemsList for this mainName (id or name match, with diacritic resilience)
      const matches = alchemyItemsList.filter(item => {
        const normId = normalizeStr(item.id);
        const normName = normalizeStr(item.name);

        const idMatch = normId === normMainName;
        const nameMatch = normName === normMainName;

        if (!idMatch && !nameMatch) return false;

        // If a filter tag is specified, match strictly
        if (filterTag) {
          const lowerFilter = filterTag.toLowerCase().trim();
          
          // 1. Check req_tags with comprehensive prefix stripping (est_, uf_, prof_, cid_, etc.)
          const inReqTags = (item.req_tags || []).some((t: string) => {
            const normTag = t.toLowerCase().trim();
            return (
              normTag === lowerFilter || 
              normTag.includes(lowerFilter) ||
              normTag.replace(/^[a-z]{2,4}_/, "") === lowerFilter
            );
          });

          // 2. Check add_tags
          const inAddTags = (item.add_tags || []).some((t: string) => {
            const normTag = t.toLowerCase().trim();
            return (
              normTag === lowerFilter || 
              normTag.includes(lowerFilter) ||
              normTag.replace(/^[a-z]{2,4}_/, "") === lowerFilter
            );
          });

          // 3. Check item's ID containing filter prefix/suffix
          const inId = normId.includes(lowerFilter) || normId.replace(/^[a-z]{2,4}_/, "") === lowerFilter;

          // 4. Check rawItem properties for matches (e.g. Estado/Pai property or raw fields)
          const inRawProps = item.rawItem ? Object.entries(item.rawItem).some(([key, val]) => {
            if (typeof val === 'string') {
              const normVal = normalizeStr(val);
              return (
                normVal === lowerFilter || 
                normVal.includes(lowerFilter) ||
                normVal.replace(/^[a-z]{2,4}_/, "") === lowerFilter
              );
            }
            if (Array.isArray(val)) {
              return val.some(v => {
                if (typeof v !== 'string') return false;
                const normVal = normalizeStr(v);
                return (
                  normVal === lowerFilter || 
                  normVal.includes(lowerFilter) ||
                  normVal.replace(/^[a-z]{2,4}_/, "") === lowerFilter
                );
              });
            }
            return false;
          }) : false;

          return inReqTags || inAddTags || inId || inRawProps;
        }

        return true;
      });

      if (matches.length > 0) {
        foundPartsCount++;
        
        // Report collisions ONLY if there is NO filter tag and multiple matches are found
        if (!filterTag && matches.length > 1) {
          collisionsList.push(mainName);
        }

        matches.forEach(item => {
          matchedIdsSet.add(item.id);
          matchedNamesSet.add(item.name);
        });
      }
    });

    const matchedIds = Array.from(matchedIdsSet);
    const notFoundCount = parts.length - foundPartsCount;

    if (matchedIds.length > 0) {
      // Merge with already selected IDs
      setSelectedItemIds(prev => Array.from(new Set([...prev, ...matchedIds])));
      setSmartPasteText(""); // clear input upon success

      if (collisionsList.length > 0) {
        // Warning due to collision
        const uniqueCollisions = Array.from(new Set(collisionsList));
        const collisionText = uniqueCollisions.map(c => `'${c}'`).join(", ");
        triggerToast(
          "⚠️ Colisões de Nome Detectadas",
          `Atenção: Encontramos múltiplos itens com o nome ${collisionText}. Considere usar o formato Nome/Tag (ex: Bom Jesus/RS) para precisão.`,
          false,
          "warning"
        );
      } else {
        // Normal success toast
        triggerToast(
          "📋 Smart Paste Concluído!",
          `${matchedIds.length} item(ns) selecionado(s). ${notFoundCount > 0 ? `${notFoundCount} ignorados (não encontrados na aba atual).` : "Todos combinados!"}`,
          false,
          "success"
        );
      }
    } else {
      triggerToast(
        "⚠️ Nenhum correspondente",
        `Os itens especificados não existem ou não batem com os filtros no gabinete atual "${selectedCategory.toUpperCase()}".`,
        true,
        "error"
      );
    }
  };

  const handleAdvancedInjection = (text: string, targetField: "req_tags" | "add_tags") => {
    if (!text || !text.trim()) {
      triggerToast("Texto Vazio", "Favor preencher a área de texto com a DSL de injeção.", true, "error");
      return;
    }

    const normalizeStr = (str: string) => {
      if (!str) return "";
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    };

    const lines = text.split("\n");
    let updatedCount = 0;
    let ignoredCount = 0;
    let alreadyHadCount = 0;

    // Track targets updated
    const tagsToMergeByItemId: Record<string, string[]> = {};

    lines.forEach(line => {
      const cleanLine = line.trim();
      if (!cleanLine) return;

      const colonIndex = cleanLine.indexOf(":");
      if (colonIndex === -1) {
        ignoredCount++;
        return;
      }

      const target = cleanLine.substring(0, colonIndex).trim();
      const tagsStr = cleanLine.substring(colonIndex + 1).trim();

      if (!target || !tagsStr) {
        ignoredCount++;
        return;
      }

      const parsedTags = tagsStr.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
      if (parsedTags.length === 0) {
        ignoredCount++;
        return;
      }

      let mainName = target;
      let filterTag: string | null = null;

      if (target.includes("/")) {
        const index = target.indexOf("/");
        mainName = target.substring(0, index).trim();
        filterTag = target.substring(index + 1).trim();
      }

      const normMainName = normalizeStr(mainName);

      const matches = alchemyItemsList.filter(item => {
        const normId = normalizeStr(item.id);
        const normName = normalizeStr(item.name);

        const idMatch = normId === normMainName;
        const nameMatch = normName === normMainName;

        if (!idMatch && !nameMatch) return false;

        if (filterTag) {
          const lowerFilter = filterTag.toLowerCase().trim();

          const inReqTags = (item.req_tags || []).some((t: string) => {
            const normTag = t.toLowerCase().trim();
            return (
              normTag === lowerFilter ||
              normTag.includes(lowerFilter) ||
              normTag.replace(/^[a-z]{2,4}_/, "") === lowerFilter
            );
          });

          const inAddTags = (item.add_tags || []).some((t: string) => {
            const normTag = t.toLowerCase().trim();
            return (
              normTag === lowerFilter ||
              normTag.includes(lowerFilter) ||
              normTag.replace(/^[a-z]{2,4}_/, "") === lowerFilter
            );
          });

          const inId = normId.includes(lowerFilter) || normId.replace(/^[a-z]{2,4}_/, "") === lowerFilter;

          const inRawProps = item.rawItem ? Object.entries(item.rawItem).some(([key, val]) => {
            if (typeof val === "string") {
              const normVal = normalizeStr(val);
              return (
                normVal === lowerFilter ||
                normVal.includes(lowerFilter) ||
                normVal.replace(/^[a-z]{2,4}_/, "") === lowerFilter
              );
            }
            if (Array.isArray(val)) {
              return val.some(v => {
                if (typeof v !== "string") return false;
                const normVal = normalizeStr(v);
                return (
                  normVal === lowerFilter ||
                  normVal.includes(lowerFilter) ||
                  normVal.replace(/^[a-z]{2,4}_/, "") === lowerFilter
                );
              });
            }
            return false;
          }) : false;

          return inReqTags || inAddTags || inId || inRawProps;
        }

        return true;
      });

      if (matches.length > 0) {
        matches.forEach(item => {
          // Keep only non-associated tags (not in existing req_tags nor active add_tags)
          const existingTags = new Set([
            ...(item.req_tags || []),
            ...(item.add_tags || [])
          ].map(t => t.toLowerCase().trim()));

          const filteredNewTagsForThisItem = parsedTags.filter(tag => {
            const cleanTagLower = tag.toLowerCase().trim();
            return !existingTags.has(cleanTagLower);
          });

          if (filteredNewTagsForThisItem.length === 0) {
            alreadyHadCount++;
            return;
          }

          if (!tagsToMergeByItemId[item.id]) {
            tagsToMergeByItemId[item.id] = [];
          }
          filteredNewTagsForThisItem.forEach(tag => {
            if (!tagsToMergeByItemId[item.id].includes(tag)) {
              tagsToMergeByItemId[item.id].push(tag);
            }
          });
          updatedCount++;
        });
      } else {
        ignoredCount++;
      }
    });

    if (Object.keys(tagsToMergeByItemId).length === 0) {
      triggerToast(
        "Nenhum Item Atualizado",
        `Os itens correspondentes já possuem todas as tags fornecidas ou as linhas não foram encontradas. (Ignoradas: ${ignoredCount}, Redundantes: ${alreadyHadCount})`,
        true,
        "warning"
      );
      return;
    }

    const targetKey = targetField === "req_tags" ? "req_tags" : "add_tags";

    switch (selectedCategory) {
      case "demografia":
        setDemografia(prev => prev.map(d => {
          const newTags = tagsToMergeByItemId[d.id_demo];
          if (!newTags) return d;
          const prevTags = d.add_tags || [];
          return {
            ...d,
            add_tags: Array.from(new Set([...prevTags, ...newTags]))
          };
        }));
        break;

      case "socioeconomico":
        setSocioeconomico(prev => prev.map(s => {
          const newTags = tagsToMergeByItemId[s.id_socio];
          if (!newTags) return s;
          const prevTags = s[targetKey] || [];
          return {
            ...s,
            [targetKey]: Array.from(new Set([...prevTags, ...newTags]))
          };
        }));
        break;

      case "cidade":
        setCidades(prev => prev.map(c => {
          const newTags = tagsToMergeByItemId[c.id_cidade];
          if (!newTags) return c;
          const prevTags = c[targetKey] || [];
          return {
            ...c,
            [targetKey]: Array.from(new Set([...prevTags, ...newTags]))
          };
        }));
        break;

      case "estado":
        setEstados(prev => prev.map(e => {
          const newTags = tagsToMergeByItemId[e.id_estado];
          if (!newTags) return e;
          const prevTags = e.add_tags || [];
          return {
            ...e,
            add_tags: Array.from(new Set([...prevTags, ...newTags]))
          };
        }));
        break;

      case "nome":
        setNomes(prev => prev.map(n => {
          const newTags = tagsToMergeByItemId[n.id_nome];
          if (!newTags) return n;
          const prevTags = n.req_tags || [];
          return {
            ...n,
            req_tags: Array.from(new Set([...prevTags, ...newTags]))
          };
        }));
        break;
    }

    const feedbackSub = `Sucesso: ${updatedCount} item(ns) atualizado(s) com novas tags. ${alreadyHadCount > 0 ? `${alreadyHadCount} já possuíam as tags. ` : ""}${ignoredCount > 0 ? `${ignoredCount} linha(s) ignoradas.` : ""}`;

    triggerToast(
      "Injeção Concluída!",
      feedbackSub,
      false,
      "success"
    );
    
    // Clear advancedText and close modal
    setAdvancedText("");
    setIsAdvancedModalOpen(false);
  };

  // Configure Sensors with touch optimization
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 8 }
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 8 }
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  // Dynamic list of selectable items with normalized wrapper maps
  const alchemyItemsList = useMemo(() => {
    switch (selectedCategory) {
      case "demografia":
        return demografia.map(d => ({
          id: d.id_demo,
          name: d.descricao,
          type: "Demografia",
          req_tags: [] as string[],
          add_tags: d.add_tags || [],
          rawItem: d
        }));
      case "socioeconomico":
        return socioeconomico.map(s => ({
          id: s.id_socio,
          name: s.profissao,
          type: "Socioeconômico",
          req_tags: s.req_tags || [],
          add_tags: s.add_tags || [],
          rawItem: s
        }));
      case "cidade":
        return cidades.map(c => ({
          id: c.id_cidade,
          name: c.nome_cidade,
          type: "Geografia (Cidade)",
          req_tags: c.req_tags || [],
          add_tags: c.add_tags || [],
          rawItem: c
        }));
      case "estado":
        return estados.map(e => ({
          id: e.id_estado,
          name: e.nome_estado,
          type: "Geografia (Estado)",
          req_tags: [] as string[],
          add_tags: e.add_tags || [],
          rawItem: e
        }));
      case "nome":
        return nomes.map(n => ({
          id: n.id_nome,
          name: n.nome,
          type: "Nomes (Regras)",
          req_tags: n.req_tags || [],
          add_tags: [] as string[],
          rawItem: n
        }));
      default:
        return [];
    }
  }, [selectedCategory, demografia, socioeconomico, cidades, estados, nomes]);

  // Derived filtered items for the active cabinet
  const filteredCabinetItems = useMemo(() => {
    if (!cabinetSearchQuery.trim()) return alchemyItemsList;
    const query = cabinetSearchQuery.toLowerCase();
    return alchemyItemsList.filter(item => 
      item.name.toLowerCase().includes(query) || 
      item.id.toLowerCase().includes(query)
    );
  }, [alchemyItemsList, cabinetSearchQuery]);

  // Current active core item
  const selectedCoreItem = useMemo(() => {
    if (!selectedItemId) return alchemyItemsList[0] || null;
    return alchemyItemsList.find(item => item.id === selectedItemId) || alchemyItemsList[0] || null;
  }, [alchemyItemsList, selectedItemId]);

  // Derived properties across multi-selected items for Batch Editing
  const batchItemDetails = useMemo(() => {
    if (selectedItemIds.length <= 1) return { req_tags: [], add_tags: [], mult_tags: {} as Record<string, number> };
    
    // Find all items in the current selection
    const selectedItems = alchemyItemsList.filter(item => selectedItemIds.includes(item.id));
    
    const reqTagsSet = new Set<string>();
    const addTagsSet = new Set<string>();
    const multTags: Record<string, number> = {};

    selectedItems.forEach(item => {
      item.req_tags.forEach(t => {
        reqTagsSet.add(t);
        const w = item.rawItem?.mult_tags?.[t] ?? item.rawItem?.[`mult_${t}`];
        if (w !== undefined && w !== null) {
          multTags[t] = w;
        }
      });
      item.add_tags.forEach(t => {
        addTagsSet.add(t);
        const w = item.rawItem?.mult_tags?.[t] ?? item.rawItem?.[`mult_${t}`];
        if (w !== undefined && w !== null) {
          multTags[t] = w;
        }
      });
    });

    return {
      req_tags: Array.from(reqTagsSet),
      add_tags: Array.from(addTagsSet),
      mult_tags: multTags
    };
  }, [selectedItemIds, alchemyItemsList]);

  // Extract all compiled system tags
  const allKnownSystemTags = useMemo(() => {
    const tagsSet = new Set<string>();
    
    // Explicit lists
    tagDef.forEach(t => {
      if (t.tag?.trim()) tagsSet.add(t.tag.trim());
    });
    
    // Extracted from arrays
    demografia.forEach(d => d.add_tags?.forEach(tag => tagsSet.add(tag)));
    socioeconomico.forEach(s => {
      s.add_tags?.forEach(tag => tagsSet.add(tag));
      s.req_tags?.forEach(tag => tagsSet.add(tag));
    });
    cidades.forEach(c => {
      c.add_tags?.forEach(tag => tagsSet.add(tag));
      c.req_tags?.forEach(tag => tagsSet.add(tag));
    });
    estados.forEach(e => e.add_tags?.forEach(tag => tagsSet.add(tag)));
    nomes.forEach(n => n.req_tags?.forEach(tag => tagsSet.add(tag)));

    return Array.from(tagsSet);
  }, [tagDef, demografia, socioeconomico, cidades, estados, nomes]);

  // Filter gems by shelf pill selection AND search query
  const filteredGems = useMemo(() => {
    let result = allKnownSystemTags;

    // Apply search query
    if (tagSearchQuery.trim()) {
      result = result.filter(tag => 
        tag.toLowerCase().includes(tagSearchQuery.toLowerCase())
      );
    }

    // Apply categorical filters
    if (activeShelfFilter === "todos") return result;

    return result.filter(tag => {
      const colors = getTagColorScheme(tag);
      if (activeShelfFilter === "demo" && colors.label === "Demografia") return true;
      if (activeShelfFilter === "socio" && colors.label === "Socioeconômico") return true;
      if (activeShelfFilter === "psi" && colors.label === "Psicológico") return true;
      if (activeShelfFilter === "geo" && colors.label === "Geográfico") return true;
      return false;
    });
  }, [allKnownSystemTags, tagSearchQuery, activeShelfFilter]);

  // Balança Preditiva (Real-Time Drag and Drop Weight HUD)
  const weighCalculation = useMemo(() => {
    if (!selectedCoreItem) return { original: 0, simulated: 0, multDetail: [] as string[] };
    
    const original = selectedCoreItem.rawItem?.peso_base || 50;
    let simulated = original;
    const multDetail: string[] = [];

    // Map active multiplier tags inside item
    const rawKeys = (selectedCoreItem.rawItem || {}) as any;
    const itemMults = rawKeys.mult_tags || {};

    const allInvolvedTags = [...selectedCoreItem.req_tags, ...selectedCoreItem.add_tags];
    
    allInvolvedTags.forEach(tag => {
      // Priority 1: Shelf custom weight we are entering in the panel
      // Priority 2: Inherent database item mult_tags object
      // Priority 3: Flat property mult_TAGNAME key
      let factor = 1.0;
      if (shelfWeights[tag] !== undefined) {
        factor = shelfWeights[tag];
        multDetail.push(`${tag} (${factor}x da bancada)`);
      } else if (itemMults[tag] !== undefined) {
        factor = itemMults[tag];
        multDetail.push(`${tag} (${factor}x no banco)`);
      } else if (rawKeys[`mult_${tag}`] !== undefined) {
        factor = Number(rawKeys[`mult_${tag}`]);
        multDetail.push(`${tag} (${factor}x no banco)`);
      }

      if (factor !== 1.0 && !isNaN(factor)) {
        simulated = simulated * factor;
      }
    });

    return {
      original,
      simulated: parseFloat(simulated.toFixed(1)),
      multDetail
    };
  }, [selectedCoreItem, shelfWeights]);

  // PARADOX ACTIVE ACTION DETECTOR
  const detectParadoxConflict = (targetItem: typeof selectedCoreItem, tagToAdd: string): string | null => {
    if (!targetItem) return null;
    const existing = [...targetItem.req_tags, ...targetItem.add_tags];
    
    for (const [p1, p2] of PARADOXED_PAIRS) {
      if (tagToAdd.toLowerCase() === p1.toLowerCase() && existing.some(t => t.toLowerCase() === p2.toLowerCase())) {
        return p2;
      }
      if (tagToAdd.toLowerCase() === p2.toLowerCase() && existing.some(t => t.toLowerCase() === p1.toLowerCase())) {
        return p1;
      }
    }
    return null;
  };

  const triggerCauldronParadoxShake = () => {
    setIsCauldronParadoxShaked(true);
    setTimeout(() => {
      setIsCauldronParadoxShaked(false);
    }, 850);
  };

  const triggerBubblePulse = () => {
    setBubbleAnimate(true);
    setTimeout(() => {
      setBubbleAnimate(false);
    }, 900);
  };

  // State modifier wrappers adding items beautifully
  const addTagToCoreItem = (targetKey: "req" | "add", tagName: string, weight?: number | null) => {
    if (!selectedCoreItem) return;
    
    // Check Paradox conflict
    const paradoxFound = detectParadoxConflict(selectedCoreItem, tagName);
    if (paradoxFound) {
      triggerCauldronParadoxShake();
      triggerToast(
        "⚡ Paradoxos Alquímicos Detectados!",
        `Bloqueado: Não é possível carregar "${tagName}" simultaneamente com "${paradoxFound}".`,
        true
      );
      return;
    }

    const id = selectedCoreItem.id;
    triggerBubblePulse();
    const hasWeight = weight !== undefined && weight !== null;

    switch (selectedCategory) {
      case "demografia":
        if (targetKey === "req") return;
        setDemografia(prev => prev.map(d => {
          if (d.id_demo !== id) return d;
          let add_tags = d.add_tags || [];
          if (!add_tags.includes(tagName)) {
            add_tags = [...add_tags, tagName];
          }
          const updated = { ...d, add_tags } as any;
          if (hasWeight) {
            const mult_tags = { ...((d as any).mult_tags || {}), [tagName]: weight };
            updated.mult_tags = mult_tags;
            updated[`mult_${tagName}`] = weight;
          }
          return updated;
        }));
        break;
      case "socioeconomico":
        setSocioeconomico(prev => prev.map(s => {
          if (s.id_socio !== id) return s;
          let updated = { ...s };
          if (targetKey === "req") {
            let req_tags = s.req_tags || [];
            if (!req_tags.includes(tagName)) {
              req_tags = [...req_tags, tagName];
            }
            updated.req_tags = req_tags;
          } else {
            let add_tags = s.add_tags || [];
            if (!add_tags.includes(tagName)) {
              add_tags = [...add_tags, tagName];
            }
            updated.add_tags = add_tags;
          }
          if (hasWeight) {
            const mult_tags = { ...(s.mult_tags || {}), [tagName]: weight };
            updated.mult_tags = mult_tags;
            updated[`mult_${tagName}`] = weight;
          }
          return updated;
        }));
        break;
      case "cidade":
        setCidades(prev => prev.map(c => {
          if (c.id_cidade !== id) return c;
          let updated = { ...c };
          if (targetKey === "req") {
            let req_tags = c.req_tags || [];
            if (!req_tags.includes(tagName)) {
              req_tags = [...req_tags, tagName];
            }
            updated.req_tags = req_tags;
          } else {
            let add_tags = c.add_tags || [];
            if (!add_tags.includes(tagName)) {
              add_tags = [...add_tags, tagName];
            }
            updated.add_tags = add_tags;
          }
          if (hasWeight) {
            const mult_tags = { ...(c.mult_tags || {}), [tagName]: weight };
            updated.mult_tags = mult_tags;
            updated[`mult_${tagName}`] = weight;
          }
          return updated;
        }));
        break;
      case "estado":
        if (targetKey === "req") return;
        setEstados(prev => prev.map(e => {
          if (e.id_estado !== id) return e;
          let add_tags = e.add_tags || [];
          if (!add_tags.includes(tagName)) {
            add_tags = [...add_tags, tagName];
          }
          const updated = { ...e, add_tags } as any;
          if (hasWeight) {
            const mult_tags = { ...((e as any).mult_tags || {}), [tagName]: weight };
            updated.mult_tags = mult_tags;
            updated[`mult_${tagName}`] = weight;
          }
          return updated;
        }));
        break;
      case "nome":
        if (targetKey === "add") return;
        setNomes(prev => prev.map(n => {
          if (n.id_nome !== id) return n;
          let req_tags = n.req_tags || [];
          if (!req_tags.includes(tagName)) {
            req_tags = [...req_tags, tagName];
          }
          const updated = { ...n, req_tags } as any;
          if (hasWeight) {
            const mult_tags = { ...(n.mult_tags || {}), [tagName]: weight };
            updated.mult_tags = mult_tags;
            updated[`mult_${tagName}`] = weight;
          }
          return updated;
        }));
        break;
    }
  };

  const removeTagFromCoreItem = (targetKey: "req" | "add", tagName: string) => {
    if (!selectedCoreItem) return;
    const id = selectedCoreItem.id;

    switch (selectedCategory) {
      case "demografia":
        if (targetKey === "req") return;
        setDemografia(prev => prev.map(d => {
          if (d.id_demo !== id) return d;
          const add_tags = (d.add_tags || []).filter(t => t !== tagName);
          const mult_tags = { ...(d.mult_tags || {}) };
          delete mult_tags[tagName];
          const updated = { ...d, add_tags, mult_tags };
          delete updated[`mult_${tagName}`];
          return updated;
        }));
        break;
      case "socioeconomico":
        setSocioeconomico(prev => prev.map(s => {
          if (s.id_socio !== id) return s;
          let updated = { ...s };
          if (targetKey === "req") {
            updated.req_tags = (s.req_tags || []).filter(t => t !== tagName);
          } else {
            updated.add_tags = (s.add_tags || []).filter(t => t !== tagName);
          }
          const mult_tags = { ...(s.mult_tags || {}) };
          delete mult_tags[tagName];
          updated.mult_tags = mult_tags;
          delete updated[`mult_${tagName}`];
          return updated;
        }));
        break;
      case "cidade":
        setCidades(prev => prev.map(c => {
          if (c.id_cidade !== id) return c;
          let updated = { ...c };
          if (targetKey === "req") {
            updated.req_tags = (c.req_tags || []).filter(t => t !== tagName);
          } else {
            updated.add_tags = (c.add_tags || []).filter(t => t !== tagName);
          }
          const mult_tags = { ...(c.mult_tags || {}) };
          delete mult_tags[tagName];
          updated.mult_tags = mult_tags;
          delete updated[`mult_${tagName}`];
          return updated;
        }));
        break;
      case "estado":
        if (targetKey === "req") return;
        setEstados(prev => prev.map(e => {
          if (e.id_estado !== id) return e;
          const add_tags = (e.add_tags || []).filter(t => t !== tagName);
          const mult_tags = { ...(e.mult_tags || {}) };
          delete mult_tags[tagName];
          const updated = { ...e, add_tags, mult_tags };
          delete updated[`mult_${tagName}`];
          return updated;
        }));
        break;
      case "nome":
        if (targetKey === "add") return;
        setNomes(prev => prev.map(n => {
          if (n.id_nome !== id) return n;
          const req_tags = (n.req_tags || []).filter(t => t !== tagName);
          const mult_tags = { ...(n.mult_tags || {}) };
          delete mult_tags[tagName];
          const updated = { ...n, req_tags, mult_tags };
          delete updated[`mult_${tagName}`];
          return updated;
        }));
        break;
    }
  };

  const addTagToBatchItems = (targetKey: "req" | "add", tagName: string, weight?: number | null) => {
    if (selectedItemIds.length === 0) return;
    
    triggerBubblePulse();
    const hasWeight = weight !== undefined && weight !== null;

    let successCount = 0;
    let conflictCount = 0;

    const runAddForSingleItemPayload = (itemExistingTags: string[]): { shouldAdd: boolean; paradoxFound?: string | null } => {
      for (const [p1, p2] of PARADOXED_PAIRS) {
        if (tagName.toLowerCase() === p1.toLowerCase() && itemExistingTags.some(t => t.toLowerCase() === p2.toLowerCase())) {
          return { shouldAdd: false, paradoxFound: p2 };
        }
        if (tagName.toLowerCase() === p2.toLowerCase() && itemExistingTags.some(t => t.toLowerCase() === p1.toLowerCase())) {
          return { shouldAdd: false, paradoxFound: p1 };
        }
      }
      return { shouldAdd: true };
    };

    switch (selectedCategory) {
      case "demografia":
        if (targetKey === "req") return;
        setDemografia(prev => prev.map(d => {
          if (!selectedItemIds.includes(d.id_demo)) return d;
          const check = runAddForSingleItemPayload(d.add_tags || []);
          if (!check.shouldAdd) {
            conflictCount++;
            return d;
          }
          successCount++;
          const mergedTags = Array.from(new Set([...(d.add_tags || []), tagName]));
          const updated = { 
            ...d, 
            add_tags: mergedTags,
            ...(hasWeight ? {
              mult_tags: { ...((d as any).mult_tags || {}), [tagName]: weight },
              [`mult_${tagName}`]: weight
            } : {})
          } as any;
          return updated;
        }));
        break;

      case "socioeconomico":
        setSocioeconomico(prev => prev.map(s => {
          if (!selectedItemIds.includes(s.id_socio)) return s;
          const currentTags = [...(s.req_tags || []), ...(s.add_tags || [])];
          const check = runAddForSingleItemPayload(currentTags);
          if (!check.shouldAdd) {
            conflictCount++;
            return s;
          }
          successCount++;
          const mergedTags = targetKey === "req"
            ? Array.from(new Set([...(s.req_tags || []), tagName]))
            : Array.from(new Set([...(s.add_tags || []), tagName]));
          
          const updated = {
            ...s,
            ...(targetKey === "req" ? { req_tags: mergedTags } : { add_tags: mergedTags }),
            ...(hasWeight ? {
              mult_tags: { ...(s.mult_tags || {}), [tagName]: weight },
              [`mult_${tagName}`]: weight
            } : {})
          } as any;
          return updated;
        }));
        break;

      case "cidade":
        setCidades(prev => prev.map(c => {
          if (!selectedItemIds.includes(c.id_cidade)) return c;
          const currentTags = [...(c.req_tags || []), ...(c.add_tags || [])];
          const check = runAddForSingleItemPayload(currentTags);
          if (!check.shouldAdd) {
            conflictCount++;
            return c;
          }
          successCount++;
          const mergedTags = targetKey === "req"
            ? Array.from(new Set([...(c.req_tags || []), tagName]))
            : Array.from(new Set([...(c.add_tags || []), tagName]));
          
          const updated = {
            ...c,
            ...(targetKey === "req" ? { req_tags: mergedTags } : { add_tags: mergedTags }),
            ...(hasWeight ? {
              mult_tags: { ...(c.mult_tags || {}), [tagName]: weight },
              [`mult_${tagName}`]: weight
            } : {})
          } as any;
          return updated;
        }));
        break;

      case "estado":
        if (targetKey === "req") return;
        setEstados(prev => prev.map(e => {
          if (!selectedItemIds.includes(e.id_estado)) return e;
          const check = runAddForSingleItemPayload(e.add_tags || []);
          if (!check.shouldAdd) {
            conflictCount++;
            return e;
          }
          successCount++;
          const mergedTags = Array.from(new Set([...(e.add_tags || []), tagName]));
          const updated = {
            ...e,
            add_tags: mergedTags,
            ...(hasWeight ? {
              mult_tags: { ...((e as any).mult_tags || {}), [tagName]: weight },
              [`mult_${tagName}`]: weight
            } : {})
          } as any;
          return updated;
        }));
        break;

      case "nome":
        if (targetKey === "add") return;
        setNomes(prev => prev.map(n => {
          if (!selectedItemIds.includes(n.id_nome)) return n;
          const check = runAddForSingleItemPayload(n.req_tags || []);
          if (!check.shouldAdd) {
            conflictCount++;
            return n;
          }
          successCount++;
          const mergedTags = Array.from(new Set([...(n.req_tags || []), tagName]));
          const updated = {
            ...n,
            req_tags: mergedTags,
            ...(hasWeight ? {
              mult_tags: { ...(n.mult_tags || {}), [tagName]: weight },
              [`mult_${tagName}`]: weight
            } : {})
          } as any;
          return updated;
        }));
        break;
    }

    if (conflictCount > 0) {
      triggerCauldronParadoxShake();
      triggerToast(
        "⚡ Conflitos na Edição em Massa!",
        `Gema aplicada com sucesso a ${successCount} itens. Bloqueada em ${conflictCount} itens devido a paradoxos.`,
        true
      );
    } else {
      triggerToast(
        "✨ Edição em Massa Concluída!",
        `A gema "${tagName}" foi infundida com sucesso em ${successCount} itens selecionados!`,
        false
      );
    }
  };

  const removeTagFromBatchItems = (targetKey: "req" | "add", tagName: string) => {
    if (selectedItemIds.length === 0) return;

    switch (selectedCategory) {
      case "demografia":
        if (targetKey === "req") return;
        setDemografia(prev => prev.map(d => {
          if (!selectedItemIds.includes(d.id_demo)) return d;
          const add_tags = (d.add_tags || []).filter(t => t !== tagName);
          const mult_tags = { ...(d.mult_tags || {}) };
          delete mult_tags[tagName];
          const updated = { ...d, add_tags, mult_tags };
          delete updated[`mult_${tagName}`];
          return updated;
        }));
        break;
      case "socioeconomico":
        setSocioeconomico(prev => prev.map(s => {
          if (!selectedItemIds.includes(s.id_socio)) return s;
          let updated = { ...s };
          if (targetKey === "req") {
            updated.req_tags = (s.req_tags || []).filter(t => t !== tagName);
          } else {
            updated.add_tags = (s.add_tags || []).filter(t => t !== tagName);
          }
          const mult_tags = { ...(s.mult_tags || {}) };
          delete mult_tags[tagName];
          updated.mult_tags = mult_tags;
          delete updated[`mult_${tagName}`];
          return updated;
        }));
        break;
      case "cidade":
        setCidades(prev => prev.map(c => {
          if (!selectedItemIds.includes(c.id_cidade)) return c;
          let updated = { ...c };
          if (targetKey === "req") {
            updated.req_tags = (c.req_tags || []).filter(t => t !== tagName);
          } else {
            updated.add_tags = (c.add_tags || []).filter(t => t !== tagName);
          }
          const mult_tags = { ...(c.mult_tags || {}) };
          delete mult_tags[tagName];
          updated.mult_tags = mult_tags;
          delete updated[`mult_${tagName}`];
          return updated;
        }));
        break;
      case "estado":
        if (targetKey === "req") return;
        setEstados(prev => prev.map(e => {
          if (!selectedItemIds.includes(e.id_estado)) return e;
          const add_tags = (e.add_tags || []).filter(t => t !== tagName);
          const mult_tags = { ...(e.mult_tags || {}) };
          delete mult_tags[tagName];
          const updated = { ...e, add_tags, mult_tags };
          delete updated[`mult_${tagName}`];
          return updated;
        }));
        break;
      case "nome":
        if (targetKey === "add") return;
        setNomes(prev => prev.map(n => {
          if (!selectedItemIds.includes(n.id_nome)) return n;
          const req_tags = (n.req_tags || []).filter(t => t !== tagName);
          const mult_tags = { ...(n.mult_tags || {}) };
          delete mult_tags[tagName];
          const updated = { ...n, req_tags, mult_tags };
          delete updated[`mult_${tagName}`];
          return updated;
        }));
        break;
    }

    triggerToast(
      "🗑️ Gema Removida do Lote!",
      `A gema "${tagName}" foi removida de todos os itens selecionados.`,
      false
    );
  };

  // ON DRAG START & END HANDLERS
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    const activeIdStr = String(active.id);

    // Retrieve rich data payloads
    const activeData = active.data.current as { 
      tagName?: string; 
      weight?: number | null;
      isMasterCrystal?: boolean;
      masterTags?: string[] 
    } | undefined;

    const dragTagName = activeData?.tagName;
    const dragWeight = activeData?.weight ?? null;

    // Handle dropping massive crystals
    if (activeData?.isMasterCrystal && activeData?.masterTags) {
      const targetSlot = over?.id === "req_slot" ? "req" : over?.id === "add_slot" ? "add" : null;
      if (!targetSlot) return;

      if (selectedItemIds.length > 1) {
        // Master Crystal dropped onto Batch Crucible
        activeData.masterTags.forEach(tagName => {
          addTagToBatchItems(targetSlot, tagName, null);
        });
      } else {
        // Standard Individual Drop
        let injectedCount = 0;
        let blockedCount = 0;

        activeData.masterTags.forEach(tagName => {
          const paradoxFound = detectParadoxConflict(selectedCoreItem, tagName);
          if (paradoxFound) {
            blockedCount++;
          } else {
            addTagToCoreItem(targetSlot, tagName, null);
            injectedCount++;
          }
        });

        if (blockedCount > 0) {
          triggerCauldronParadoxShake();
          triggerToast(
            "🔮 Fusão de Cristal Parcial!",
            `Carregadas ${injectedCount} gemas. ${blockedCount} foram travadas para evitar colapso de paradoxo.`,
            true
          );
        } else {
          triggerToast(
            "✨ Cristal Mestrado Desintegrado!",
            `Infundidas ${injectedCount} gemas simultaneamente em harmonia no slot ${targetSlot}!`,
            false
          );
        }
      }
      return;
    }

    // Standard tag interaction routing
    if (activeIdStr.startsWith("shelf::")) {
      const tagName = dragTagName || activeIdStr.replace("shelf::", "");
      if (over?.id === "req_slot") {
        if (selectedItemIds.length > 1) {
          addTagToBatchItems("req", tagName, dragWeight);
        } else {
          addTagToCoreItem("req", tagName, dragWeight);
        }
      } else if (over?.id === "add_slot") {
        if (selectedItemIds.length > 1) {
          addTagToBatchItems("add", tagName, dragWeight);
        } else {
          addTagToCoreItem("add", tagName, dragWeight);
        }
      }
    } 
    else if (activeIdStr.startsWith("req::")) {
      const tagName = dragTagName || activeIdStr.replace("req::", "");
      if (over?.id === "add_slot") {
        if (selectedItemIds.length > 1) {
          removeTagFromBatchItems("req", tagName);
          addTagToBatchItems("add", tagName, dragWeight);
        } else {
          removeTagFromCoreItem("req", tagName);
          addTagToCoreItem("add", tagName, dragWeight);
        }
      } else if (over?.id !== "req_slot") {
        if (selectedItemIds.length > 1) {
          removeTagFromBatchItems("req", tagName);
        } else {
          removeTagFromCoreItem("req", tagName);
        }
      }
    } 
    else if (activeIdStr.startsWith("add::")) {
      const tagName = dragTagName || activeIdStr.replace("add::", "");
      if (over?.id === "req_slot") {
        if (selectedItemIds.length > 1) {
          removeTagFromBatchItems("add", tagName);
          addTagToBatchItems("req", tagName, dragWeight);
        } else {
          removeTagFromCoreItem("add", tagName);
          addTagToCoreItem("req", tagName, dragWeight);
        }
      } else if (over?.id !== "add_slot") {
        if (selectedItemIds.length > 1) {
          removeTagFromBatchItems("add", tagName);
        } else {
          removeTagFromCoreItem("add", tagName);
        }
      }
    }
  };

  const handleForgeCustomTag = () => {
    const rawTag = newCustomTagName.trim().replace(/\s+/g, "_");
    if (!rawTag) return;

    if (allKnownSystemTags.some(t => t.toLowerCase() === rawTag.toLowerCase())) {
      triggerToast("Erro de duplicado!", "Esta gema já existe nas prateleiras do laboratório!", true);
      return;
    }

    const newTagEntry: TagDef = {
      tag: rawTag,
      mod_saude: 1.0,
      mod_felicidade: 1.0,
      mod_renda_mensal: 1.0
    };

    setTagDef(prev => [...prev, newTagEntry]);
    setNewCustomTagName("");
    setActiveSelectedGem(rawTag);
    triggerToast("Gema Criada!", `Cunhada a essência "${rawTag}" nas prateleiras.`, false);
    triggerBubblePulse();
  };

  // RETROACTIVE SYSTEM PARADOX SCANNER Engine Check
  const runRetroactiveParadoxScanner = () => {
    const foundAnomalies: typeof anomalies = [];

    // 1. Demografia Scan
    demografia.forEach(d => {
      const tags = d.add_tags || [];
      const conflicts: string[] = [];
      PARADOXED_PAIRS.forEach(([p1, p2]) => {
        if (tags.includes(p1) && tags.includes(p2)) {
          conflicts.push(`(${p1} ⇄ ${p2})`);
        }
      });
      if (conflicts.length > 0) {
        foundAnomalies.push({
          id: d.id_demo,
          name: d.descricao,
          type: "Demografia",
          category: "demografia",
          conflicts
        });
      }
    });

    // 2. Socioeconomico Scan
    socioeconomico.forEach(s => {
      const tags = [...(s.req_tags || []), ...(s.add_tags || [])];
      const conflicts: string[] = [];
      PARADOXED_PAIRS.forEach(([p1, p2]) => {
        if (tags.includes(p1) && tags.includes(p2)) {
          conflicts.push(`(${p1} ⇄ ${p2})`);
        }
      });
      if (conflicts.length > 0) {
        foundAnomalies.push({
          id: s.id_socio,
          name: s.profissao,
          type: "Socioeconômico / Cargo",
          category: "socioeconomico",
          conflicts
        });
      }
    });

    // 3. Cidades Scan
    cidades.forEach(c => {
      const tags = [...(c.req_tags || []), ...(c.add_tags || [])];
      const conflicts: string[] = [];
      PARADOXED_PAIRS.forEach(([p1, p2]) => {
        if (tags.includes(p1) && tags.includes(p2)) {
          conflicts.push(`(${p1} ⇄ ${p2})`);
        }
      });
      if (conflicts.length > 0) {
        foundAnomalies.push({
          id: c.id_cidade,
          name: c.nome_cidade,
          type: "Geografia / Município",
          category: "cidade",
          conflicts
        });
      }
    });

    // 4. Estados Scan
    estados.forEach(e => {
      const tags = e.add_tags || [];
      const conflicts: string[] = [];
      PARADOXED_PAIRS.forEach(([p1, p2]) => {
        if (tags.includes(p1) && tags.includes(p2)) {
          conflicts.push(`(${p1} ⇄ ${p2})`);
        }
      });
      if (conflicts.length > 0) {
        foundAnomalies.push({
          id: e.id_estado,
          name: e.nome_estado,
          type: "Geografia / Estado",
          category: "estado",
          conflicts
        });
      }
    });

    // 5. Nomes Scan
    nomes.forEach(n => {
      const tags = n.req_tags || [];
      const conflicts: string[] = [];
      PARADOXED_PAIRS.forEach(([p1, p2]) => {
        if (tags.includes(p1) && tags.includes(p2)) {
          conflicts.push(`(${p1} ⇄ ${p2})`);
        }
      });
      if (conflicts.length > 0) {
        foundAnomalies.push({
          id: n.id_nome,
          name: n.nome,
          type: "Nomes (Regras)",
          category: "nome",
          conflicts
        });
      }
    });

    setAnomalies(foundAnomalies);
    setScannerOpen(true);

    if (foundAnomalies.length > 0) {
      triggerToast(
        "🚨 Varredura Completa!",
        `Esquadrinhados ${foundAnomalies.length} paradoxos na planilha ativa.`,
        true
      );
    } else {
      triggerToast(
        "✅ Planilha Saudável!",
        "Nenhum conflito paradoxal foi detectado retroativamente no motor atual.",
        false
      );
    }
  };

  // EXPORT FUNCTION (Formatted tabbed database content)
  const exportCurrentMatrixToClipboard = async () => {
    let headers: string[] = [];
    let dataList: any[] = [];
    let tabLabel = "";

    if (selectedCategory === "demografia") {
      tabLabel = "Democracia/Demografia";
      headers = ["id_demo", "descricao", "idade_min", "idade_max", "peso_base", "add_tags"];
      dataList = demografia;
    } else if (selectedCategory === "socioeconomico") {
      tabLabel = "Socioeconômico / Profissões";
      headers = ["id_socio", "profissao", "req_tags", "mult_tags", "peso_base", "add_tags"];
      dataList = socioeconomico;
    } else if (selectedCategory === "cidade") {
      tabLabel = "Cidades";
      headers = ["id_cidade", "nome_cidade", "req_tags", "peso_base", "add_tags"];
      dataList = cidades;
    } else if (selectedCategory === "estado") {
      tabLabel = "Estados";
      headers = ["id_estado", "nome_estado", "peso_base", "add_tags"];
      dataList = estados;
    } else if (selectedCategory === "nome") {
      tabLabel = "Nomes (Regras)";
      headers = ["id_nome", "nome", "req_tags", "peso_base"];
      dataList = nomes;
    }

    const tsvHeaderLine = headers.join("\t");
    const tsvRows = dataList.map((item) => {
      return headers.map((header) => {
        const value = item[header];
        if (Array.isArray(value)) {
          return value.join(", ");
        }
        if (typeof value === "object" && value !== null) {
          return Object.entries(value)
            .map(([k, v]) => `${k}:${v}`)
            .join(", ");
        }
        return value === undefined || value === null ? "" : String(value);
      }).join("\t");
    });

    const fullTSV = [tsvHeaderLine, ...tsvRows].join("\n");

    try {
      await navigator.clipboard.writeText(fullTSV);
      setExportFeedback(`Matriz de ${tabLabel} copiada em formato TSV estruturado!`);
      setTimeout(() => setExportFeedback(null), 5000);
    } catch (e) {
      console.error(e);
      setExportFeedback("Erro ao copiar matriz.");
      setTimeout(() => setExportFeedback(null), 5000);
    }
  };

  const copySyncPromptToClipboard = async () => {
    const promptText = "Atue como meu Engenheiro de Software. Acabei de atualizar a estrutura da planilha através do Painel de Alquimia. Por favor, force o reload do cache e re-mapeie as colunas do DataFrame a partir do link CSV: <LINK_DO_CSV_AQUI>. Garanta que o motor de sorteio procedural (RNG) e as amarrações de pesos incluam as novas tags de exigência e infundidas sem crashar o loop de geração massiva.";
    try {
      await navigator.clipboard.writeText(promptText);
      setExportFeedback("Prompt de Sincronização copiado!");
      setTimeout(() => setExportFeedback(null), 5000);
    } catch (e) {
      console.error(e);
      setExportFeedback("Erro ao copiar o prompt.");
      setTimeout(() => setExportFeedback(null), 5000);
    }
  };

  const activeTagName = activeDragId 
    ? (activeDragId.includes("::") ? activeDragId.split("::")[1] : activeDragId.replace("shelf::", "")) 
    : null;
  const activeWeight = activeTagName ? shelfWeights[activeTagName] : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6 text-indigo-150 relative">
        
        {/* PARADOX FEEDBACK TOAST FLOATING BANNER */}
        <AnimatePresence>
          {activeToast && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className={`fixed top-8 left-1/2 transform -translate-x-1/2 p-4 rounded-2xl shadow-2xl z-[999999] flex items-start gap-3 border max-w-md ${
                activeToast.type === "warning"
                  ? "bg-amber-950/95 border-amber-500/50 text-amber-100 shadow-[0_0_30px_rgba(245,158,11,0.4)]"
                  : activeToast.isError 
                    ? "bg-red-950/95 border-red-500/50 text-red-100 shadow-[0_0_30px_rgba(239,68,68,0.4)]"
                    : "bg-indigo-950/95 border-[#4f46e5]/50 text-indigo-100 shadow-[0_0_30px_rgba(79,70,229,0.4)]"
              }`}
            >
              <ShieldAlert className={`w-5 h-5 mt-0.5 shrink-0 ${
                activeToast.type === "warning"
                  ? "text-amber-400"
                  : activeToast.isError 
                    ? "text-red-400" 
                    : "text-indigo-400"
              }`} />
              <div className="text-left font-mono">
                <div className="text-xs font-black uppercase tracking-wider">{activeToast.message}</div>
                <div className="text-[10px] text-slate-350 mt-1 leading-snug">{activeToast.sub}</div>
              </div>
              <button onClick={() => setActiveToast(null)} className="text-slate-500 hover:text-white shrink-0 ml-1 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. ARCHITECTURE HEADER */}
        <div className="bg-[#0b0c15]/95 border border-indigo-900/40 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="absolute right-0 top-0 h-40 w-40 bg-fuchsia-600/10 rounded-full filter blur-xl pointer-events-none" />
          
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <FlaskConical className="w-5 h-5 text-indigo-400 animate-pulse" />
              </span>
              <h2 className="text-xl font-bold font-sans text-white tracking-tight flex flex-wrap items-center gap-2">
                <span>Laboratório de Alquimia Neural</span>
                <span className="text-[9px] text-yellow-400 font-mono uppercase bg-yellow-400/10 border border-yellow-400/30 px-1.5 py-0.5 rounded font-bold">
                  Bancada Profissional AAA
                </span>
              </h2>
            </div>
            <p className="text-xs text-[#a2a8d3] font-mono leading-relaxed">
              Arraste Gemas e Cristais Mestres no caldeirão para infundir sua descendência genética. Proteção contra paradoxos ativada em tempo real com balanceamento preciso.
            </p>
          </div>

          <div className="flex flex-wrap md:flex-nowrap items-center gap-3 shrink-0">
            {/* RETROACTIVE RUN ALERTER ACTION BUTTON */}
            <button
              onClick={runRetroactiveParadoxScanner}
              className="px-4 py-2.5 bg-[#4c0519]/80 border border-red-500/30 text-rose-300 hover:text-white rounded-xl text-xs font-mono font-bold transition-all hover:bg-rose-950 cursor-pointer flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.15)] animate-pulse"
              title="Escaneia retroativamente anomalias e tags excludentes na planilha inteira"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Escanear Paradoxos</span>
            </button>

            <div className="bg-[#06070e] border border-indigo-950/80 rounded-xl px-4 py-2 text-left font-mono">
              <div className="text-[9px] text-[#555a82] uppercase leading-none font-bold">Essências Totais</div>
              <div className="text-sm font-bold text-fuchsia-400 mt-1 flex items-center gap-1.5">
                <Pocket className="w-4 h-4 text-fuchsia-500" />
                <span>{allKnownSystemTags.length} Gemas</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. EXPORT CONTROLS HUD */}
        <div className="bg-slate-900 border-b border-indigo-500/30 p-4 rounded-2xl flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-fuchsia-400" />
            <span className="text-xs font-mono font-bold text-indigo-300">
              Exportar Matriz Ativa: <span className="text-white uppercase font-extrabold">{selectedCategory === "socioeconomico" ? "Socioeconômico" : selectedCategory}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 w-full sm:w-auto">
            <AnimatePresence>
              {exportFeedback && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-[10px] font-mono font-extrabold text-emerald-400 bg-emerald-950/50 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg shadow-sm"
                >
                  ✨ {exportFeedback}
                </motion.span>
              )}
            </AnimatePresence>

            <button
              onClick={exportCurrentMatrixToClipboard}
              className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-indigo-200 hover:text-white border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow"
              title="Copia os dados da sub-aba ativa em formato TSV estruturado"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-400" />
              <span>Copiar Matriz Atualizada (TSV)</span>
            </button>

            <button
              onClick={copySyncPromptToClipboard}
              className="px-3.5 py-2 bg-gradient-to-r from-indigo-700 to-fuchsia-700 hover:from-indigo-650 hover:to-fuchsia-650 text-white rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
              title="Copia o prompt de atualização do DataFrame com os novos dados em formato link CSV"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>Copiar Prompt de Sincronização Engine</span>
            </button>
          </div>
        </div>

        {/* 3. MAIN WORKSPACE GRID: ITEM SIDECHOOSER + CENTRAL CRUCIBLE */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mx-auto">
          
          {/* LEFT COLUMN: ITEM CHOOSER (Cols 1-4) */}
          <div className="w-full lg:col-span-4 bg-[#0a0b12]/95 border border-indigo-900/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-xl col-span-1">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] text-indigo-400/80 font-bold font-mono tracking-wider uppercase block">Gabinete de Matrizes:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["socioeconomico", "demografia", "cidade", "estado", "nome"] as const).map(cat => {
                    const isActive = selectedCategory === cat;
                    const isFullWidthCmd = cat === "nome";
                    const short = {
                      socioeconomico: "💼 Cargo/Pro",
                      demografia: "🧬 Demografia",
                      cidade: "🏙️ Municípios",
                      estado: "🇧🇷 Estados",
                      nome: "👤 Nomes (Regra)"
                    };
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setSelectedItemId(null);
                          setCabinetSearchQuery("");
                          setSelectedItemIds([]);
                        }}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold tracking-tight transition-all cursor-pointer ${
                          isFullWidthCmd ? "col-span-2" : ""
                        } ${
                          isActive 
                            ? "bg-indigo-950 border border-fuchsia-400 text-fuchsia-300 shadow-[0_0_8px_rgba(232,121,249,0.15)]"
                            : "bg-slate-950 border border-indigo-950 text-indigo-500 hover:text-indigo-300 hover:border-indigo-900"
                        }`}
                      >
                        {short[cat]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* BATCH EDITING SELECTION CONTROLS */}
              <div className="bg-[#05060b] p-3 rounded-xl border border-indigo-950 space-y-2 select-none">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBatchMode(!isBatchMode);
                        setSelectedItemIds([]);
                      }}
                      className={`px-2.5 py-1 text-[9px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 border h-7 rounded-lg ${
                        isBatchMode 
                          ? "border-amber-400 text-amber-300 bg-amber-950/45 font-black shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                          : "border-indigo-950 text-indigo-400 hover:text-indigo-300 hover:border-indigo-900"
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                      <span>{isBatchMode ? "✓ Lote Ativo" : "Seleção em Lote"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsAdvancedModalOpen(true);
                        if (selectedCategory === "nome") {
                          setAdvancedField("req_tags");
                        } else {
                          setAdvancedField("add_tags");
                        }
                      }}
                      className={`px-2.5 py-1 text-[9px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 border h-7 rounded-lg ${
                        isStealthMode 
                          ? "border-gray-355 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400"
                          : "border-indigo-950/60 text-indigo-300 bg-indigo-950/20 hover:text-white hover:border-indigo-800"
                      }`}
                      title="Injetar tags em massa a partir de texto estruturado (DSL)"
                    >
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Injetor Avançado</span>
                    </button>
                  </div>

                  {isBatchMode && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allFilteredIds = filteredCabinetItems.map(item => item.id);
                          const areAllSelected = allFilteredIds.every(id => selectedItemIds.includes(id));
                          if (areAllSelected) {
                            setSelectedItemIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
                          } else {
                            setSelectedItemIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
                          }
                        }}
                        className="text-[8px] font-mono bg-[#090a12] hover:bg-[#121422] border border-indigo-950 px-2 py-0.5 rounded text-fuchsia-400 hover:text-fuchsia-300 font-bold uppercase cursor-pointer"
                      >
                        ✓ Todos
                      </button>
                      
                      {selectedItemIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedItemIds([])}
                          className="text-[8px] font-mono hover:text-red-300 text-red-400 font-extrabold uppercase transition-all"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {isBatchMode ? (
                  <div className="flex items-center justify-between text-[7.5px] font-mono uppercase tracking-wide text-slate-400 pl-0.5">
                    <span>Marque vários itens abaixo</span>
                    {selectedItemIds.length > 0 && (
                      <span className="text-amber-400 font-extrabold">({selectedItemIds.length} selecionados)</span>
                    )}
                  </div>
                ) : (
                  <p className="text-[7.5px] uppercase font-mono tracking-wide text-slate-500 text-left pl-0.5">
                    Ative acima para aplicar o mesmo modificador a múltiplos itens ao mesmo tempo.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-mono font-extrabold text-[#747bbd] uppercase">Substâncias Ativas</span>
                  <span className="text-[9px] font-mono text-indigo-600">Total: {filteredCabinetItems.length}</span>
                </div>

                {/* Cabinet Search Input Bar */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={cabinetSearchQuery}
                    onChange={(e) => setCabinetSearchQuery(e.target.value)}
                    placeholder="Filtrar matérias neste gabinete..."
                    className="w-full pl-8 pr-7 py-1.5 bg-slate-950/80 hover:bg-slate-950 focus:bg-slate-950 border border-indigo-950/80 focus:border-indigo-500/50 outline-none text-[10.5px] text-white rounded-xl font-mono leading-none transition-all placeholder:text-[9.5px]"
                  />
                  {cabinetSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCabinetSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-500 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                
                <div className="overflow-y-auto max-h-[250px] pr-1 space-y-1.5 custom-scrollbar">
                  {filteredCabinetItems.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-[10px] font-mono italic">
                      Nenhuma matéria ativa encontrada para "{cabinetSearchQuery}".
                    </div>
                  ) : (
                    filteredCabinetItems.map(item => {
                      const isLoaded = selectedCoreItem?.id === item.id;
                      const isSelectedInBatch = selectedItemIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (isBatchMode) {
                              setSelectedItemIds(prev => 
                                prev.includes(item.id) 
                                  ? prev.filter(id => id !== item.id) 
                                  : [...prev, item.id]
                              );
                            } else {
                              setSelectedItemId(item.id);
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all select-none ${
                            isBatchMode
                              ? isSelectedInBatch
                                ? "ring-2 ring-yellow-400 bg-yellow-950 border-yellow-500 text-yellow-100 shadow-[0_0_12px_rgba(250,204,21,0.2)] scale-[0.98]"
                                : "bg-slate-950 border border-indigo-950/80 hover:border-indigo-900/40 text-indigo-400/80 hover:text-indigo-300"
                              : isLoaded 
                                ? "bg-fuchsia-950/20 border-fuchsia-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.15)]"
                                : "bg-slate-950 border border-indigo-950/80 hover:border-indigo-900/60 text-indigo-300"
                          }`}
                        >
                          <div className="text-xs font-bold font-sans truncate">{item.name}</div>
                          <div className="flex items-center gap-2 mt-1 text-[8.5px] text-[#555a82] font-mono">
                            <span className="text-indigo-400">{item.id}</span>
                            {item.req_tags.length > 0 && (
                              <span className="text-orange-400">| Q: {item.req_tags.length}</span>
                            )}
                            {item.add_tags.length > 0 && (
                              <span className="text-cyan-400">| G: {item.add_tags.length}</span>
                            )}
                            <span className="text-slate-500">| Peso: {item.rawItem?.peso_base || 50}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* FORGER */}
            <div className="pt-4 border-t border-indigo-950 space-y-2 text-left font-mono">
              <span className="text-[9px] text-[#747bbd] uppercase font-bold block">Forjar Nova Essência</span>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Ex_Gema_Psi"
                  value={newCustomTagName}
                  onChange={(e) => setNewCustomTagName(e.target.value)}
                  className="bg-slate-950 border border-indigo-950 focus:border-fuchsia-500 select-all outline-none rounded-lg px-2 py-1 text-[10px] text-slate-200 flex-1 font-mono"
                />
                <button
                  onClick={handleForgeCustomTag}
                  className="px-2.5 py-1 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white hover:from-fuchsia-500 hover:to-purple-500 font-bold rounded-lg cursor-pointer text-[10px] flex items-center justify-center gap-1 shadow-lg"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span>Cunhar</span>
                </button>
              </div>
            </div>
          </div>

          {/* CENTRAL AREA: CRUCIBLE CALDRON (Cols 5-12) */}
          <div className="w-full lg:col-span-8 bg-[#090b14]/90 border border-indigo-900/25 rounded-2xl p-4 md:p-6 flex flex-col gap-6 items-center justify-center relative shadow-2xl min-h-[440px] col-span-1">
            
            {/* 5. SMART PASTE AREA FOR MULTI-SELECT/BATCH EDITING */}
            {isBatchMode && (
              <div className="w-full max-w-2xl bg-[#030408]/80 border border-amber-500/20 p-4 rounded-xl flex flex-col gap-2.5 shadow-md font-mono text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-mono text-amber-400 font-extrabold flex items-center gap-1.5">
                    <Clipboard className="w-3.5 h-3.5 text-amber-400" />
                    Colagem Inteligente (Smart Paste)
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text) {
                            setSmartPasteText(text);
                            triggerToast("Clipboard Lida", "Texto copiado da área de transferência!", false);
                          } else {
                            triggerToast("Aviso", "A área de transferência está vazia.", true);
                          }
                        } catch (err) {
                          triggerToast("Restrição", "Permissão negada ou bloqueada no iFrame. Cole manualmente no campo abaixo.", true);
                        }
                      }}
                      className="text-[8px] bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-950 hover:border-indigo-800 px-2 py-0.5 rounded text-indigo-300 font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>📋 Colar clipboard</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setIsSmartPasteExpanded(!isSmartPasteExpanded)}
                      className="text-[8.5px] hover:text-indigo-350 text-indigo-500 font-bold uppercase cursor-pointer"
                    >
                      {isSmartPasteExpanded ? "Recolher [-]" : "Expandir [+]"}
                    </button>
                  </div>
                </div>

                {(isSmartPasteExpanded || smartPasteText.length > 0) ? (
                  <div className="space-y-2 animate-fade-in">
                    <textarea
                      placeholder="Cole nomes ou IDs separados por vírgula ou nova linha... Ex: Santos, São Paulo, Campinas"
                      value={smartPasteText}
                      onChange={(e) => setSmartPasteText(e.target.value)}
                      rows={2}
                      className="w-full p-2 bg-slate-950 border border-indigo-950 focus:border-fuchsia-500 rounded-lg outline-none text-[10px] text-slate-200 placeholder-slate-600 font-mono resize-none leading-normal"
                    />
                    <div className="flex justify-end gap-2">
                      {smartPasteText.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSmartPasteText("")}
                          className="px-2 py-0.5 border border-transparent text-[#94a3b8] hover:text-white font-bold rounded-md text-[8.5px] cursor-pointer"
                        >
                          Limpar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSmartPaste(smartPasteText)}
                        className="px-3 py-1 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white hover:from-fuchsia-500 hover:to-indigo-500 font-bold rounded-lg cursor-pointer text-[9px] flex items-center gap-1 shadow-md"
                      >
                        ✓ Injetar Seleção
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[8.5px] text-slate-500 flex items-center justify-between cursor-pointer" onClick={() => setIsSmartPasteExpanded(true)}>
                    <span>Cole uma lista de itens para selecioná-los no gabinete ativo "{selectedCategory.toUpperCase()}".</span>
                    <span className="text-fuchsia-500/80 font-bold hover:underline">Abrir Campo</span>
                  </div>
                )}
              </div>
            )}

            {/* LUPA CALDRON AND PREDITIVE DISPLAY HUD */}
            {selectedItemIds.length > 1 ? (
              <div className="w-full h-full flex-1 flex flex-col items-center justify-center space-y-6">
                
                {/* 6. BATCH EDITING HEADER HUD */}
                <div className="w-full bg-[#05060b]/90 border border-amber-500/30 p-4 rounded-2xl max-w-2xl font-mono text-left flex flex-col gap-3 shadow-xl select-none">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-indigo-950/40 pb-3">
                    <div className="space-y-1">
                      <div className="text-[10px] text-amber-400 font-extrabold uppercase flex items-center gap-1">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        Transmutação em Lote Ativa
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl font-black text-amber-300 tracking-tight leading-none drop-shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                          Editando {selectedItemIds.length} Itens em Massa
                        </span>
                      </div>
                    </div>

                    <div className="text-[9px] text-slate-300 border-l border-indigo-950 pl-0 sm:pl-4 self-center flex-1 max-w-md">
                      <span className="text-amber-500 font-bold uppercase tracking-wider block mb-1">Impacto Unificado:</span>
                      <span className="italic text-slate-400 text-[8.5px]">Qualquer gema arrastada para os slots abaixo será infundida simultaneamente nos {selectedItemIds.length} registros selecionados.</span>
                    </div>
                  </div>

                  {/* SELECTED RECORDS PILLS LIST */}
                  <div className="space-y-1">
                    <span className={`text-[8px] font-mono font-extrabold uppercase ${isStealthMode ? "text-gray-500" : "text-slate-500"}`}>Substâncias sob influência de lote:</span>
                    <div className="flex flex-wrap gap-1 max-h-[50px] overflow-y-auto pr-1 custom-scrollbar">
                      {alchemyItemsList.filter(it => selectedItemIds.includes(it.id)).map(it => (
                        <span key={it.id} className={`text-[8.5px] font-mono font-bold px-2 py-[2.5px] truncate max-w-[130px] ${
                          isStealthMode 
                            ? "bg-gray-100 border border-gray-300 text-gray-700 rounded-none font-sans" 
                            : "bg-amber-950/20 border border-amber-950/50 text-amber-400/90 rounded"
                        }`} title={it.name}>
                          {isStealthMode ? "📁" : "📦"} {it.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Crucible caldron state */}
                <div className="text-center space-y-1 max-w-lg">
                  <span className={isStealthMode ? "text-[10px] bg-white text-gray-600 border border-gray-300 px-3 py-0.5 rounded-none font-sans font-bold uppercase inline-block select-none" : "text-[8px] font-mono bg-amber-900/40 text-amber-400 border border-amber-800/30 px-3 py-0.5 rounded-full font-bold uppercase tracking-widest inline-block select-none"}>
                    {isStealthMode ? "Painel de Configuração de Tags em Lote" : "⚡ CALDEIRÃO EM LOTE OPERANTE"}
                  </span>
                </div>

                {/* 7. SYSTEM PARADOX ACTIVE CAULDRON WRAPPER (Batch Crucible) */}
                <motion.div 
                  animate={(isCauldronParadoxShaked && !isStealthMode) ? {
                    x: [0, -10, 10, -10, 10, -5, 5, 0],
                    borderColor: ["#d97706", "#ef4444", "#d97706"]
                  } : {}}
                  transition={{ duration: 0.7 }}
                  className={`w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch max-w-2xl px-2 p-5 ${
                    isStealthMode 
                      ? "bg-white border border-gray-300 rounded-none shadow-sm" 
                      : `bg-[#030407]/40 border-2 rounded-3xl ${isCauldronParadoxShaked ? "border-red-500 ring-2 ring-red-500/20" : "border-amber-700/60"}`
                  }`}
                >
                  
                  {/* SLOT 1 (DropZone de Requisitos) */}
                  <div className="flex flex-col space-y-1.5 text-left">
                    <span className={isStealthMode ? "text-xs font-sans text-gray-700 font-bold" : "text-[9px] uppercase tracking-wider font-mono text-orange-400 font-extrabold flex items-center gap-1 select-none"}>
                      {isStealthMode ? "Área de Anexo de Dados: Exigências" : <>
                        <Sliders className="w-3.5 h-3.5 text-orange-400" />
                        1. EXIGÊNCIAS EM MASSA (req_tags)
                      </>}
                    </span>
                    
                    <DroppableSlot 
                      id="req_slot"
                      className={isStealthMode ? `border border-gray-300 bg-white relative min-h-[160px] flex flex-col justify-center rounded-none p-4 ${
                        selectedCategory === "demografia" || selectedCategory === "estado"
                          ? "opacity-20 pointer-events-none select-none border-gray-200 bg-gray-50 text-gray-400"
                          : "hover:border-gray-450"
                      }` : `border-dashed border-2 border-orange-500/40 rounded-2xl p-4 flex flex-col bg-orange-950/5 relative min-h-[160px] justify-center ${
                        selectedCategory === "demografia" || selectedCategory === "estado"
                          ? "opacity-25 pointer-events-none select-none border-indigo-950"
                          : "hover:border-orange-500/70"
                      }`}
                    >
                      {/* Territory layout locking */}
                      {(selectedCategory === "demografia" || selectedCategory === "estado") && (
                        <div className={`absolute inset-0 flex flex-col items-center justify-center text-center p-3 z-10 ${
                          isStealthMode ? "bg-gray-50 rounded-none" : "bg-[#07080e]/95 rounded-2xl"
                        }`}>
                          <Lock className={`w-5 h-5 mb-1 ${isStealthMode ? "text-gray-400" : "text-indigo-500"}`} />
                          <span className={`text-[9px] font-mono leading-tight ${isStealthMode ? "text-gray-400" : "text-[#42466e]"}`}>
                            Sem exigências. Demos/Estados herdam sem restrições de entrada.
                          </span>
                        </div>
                      )}

                      {batchItemDetails.req_tags.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-4 text-center space-y-2 select-none">
                          <div className={isStealthMode ? "w-8 h-8 border border-gray-300 flex items-center justify-center text-xs text-gray-400 font-bold" : "w-8 h-8 rounded-full border border-dashed border-orange-500/30 flex items-center justify-center text-xs text-orange-400 font-bold animate-pulse"}>
                            +
                          </div>
                          <span className={isStealthMode ? "text-[10px] text-gray-400 font-sans" : "text-[9px] text-orange-455/70 font-mono uppercase font-black tracking-wide"}>
                            {isStealthMode ? "Arraste as tags exigidas" : "Solte exigências de lote aqui"}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 content-start p-2">
                          {batchItemDetails.req_tags.map(tag => {
                            const weight = batchItemDetails.mult_tags[tag];
                            return (
                              <SocketedGem
                                key={`req::${tag}`}
                                id={`req::${tag}`}
                                tag={tag}
                                weight={weight}
                                slotType="req"
                                onRemove={() => removeTagFromBatchItems("req", tag)}
                              />
                            );
                          })}
                        </div>
                      )}
                    </DroppableSlot>
                  </div>

                  {/* SLOT 2 (DropZone de Geração) */}
                  <div className="flex flex-col space-y-1.5 text-left">
                    <span className={isStealthMode ? "text-xs font-sans text-gray-700 font-bold" : "text-[9px] uppercase tracking-wider font-mono text-cyan-400 font-extrabold flex items-center gap-1 select-none"}>
                      {isStealthMode ? "Área de Anexo de Dados: Infusões" : <>
                        <Database className="w-3.5 h-3.5 text-cyan-400" />
                        2. GERAÇÃO EM MASSA (add_tags)
                      </>}
                    </span>

                    <DroppableSlot 
                      id="add_slot"
                      className={isStealthMode ? `border border-gray-300 bg-white relative min-h-[160px] flex flex-col justify-center rounded-none p-4 ${
                        selectedCategory === "nome"
                          ? "opacity-20 pointer-events-none select-none border-gray-200 bg-gray-50 text-gray-400"
                          : "hover:border-gray-450"
                      }` : `border-dashed border-2 border-cyan-500/40 rounded-2xl p-4 flex flex-col bg-cyan-950/5 relative min-h-[160px] justify-center ${
                        selectedCategory === "nome"
                          ? "opacity-25 pointer-events-none select-none border-indigo-950"
                          : "hover:border-cyan-500/70"
                      }`}
                    >
                      {selectedCategory === "nome" && (
                        <div className={`absolute inset-0 flex flex-col items-center justify-center text-center p-3 z-10 ${
                          isStealthMode ? "bg-gray-50 rounded-none" : "bg-[#07080e]/95 rounded-2xl"
                        }`}>
                          <Lock className={`w-5 h-5 mb-1 ${isStealthMode ? "text-gray-400" : "text-indigo-500"}`} />
                          <span className={`text-[9px] font-mono leading-tight ${isStealthMode ? "text-gray-400" : "text-[#42466e]"}`}>
                            Sem infusor de tags. Nomes servem apenas para filtrar por exigência.
                          </span>
                        </div>
                      )}

                      {batchItemDetails.add_tags.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-4 text-center space-y-2 select-none">
                          <div className={isStealthMode ? "w-8 h-8 border border-gray-300 flex items-center justify-center text-xs text-gray-400 font-bold" : "w-8 h-8 rounded-full border border-dashed border-cyan-500/30 flex items-center justify-center text-xs text-cyan-400 font-bold animate-pulse"}>
                            +
                          </div>
                          <span className={isStealthMode ? "text-[10px] text-gray-400 font-sans" : "text-[9px] text-cyan-455/70 font-mono uppercase font-black tracking-wide"}>
                            {isStealthMode ? "Arraste as tags de infusão" : "Solte infusões de lote aqui"}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 content-start p-2">
                          {batchItemDetails.add_tags.map(tag => {
                            const weight = batchItemDetails.mult_tags[tag];
                            return (
                              <SocketedGem
                                key={`add::${tag}`}
                                id={`add::${tag}`}
                                tag={tag}
                                weight={weight}
                                slotType="add"
                                onRemove={() => removeTagFromBatchItems("add", tag)}
                              />
                            );
                          })}
                        </div>
                      )}
                    </DroppableSlot>
                  </div>

                </motion.div>

                {/* DUAL-SHELF CONTROLS FOR BATCH INVENTORIES */}
                <div className="w-full max-w-2xl space-y-3 mt-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#05060b] p-3 rounded-xl border border-indigo-950 select-none">
                    <div className="flex flex-col text-left shrink-0">
                      <div className="flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-fuchsia-400" />
                        <span className="text-[10px] text-indigo-400 uppercase font-black font-mono">Inventário de Filtros</span>
                      </div>
                      <span className="text-[8px] text-slate-500 mt-0.5 uppercase font-bold font-mono">Pesquisa de gemas para lote</span>
                    </div>

                    <div className="flex flex-wrap gap-1 mr-auto sm:mr-0">
                      {(["todos", "demo", "socio", "psi", "geo", "cristais"] as const).map(pill => {
                        const isActive = activeShelfFilter === pill;
                        const labels = {
                          todos: "✨ Todos",
                          demo: "🔵 Demos",
                          socio: "🟡 Socios",
                          psi: "🟣 Psic",
                          geo: "🟢 Geos",
                          cristais: "💎 Cristais"
                        };
                        return (
                          <button
                            key={pill}
                            onClick={() => setActiveShelfFilter(pill)}
                            className={`text-[8px] font-bold font-mono px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                              isActive 
                                ? "bg-indigo-950 border-fuchsia-400/80 text-fuchsia-300 shadow-[0_0_8px_rgba(240,46,170,0.15)]"
                                : "bg-[#090a12] border-indigo-950 text-indigo-500 hover:text-indigo-400 hover:border-indigo-900"
                            }`}
                          >
                            {labels[pill]}
                          </button>
                        );
                      })}
                    </div>

                    <div className="relative w-full sm:max-w-xs font-mono">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-indigo-500">
                        <Search className="w-3 h-3 text-indigo-600" />
                      </div>
                      <input
                        type="text"
                        placeholder="Filtrar gaveta..."
                        value={tagSearchQuery}
                        onChange={(e) => setTagSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-indigo-950 focus:border-fuchsia-700 outline-none rounded-lg pl-7 pr-2.5 py-1 text-[9px] font-mono text-slate-350"
                      />
                    </div>
                  </div>

                  <div className="text-left font-mono">
                    <span className="text-[9px] uppercase tracking-wider font-mono text-fuchsia-400 font-extrabold flex items-center gap-1 select-none mb-1.5 pl-1">
                      <Pocket className="w-3.5 h-3.5 text-fuchsia-400" />
                      Prateleira de Essências Genéticas (Arraste para transmutação múltipla)
                    </span>
                    <DroppableSlot 
                      id="shelf_dock" 
                      className="flex flex-wrap gap-3 p-4 bg-slate-900/50 rounded-2xl border border-indigo-500/30 max-h-64 overflow-y-auto w-full custom-scrollbar items-start justify-start relative select-none"
                    >
                      {activeShelfFilter === "cristais" ? (
                        <div className="flex flex-wrap gap-3 p-1">
                          {MASTER_CRYSTALS.map(c => (
                            <MasterCrystal
                              key={c.id}
                              id={c.id}
                              name={c.name}
                              icon={c.icon}
                              tags={c.tags}
                              color={c.color}
                              description={c.description}
                            />
                          ))}
                        </div>
                      ) : (
                        filteredGems.length > 0 ? (
                          filteredGems.map((tag) => {
                            const isSelected = activeSelectedGem === tag;
                            return (
                              <DraggableGem
                                key={`shelf::${tag}`}
                                id={`shelf::${tag}`}
                                tag={tag}
                                weight={shelfWeights[tag]}
                                onWeightChange={(newW) => {
                                  setShelfWeights(prev => {
                                    const updated = { ...prev };
                                    if (newW === undefined || isNaN(newW)) {
                                      delete updated[tag];
                                    } else {
                                      updated[tag] = newW;
                                    }
                                    return updated;
                                  });
                                }}
                                isSelected={isSelected}
                                onClick={() => {
                                  setActiveSelectedGem(tag);
                                }}
                                tagDefList={tagDef}
                              />
                            );
                          })
                        ) : (
                          <div className="w-full text-center py-6 text-[10px] text-indigo-600 font-mono italic animate-fade-in">
                            Nenhuma gema disponível com os filtros atuais no laboratório.
                          </div>
                        )
                      )}
                    </DroppableSlot>
                  </div>
                </div>

              </div>
            ) : selectedCoreItem ? (
              <div className="w-full h-full flex-1 flex flex-col items-center justify-center space-y-6">
                
                {/* 6. A BALANÇA PREDITIVA (HUD DE CÁLCULO PROCEDURAL EM TEMPO REAL) */}
                <div className="w-full bg-[#05060b]/90 border border-indigo-950 p-4 rounded-2xl max-w-2xl font-mono text-left flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-xl select-none">
                  <div className="space-y-1">
                    <div className="text-[9px] text-indigo-400 font-extrabold uppercase flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-indigo-400" />
                      Projeção Preditiva de Peso
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-sm font-black text-indigo-400 line-through decoration-indigo-850/60 leading-none">
                        {weighCalculation.original}
                      </span>
                      <span className="text-xl font-black text-[#FFBF00] tracking-tight leading-none drop-shadow-[0_0_8px_rgba(250,204,21,0.2)]">
                        {weighCalculation.simulated} pts
                      </span>
                    </div>
                  </div>

                  <div className="text-[9px] text-slate-400 border-l border-indigo-950/80 pl-0 sm:pl-4 self-center flex-1 max-w-md">
                    <span className="text-indigo-500 font-bold uppercase tracking-wider block mb-1">Amortecedores Ativos:</span>
                    {weighCalculation.multDetail.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-h-[35px] overflow-y-auto">
                        {weighCalculation.multDetail.map((detStr, idx) => (
                          <span key={idx} className="bg-slate-950 border border-indigo-950 font-bold px-1.5 py-[2.5px] rounded text-emerald-400 text-[8.5px]">
                            {detStr}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="italic text-slate-500 text-[8px]">Sem pesos atenuantes aplicados. Execução pura.</span>
                    )}
                  </div>
                </div>

                {/* Crucible caldron state */}
                <div className="text-center space-y-1 max-w-lg">
                  <span className={isStealthMode ? "text-[10px] bg-white text-gray-650 border border-gray-300 px-3 py-0.5 rounded-none font-sans font-bold uppercase inline-block select-none" : "text-[8px] font-mono bg-indigo-900/40 text-indigo-400 border border-indigo-800/30 px-2 py-0.5 rounded font-bold uppercase tracking-widest inline-block select-none"}>
                    {isStealthMode ? "Painel de Configuração de Item Ativo" : "Reagente Ativo no Caldeirão"}
                  </span>
                  <h3 className={`text-lg font-black tracking-tight font-sans flex items-center justify-center gap-2 ${isStealthMode ? "text-gray-900" : "text-white"}`}>
                    {!isStealthMode && <FlaskConical className={`w-4 h-4 text-fuchsia-400 ${bubbleAnimate ? 'animate-bounce' : 'animate-pulse'}`} />}
                    {selectedCoreItem.name} 
                    <span className={`font-mono text-xs font-bold ${isStealthMode ? "text-gray-500" : "text-indigo-400"}`}>({selectedCoreItem.id})</span>
                  </h3>
                </div>

                {/* 7. SYSTEM PARADOX ACTIVE CAULDRON WRAPPER (Animation Shake support integrated) */}
                <motion.div 
                  animate={(isCauldronParadoxShaked && !isStealthMode) ? {
                    x: [0, -10, 10, -10, 10, -5, 5, 0],
                    borderColor: ["#1e1b4b", "#ef4444", "#1e1b4b"]
                  } : {}}
                  transition={{ duration: 0.7 }}
                  className={`w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch max-w-2xl px-2 p-5 ${
                    isStealthMode 
                      ? "bg-white border border-gray-300 rounded-none shadow-sm"
                      : `border-2 bg-[#030407]/40 rounded-3xl ${isCauldronParadoxShaked ? "border-red-500 ring-2 ring-red-500/20" : "border-indigo-950"}`
                  }`}
                >
                  
                  {/* SLOT 1 (DropZone de Requisitos) */}
                  <div className="flex flex-col space-y-1.5 text-left">
                    <span className={isStealthMode ? "text-xs font-sans text-gray-700 font-bold" : "text-[9px] uppercase tracking-wider font-mono text-orange-400 font-extrabold flex items-center gap-1 select-none"}>
                      {isStealthMode ? "Área de Anexo de Dados: Exigências" : <>
                        <Sliders className="w-3.5 h-3.5 text-orange-400" />
                        1. SLOT REVERBERANTE (req_tags)
                      </>}
                    </span>
                    
                    <DroppableSlot 
                      id="req_slot"
                      className={isStealthMode ? `border border-gray-300 bg-white relative min-h-[160px] flex flex-col justify-center rounded-none p-4 ${
                        selectedCategory === "demografia" || selectedCategory === "estado"
                          ? "opacity-20 pointer-events-none select-none border-gray-200 bg-gray-50 text-gray-400"
                          : "hover:border-gray-450"
                      }` : `border-dashed border-2 border-orange-500/40 rounded-2xl p-4 flex flex-col bg-orange-950/5 relative min-h-[160px] justify-center ${
                        selectedCategory === "demografia" || selectedCategory === "estado"
                          ? "opacity-25 pointer-events-none select-none border-indigo-950"
                          : "hover:border-orange-500/70"
                      }`}
                    >
                      {/* Territory layout locking */}
                      {(selectedCategory === "demografia" || selectedCategory === "estado") && (
                        <div className={`absolute inset-0 flex flex-col items-center justify-center text-center p-3 z-10 ${
                          isStealthMode ? "bg-gray-50 rounded-none" : "bg-[#07080e]/95 rounded-2xl"
                        }`}>
                          <Lock className={`w-5 h-5 mb-1 ${isStealthMode ? "text-gray-400" : "text-indigo-500"}`} />
                          <span className={`text-[9px] font-mono leading-tight ${isStealthMode ? "text-gray-400" : "text-[#42466e]"}`}>
                            Sem exigências. Demos/Estados herdam sem restrições de entrada.
                          </span>
                        </div>
                      )}

                      {selectedCoreItem.req_tags.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-4 text-center space-y-2 select-none">
                          <div className={isStealthMode ? "w-8 h-8 border border-gray-300 flex items-center justify-center text-xs text-gray-400 font-bold" : "w-8 h-8 rounded-full border border-dashed border-orange-500/30 flex items-center justify-center text-xs text-orange-400 font-bold animate-pulse"}>
                            +
                          </div>
                          <span className={isStealthMode ? "text-[10px] text-gray-400 font-sans" : "text-[9px] text-orange-450/70 font-mono uppercase font-black tracking-wide"}>
                            {isStealthMode ? "Arraste as tags exigidas" : "Solte o que este cargo exige"}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 content-start p-2">
                          {selectedCoreItem.req_tags.map(tag => {
                            const weight = selectedCoreItem.rawItem?.mult_tags?.[tag] ?? selectedCoreItem.rawItem?.[`mult_${tag}`];
                            return (
                              <SocketedGem
                                key={`req::${tag}`}
                                id={`req::${tag}`}
                                tag={tag}
                                weight={weight}
                                slotType="req"
                                onRemove={() => removeTagFromCoreItem("req", tag)}
                              />
                            );
                          })}
                        </div>
                      )}
                    </DroppableSlot>
                  </div>

                  {/* SLOT 2 (DropZone de Geração) */}
                  <div className="flex flex-col space-y-1.5 text-left">
                    <span className={isStealthMode ? "text-xs font-sans text-gray-700 font-bold" : "text-[9px] uppercase tracking-wider font-mono text-cyan-400 font-extrabold flex items-center gap-1 select-none"}>
                      {isStealthMode ? "Área de Anexo de Dados: Infusões" : <>
                        <Database className="w-3.5 h-3.5 text-cyan-400" />
                        2. SLOT GERADOR (add_tags)
                      </>}
                    </span>

                    <DroppableSlot 
                      id="add_slot"
                      className={isStealthMode ? `border border-gray-300 bg-white relative min-h-[160px] flex flex-col justify-center rounded-none p-4 ${
                        selectedCategory === "nome"
                          ? "opacity-20 pointer-events-none select-none border-gray-200 bg-gray-50 text-gray-400"
                          : "hover:border-gray-450"
                      }` : `border-dashed border-2 border-cyan-500/40 rounded-2xl p-4 flex flex-col bg-cyan-950/5 relative min-h-[160px] justify-center ${
                        selectedCategory === "nome"
                          ? "opacity-25 pointer-events-none select-none border-indigo-950"
                          : "hover:border-cyan-500/70"
                      }`}
                    >
                      {selectedCategory === "nome" && (
                        <div className={`absolute inset-0 flex flex-col items-center justify-center text-center p-3 z-10 ${
                          isStealthMode ? "bg-gray-50 rounded-none" : "bg-[#07080e]/95 rounded-2xl"
                        }`}>
                          <Lock className={`w-5 h-5 mb-1 ${isStealthMode ? "text-gray-400" : "text-indigo-500"}`} />
                          <span className={`text-[9px] font-mono leading-tight ${isStealthMode ? "text-gray-400" : "text-[#42466e]"}`}>
                            Sem infusor de tags. Nomes servem apenas para filtrar por exigência.
                          </span>
                        </div>
                      )}

                      {selectedCoreItem.add_tags.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-4 text-center space-y-2 select-none">
                          <div className={isStealthMode ? "w-8 h-8 border border-gray-300 flex items-center justify-center text-xs text-gray-400 font-bold" : "w-8 h-8 rounded-full border border-dashed border-cyan-500/30 flex items-center justify-center text-xs text-cyan-400 font-bold"}>
                            +
                          </div>
                          <span className={isStealthMode ? "text-[10px] text-gray-400 font-sans" : "text-[9px] text-cyan-455/70 font-mono uppercase font-black tracking-wide"}>
                            {isStealthMode ? "Arraste as tags de infusão" : "Solte o que este item infunde"}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 content-start p-2">
                          {selectedCoreItem.add_tags.map(tag => {
                            const weight = selectedCoreItem.rawItem?.mult_tags?.[tag] ?? selectedCoreItem.rawItem?.[`mult_${tag}`];
                            return (
                              <SocketedGem
                                key={`add::${tag}`}
                                id={`add::${tag}`}
                                tag={tag}
                                weight={weight}
                                slotType="add"
                                onRemove={() => removeTagFromCoreItem("add", tag)}
                              />
                            );
                          })}
                        </div>
                      )}
                    </DroppableSlot>
                  </div>

                </motion.div>

                {/* 3. DUAL-SHELF CONTROLS FOR DIRECT GEM REGISTERED DOCKS (Transplanted immediately below the slots for optimal mobile ergonomics) */}
                <div className="w-full max-w-2xl space-y-3 mt-4">
                  
                  {/* Toolbar Minimalista e Filtros de Categorias (Inventário Inteligente) */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#05060b] p-3 rounded-xl border border-indigo-950 select-none">
                    
                    <div className="flex flex-col text-left shrink-0">
                      <div className="flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-fuchsia-400" />
                        <span className="text-[10px] text-indigo-400 uppercase font-black font-mono">Inventário de Filtros</span>
                      </div>
                      <span className="text-[8px] text-slate-500 mt-0.5 uppercase font-bold font-mono">Pesquisa em tempo real de matrizes</span>
                    </div>

                    {/* HORIZONTAL FILTERS PILLS CORES */}
                    <div className="flex flex-wrap gap-1 mr-auto sm:mr-0">
                      {(["todos", "demo", "socio", "psi", "geo", "cristais"] as const).map(pill => {
                        const isActive = activeShelfFilter === pill;
                        const labels = {
                          todos: "✨ Todos",
                          demo: "🔵 Demos",
                          socio: "🟡 Socios",
                          psi: "🟣 Psic",
                          geo: "🟢 Geos",
                          cristais: "💎 Cristais"
                        };
                        return (
                          <button
                            key={pill}
                            onClick={() => setActiveShelfFilter(pill)}
                            className={`text-[8px] font-bold font-mono px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                              isActive 
                                ? "bg-indigo-950 border-fuchsia-400/80 text-fuchsia-300 shadow-[0_0_8px_rgba(240,46,170,0.15)]"
                                : "bg-[#090a12] border-indigo-950 text-indigo-500 hover:text-indigo-400 hover:border-indigo-900"
                            }`}
                          >
                            {labels[pill]}
                          </button>
                        );
                      })}
                    </div>

                    <div className="relative w-full sm:max-w-xs font-mono">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-indigo-500">
                        <Search className="w-3" />
                      </div>
                      <input
                        type="text"
                        placeholder="Filtrar gaveta..."
                        value={tagSearchQuery}
                        onChange={(e) => setTagSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-indigo-950 focus:border-fuchsia-700 outline-none rounded-lg pl-7 pr-2.5 py-1 text-[9px] font-mono text-slate-350"
                      />
                    </div>
                  </div>

                  {/* RENDER SHELF AREA DYNAMICALLY (either Master Crystals or single gems!) */}
                  <div className="text-left font-mono">
                    <span className="text-[9px] uppercase tracking-wider font-mono text-fuchsia-400 font-extrabold flex items-center gap-1 select-none mb-1.5 pl-1">
                      <Pocket className="w-3.5 h-3.5 text-fuchsia-400" />
                      Prateleira de Essências Genéticas (Perto dos slots para arrasto ergonômico)
                    </span>
                    <DroppableSlot 
                      id="shelf_dock" 
                      className="flex flex-wrap gap-3 p-4 bg-slate-900/50 rounded-2xl border border-indigo-500/30 max-h-64 overflow-y-auto w-full custom-scrollbar items-start justify-start relative select-none"
                    >
                      {activeShelfFilter === "cristais" ? (
                        // CRISTAIS MESTRES SECTION (Template Recipes)
                        <div className="flex flex-wrap gap-3 p-1">
                          {MASTER_CRYSTALS.map(c => (
                            <MasterCrystal
                              key={c.id}
                              id={c.id}
                              name={c.name}
                              icon={c.icon}
                              tags={c.tags}
                              color={c.color}
                              description={c.description}
                            />
                          ))}
                        </div>
                      ) : (
                        // REGULAR REAGENTS GEMS WITH HOVER EFFECTS
                        filteredGems.length > 0 ? (
                          filteredGems.map((tag) => {
                            const isSelected = activeSelectedGem === tag;
                            return (
                              <DraggableGem
                                key={`shelf::${tag}`}
                                id={`shelf::${tag}`}
                                tag={tag}
                                weight={shelfWeights[tag]}
                                onWeightChange={(newW) => {
                                  setShelfWeights(prev => {
                                    const updated = { ...prev };
                                    if (newW === undefined || isNaN(newW)) {
                                      delete updated[tag];
                                    } else {
                                      updated[tag] = newW;
                                    }
                                    return updated;
                                  });
                                }}
                                isSelected={isSelected}
                                onClick={() => {
                                  setActiveSelectedGem(tag);
                                }}
                                tagDefList={tagDef}
                              />
                            );
                          })
                        ) : (
                          <div className="w-full text-center py-6 text-[10px] text-indigo-600 font-mono italic animate-fade-in">
                            Nenhuma gema disponível com os filtros atuais no laboratório.
                          </div>
                        )
                      )}
                    </DroppableSlot>
                  </div>
                </div>

                {/* 8. EDITOR DINÂMICO DE ATRIBUTOS E MODIFICADORES (Senior Dynamic Column Refactor) */}
                <div className="w-full max-w-2xl bg-[#030408]/65 border border-indigo-950/90 rounded-3xl p-5 mt-4 space-y-4 text-left font-mono">
                  
                  {/* Header Title */}
                  <div className="flex items-center justify-between border-b border-indigo-950 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-emerald-400" />
                      <div>
                        <h4 className="text-[11px] font-black text-white uppercase tracking-wider">Atributos & Multiplicadores Dinâmicos</h4>
                        <p className="text-[8.5px] text-slate-500">Mapeamento dinâmico sem chaves estáticas para este item</p>
                      </div>
                    </div>
                    <span className="text-[9px] bg-emerald-950/60 text-emerald-400 border border-emerald-900/30 px-2 py-0.5 rounded font-black uppercase">
                      Agnóstico
                    </span>
                  </div>

                  {/* Grid layout of all properties */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {Object.entries(selectedCoreItem.rawItem || {}).map(([key, val]) => {
                      if (Array.isArray(val) || typeof val === "object") return null; // skip complex schemas

                      const keyLower = key.toLowerCase();
                      const isPrimaryKey = 
                        keyLower === "id_demo" || 
                        keyLower === "id_socio" || 
                        keyLower === "id_cidade" || 
                        keyLower === "id_estado" || 
                        keyLower === "id_nome" || 
                        keyLower === "id";

                      const isDynamicMod = keyLower.startsWith("mult_") || keyLower.startsWith("mod_");

                      return (
                        <div 
                          key={key} 
                          className={`p-2.5 rounded-xl border flex flex-col justify-between space-y-1.5 transition-colors ${
                            isPrimaryKey 
                              ? "bg-slate-950/40 border-slate-900/40 text-slate-500 opacity-80" 
                              : isDynamicMod 
                                ? "bg-amber-950/5 border-amber-950/50 hover:border-amber-900/40" 
                                : "bg-slate-950/80 border-indigo-950/70"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[9.5px] font-bold ${isDynamicMod ? "text-amber-400" : isPrimaryKey ? "text-slate-500" : "text-indigo-300"}`}>
                              {isPrimaryKey ? "🔑 " : isDynamicMod ? "⚡ " : "📝 "}{key}
                            </span>

                            {isDynamicMod && (
                              <button
                                type="button"
                                onClick={() => {
                                  updateRawItemProperty(selectedCoreItem.id, key, null);
                                  triggerToast("Modificador Removido!", `A propriedade "${key}" foi apagada deste item.`, false);
                                }}
                                className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                title="Excluir este multiplicador"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="relative">
                            <input
                              type={typeof val === "number" ? "number" : "text"}
                              step={typeof val === "number" ? "0.1" : undefined}
                              disabled={isPrimaryKey}
                              value={val ?? ""}
                              onChange={(e) => {
                                const inputVal = e.target.value;
                                if (typeof val === "number") {
                                  const parsedFloat = parseFloat(inputVal);
                                  updateRawItemProperty(selectedCoreItem.id, key, isNaN(parsedFloat) ? "" : parsedFloat);
                                } else {
                                  updateRawItemProperty(selectedCoreItem.id, key, inputVal);
                                }
                              }}
                              className={`w-full bg-[#030408] px-2 py-1 outline-none text-[10px] text-slate-200 border rounded-lg font-mono ${
                                isPrimaryKey 
                                  ? "border-transparent focus:border-transparent select-none cursor-not-allowed text-slate-500" 
                                  : "border-indigo-950/70 focus:border-indigo-500/50"
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 9. SUBFORM: INJECT NEW MODIFIER */}
                  <div className="bg-[#05070c]/90 border border-indigo-950/80 rounded-2xl p-3.5 space-y-2">
                    <span className="text-[9px] text-[#747bbd] uppercase font-extrabold flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5 text-indigo-400" />
                      Criar Novo Modificador Dinâmico (Agnóstico)
                    </span>
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      {/* Prefix Selector */}
                      <select
                        value={newModPrefix}
                        onChange={(e) => setNewModPrefix(e.target.value as "mult_" | "mod_")}
                        className="bg-slate-950 border border-indigo-950/80 text-[10px] text-indigo-300 rounded-lg px-2 py-1.5 font-mono cursor-pointer outline-none focus:border-indigo-600/50"
                      >
                        <option value="mult_">mult_</option>
                        <option value="mod_">mod_</option>
                      </select>

                      {/* Modifier Name */}
                      <input
                        type="text"
                        placeholder="Ex: Startups"
                        value={newModName}
                        onChange={(e) => setNewModName(e.target.value)}
                        className="bg-slate-950 border border-indigo-950/80 text-[10px] text-slate-200 rounded-lg px-2.5 py-1.5 font-mono flex-1 outline-none focus:border-indigo-600/50"
                      />

                      {/* Weight Value */}
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Peso"
                        value={newModVal}
                        onChange={(e) => setNewModVal(e.target.value)}
                        className="bg-slate-950 border border-indigo-950/80 text-[10px] text-slate-200 rounded-lg w-16 px-2 py-1.5 font-mono outline-none focus:border-indigo-600/50 text-center"
                      />

                      {/* Submit */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedCoreItem || !newModName.trim()) {
                            triggerToast("Nome inválido!", "Digite o nome da gema que quer ligar a este item.", true);
                            return;
                          }
                          const cleanMod = newModName.trim().replace(/\s+/g, "_");
                          const finalKey = `${newModPrefix}${cleanMod}`;
                          const fVal = parseFloat(newModVal) || 1.0;
                          updateRawItemProperty(selectedCoreItem.id, finalKey, fVal);
                          setNewModName("");
                          triggerToast("Dinamismo acoplado!", `Injetada propriedade "${finalKey}" : ${fVal}`, false);
                        }}
                        className="w-full sm:w-auto px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg cursor-pointer text-[10px] flex items-center justify-center gap-1 shadow-md transition-all active:scale-98"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Injetar</span>
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              <div className="text-center py-12 text-sm text-indigo-500 space-y-1 font-mono">
                <HelpCircle className="w-8 h-8 text-indigo-600 mx-auto animate-pulse" />
                <p>Abra o gabinete ao lado e selecione uma substância.</p>
              </div>
            )}

          </div>

        </div>

        {/* DRAG OVERLAY FOR GORGEOUS TRANSLATIONS */}
        <DragOverlay>
          {activeDragId ? (
            activeDragId.startsWith("master::") ? (
              // Master Crystal design placeholder proxy
              (() => {
                const crystal = MASTER_CRYSTALS.find(c => c.id === activeDragId);
                if (!crystal) return null;
                return (
                  <div className={`border-4 rounded-3xl p-3 flex flex-col justify-center items-center text-center select-none bg-gradient-to-br w-32 aspect-square scale-102 z-[999999] opacity-90 shadow-2xl ${crystal.color}`}
                       style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}>
                    <span className="text-xl mb-1">{crystal.icon}</span>
                    <span className="text-[9px] font-sans font-black leading-tight max-w-[85px]">{crystal.name}</span>
                  </div>
                );
              })()
            ) : activeTagName ? (
              <div className={`text-[10px] font-mono font-black rounded-xl px-2.5 py-1.5 ${
                activeWeight !== undefined && activeWeight !== null
                  ? "bg-gradient-to-br from-yellow-500 to-amber-850 text-yellow-100 ring-2 ring-yellow-400"
                  : "bg-gradient-to-br from-fuchsia-600 to-purple-850 text-[#fff] ring-2 ring-white"
              } opacity-90 scale-110 pointer-events-none z-[99999] border border-fuchsia-400 drop-shadow-[-12px_12px_24px_rgba(168,85,247,0.8)] shadow-[0_0_20px_rgba(168,85,247,0.8)] animate-pulse`}>
                💎 {activeTagName} {activeWeight !== undefined && activeWeight !== null ? `[${activeWeight}x]` : ""}
              </div>
            ) : null
          ) : null}
        </DragOverlay>

        {/* INTERACTIVE RETROACTIVE SYSTEM SCANNER RESULTS MODAL */}
        <AnimatePresence>
          {scannerOpen && (
            <div className="fixed inset-0 bg-[#020205]/95 backdrop-blur-md z-[999999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[#090b14] border border-indigo-500/20 rounded-3xl p-6 max-w-2xl w-full shadow-2xl text-left flex flex-col justify-between max-h-[85vh]"
              >
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-indigo-950 pb-4 mb-4 select-none">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-red-950/80 rounded-xl border border-red-500/20 text-rose-400">
                      <ShieldAlert className="w-5 h-5 text-rose-400" />
                    </span>
                    <div>
                      <h3 className="text-sm font-black font-sans text-white uppercase tracking-wider">Mapeamento Retrospectivo de Paradoxos</h3>
                      <p className="text-[10.5px] text-slate-400 font-mono">Varredura profunda do loop de heranças e dependências cruzadas</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setScannerOpen(false)}
                    className="p-1 rounded-lg hover:bg-indigo-950 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar my-2">
                  {anomalies.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-[10px] text-rose-400 font-mono font-extrabold uppercase bg-rose-950/20 border border-rose-500/10 p-2.5 rounded-xl">
                        Aviso: Encontradas {anomalies.length} anomalias que causarão travamento no loop RNG devido a exclusão de requisitos mútuos.
                      </div>

                      {anomalies.map((an, idx) => (
                        <div 
                          key={`${an.id}-${idx}`}
                          className="bg-[#04050a] border border-indigo-950 hover:border-indigo-900 rounded-xl p-3 flex items-center justify-between gap-4 font-mono transition-colors"
                        >
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="text-slate-400 italic">[{an.type}]</span>
                              <span className="text-white font-sans text-xs">{an.name}</span>
                              <span className="text-[9px] text-[#555a82]">({an.id})</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1 mt-1 font-bold">
                              <span className="text-[8px] text-slate-500 uppercase">Tags Críticas:</span>
                              {an.conflicts.map((c, cIdx) => (
                                <span key={cIdx} className="bg-red-950/30 text-rose-400 border border-red-500/10 px-1 py-[2px] rounded text-[8px] font-black">
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedCategory(an.category);
                              setSelectedItemId(an.id);
                              setScannerOpen(false);
                            }}
                            className="px-2.5 py-1.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/30 hover:border-indigo-500/60 text-indigo-300 hover:text-white rounded-lg text-[9px] font-bold tracking-tight transition-all cursor-pointer inline-flex items-center gap-1 shrink-0"
                          >
                            <span>Corrigir no Crisol</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl font-bold">
                        ✓
                      </div>
                      <span className="text-xs text-emerald-400 font-extrabold uppercase font-mono">Bancada Totalmente Estável</span>
                      <p className="text-[10px] text-slate-500 font-mono max-w-sm">
                        Todos os seus itens e requisitos estão consistentes e limpos! Sem paradoxos retroativos mapeados no DataFrame.
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer and controls */}
                <div className="border-t border-indigo-950 pt-4 mt-4 text-right flex justify-end gap-2 select-none font-mono">
                  <button
                    onClick={() => setScannerOpen(false)}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-indigo-950 text-indigo-400 hover:text-indigo-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ADVANCED TEXT-TO-DATA INJECTOR MODAL */}
        <AnimatePresence>
          {isAdvancedModalOpen && (
            <div className={`fixed inset-0 z-[999999] flex items-center justify-center p-4 backdrop-blur-sm ${
              isStealthMode ? "bg-black/50" : "bg-[#020205]/95 backdrop-blur-md"
            }`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className={`max-w-xl w-full p-6 text-left flex flex-col justify-between max-h-[90vh] ${
                  isStealthMode 
                    ? "bg-white border border-gray-300 rounded-none shadow-2xl text-gray-900 font-sans"
                    : "bg-[#090b14] border border-indigo-500/25 rounded-3xl text-white font-mono shadow-2xl"
                }`}
              >
                {/* Header */}
                <div className={`flex items-center justify-between pb-3 mb-3 border-b ${
                  isStealthMode ? "border-gray-200" : "border-indigo-950/80"
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`p-2 rounded-xl border ${
                      isStealthMode 
                        ? "bg-gray-150 border-gray-300 text-gray-700" 
                        : "bg-indigo-950/60 border-indigo-500/20 text-indigo-400"
                    }`}>
                      <Terminal className="w-5 h-5 animate-pulse" />
                    </span>
                    <div>
                      <h3 className={`text-xs font-black uppercase tracking-wider ${isStealthMode ? "text-gray-900 font-sans" : "text-white font-sans"}`}>
                        Injetor de Dados Avançado (Text-to-Data DSL)
                      </h3>
                      <p className={`text-[10.5px] font-medium leading-tight mt-0.5 ${isStealthMode ? "text-gray-500 font-sans" : "text-[#747bbd] font-mono"}`}>
                        Injete gemas e exigências em massa via texto estruturado
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsAdvancedModalOpen(false);
                      setAdvancedText("");
                    }}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isStealthMode ? "hover:bg-gray-100 text-gray-400 hover:text-gray-800" : "hover:bg-indigo-950 text-slate-400 hover:text-white"
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Instructions */}
                <div className={`text-[9.5px] p-3 mb-3 border leading-relaxed rounded-xl ${
                  isStealthMode 
                    ? "bg-gray-50 border-gray-200 text-gray-600 font-sans" 
                    : "bg-[#04050a] border-indigo-950/50 text-slate-400 font-mono"
                }`}>
                  <span className={`font-bold block mb-1 uppercase ${isStealthMode ? "text-gray-800" : "text-indigo-400"}`}>Como usar o formato DSL:</span>
                  Escreva o nome do item ou filtro por linha, dois pontos (:), e depois as gemas separadas por vírgula. Exemplo:<br />
                  <code className={`block mt-1 p-1 rounded font-bold text-[9px] ${isStealthMode ? "bg-gray-100 text-gray-800" : "bg-slate-950/80 text-amber-400"}`}>
                    Santos/SP: Litoral, Turistico, Quente<br />
                    Sao Paulo: Metropole, Capital, Economia
                  </code>
                </div>

                {/* Textarea */}
                <div className="flex-1 flex flex-col space-y-1 my-1">
                  <span className={`text-[9.5px] uppercase font-bold tracking-wider ${isStealthMode ? "text-gray-600 font-sans" : "text-[#747bbd] font-mono"}`}>DSL de Injeção:</span>
                  <textarea
                    placeholder={"Cole seu bloco DSL aqui...\nExemplo:\nSantos/SP: Litoral, Turistico\nid_socio_advogado: OAB, Judiciario"}
                    value={advancedText}
                    onChange={(e) => setAdvancedText(e.target.value)}
                    className={`w-full p-3 font-mono text-[10.5px] leading-normal resize-none flex-1 focus:outline-none focus:ring-1 ${
                      isStealthMode 
                        ? "bg-white border border-gray-300 text-gray-800 focus:border-gray-500 focus:ring-gray-300 rounded-lg h-56" 
                        : "bg-slate-950 border border-indigo-950 text-slate-200 focus:border-fuchsia-500 focus:ring-indigo-950 rounded-xl h-56"
                    }`}
                  />
                </div>

                {/* Radios for target selection */}
                <div className={`mt-3 py-2.5 px-3 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isStealthMode ? "border-gray-200 bg-gray-50" : "border-indigo-950/40 bg-[#05060b]"
                }`}>
                  <div className="flex flex-col text-left shrink-0">
                    <span className={`text-[10px] uppercase font-bold ${isStealthMode ? "text-gray-700 font-sans" : "text-[#747bbd] font-mono"}`}>Tipo de Destino das Tags:</span>
                    <span className={`text-[8.5px] mt-0.5 ${isStealthMode ? "text-gray-500 font-sans" : "text-slate-500 font-mono"}`}>
                      Selecione onde injetar as tags descritas nas linhas
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer font-sans ${isStealthMode ? "text-gray-750" : "text-indigo-200"}`}>
                      <input
                        type="radio"
                        name="advancedField"
                        value="add_tags"
                        checked={advancedField === "add_tags"}
                        onChange={() => setAdvancedField("add_tags")}
                        disabled={selectedCategory === "nome"}
                        className="accent-fuchsia-500 cursor-pointer"
                      />
                      <span>Infundir (add_tags)</span>
                    </label>

                    <label className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer font-sans ${isStealthMode ? "text-gray-750" : "text-indigo-200"}`}>
                      <input
                        type="radio"
                        name="advancedField"
                        value="req_tags"
                        checked={advancedField === "req_tags"}
                        onChange={() => setAdvancedField("req_tags")}
                        disabled={selectedCategory === "demografia" || selectedCategory === "estado"}
                        className="accent-fuchsia-500 cursor-pointer"
                      />
                      <span>Exigir (req_tags)</span>
                    </label>
                  </div>
                </div>

                {/* Footer and controls */}
                <div className={`border-t pt-4 mt-4 flex justify-end gap-2 ${
                  isStealthMode ? "border-gray-200" : "border-indigo-950/80"
                }`}>
                  <button
                    onClick={() => {
                      setIsAdvancedModalOpen(false);
                      setAdvancedText("");
                    }}
                    className={`px-4 py-2 text-xs font-bold cursor-pointer tracking-tight transition-all rounded-xl ${
                      isStealthMode 
                        ? "bg-white hover:bg-gray-100 border border-gray-300 text-gray-750 font-sans" 
                        : "bg-slate-950 hover:bg-slate-900 border border-indigo-950 text-indigo-400 hover:text-indigo-300"
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleAdvancedInjection(advancedText, advancedField)}
                    className={`px-4 py-2 text-xs font-bold cursor-pointer tracking-tight transition-all flex items-center gap-1.5 rounded-xl ${
                      isStealthMode 
                        ? "bg-black text-white hover:bg-gray-800 font-sans" 
                        : "bg-gradient-to-r from-indigo-650 to-fuchsia-650 hover:from-indigo-600 hover:to-fuchsia-600 text-white shadow-lg"
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Processar e Injetar</span>
                  </button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </DndContext>
  );
};

export default AlchemyPanel;
