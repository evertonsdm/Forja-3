import React, { useState, useEffect, useCallback } from "react";
import { 
  ReactFlow, 
  Controls, 
  Background, 
  MiniMap, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
  Position
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { CustomCapsuleNode, CapsuleNodeData } from "./CustomCapsuleNode";
import { 
  Workflow, 
  Sliders, 
  Database, 
  Plus, 
  RotateCcw, 
  Layers, 
  Play, 
  FileEdit,
  Trash2,
  HelpCircle,
  Eye,
  Settings
} from "lucide-react";

// Register custom capsule node
const nodeTypes = {
  customCapsule: CustomCapsuleNode,
};

// Default preset nodes that showcase the complete cascade engine pipeline 
const DEFAULT_PRESET_NODES: Node[] = [
  {
    id: "seed",
    type: "customCapsule",
    position: { x: 40, y: 180 },
    data: {
      title: "PRNG: Seed Determinística",
      subtitle: "Inicialização do Ingress",
      req_tags: [],
      add_tags: ["GERADOR_START", "SEED_ATIVO"],
      peso_base: "Ativo",
      color: "blue"
    },
    dragHandle: undefined
  },
  {
    id: "fase0",
    type: "customCapsule",
    position: { x: 380, y: 40 },
    data: {
      title: "Fase 0: Origem (Estado de São Paulo)",
      subtitle: "Geografia Macro",
      req_tags: ["SEED_ATIVO"],
      add_tags: ["EST_SP", "UF_SP", "Regiao_Sudeste", "Metropole"],
      peso_base: 5.5,
      color: "amber"
    },
    dragHandle: undefined
  },
  {
    id: "fase05",
    type: "customCapsule",
    position: { x: 740, y: 40 },
    data: {
      title: "Fase 0.5: Micro-Geografia (Campinas)",
      subtitle: "Filtros de Paridade de Sorteio",
      req_tags: ["Regiao_Sudeste", "Metropole"],
      add_tags: ["Cidade_Grande", "Clima_Temperado", "Polo_Universitario"],
      peso_base: 3.5,
      color: "blue"
    },
    dragHandle: undefined
  },
  {
    id: "fase1",
    type: "customCapsule",
    position: { x: 380, y: 310 },
    data: {
      title: "Fase 1: Demografia (Adulto Jovem)",
      subtitle: "Perfil de Faixa Etária",
      req_tags: ["SEED_ATIVO"],
      add_tags: ["Adulto_Jovem", "Solteiro"],
      peso_base: 4.8,
      color: "purple"
    },
    dragHandle: undefined
  },
  {
    id: "fase15",
    type: "customCapsule",
    position: { x: 740, y: 310 },
    data: {
      title: "Fase 1.5: Identidade (Matheus)",
      subtitle: "Nomes Procedurais Coerentes",
      req_tags: ["Adulto_Jovem", "UF_SP"],
      add_tags: ["Nome: Matheus", "Masculino"],
      peso_base: 1.5,
      color: "emerald"
    },
    dragHandle: undefined
  },
  {
    id: "fase2",
    type: "customCapsule",
    position: { x: 1100, y: 160 },
    data: {
      title: "Fase 2: Socioeconomico (Dev Software)",
      subtitle: "Profissões e Multiplicadores",
      req_tags: ["Cidade_Grande", "Adulto_Jovem"],
      add_tags: ["Profissao_TI", "Classe_Media_Alta", "Trabalho_Remoto"],
      peso_base: 2.8,
      color: "rose"
    },
    dragHandle: undefined
  },
  {
    id: "fase3",
    type: "customCapsule",
    position: { x: 1460, y: 160 },
    data: {
      title: "Fase 3: Resolução (Consolidação NPC)",
      subtitle: "Status Somatizado e Logs",
      req_tags: ["Classe_Media_Alta", "Trabalho_Remoto"],
      add_tags: ["Saude_Razoavel", "Felicidade_Alta", "Renda_Alta"],
      peso_base: 1.0,
      color: "emerald"
    },
    dragHandle: undefined
  }
];

const DEFAULT_PRESET_EDGES: Edge[] = [
  {
    id: "e-seed-fase0",
    source: "seed",
    target: "fase0",
    sourceHandle: "outputs",
    targetHandle: "inputs",
    animated: true,
    style: { stroke: "#fbbf24", strokeWidth: 2 }
  },
  {
    id: "e-fase0-fase05",
    source: "fase0",
    target: "fase05",
    sourceHandle: "outputs",
    targetHandle: "inputs",
    animated: true,
    style: { stroke: "#3b82f6", strokeWidth: 2 }
  },
  {
    id: "e-seed-fase1",
    source: "seed",
    target: "fase1",
    sourceHandle: "outputs",
    targetHandle: "inputs",
    animated: true,
    style: { stroke: "#a855f7", strokeWidth: 2 }
  },
  {
    id: "e-fase1-fase15",
    source: "fase1",
    target: "fase15",
    sourceHandle: "outputs",
    targetHandle: "inputs",
    animated: true,
    style: { stroke: "#10b981", strokeWidth: 2 }
  },
  {
    id: "e-fase05-fase2",
    source: "fase05",
    target: "fase2",
    sourceHandle: "outputs",
    targetHandle: "inputs",
    animated: true,
    style: { stroke: "#f43f5e", strokeWidth: 2 }
  },
  {
    id: "e-fase15-fase2",
    source: "fase15",
    target: "fase2",
    sourceHandle: "outputs",
    targetHandle: "inputs",
    animated: true,
    style: { stroke: "#f43f5e", strokeWidth: 2 }
  },
  {
    id: "e-fase2-fase3",
    source: "fase2",
    target: "fase3",
    sourceHandle: "outputs",
    targetHandle: "inputs",
    animated: true,
    style: { stroke: "#10b981", strokeWidth: 2 }
  }
];

// Alternate Preset for Regional Fallback Simulation
const FALLBACK_PRESET_NODES: Node[] = [
  {
    id: "seed",
    type: "customCapsule",
    position: { x: 50, y: 200 },
    data: {
      title: "PRNG: Semente Alternativa",
      subtitle: "Inicialização Paritária",
      req_tags: [],
      add_tags: ["GERADOR_START", "SEED_BAIXO_PESO"],
      peso_base: "Ativo",
      color: "purple"
    }
  },
  {
    id: "fase0_nordeste",
    type: "customCapsule",
    position: { x: 400, y: 100 },
    data: {
      title: "Fase 0: Origem (Estado do Ceará)",
      subtitle: "Nordeste Seco",
      req_tags: ["SEED_BAIXO_PESO"],
      add_tags: ["EST_CE", "UF_CE", "Regiao_Nordeste"],
      peso_base: 3.0,
      color: "rose"
    }
  },
  {
    id: "fase05_fortal",
    type: "customCapsule",
    position: { x: 750, y: 100 },
    data: {
      title: "Fase 0.5: Micro-Geografia (Fortaleza)",
      subtitle: "Capital Praiana",
      req_tags: ["Regiao_Nordeste"],
      add_tags: ["Cidade_Turistica", "Litoral", "Calor_Forte"],
      peso_base: 4.0,
      color: "blue"
    }
  },
  {
    id: "fase2_turismo",
    type: "customCapsule",
    position: { x: 1100, y: 180 },
    data: {
      title: "Fase 2: Socioeconomico (Guia de Turismo)",
      subtitle: "Profissão Costeira",
      req_tags: ["Cidade_Turistica", "Litoral"],
      add_tags: ["Guia_Praia", "Renda_Variavel"],
      peso_base: 2.5,
      color: "amber"
    }
  }
];

const FALLBACK_PRESET_EDGES: Edge[] = [
  {
    id: "e-seed-fase0-ce",
    source: "seed",
    target: "fase0_nordeste",
    sourceHandle: "outputs",
    targetHandle: "inputs",
    animated: true,
    style: { stroke: "#f43f5e", strokeWidth: 2 }
  },
  {
    id: "e-ce-fortal",
    source: "fase0_nordeste",
    target: "fase05_fortal",
    sourceHandle: "outputs",
    targetHandle: "inputs",
    animated: true,
    style: { stroke: "#3b82f6", strokeWidth: 2 }
  },
  {
    id: "e-fortal-guia",
    source: "fase05_fortal",
    target: "fase2_turismo",
    sourceHandle: "outputs",
    targetHandle: "inputs",
    animated: true,
    style: { stroke: "#fbbf24", strokeWidth: 2 }
  }
];

export function CascadeVisualizer() {
  const [nodes, setNodes, onNodesChange] = useNodesState(DEFAULT_PRESET_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEFAULT_PRESET_EDGES);
  
  // Selection details state for the live nodes inspector panel in sidebar
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isEditingData, setIsEditingData] = useState(false);
  
  // Active temporary edit values
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editPeso, setEditPeso] = useState<string | number>("");
  const [editColor, setEditColor] = useState("amber");
  const [editReqTagsText, setEditReqTagsText] = useState("");
  const [editAddTagsText, setEditAddTagsText] = useState("");

  // Custom node state to help incremental workflow testing
  const [newNodeIndex, setNewNodeIndex] = useState(1);

  // Sync node selection callback
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    const nodeData = node.data as CapsuleNodeData;
    setEditTitle(nodeData.title);
    setEditSubtitle(nodeData.subtitle || "");
    setEditPeso(nodeData.peso_base ?? 1.0);
    setEditColor(nodeData.color || "amber");
    setEditReqTagsText((nodeData.req_tags || []).join(", "));
    setEditAddTagsText((nodeData.add_tags || []).join(", "));
    setIsEditingData(true);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setIsEditingData(false);
  }, []);

  // Set up connection callback
  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        ...connection,
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        animated: true,
        style: { stroke: "#3b82f6", strokeWidth: 2 }
      } as Edge;
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Handler to update selected node features in real-time
  const handleSaveNodeEdits = () => {
    if (!selectedNode) return;
    
    const reqTags = editReqTagsText
      .split(",")
      .map(t => t.trim())
      .filter(t => t !== "");
      
    const addTags = editAddTagsText
      .split(",")
      .map(t => t.trim())
      .filter(t => t !== "");

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          const updatedNode = {
            ...n,
            data: {
              ...n.data,
              title: editTitle,
              subtitle: editSubtitle,
              peso_base: isNaN(Number(editPeso)) ? editPeso : Number(editPeso),
              color: editColor,
              req_tags: reqTags,
              add_tags: addTags
            }
          };
          // Also sync the visual selection card view
          setSelectedNode(updatedNode);
          return updatedNode;
        }
        return n;
      })
    );
  };

  // Add a fully functional custom capsule node dynamically styled inside the viewport coordinate space
  const handleAddNewNode = () => {
    const id = `node_rule_${newNodeIndex}`;
    const xPos = 200 + (newNodeIndex * 50) % 600;
    const yPos = 120 + (newNodeIndex * 40) % 250;
    
    // Choose colors rotation for visual rhythm
    const colors = ["amber", "blue", "purple", "emerald", "rose"];
    const chosenColor = colors[newNodeIndex % colors.length];

    const newNode: Node = {
      id,
      type: "customCapsule",
      position: { x: xPos, y: yPos },
      data: {
        title: `Regra Regulatória #${newNodeIndex}`,
        subtitle: `Regra Injetável Customizada`,
        req_tags: [`TAG_REQ_${newNodeIndex}`],
        add_tags: [`TAG_ATIVADA_${newNodeIndex}`],
        peso_base: 2.0,
        color: chosenColor
      }
    };

    setNodes((nds) => [...nds, newNode]);
    setNewNodeIndex((prev) => prev + 1);
  };

  const handleDeleteSelectedNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
    setIsEditingData(false);
  };

  const handleResetToPresetDefault = () => {
    setNodes(DEFAULT_PRESET_NODES);
    setEdges(DEFAULT_PRESET_EDGES);
    setSelectedNode(null);
    setIsEditingData(false);
  };

  const handleApplyFallbackPreset = () => {
    setNodes(FALLBACK_PRESET_NODES);
    setEdges(FALLBACK_PRESET_EDGES);
    setSelectedNode(null);
    setIsEditingData(false);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-200">
      
      {/* 1. BLUEPRINT DESIGN METADATA HEADER */}
      <div className="bg-[#12141c]/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="absolute right-0 top-0 h-full w-1/4 bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none" />
        
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Workflow className="w-5 h-5 animate-spin-slow" />
            </span>
            <h2 className="text-xl font-bold font-sans text-white tracking-tight">
              Visual Scripting Canvas <span className="text-[10px] text-blue-400 tracking-normal font-mono uppercase bg-blue-500/5 border border-blue-500/10 px-1.5 py-0.5 rounded ml-2 font-normal">React Flow Engine v12</span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-mono leading-relaxed">
            Navegue por nossa árvore determinística de regras. Cada cápsula representa um nó de processamento (Fases 0 a 3). O engine avalia se a npcmemória acumula as tags de requisitos e injeta as novas propriedades. Faça PAN/ZOOM, arraste e crie novas lógicas de paridade em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0 w-full sm:w-auto">
          <button
            onClick={handleAddNewNode}
            className="flex-1 sm:flex-initial py-2 px-3.5 bg-slate-900 border border-slate-800 hover:border-blue-500/20 text-slate-300 hover:text-blue-400 text-xs font-mono rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 font-bold active:scale-95 duration-150 shadow-lg"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>+ Adicionar Regra</span>
          </button>
          
          <button
            onClick={handleResetToPresetDefault}
            className="flex-1 sm:flex-initial py-2 px-3 bg-slate-950 border border-slate-900 text-slate-400 hover:text-white text-xs font-mono rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 duration-155"
            title="Resetar para a cadeia de herança brasileira padrão"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
            <span>Resetar Engine</span>
          </button>
        </div>
      </div>

      {/* 2. DUAL LAYOUT GRID: NODE GRAPH CANVAS + DETAILED LIVE INSPECTOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* CANVAS GRAPH AREA (Cols 1-9) */}
        <div className="lg:col-span-8 flex flex-col bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden relative shadow-2xl min-h-[580px] lg:h-[620px]">
          
          {/* Floating HUD controls for canvas presets */}
          <div className="absolute top-4 left-4 z-40 flex flex-wrap gap-1.5 items-center bg-slate-900/90 border border-slate-800/80 p-1 rounded-xl shadow-2xl backdrop-blur-md">
            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase px-2 py-0.5 tracking-wider">PRESETS:</span>
            <button
              onClick={handleResetToPresetDefault}
              className="py-1 px-2.5 rounded-lg text-[10px] font-mono font-bold tracking-tight bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              Cadeia Completa SP
            </button>
            <button
              onClick={handleApplyFallbackPreset}
              className="py-1 px-2.5 rounded-lg text-[10px] font-mono font-bold tracking-tight bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              Paridade Fallback CE
            </button>
          </div>

          <div className="absolute bottom-4 right-4 z-40 bg-slate-900/90 border border-slate-800/80 rounded-lg py-1 px-2.5 font-mono text-[9px] text-slate-400 shadow-xl backdrop-blur-md">
            <span>Dica: Clique com o botão correspondente para ligar nos Handles e criar caminhos (wire animated: true)</span>
          </div>

          {/* Interactive React Flow Area */}
          <div className="w-full h-full flex-1 min-h-[480px]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              colorMode="dark"
              id="CascadeReactFlowEngine"
            >
              <Background variant={Background ? ("dots" as any) : "dots"} color="#334155" size={1} gap={20} />
              <Controls className="bg-slate-900 border border-slate-800 text-slate-200" />
              <MiniMap 
                zoomable 
                pannable
                style={{ background: "#0c0d12", border: "1px solid #1e293b", borderRadius: "10px" }}
                nodeColor={(node) => {
                  const c = (node.data as any)?.color;
                  if (c === "amber") return "#f59e0b";
                  if (c === "blue") return "#3b82f6";
                  if (c === "purple") return "#a855f7";
                  if (c === "emerald") return "#10b981";
                  if (c === "rose") return "#f43f5e";
                  return "#475569";
                }}
                maskColor="rgba(2, 6, 23, 0.5)"
              />
            </ReactFlow>
          </div>
        </div>

        {/* DETAILED RULE LIVE INSPECTOR PANEL (Cols 9-12) */}
        <div className="lg:col-span-4 flex flex-col bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl relative p-5 space-y-4">
          
          <div className="border-b border-slate-800 pb-3.5 flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FileEdit className="w-4 h-4 text-blue-400" />
              Auditor e Editor de Regras
            </h3>
            {isEditingData && (
              <span className="text-[8px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.5 rounded font-extrabold uppercase animate-pulse">
                Ativo
              </span>
            )}
          </div>

          {isEditingData && selectedNode ? (
            <div className="flex-1 flex flex-col justify-between space-y-4 font-mono text-xs">
              
              <div className="space-y-4 overflow-y-auto max-h-[460px] pr-1.5 custom-scrollbar">
                
                {/* Node ID indicator */}
                <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-850 flex items-center justify-between">
                  <span className="text-slate-500 text-[10px]">REQUISITO ID:</span>
                  <span className="font-bold text-slate-300 font-mono text-[10px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded select-all">
                    {selectedNode.id}
                  </span>
                </div>

                {/* Edit Title */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Título da Regra:</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => {
                      setEditTitle(e.target.value);
                      // Live change feedback
                      const val = e.target.value;
                      setNodes((nds) => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, title: val } } : n));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-blue-500 outline-none rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>

                {/* Edit Subtitle */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Fase / Agrupamento:</label>
                  <input
                    type="text"
                    value={editSubtitle}
                    onChange={(e) => {
                      setEditSubtitle(e.target.value);
                      // Live change feedback
                      const val = e.target.value;
                      setNodes((nds) => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, subtitle: val } } : n));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-blue-500 outline-none rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
                  />
                </div>

                {/* Edit Weight / Base Weight */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Peso Base de Sorteio:</label>
                  <input
                    type="text"
                    value={editPeso}
                    onChange={(e) => {
                      setEditPeso(e.target.value);
                      // Live change feedback
                      const val = e.target.value;
                      setNodes((nds) => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, peso_base: val } } : n));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-blue-500 outline-none rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
                  />
                </div>

                {/* Choose Theme Color */}
                <div className="space-y-2">
                  <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Accent Glow:</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {["amber", "blue", "purple", "emerald", "rose"].map((c) => {
                      const isActive = editColor === c;
                      let bgTheme = "bg-amber-500/40 border-amber-500";
                      if (c === "blue") bgTheme = "bg-blue-500/40 border-blue-500";
                      if (c === "purple") bgTheme = "bg-purple-500/40 border-purple-500";
                      if (c === "emerald") bgTheme = "bg-[#10b981]/40 border-emerald-500";
                      if (c === "rose") bgTheme = "bg-rose-500/40 border-rose-500";

                      return (
                        <button
                          key={c}
                          onClick={() => {
                            setEditColor(c);
                            setNodes((nds) => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, color: c } } : n));
                          }}
                          className={`h-7 rounded border-2 transition-all cursor-pointer ${bgTheme} ${isActive ? "ring-2 ring-white scale-105" : "opacity-60 saturate-50 hover:opacity-100 font-bold"}`}
                          title={`Visual do Nó em ${c.toUpperCase()}`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Edit Requirement Tags */}
                <div className="space-y-1.5">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-amber-500" /> Requisitos (req_tags - separado por vírgula):
                  </span>
                  <input
                    type="text"
                    value={editReqTagsText}
                    onChange={(e) => {
                      setEditReqTagsText(e.target.value);
                      // Live change feedback
                      const tags = e.target.value.split(",").map(t => t.trim()).filter(t => t !== "");
                      setNodes((nds) => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, req_tags: tags } } : n));
                    }}
                    placeholder="UF_SP, Regiao_Sudeste"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 outline-none rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
                  />
                </div>

                {/* Edit Generated Tags (Add Tags) */}
                <div className="space-y-1.5">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Database className="w-3.5 h-3.5 text-emerald-500" /> Injeta na Memória (add_tags - por vírgula):
                  </span>
                  <input
                    type="text"
                    value={editAddTagsText}
                    onChange={(e) => {
                      setEditAddTagsText(e.target.value);
                      // Live change feedback
                      const tags = e.target.value.split(",").map(t => t.trim()).filter(t => t !== "");
                      setNodes((nds) => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, add_tags: tags } } : n));
                    }}
                    placeholder="Adulto_Jovem, Solteiro"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 outline-none rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
                  />
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={handleSaveNodeEdits}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 font-bold font-mono rounded-xl cursor-pointer shadow-lg active:scale-95 duration-100 hover:shadow-blue-500/10 flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  <span>Gravar nas Alterações</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelectedNode}
                  className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold font-mono rounded-xl cursor-pointer duration-100 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir Regra</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
              <HelpCircle className="w-10 h-10 text-slate-600 animate-pulse" />
              <div className="space-y-1">
                <h4 className="text-slate-300 font-sans font-bold text-xs select-none">Nenhuma Regra Selecionada</h4>
                <p className="text-[10px] text-slate-500 font-mono leading-relaxed max-w-[220px] mx-auto select-none">
                  Clique diretamente em um dos cartões de cápsula no Canvas para editar os requisitos e parâmetros de herança.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-900 w-full text-left space-y-1 font-mono text-[9px] text-slate-500">
                <div className="uppercase font-bold text-slate-600 tracking-wider">Injeção Determinística:</div>
                <p className="leading-tight">
                  Quando a seed inicia, os nós executam do INPUT em direção ao OUTPUT. Modifique as tags de requisitos e altere instantaneamente se eles serão elegíveis ou ignorados pela cascata de rolagem!
                </p>
              </div>
            </div>
          )}

        </div>
        
      </div>

    </div>
  );
}

export default CascadeVisualizer;
