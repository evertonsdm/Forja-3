import React, { useState, useEffect } from "react";
import { Demografia, Socioeconomico, TagDef, Estado, NomeDef, CidadeDef } from "../types";
import { 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Lock, 
  Unlock, 
  Check, 
  RotateCcw, 
  Workflow, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  Info,
  FolderOpen,
  Filter,
  X,
  Sliders,
  Cloud,
  CloudUpload,
  LogOut,
  Loader,
  UserCheck
} from "lucide-react";
import { 
  initAuth, 
  signInWithGoogle, 
  logoutFromGoogle, 
  fetchSpreadsheetMetadata, 
  updateGoogleSheetsValuesInBatch,
  BatchUpdateRange
} from "../utils/googleAuth";

interface BlockMatrixEditorProps {
  demografia: Demografia[];
  socioeconomico: Socioeconomico[];
  tagDef: TagDef[];
  estados: Estado[];
  nomes: NomeDef[];
  cidades: CidadeDef[];
  
  // Callback for sheets/reset sync
  onResetFromSheets: () => Promise<void>;
  isSyncing: boolean;
}

export const BlockMatrixEditor: React.FC<BlockMatrixEditorProps> = ({
  demografia,
  socioeconomico,
  tagDef,
  estados,
  nomes,
  cidades,
  onResetFromSheets,
  isSyncing,
}) => {
  // Active sub-tab target
  const [activeSubTab, setActiveSubTab] = useState<"demo" | "socio" | "cid" | "est" | "nom" | "tags">("demo");

  // Google Auth & Cloud Sync States
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [cloudSyncLoading, setCloudSyncLoading] = useState(false);
  const [cloudSyncMessage, setCloudSyncMessage] = useState<string | null>(null);

  // GID-to-subtab configurations
  const SUBTAB_GID_MAP: Record<"demo" | "socio" | "cid" | "est" | "nom" | "tags", { gid: number; fallbackTitle: string; defaultHeaders: string[] }> = {
    demo: {
      gid: 0,
      fallbackTitle: "Demografia",
      defaultHeaders: ["id_demo", "descricao", "idade_min", "idade_max", "peso_base", "add_tags"]
    },
    socio: {
      gid: 1646832095,
      fallbackTitle: "Socioeconomico",
      defaultHeaders: ["id_socio", "profissao", "req_tags", "mult_tags", "peso_base", "add_tags"]
    },
    cid: {
      gid: 933912219,
      fallbackTitle: "Cidades",
      defaultHeaders: ["id_cidade", "nome_cidade", "req_tags", "peso_base", "add_tags"]
    },
    est: {
      gid: 1321492706,
      fallbackTitle: "Estados",
      defaultHeaders: ["id_estado", "nome_estado", "peso_base", "add_tags"]
    },
    nom: {
      gid: 1812951774,
      fallbackTitle: "Nomes",
      defaultHeaders: ["id_nome", "nome", "peso_base", "req_tags"]
    },
    tags: {
      gid: 2103085223,
      fallbackTitle: "Tags",
      defaultHeaders: ["tag", "mod_saude", "mod_felicidade", "mod_renda_mensal"]
    }
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      (u, tk) => {
        setGoogleUser(u);
        setGoogleToken(tk);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setCloudSyncLoading(true);
    setCloudSyncMessage("Autenticando via Google...");
    try {
      const res = await signInWithGoogle();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        setExportFeedback("Autenticação com o Google realizada com sucesso!");
        setTimeout(() => setExportFeedback(null), 5000);
      }
    } catch (err: any) {
      console.error(err);
      setExportFeedback(`Falha no Login: ${err.message || err}`);
      setTimeout(() => setExportFeedback(null), 6000);
    } finally {
      setCloudSyncLoading(false);
      setCloudSyncMessage(null);
    }
  };

  const handleGoogleLogout = async () => {
    if (window.confirm("Deseja realmente desconectar sua conta do Google?")) {
      await logoutFromGoogle();
      setGoogleUser(null);
      setGoogleToken(null);
      setExportFeedback("Desconectado de sua Conta Google.");
      setTimeout(() => setExportFeedback(null), 5000);
    }
  };

  const handleSyncActiveTabToGoogleSheets = async () => {
    if (!googleToken) {
      alert("Autenticação necessária. Por favor, conecte-se com o Google primeiro.");
      return;
    }

    const config = SUBTAB_GID_MAP[activeSubTab];
    if (!config) return;

    // Get confirmation first before mutating
    const confirmed = window.confirm(
      `ATENÇÃO: Você está prestes a sincronizar diretamente com a nuvem!\n\n` +
      `Isso irá sobrescrever completamente a aba da planilha ativa (${config.fallbackTitle}) ` +
      `pelas suas modificações locais em memória.\n\n` +
      `Deseja prosseguir com o Batch Commit Manual?`
    );

    if (!confirmed) return;

    setCloudSyncLoading(true);
    setCloudSyncMessage("Enviando dados para a Forja...");

    try {
      const docId = "1cxHlvoMKiuYq8iz0_vxPEGT6WQv082MdRLrsRqEoaxk";

      // 1. Resolve exact sheet title dynamically via Google metadata lookup
      let sheetTitle = config.fallbackTitle;
      try {
        const metadata = await fetchSpreadsheetMetadata(docId, googleToken);
        const matchingSheet = metadata.sheets.find(
          (s) => s.properties.sheetId === config.gid
        );
        if (matchingSheet) {
          sheetTitle = matchingSheet.properties.title;
        }
      } catch (metaErr) {
        console.warn("Metadados não resolvidos, usando fallback do título:", metaErr);
      }

      // 2. Format row values safely
      let standardHeaders = config.defaultHeaders;
      let dataList: any[] = [];

      if (activeSubTab === "demo") dataList = localDemo;
      else if (activeSubTab === "socio") dataList = localSocio;
      else if (activeSubTab === "cid") dataList = localCid;
      else if (activeSubTab === "est") dataList = localEst;
      else if (activeSubTab === "nom") dataList = localNom;
      else if (activeSubTab === "tags") dataList = localTags;

      const dynamicHeaders = getDynamicHeaders(dataList);
      const allHeaders = [...standardHeaders, ...dynamicHeaders];

      const toValueCell = (val: any) => {
        if (val === undefined || val === null) return "";
        if (Array.isArray(val)) {
          return val.join(", ");
        }
        if (typeof val === "object") {
          return Object.entries(val).map(([k, v]) => `${k}:${v}`).join(", ");
        }
        return val;
      };

      // Construct values matrices
      const sheetHeaderRow = allHeaders;
      const sheetRowsList = dataList.map((item) => {
        return allHeaders.map((header) => toValueCell(item[header]));
      });

      const finalValuesPayload = [sheetHeaderRow, ...sheetRowsList];

      // Define safe ranges with double quotes or quotes for spacing
      const activeRangeToClear = `'${sheetTitle}'!A1:Z5000`;
      const activeRangeToUpdate = `'${sheetTitle}'!A1`;

      const batchData: BatchUpdateRange[] = [
        {
          range: activeRangeToUpdate,
          values: finalValuesPayload,
        },
      ];

      // 3. Execute cloud batch update cleanly!
      await updateGoogleSheetsValuesInBatch(
        docId,
        googleToken,
        batchData,
        [activeRangeToClear]
      );

      setExportFeedback(`Sucesso! ${dataList.length} itens sincronizados na nuvem (${sheetTitle}).`);
      setTimeout(() => setExportFeedback(null), 8000);

      // 4. Force state update inside client or warn user to reload
      try {
        await onResetFromSheets();
      } catch (reloadErr) {
        console.warn("Não foi possível atualizar dados locais:", reloadErr);
      }
    } catch (err: any) {
      console.error(err);
      // Legible permission / rate limit error capture
      const readableErr = err.message || JSON.stringify(err);
      alert(`[Erro de Sincronização] Não foi possível salvar na nuvem.\n\nMotivo:\n${readableErr}`);
      setExportFeedback("Erro de Sincronização. Verifique permissões.");
      setTimeout(() => setExportFeedback(null), 8000);
    } finally {
      setCloudSyncLoading(false);
      setCloudSyncMessage(null);
    }
  };

  // Local copies of rules for isolation
  const [localDemo, setLocalDemo] = useState<Demografia[]>([]);
  const [localSocio, setLocalSocio] = useState<Socioeconomico[]>([]);
  const [localCid, setLocalCid] = useState<CidadeDef[]>([]);
  const [localEst, setLocalEst] = useState<Estado[]>([]);
  const [localNom, setLocalNom] = useState<NomeDef[]>([]);
  const [localTags, setLocalTags] = useState<TagDef[]>([]);

  // Search filter query
  const [searchQuery, setSearchQuery] = useState("");

  // Input validation errors
  const [inputErrors, setInputErrors] = useState<Record<string, string>>({});

  // Local locks flags for weight options
  const [localLocks, setLocalLocks] = useState<Record<string, boolean>>({});

  // Sheet export feedback tracker
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Selected Block key state to focus editing on exactly ONE chosen block
  // Format: `${activeSubTab}_${index}` e.g., "demo_0", "nom_142"
  const [selectedBlockKey, setSelectedBlockKey] = useState<string | null>(null);

  // Dynamic columns state
  const [newModPrefix, setNewModPrefix] = useState<"mult_" | "mod_">("mult_");
  const [newModTag, setNewModTag] = useState("");

  const getDynamicHeaders = (items: any[]) => {
    const dynamicKeys = new Set<string>();
    items.forEach(item => {
      if (item && typeof item === "object") {
        Object.keys(item).forEach(key => {
          if (key.startsWith("mult_") || key.startsWith("mod_")) {
            dynamicKeys.add(key);
          }
        });
      }
    });
    return Array.from(dynamicKeys);
  };

  const getDynamicKeysOfItem = (item: any) => {
    if (!item || typeof item !== "object") return [];
    return Object.keys(item).filter(k => k.startsWith("mult_") || k.startsWith("mod_"));
  };

  const handleAddDynamicModifier = () => {
    if (!newModTag.trim()) {
      alert("Por favor, informe o nome da Tag.");
      return;
    }
    let normalizedTag = newModTag.trim().replace(/\s+/g, "_");
    if (normalizedTag.startsWith("mult_")) {
      normalizedTag = normalizedTag.replace("mult_", "");
    } else if (normalizedTag.startsWith("mod_")) {
      normalizedTag = normalizedTag.replace("mod_", "");
    }
    
    const colName = `${newModPrefix}${normalizedTag}`;

    if (activeSubTab === "demo" && localDemo[selectedIndex]) {
      const copy = [...localDemo];
      (copy[selectedIndex] as any)[colName] = 1.0;
      setLocalDemo(copy);
    } else if (activeSubTab === "socio" && localSocio[selectedIndex]) {
      const copy = [...localSocio];
      (copy[selectedIndex] as any)[colName] = 1.0;
      setLocalSocio(copy);
    } else if (activeSubTab === "cid" && localCid[selectedIndex]) {
      const copy = [...localCid];
      (copy[selectedIndex] as any)[colName] = 1.0;
      setLocalCid(copy);
    } else if (activeSubTab === "est" && localEst[selectedIndex]) {
      const copy = [...localEst];
      (copy[selectedIndex] as any)[colName] = 1.0;
      setLocalEst(copy);
    } else if (activeSubTab === "nom" && localNom[selectedIndex]) {
      const copy = [...localNom];
      (copy[selectedIndex] as any)[colName] = 1.0;
      setLocalNom(copy);
    } else if (activeSubTab === "tags" && localTags[selectedIndex]) {
      const copy = [...localTags];
      (copy[selectedIndex] as any)[colName] = 1.0;
      setLocalTags(copy);
    }

    setNewModTag("");
    setExportFeedback(`Modificador ${colName} adicionado à linha com peso 1.0!`);
    setTimeout(() => setExportFeedback(null), 5000);
  };

  const getSubTabCSVUrl = () => {
    const docId = "1cxHlvoMKiuYq8iz0_vxPEGT6WQv082MdRLrsRqEoaxk";
    switch (activeSubTab) {
      case "demo": return `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=0`;
      case "socio": return `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=1646832095`;
      case "cid": return `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=933912219`;
      case "est": return `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=1321492706`;
      case "nom": return `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=1812951774`;
      case "tags": return `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=2103085223`;
      default: return `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv`;
    }
  };

  const handleCopyMatrixCSV = async () => {
    let standardHeaders: string[] = [];
    let dataList: any[] = [];
    let tabLabel = "";

    if (activeSubTab === "demo") {
      tabLabel = "Democracia/Demografia";
      standardHeaders = ["id_demo", "descricao", "idade_min", "idade_max", "peso_base", "add_tags"];
      dataList = localDemo;
    } else if (activeSubTab === "socio") {
      tabLabel = "Socioeconômico / Profissões";
      standardHeaders = ["id_socio", "profissao", "req_tags", "mult_tags", "peso_base", "add_tags"];
      dataList = localSocio;
    } else if (activeSubTab === "cid") {
      tabLabel = "Cidades";
      standardHeaders = ["id_cidade", "nome_cidade", "req_tags", "peso_base", "add_tags"];
      dataList = localCid;
    } else if (activeSubTab === "est") {
      tabLabel = "Estados";
      standardHeaders = ["id_estado", "nome_estado", "peso_base", "add_tags"];
      dataList = localEst;
    } else if (activeSubTab === "nom") {
      tabLabel = "Nomes";
      standardHeaders = ["id_nome", "nome", "peso_base", "req_tags"];
      dataList = localNom;
    } else if (activeSubTab === "tags") {
      tabLabel = "Tags / Atributos básicos";
      standardHeaders = ["tag", "mod_saude", "mod_felicidade", "mod_renda_mensal"];
      dataList = localTags;
    }

    const dynamicHeaders = getDynamicHeaders(dataList);
    const allHeaders = [...standardHeaders, ...dynamicHeaders];

    const toCSVCell = (val: any) => {
      if (val === undefined || val === null) return "";
      let str = "";
      if (Array.isArray(val)) {
        str = val.join(", ");
      } else if (typeof val === "object") {
        str = Object.entries(val).map(([k, v]) => `${k}:${v}`).join(", ");
      } else {
        str = String(val);
      }
      if (str.includes("\t") || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerLine = allHeaders.join("\t");
    const rows = dataList.map((item) => {
      return allHeaders.map((header) => {
        return toCSVCell(item[header]);
      }).join("\t");
    });

    const fullCSV = [headerLine, ...rows].join("\n");

    try {
      await navigator.clipboard.writeText(fullCSV);
      setExportFeedback(`Matriz Completa (TSV) de ${tabLabel} copiada com sucesso! Pronta para colar no Google Sheets.`);
      setTimeout(() => setExportFeedback(null), 6000);
    } catch (e) {
      console.error(e);
      setExportFeedback("Erro ao copiar matriz completa CSV.");
    }
  };

  const handleCopyPromptSync = async () => {
    const csvUrl = getSubTabCSVUrl();
    const promptText = `Atue como meu Engenheiro de Software. Acabei de atualizar a estrutura da planilha através do editor de matrizes. Por favor, force o reload do cache e re-mapeie as colunas do DataFrame a partir do link CSV: ${csvUrl}. Garanta que o motor de sorteio procedural (RNG) e as amarrações de pesos incluam automaticamente as novas colunas identificadas com os prefixos 'mult_' ou 'mod_' sem crashar o loop de geração massiva.`;

    try {
      await navigator.clipboard.writeText(promptText);
      setExportFeedback("Prompt de Sincronização copiado com sucesso! Você pode colá-lo na IA.");
      setTimeout(() => setExportFeedback(null), 6000);
    } catch (e) {
      console.error(e);
      setExportFeedback("Erro ao copiar Prompt de Sincronização.");
    }
  };

  // Safe deep clone helper to prevent SyntaxError from undefined/null variables
  const safeDeepClone = <T,>(obj: T, fallback: T): T => {
    if (obj === undefined || obj === null) return fallback;
    try {
      const str = JSON.stringify(obj);
      if (str === undefined || !str) return fallback;
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  };

  // Sync state arrays when parents change
  useEffect(() => {
    setLocalDemo(safeDeepClone(demografia, []));
  }, [demografia]);

  useEffect(() => {
    setLocalSocio(safeDeepClone(socioeconomico, []));
  }, [socioeconomico]);

  useEffect(() => {
    setLocalCid(safeDeepClone(cidades, []));
  }, [cidades]);

  useEffect(() => {
    setLocalEst(safeDeepClone(estados, []));
  }, [estados]);

  useEffect(() => {
    setLocalNom(safeDeepClone(nomes, []));
  }, [nomes]);

  useEffect(() => {
    setLocalTags(safeDeepClone(tagDef, []));
  }, [tagDef]);

  // Handle local soft resets
  const handleResetLocalMatrix = async () => {
    if (window.confirm("Deseja realmente perder as modificações locais deste Editor de Blocos e re-sincronizar os originais da planilha?")) {
      await onResetFromSheets();
      setSelectedBlockKey(null);
    }
  };

  // Helper validation for floats/commas
  const getNormalizedWeight = (rawVal: string, blockKey: string): { val: number; cleanStr: string } => {
    let cleanStr = rawVal;
    const hasInvalid = /[^0-9.,]/.test(cleanStr);
    
    if (hasInvalid) {
      setInputErrors((prev) => ({ ...prev, [blockKey]: "Apenas números, . ou ," }));
      cleanStr = cleanStr.replace(/[^0-9.,]/g, "");
    } else {
      setInputErrors((prev) => {
        const copy = { ...prev };
        delete copy[blockKey];
        return copy;
      });
    }

    let normalized = cleanStr.replace(/,/g, ".");
    const parts = normalized.split(".");
    if (parts.length > 2) {
      normalized = parts[0] + "." + parts.slice(1).join("");
    }

    const floatVal = parseFloat(normalized);
    return {
      val: isNaN(floatVal) ? 1.0 : floatVal,
      cleanStr: normalized,
    };
  };

  // Input array tag parsers
  const parseTagsInput = (text: string): string[] => {
    return text.split(/[,;\s]+/).map(t => t.trim()).filter(t => t.length > 0);
  };

  const parseMultTagsInput = (text: string): Record<string, number> => {
    const records: Record<string, number> = {};
    const elements = text.split(/[,;]+/);
    for (const el of elements) {
      const parts = el.split(":");
      if (parts.length === 2) {
        const key = parts[0].trim().toLowerCase();
        const num = parseFloat(parts[1].trim().replace(/,/g, "."));
        if (key && !isNaN(num)) {
          records[key] = num;
        }
      }
    }
    return records;
  };

  const serializeMultTags = (rec: Record<string, number> | undefined | null): string => {
    if (!rec) return "";
    return Object.entries(rec).map(([k, v]) => `${k}:${v}`).join(", ");
  };

  // Tag Badge Pill render
  const renderTagPill = (tag: string, onRemove: () => void) => {
    return (
      <span 
        key={tag} 
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-all shadow-sm"
      >
        <span>{tag}</span>
        <button
          type="button"
          onClick={onRemove}
          className="hover:text-red-400 font-black focus:outline-none text-[10px] leading-none px-0.5 cursor-pointer text-blue-300/80 hover:text-white"
          title="Remover Tag"
        >
          ×
        </button>
      </span>
    );
  };

  // Shift block prioritization list
  const moveBlockUp = (index: number) => {
    if (index === 0) return;
    const targetKeyBase = `${activeSubTab}_`;

    if (activeSubTab === "demo") {
      const copy = [...localDemo];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      setLocalDemo(copy);
      setSelectedBlockKey(`${targetKeyBase}${index - 1}`);
    } else if (activeSubTab === "socio") {
      const copy = [...localSocio];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      setLocalSocio(copy);
      setSelectedBlockKey(`${targetKeyBase}${index - 1}`);
    } else if (activeSubTab === "cid") {
      const copy = [...localCid];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      setLocalCid(copy);
      setSelectedBlockKey(`${targetKeyBase}${index - 1}`);
    } else if (activeSubTab === "est") {
      const copy = [...localEst];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      setLocalEst(copy);
      setSelectedBlockKey(`${targetKeyBase}${index - 1}`);
    } else if (activeSubTab === "nom") {
      const copy = [...localNom];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      setLocalNom(copy);
      setSelectedBlockKey(`${targetKeyBase}${index - 1}`);
    } else if (activeSubTab === "tags") {
      const copy = [...localTags];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      setLocalTags(copy);
      setSelectedBlockKey(`${targetKeyBase}${index - 1}`);
    }
  };

  const moveBlockDown = (index: number) => {
    let limit = 0;
    if (activeSubTab === "demo") limit = localDemo.length;
    else if (activeSubTab === "socio") limit = localSocio.length;
    else if (activeSubTab === "cid") limit = localCid.length;
    else if (activeSubTab === "est") limit = localEst.length;
    else if (activeSubTab === "nom") limit = localNom.length;
    else if (activeSubTab === "tags") limit = localTags.length;

    if (index >= limit - 1) return;
    const targetKeyBase = `${activeSubTab}_`;

    if (activeSubTab === "demo") {
      const copy = [...localDemo];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      setLocalDemo(copy);
      setSelectedBlockKey(`${targetKeyBase}${index + 1}`);
    } else if (activeSubTab === "socio") {
      const copy = [...localSocio];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      setLocalSocio(copy);
      setSelectedBlockKey(`${targetKeyBase}${index + 1}`);
    } else if (activeSubTab === "cid") {
      const copy = [...localCid];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      setLocalCid(copy);
      setSelectedBlockKey(`${targetKeyBase}${index + 1}`);
    } else if (activeSubTab === "est") {
      const copy = [...localEst];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      setLocalEst(copy);
      setSelectedBlockKey(`${targetKeyBase}${index + 1}`);
    } else if (activeSubTab === "nom") {
      const copy = [...localNom];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      setLocalNom(copy);
      setSelectedBlockKey(`${targetKeyBase}${index + 1}`);
    } else if (activeSubTab === "tags") {
      const copy = [...localTags];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      setLocalTags(copy);
      setSelectedBlockKey(`${targetKeyBase}${index + 1}`);
    }
  };

  // Creators
  const createBlankBlock = () => {
    const uniqueNum = Math.floor(100 + Math.random() * 900);
    const uniqueId = `nb_${uniqueNum}`;
    
    if (activeSubTab === "demo") {
      const newItem: Demografia = {
        id_demo: `DEMO_${uniqueNum}`,
        descricao: "NovaIdade",
        idade_min: 18,
        idade_max: 50,
        peso_base: 1.0,
        add_tags: ["nova_tag"],
      };
      setLocalDemo([newItem, ...localDemo]);
      setSelectedBlockKey("demo_0");
      setSearchQuery(newItem.id_demo);
    } else if (activeSubTab === "socio") {
      const newItem: Socioeconomico = {
        id_socio: uniqueId,
        profissao: "Profissao Profissional",
        req_tags: [],
        mult_tags: {},
        peso_base: 1.0,
        add_tags: ["especialista"],
      };
      setLocalSocio([newItem, ...localSocio]);
      setSelectedBlockKey("socio_0");
      setSearchQuery(newItem.id_socio);
    } else if (activeSubTab === "cid") {
      const newItem: CidadeDef = {
        id_cidade: `cid_${uniqueNum}`,
        nome_cidade: "Nova Cidade",
        req_tags: [],
        peso_base: 1.0,
        add_tags: [],
      };
      setLocalCid([newItem, ...localCid]);
      setSelectedBlockKey("cid_0");
      setSearchQuery(newItem.id_cidade);
    } else if (activeSubTab === "est") {
      const newItem: Estado = {
        id_estado: `EST_N_${uniqueNum}`,
        nome_estado: "Novo Estado",
        peso_base: 1.0,
        add_tags: [],
      };
      setLocalEst([newItem, ...localEst]);
      setSelectedBlockKey("est_0");
      setSearchQuery(newItem.id_estado);
    } else if (activeSubTab === "nom") {
      const newItem: NomeDef = {
        id_nome: `nome_${uniqueNum}`,
        nome: "NovoNome",
        req_tags: [],
        peso_base: 1.0,
      };
      setLocalNom([newItem, ...localNom]);
      setSelectedBlockKey("nom_0");
      setSearchQuery(newItem.id_nome);
    } else if (activeSubTab === "tags") {
      const newItem: TagDef = {
        tag: `nova_tag_${uniqueNum}`,
        mod_saude: 0,
        mod_felicidade: 0,
        mod_renda_mensal: 0,
      };
      setLocalTags([newItem, ...localTags]);
      setSelectedBlockKey("tags_0");
      setSearchQuery(newItem.tag);
    }
  };

  const deleteBlock = (index: number) => {
    if (activeSubTab === "demo") {
      setLocalDemo(localDemo.filter((_, i) => i !== index));
    } else if (activeSubTab === "socio") {
      setLocalSocio(localSocio.filter((_, i) => i !== index));
    } else if (activeSubTab === "cid") {
      setLocalCid(localCid.filter((_, i) => i !== index));
    } else if (activeSubTab === "est") {
      setLocalEst(localEst.filter((_, i) => i !== index));
    } else if (activeSubTab === "nom") {
      setLocalNom(localNom.filter((_, i) => i !== index));
    } else if (activeSubTab === "tags") {
      setLocalTags(localTags.filter((_, i) => i !== index));
    }
    setSelectedBlockKey(null);
  };

  const toggleLocalLock = (blockKey: string) => {
    setLocalLocks((prev) => ({
      ...prev,
      [blockKey]: !prev[blockKey],
    }));
  };

  const exportCurrentTabToSheetsClipboard = async () => {
    let headers: string[] = [];
    let dataList: any[] = [];
    let tabLabel = "";

    if (activeSubTab === "demo") {
      tabLabel = "Democracia/Demografia";
      headers = ["id_demo", "descricao", "idade_min", "idade_max", "peso_base", "add_tags"];
      dataList = localDemo;
    } else if (activeSubTab === "socio") {
      tabLabel = "Socioeconômico / Profissões";
      headers = ["id_socio", "profissao", "req_tags", "mult_tags", "peso_base", "add_tags"];
      dataList = localSocio;
    } else if (activeSubTab === "cid") {
      tabLabel = "Cidades";
      headers = ["id_cidade", "nome_cidade", "req_tags", "peso_base", "add_tags"];
      dataList = localCid;
    } else if (activeSubTab === "est") {
      tabLabel = "Estados";
      headers = ["id_estado", "nome_estado", "peso_base", "add_tags"];
      dataList = localEst;
    } else if (activeSubTab === "nom") {
      tabLabel = "Nomes";
      headers = ["id_nome", "nome", "peso_base", "req_tags"];
      dataList = localNom;
    } else if (activeSubTab === "tags") {
      tabLabel = "Tags / Atributos básicos";
      headers = ["tag", "mod_saude", "mod_felicidade", "mod_renda_mensal"];
      dataList = localTags;
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
      setExportFeedback(`Matriz de ${tabLabel} copiada com sucesso!`);
      setTimeout(() => setExportFeedback(null), 6000);
    } catch (e) {
      console.error(e);
      setExportFeedback("Falha ao salvar string TSV.");
    }
  };

  const getSubTabColor = (tab: "demo" | "socio" | "cid" | "est" | "nom" | "tags") => {
    switch (tab) {
      case "demo": return "#e29e00";
      case "socio": return "#884df2";
      case "cid": return "#0088e5";
      case "est": return "#4caf50";
      case "nom": return "#e91e63";
      case "tags": return "#ff6f00";
    }
  };

  const getHeaderGradient = (tab: string) => {
    switch (tab) {
      case "demo": return "from-amber-600/90 to-amber-950/80 text-amber-200 border-b border-amber-500/20";
      case "socio": return "from-violet-600/90 to-violet-950/80 text-violet-200 border-b border-violet-500/20";
      case "cid": return "from-sky-600/90 to-sky-950/80 text-sky-200 border-b border-sky-500/20";
      case "est": return "from-emerald-600/90 to-emerald-950/80 text-emerald-200 border-b border-emerald-500/20";
      case "nom": return "from-rose-600/90 to-rose-950/80 text-rose-200 border-b border-rose-500/20";
      case "tags": return "from-orange-600/90 to-orange-950/80 text-orange-200 border-b border-orange-500/20";
      default: return "from-slate-700 to-slate-900 text-slate-200 border-b border-slate-650/20";
    }
  };

  const getNodeTitle = () => {
    if (selectedIndex === -1) return "Configurações";
    if (activeSubTab === "demo") return localDemo[selectedIndex]?.descricao || "Novo Perfil Demográfico";
    if (activeSubTab === "socio") return localSocio[selectedIndex]?.profissao || "Nova Profissão";
    if (activeSubTab === "cid") return localCid[selectedIndex]?.nome_cidade || "Nova Cidade";
    if (activeSubTab === "est") return localEst[selectedIndex]?.nome_estado || "Novo Estado";
    if (activeSubTab === "nom") return localNom[selectedIndex]?.nome || "Novo Nome";
    if (activeSubTab === "tags") return localTags[selectedIndex] ? `#${localTags[selectedIndex].tag}` : "Nova Tag";
    return "Configurações";
  };

  const activeColor = getSubTabColor(activeSubTab);

  // Filter items in active tab according to searchQuery
  // Highly optimized: supports city-to-state logical linkage and strictly cuts off lists of large entries!
  const getFilteredItems = () => {
    if (!searchQuery) return [];

    const query = searchQuery.toLowerCase().trim();
    const isShowAll = query === "*" || query === "all" || query === "tudo";

    if (activeSubTab === "demo") {
      return localDemo
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => {
          if (isShowAll) return true;
          return item.id_demo.toLowerCase().includes(query) || 
                 item.descricao.toLowerCase().includes(query) ||
                 item.add_tags.some(t => t.toLowerCase().includes(query));
        });
    }

    if (activeSubTab === "socio") {
      return localSocio
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => {
          if (isShowAll) return true;
          return (item.id_socio || "").toLowerCase().includes(query) || 
                 item.profissao.toLowerCase().includes(query) ||
                 item.req_tags.some(t => t.toLowerCase().includes(query)) ||
                 (item.add_tags || []).some(t => t.toLowerCase().includes(query));
        });
    }

    if (activeSubTab === "cid") {
      return localCid
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => {
          if (isShowAll) return true;
          return item.id_cidade.toLowerCase().includes(query) || 
                 item.nome_cidade.toLowerCase().includes(query) ||
                 item.req_tags.some(t => t.toLowerCase().includes(query)) ||
                 (item.add_tags || []).some(t => t.toLowerCase().includes(query));
        });
    }

    // MANDATE REMINDER: "Estados por exemplo, eu não quero ver os blocos a partir da propriedade Estado. E sim só a partir da cidade que eu pesquisei. E ocultar as outras."
    if (activeSubTab === "est") {
      if (isShowAll) {
        return localEst.map((item, idx) => ({ item, idx }));
      }
      // Look up our cities array to find any cities matching the query name or city ID
      const matchingCityStateIds = localCid
        .filter(c => c.nome_cidade.toLowerCase().includes(query) || c.id_cidade.toLowerCase().includes(query))
        .flatMap(c => c.req_tags || []);

      return localEst
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => {
          // Direct match with matching parent state ID from cities search
          const matchesByCity = matchingCityStateIds.includes(item.id_estado);
          if (matchesByCity) return true;

          // Fallback to direct name match ONLY if no city query matched
          if (matchingCityStateIds.length === 0) {
            return item.nome_estado.toLowerCase().includes(query) || 
                   item.id_estado.toLowerCase().includes(query);
          }
          return false;
        });
    }

    if (activeSubTab === "nom") {
      return localNom
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => {
          if (isShowAll) return true;
          return item.id_nome.toLowerCase().includes(query) || 
                 item.nome.toLowerCase().includes(query);
        });
    }

    if (activeSubTab === "tags") {
      return localTags
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => {
          if (isShowAll) return true;
          return item.tag.toLowerCase().includes(query);
        });
    }

    return [];
  };

  const filteredItems = getFilteredItems();

  // Auto-focus helper: if exactly 1 result returned, auto-select it to edit
  useEffect(() => {
    if (filteredItems.length === 1) {
      setSelectedBlockKey(`${activeSubTab}_${filteredItems[0].idx}`);
    } else {
      // If active tab or query changes and multiple matches, let user choose, but keep existing selected if it stays in matches
      const isStillInMatches = filteredItems.some(({ idx }) => selectedBlockKey === `${activeSubTab}_${idx}`);
      if (!isStillInMatches) {
        setSelectedBlockKey(null);
      }
    }
  }, [searchQuery, activeSubTab]);

  // Maximum search badges to render in grid to avoid crashing the browser (highly optimized!)
  const SUGGESTS_LIMIT = 20;
  const slicedSuggests = filteredItems.slice(0, SUGGESTS_LIMIT);
  const totalMatchesCount = filteredItems.length;
  const hasMoreThanLimit = totalMatchesCount > SUGGESTS_LIMIT;

  // Retrieve focused selected indexing
  const selectedIndex = selectedBlockKey && selectedBlockKey.startsWith(`${activeSubTab}_`)
    ? parseInt(selectedBlockKey.split("_")[1], 10)
    : -1;

  return (
    <div id="ruleforge-block-editor-view" className="space-y-3.5 text-slate-100 animate-fade-in text-left relative">
      
      {/* CLOUD SYNC LOCKING OVERLAY */}
      {cloudSyncLoading && (
        <div style={{ zIndex: 999999 }} className="absolute inset-x-0 inset-y-0 bg-[#020306]/85 backdrop-blur-md flex flex-col items-center justify-center gap-4 rounded-2xl pointer-events-auto">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border border-indigo-500/30 flex items-center justify-center animate-pulse bg-indigo-950/20">
              <Loader className="w-8 h-8 text-fuchsia-500 animate-spin" />
            </div>
            <CloudUpload className="w-5 h-5 text-indigo-400 absolute bottom-0 right-0 animate-bounce" />
          </div>
          <div className="text-center space-y-1 px-4">
            <h3 className="text-xs sm:text-sm font-black tracking-widest text-[#FFBF00] uppercase font-mono animate-pulse">
              {cloudSyncMessage || "Transmitindo dados para a Forja da Nuvem..."}
            </h3>
            <p className="text-[9px] text-[#747bbd] font-mono leading-relaxed max-w-sm mx-auto">
              Segurança ativada: Esta interface está congelada de modo preventivo até que as planilhas do Google sejam totalmente reescritas e reindexadas.
            </p>
          </div>
        </div>
      )}
      
      {/* 1. COMPACT INTRO HEADER */}
      <div className="bg-[#10121a]/95 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 relative overflow-hidden">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-[#884df2]/15 border border-[#884df2]/30 shrink-0">
              <Workflow className="w-4 h-4 text-[#884df2]" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black tracking-tight text-white uppercase font-display">
                Editor de Matrix por Chaves Cirúrgicas
              </h2>
              <p className="text-[9px] text-[#FFBF00] font-mono">
                Performance Máxima Otimizada. Exibição estritamente focada e leve para mobile.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-1.5 shrink-0 select-none">
          <button
            type="button"
            onClick={createBlankBlock}
            className="flex-1 py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black font-mono text-[9px] uppercase rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Criar Bloco</span>
          </button>
          <button
            type="button"
            onClick={handleResetLocalMatrix}
            disabled={isSyncing}
            className="py-1 px-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-[#FFBF00] disabled:opacity-40 text-slate-300 font-bold font-mono text-[9px] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className={`w-3 h-3 text-[#FFBF00] ${isSyncing ? "animate-spin" : ""}`} />
            <span>Resetar</span>
          </button>
        </div>
      </div>

      {/* 2. TAB TOGGLERS BAR */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 select-none">
        {(["demo", "socio", "cid", "est", "nom", "tags"] as const).map((tab) => {
          const tabLabel = tab === "demo" ? "Demog." :
                           tab === "socio" ? "Profiss." :
                           tab === "cid" ? "Cidades" :
                           tab === "est" ? "Estados" :
                           tab === "nom" ? "Nomes" : "Tags";
          const count = tab === "demo" ? localDemo.length :
                        tab === "socio" ? localSocio.length :
                        tab === "cid" ? localCid.length :
                        tab === "est" ? localEst.length :
                        tab === "nom" ? localNom.length : localTags.length;
                           
          const isSelected = activeSubTab === tab;
          const labelColor = getSubTabColor(tab);

          return (
            <button
              key={tab}
              onClick={() => { 
                setActiveSubTab(tab); 
                setExportFeedback(null); 
              }}
              className={`py-1 px-1 rounded-lg border text-[9px] font-mono font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                isSelected
                  ? "shadow-sm"
                  : "bg-slate-900/45 border-slate-900 text-slate-400 hover:text-slate-200"
              }`}
              style={isSelected ? { 
                borderColor: labelColor, 
                color: labelColor,
                backgroundColor: `${labelColor}12`
              } : undefined}
            >
              <div className="w-1 rounded-full shrink-0 h-1.5" style={{ backgroundColor: labelColor }} />
              <span>{tabLabel} <span className="opacity-55">({count})</span></span>
            </button>
          );
        })}
      </div>

      {/* 3. STRICT SEARCH CONTROL */}
      <div className="bg-[#10121a] border border-slate-800/80 rounded-xl p-2 space-y-1.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="🔍 Busque uma chave, ID ou nome de cidade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-slate-950 border border-slate-850 focus:border-[#FFBF00] text-[10px] sm:text-xs font-mono rounded-lg text-white outline-none focus:ring-1 focus:ring-[#FFBF00]/20 transition-all placeholder:text-slate-600"
            />
          </div>

          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setSearchQuery("*")}
              className={`py-1 px-2.5 rounded-lg text-[9px] font-mono font-black border transition-all cursor-pointer ${
                searchQuery === "*" 
                  ? "bg-[#ffbf00] text-slate-950 border-[#ffbf00]"
                  : "bg-slate-900 text-slate-350 border-slate-800 hover:bg-slate-800"
              }`}
            >
              Exibir Tudo (*)
            </button>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="py-1 px-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg text-[9px] font-mono transition-all cursor-pointer"
            >
              Ocultar
            </button>
          </div>
        </div>

        {/* CLUTTER SILENT STATE */}
        {!searchQuery ? (
          <div className="py-1.5 px-2.5 rounded-lg bg-indigo-500/5 border border-dashed border-indigo-500/10 text-slate-400 text-[9px] font-mono flex items-start gap-1.5 leading-tight">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              <strong>Modo Sem Sobrecarga</strong>. Nenhum bloco é renderizado por padrão. Busque algo (ex: digite <span className="text-[#FFBF00] font-bold cursor-pointer underline" onClick={() => setSearchQuery("sp")}>sp</span> ou clique no botão acima) para trazer à tona instantaneamente apenas a chave desejada.
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono text-slate-400 leading-tight">
            <span>Encontradas <strong>{totalMatchesCount}</strong> chaves correspondentes.</span>
            {hasMoreThanLimit && (
              <span className="text-amber-500 font-bold">⚠️ Exibindo as primeiras {SUGGESTS_LIMIT} linhas. Seja mais específico.</span>
            )}
          </div>
        )}
      </div>

      {/* TSV FEEDBACK BANNER */}
      {exportFeedback && (
        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[9px] font-mono flex items-start gap-2 shadow-sm animate-pulse">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">{exportFeedback} </span>
            <span className="text-[8px] text-slate-400">Pode colar (Ctrl+V) de volta no Google Sheets correspondente.</span>
          </div>
        </div>
      )}

      {/* TSV EXPORT ACTIONS */}
      <div className="flex items-center justify-end select-none">
        <button
          onClick={exportCurrentTabToSheetsClipboard}
          className="py-1 px-2.5 bg-[#ffbf00] text-slate-950 font-black font-mono text-[9px] uppercase tracking-wider rounded-lg hover:bg-yellow-400 transition-all flex items-center gap-1 cursor-pointer"
        >
          <FileSpreadsheet className="w-3 h-3 text-slate-950" />
          <span>Copiar TSV da Aba</span>
        </button>
      </div>

      {/* MAIN WORKSYMBOL CANVAS */}
      <div className="p-2 sm:p-3 rounded-xl bg-[#08090d] border border-slate-900 shadow-inner min-h-[140px] flex flex-col gap-3">
        
        {/* Helper visual states when empty */}
        {!searchQuery && (
          <div className="py-8 flex flex-col items-center justify-center text-center text-slate-550">
            <FolderOpen className="w-7 h-7 text-slate-800 mb-1.5 opacity-35" />
            <p className="text-[10px] font-mono font-bold text-slate-500">Workspace Limpo</p>
            <p className="text-[8px] text-slate-600 font-mono mt-0.5">
              Refine a busca para editar.
            </p>
          </div>
        )}

        {searchQuery && totalMatchesCount === 0 && (
          <div className="py-8 flex flex-col items-center justify-center text-center text-slate-550">
            <Filter className="w-7 h-7 text-stone-700 mb-1.5 opacity-30" />
            <p className="text-[10px] font-mono font-bold text-slate-500">Nenhuma correspondência</p>
            <p className="text-[8px] text-slate-600 mt-0.5">
              Tente redefinir a busca no topo ou trocar de aba.
            </p>
          </div>
        )}

        {/* RESULTS SUGGESTION PILLS ARRAY (Painel de Escolhas) */}
        {searchQuery && totalMatchesCount > 0 && (
          <div className="space-y-1">
            <div className="text-[8px] uppercase tracking-wider text-slate-500 font-mono font-bold select-none">
              Passo 1: Selecione a chave para editar
            </div>
            <div className="flex flex-wrap gap-1">
              {slicedSuggests.map(({ item, idx }) => {
                const uniqueIdKey = `${activeSubTab}_${idx}`;
                const isSelected = selectedBlockKey === uniqueIdKey;
                
                // Construct labels depending on types securely
                let labelText = "";
                let itemWeight = 0;
                if (activeSubTab === "demo") {
                  const x = item as Demografia;
                  labelText = `[DEM] ${x.id_demo} - ${x.descricao}`;
                  itemWeight = x.peso_base;
                } else if (activeSubTab === "socio") {
                  const x = item as Socioeconomico;
                  labelText = `[PROF] ${x.id_socio} - ${x.profissao}`;
                  itemWeight = x.peso_base;
                } else if (activeSubTab === "cid") {
                  const x = item as CidadeDef;
                  labelText = `[CID] ${x.id_cidade} - ${x.nome_cidade}`;
                  itemWeight = x.peso_base;
                } else if (activeSubTab === "est") {
                  const x = item as Estado;
                  labelText = `[EST] ${x.id_estado} - ${x.nome_estado}`;
                  itemWeight = x.peso_base;
                } else if (activeSubTab === "nom") {
                  const x = item as NomeDef;
                  labelText = `[NOM] ${x.id_nome} - ${x.nome}`;
                  itemWeight = x.peso_base;
                } else if (activeSubTab === "tags") {
                  const x = item as TagDef;
                  labelText = `[TAG] #${x.tag}`;
                }

                const styleProps = isSelected ? {
                  borderColor: activeColor,
                  color: "#ffffff",
                  backgroundColor: `${activeColor}20`
                } : undefined;

                return (
                  <button
                    key={uniqueIdKey}
                    type="button"
                    style={styleProps}
                    onClick={() => setSelectedBlockKey(isSelected ? null : uniqueIdKey)}
                    className={`py-1 px-2 rounded-lg border text-[9px] font-mono transition-all flex items-center justify-between gap-1.5 cursor-pointer max-w-[200px] sm:max-w-[250px] ${
                      isSelected 
                        ? "shadow-[0_0_6px_rgba(255,191,0,0.15)] font-bold text-white"
                        : "bg-[#10121a]/85 border-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="truncate">{labelText}</span>
                    {activeSubTab !== "tags" && (
                      <span className="opacity-45 text-[7px]">W:{itemWeight}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SELECTED ITEM HIGH-CONTRAST PUZZLE BLOCK EDITOR (Painel de Edição Focada) */}
        {selectedIndex !== -1 && (
          <div className="mt-2 space-y-1.5 animate-fade-in relative z-30">
            <div className="flex items-center justify-between select-none">
              <div className="text-[8px] uppercase tracking-wider text-slate-500 font-mono font-bold flex items-center gap-1.5">
                <Sliders className="w-2.5 h-2.5 text-slate-500" />
                <span>Passo 2: Ajuste os parâmetros do bloco</span>
              </div>
              
              <button
                type="button"
                onClick={() => setSelectedBlockKey(null)}
                className="text-[9px] font-mono text-slate-400 hover:text-white flex items-center gap-0.5 hover:bg-slate-900 px-1 py-0.5 rounded transition-all cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
                <span>Recolher</span>
              </button>
            </div>

            {/* Visual Block Element (Blueprint Node Graph Aesthetic) */}
            <div className="rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl overflow-visible text-slate-200 z-10 animate-slide-up flex flex-col relative">
              {/* Highlight active edge */}
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: activeColor }} />

              {/* Node Title Color (Gradient Block at the top, full width, no margins) */}
              <div className={`px-4 py-2.5 flex items-center justify-between bg-gradient-to-r ${getHeaderGradient(activeSubTab)}`}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-emerald-500 shadow animate-pulse shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="text-[7px] font-mono tracking-widest uppercase opacity-75 font-bold">
                      {activeSubTab === "demo" ? "DEMOGRAFIA" :
                       activeSubTab === "socio" ? "SOCIOPROFISSÃO" :
                       activeSubTab === "cid" ? "LOCAL_CIDADE" :
                       activeSubTab === "est" ? "LOCAL_ESTADO" :
                       activeSubTab === "nom" ? "REGISTRO_NOME" : "MOD_ATRIBUTO"}
                    </span>
                    <h3 className="text-[11px] sm:text-xs font-black text-white font-sans max-w-[180px] sm:max-w-[400px] truncate uppercase tracking-tight">
                      {getNodeTitle()}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 font-mono">
                  <span className="bg-slate-950/40 px-1.5 py-0.5 rounded text-[8px] font-mono border border-white/5 opacity-80">
                    ID: #{selectedIndex + 1}
                  </span>

                  {/* Lock parameter to lock decision calculations */}
                  {activeSubTab !== "tags" && (
                    <button
                      type="button"
                      onClick={() => toggleLocalLock(`${activeSubTab}_${selectedIndex}`)}
                      className={`p-1 rounded cursor-pointer transition-all ${
                        localLocks[`${activeSubTab}_${selectedIndex}`]
                          ? "bg-slate-950 text-amber-400 border border-slate-800"
                          : "text-white/60 hover:text-white hover:bg-white/10"
                      }`}
                      title="Forçar trava neste peso"
                    >
                      {localLocks[`${activeSubTab}_${selectedIndex}`] ? (
                        <Lock className="w-3 h-3 text-red-400" />
                      ) : (
                        <Unlock className="w-3 h-3 text-slate-100" />
                      )}
                    </button>
                  )}

                  {/* Move Up/Down to shift block prioritizations flow */}
                  <div className="flex items-center gap-0.5 bg-black/25 rounded p-0.5">
                    <button 
                      type="button" 
                      disabled={selectedIndex === 0} 
                      onClick={() => moveBlockUp(selectedIndex)} 
                      className="p-0.5 text-white disabled:opacity-20 cursor-pointer hover:bg-white/10 rounded"
                    >
                      <ArrowUp className="w-2.5 h-2.5" />
                    </button>
                    <button 
                      type="button" 
                      disabled={
                        activeSubTab === "demo" ? selectedIndex === localDemo.length - 1 :
                        activeSubTab === "socio" ? selectedIndex === localSocio.length - 1 :
                        activeSubTab === "cid" ? selectedIndex === localCid.length - 1 :
                        activeSubTab === "est" ? selectedIndex === localEst.length - 1 :
                        activeSubTab === "nom" ? selectedIndex === localNom.length - 1 :
                        selectedIndex === localTags.length - 1
                      } 
                      onClick={() => moveBlockDown(selectedIndex)} 
                      className="p-0.5 text-white disabled:opacity-20 cursor-pointer hover:bg-white/10 rounded"
                    >
                      <ArrowDown className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  {/* Remove Block */}
                  <button 
                    type="button" 
                    onClick={() => {
                      if (window.confirm("Deseja realmente deletar esta matriz de dados?")) {
                        deleteBlock(selectedIndex);
                      }
                    }} 
                    className="p-1 text-white hover:text-red-400 hover:bg-white/10 rounded cursor-pointer ml-1"
                    title="Remover"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Block Editable Fields Interface (Node Body) - Dual Column Blueprint layout */}
              <div className="bg-slate-900/95 flex flex-col md:flex-row justify-between w-full relative overflow-visible divide-y md:divide-y-0 md:divide-x divide-slate-800/80 text-white font-semibold">
                
                {/* COLUNA ESQUERDA: INPUTS */}
                <div className="flex-1 flex flex-col gap-3 py-4 overflow-visible relative">
                  <div className="px-4 pb-1.5 flex items-center gap-1.5 opacity-65 border-b border-slate-800/40 select-none">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow animate-pulse" />
                    <span className="text-[7.5px] font-mono tracking-wider uppercase text-slate-400">INPUTS (CONTROLES)</span>
                  </div>

                  {activeSubTab === "demo" && (
                    <>
                      {/* ID Único */}
                      <div className="relative pl-4 pr-3 py-1 flex flex-col text-left group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-amber-400 group-hover/prop:border-amber-500 transition-colors absolute -left-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">ID Único (id_demo)</span>
                        <input
                          type="text"
                          value={localDemo[selectedIndex].id_demo}
                          onChange={(e) => {
                            const copy = [...localDemo];
                            copy[selectedIndex].id_demo = e.target.value;
                            setLocalDemo(copy);
                          }}
                          className="bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-[10px] text-slate-300 font-mono w-full font-medium"
                        />
                      </div>

                      {/* Descrição Humanizada */}
                      <div className="relative pl-4 pr-3 py-1 flex flex-col text-left group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-amber-400 group-hover/prop:border-amber-500 transition-colors absolute -left-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">Descrição Humanizada</span>
                        <input
                          type="text"
                          value={localDemo[selectedIndex].descricao}
                          onChange={(e) => {
                            const copy = [...localDemo];
                            copy[selectedIndex].descricao = e.target.value;
                            setLocalDemo(copy);
                          }}
                          className="bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-[10px] text-slate-300 w-full font-medium"
                        />
                      </div>

                      {/* Idade Limites */}
                      <div className="relative pl-4 pr-3 py-1 flex flex-col text-left group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-amber-400 group-hover/prop:border-amber-500 transition-colors absolute -left-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">Idade Limites (Mín - Máx)</span>
                        <div className="flex items-center gap-1.5 font-mono text-[9.5px] text-slate-300">
                          <input
                            type="number"
                            value={localDemo[selectedIndex].idade_min}
                            onChange={(e) => {
                              const copy = [...localDemo];
                              copy[selectedIndex].idade_min = parseInt(e.target.value) || 0;
                              setLocalDemo(copy);
                            }}
                            className="w-12 bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 font-mono text-slate-300 text-left focus:text-white"
                          />
                          <span className="opacity-60 font-mono text-[8px]">a</span>
                          <input
                            type="number"
                            value={localDemo[selectedIndex].idade_max}
                            onChange={(e) => {
                              const copy = [...localDemo];
                              copy[selectedIndex].idade_max = parseInt(e.target.value) || 0;
                              setLocalDemo(copy);
                            }}
                            className="w-12 bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 font-mono text-slate-300 text-left focus:text-white"
                          />
                        </div>
                      </div>

                      {/* Peso base */}
                      <div className="relative pl-4 pr-3 py-1 flex flex-col text-left group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-amber-400 group-hover/prop:border-amber-500 transition-colors absolute -left-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">Peso de Distribuição base</span>
                        <input
                          type="text"
                          value={localDemo[selectedIndex].peso_base}
                          onChange={(e) => {
                            const parsed = getNormalizedWeight(e.target.value, `demo_${selectedIndex}`);
                            const copy = [...localDemo];
                            copy[selectedIndex].peso_base = parsed.val;
                            setLocalDemo(copy);
                          }}
                          className="bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-[10px] text-slate-300 font-mono w-full font-black"
                        />
                        {inputErrors[`demo_${selectedIndex}`] && (
                          <span className="text-[7px] text-red-200 mt-0.5">{inputErrors[`demo_${selectedIndex}`]}</span>
                        )}
                      </div>
                    </>
                  )}

                  {activeSubTab === "socio" && (
                    <>
                      {/* ID Profissão */}
                      <div className="relative pl-4 pr-3 py-1 flex flex-col text-left group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-amber-400 group-hover/prop:border-amber-500 transition-colors absolute -left-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">ID Profissão (id_socio)</span>
                        <input
                          type="text"
                          value={localSocio[selectedIndex].id_socio}
                          onChange={(e) => {
                            const copy = [...localSocio];
                            copy[selectedIndex].id_socio = e.target.value;
                            setLocalSocio(copy);
                          }}
                          className="bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-[10px] text-slate-300 font-mono w-full font-medium"
                        />
                      </div>

                      {/* Nome da Ocupação */}
                      <div className="relative pl-4 pr-3 py-1 flex flex-col text-left group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-amber-400 group-hover/prop:border-amber-500 transition-colors absolute -left-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">Nome da Ocupação</span>
                        <input
                          type="text"
                          value={localSocio[selectedIndex].profissao}
                          onChange={(e) => {
                            const copy = [...localSocio];
                            copy[selectedIndex].profissao = e.target.value;
                            setLocalSocio(copy);
                          }}
                          className="bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-[10px] text-slate-300 w-full font-medium"
                        />
                      </div>

                      {/* Peso Base */}
                      <div className="relative pl-4 pr-3 py-1 flex flex-col text-left group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-amber-400 group-hover/prop:border-amber-500 transition-colors absolute -left-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">Peso Base</span>
                        <input
                          type="text"
                          value={localSocio[selectedIndex].peso_base}
                          onChange={(e) => {
                            const parsed = getNormalizedWeight(e.target.value, `socio_${selectedIndex}`);
                            const copy = [...localSocio];
                            copy[selectedIndex].peso_base = parsed.val;
                            setLocalSocio(copy);
                          }}
                          className="bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-[10px] text-slate-300 font-mono w-full font-black"
                        />
                        {inputErrors[`socio_${selectedIndex}`] && (
                          <span className="text-[7px] text-red-200 mt-0.5">{inputErrors[`socio_${selectedIndex}`]}</span>
                        )}
                      </div>

                      {/* Tags Restritas Necessárias (Filtro) */}
                      <div className="relative pl-4 pr-3 py-1 flex flex-col text-left group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-amber-400 group-hover/prop:border-amber-500 transition-colors absolute -left-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">Tags Restritas Necessárias (Filtro)</span>
                        <input
                          type="text"
                          value={localSocio[selectedIndex].req_tags.join(", ")}
                          onChange={(e) => {
                            const copy = [...localSocio];
                            copy[selectedIndex].req_tags = parseTagsInput(e.target.value);
                            setLocalSocio(copy);
                          }}
                          placeholder="Nenhuma restrição"
                          className="bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-[10px] text-slate-300 font-mono w-full font-medium"
                        />
                      </div>

                      {/* Multiplicadores Regionais (Condicional Peso) */}
                      <div className="relative pl-4 pr-3 py-1 flex flex-col text-left group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-amber-400 group-hover/prop:border-amber-500 transition-colors absolute -left-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">Multiplicadores Regionais</span>
                        <input
                          type="text"
                          value={serializeMultTags(localSocio[selectedIndex].mult_tags)}
                          onChange={(e) => {
                            const copy = [...localSocio];
                            copy[selectedIndex].mult_tags = parseMultTagsInput(e.target.value);
                            setLocalSocio(copy);
                          }}
                          placeholder="NomeDaTag:1.5, OutraTag:0.5"
                          className="bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-[10px] text-slate-300 font-mono w-full font-medium"
                        />
                      </div>
                    </>
                  )}

                  {activeSubTab === "cid" && (
                    <>
                      {/* ID Cidade */}
                      <div className="relative pl-4 pr-3 py-1 flex flex-col text-left group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-amber-400 group-hover/prop:border-amber-500 transition-colors absolute -left-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">ID Cidade (id_cidade)</span>
                        <input
                          type="text"
                          value={localCid[selectedIndex].id_cidade}
                          onChange={(e) => {
                            const copy = [...localCid];
                            copy[selectedIndex].id_cidade = e.target.value;
                            setLocalCid(copy);
                          }}
                          className="bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-[10px] text-slate-300 font-mono w-full font-medium"
                        />
                      </div>

                      {/* Nome Comercial */}
                      <div className="relative pl-4 pr-3 py-1 flex flex-col text-left group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-amber-400 group-hover/prop:border-amber-500 transition-colors absolute -left-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">Nome Comercial</span>
                        <input
                          type="text"
                          value={localCid[selectedIndex].nome_cidade}
                          onChange={(e) => {
                            const copy = [...localCid];
                            copy[selectedIndex].nome_cidade = e.target.value;
                            setLocalCid(copy);
                          }}
                          className="bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-[10px] text-slate-300 w-full font-medium"
                        />
                      </div>

                      {/* Peso Demográfico */}
                      <div className="relative pl-4 pr-3 py-1 flex flex-col text-left group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-amber-400 group-hover/prop:border-amber-500 transition-colors absolute -left-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">Peso Demográfico</span>
                        <input
                          type="text"
                          value={localCid[selectedIndex].peso_base}
                          onChange={(e) => {
                            const parsed = getNormalizedWeight(e.target.value, `cid_${selectedIndex}`);
                            const copy = [...localCid];
                            copy[selectedIndex].peso_base = parsed.val;
                            setLocalCid(copy);
                          }}
                          className="bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-[10px] text-slate-300 font-mono w-full font-black"
                        />
                        {inputErrors[`cid_${selectedIndex}`] && (
                          <span className="text-[7px] text-red-200 mt-0.5">{inputErrors[`cid_${selectedIndex}`]}</span>
                        )}
                      </div>

                      {/* Estado Vinculado */}
                      <div className="relative pl-4 pr-3 py-1 flex flex-col text-left group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-amber-400 group-hover/prop:border-amber-500 transition-colors absolute -left-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">Estado Vinculado (Ex: EST_SP)</span>
                        <input
                          type="text"
                          value={localCid[selectedIndex].req_tags.join(", ")}
                          onChange={(e) => {
                            const copy = [...localCid];
                            copy[selectedIndex].req_tags = parseTagsInput(e.target.value);
                            setLocalCid(copy);
                          }}
                          placeholder="Sem restrição de estado"
                          className="bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-[10px] text-slate-300 font-mono w-full font-medium"
                        />
                      </div>
                    </>
                  )}

                  {activeSubTab === "est" && (
                    <>
                      {/* UF Código */}
                      <div className="relative pl-4 pr-3 py-1 flex flex-col text-left group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-amber-400 group-hover/prop:border-amber-500 transition-colors absolute -left-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">UF Código (id_estado)</span>
                        <input
                          type="text"
                          value={localEst[selectedIndex].id_estado}
                          onChange={(e) => {
                            const copy = [...localEst];
                            copy[selectedIndex].id_estado = e.target.value;
                            setLocalEst(copy);
                          }}
                          className="bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-[10px] text-slate-300 font-mono w-full font-medium"
                        />
                      </div>

                      {/* Nome do Estado */}
                      <div className="relative pl-4 pr-3 py-1 flex flex-col text-left group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-amber-400 group-hover/prop:border-amber-500 transition-colors absolute -left-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">Nome do Estado</span>
                        <input
                          type="text"
                          value={localEst[selectedIndex].nome_estado}
                          onChange={(e) => {
                            const copy = [...localEst];
                            copy[selectedIndex].nome_estado = e.target.value;
                            setLocalEst(copy);
                          }}
                          className="bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-[10px] text-slate-300 w-full font-medium"
                        />
                      </div>

                      {/* Peso Regional */}
                      <div className="relative pl-4 pr-3 py-1 flex flex-col text-left group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-amber-400 group-hover/prop:border-amber-500 transition-colors absolute -left-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">Peso Regional</span>
                        <input
                          type="text"
                          value={localEst[selectedIndex].peso_base}
                          onChange={(e) => {
                            const parsed = getNormalizedWeight(e.target.value, `est_${selectedIndex}`);
                            const copy = [...localEst];
                            copy[selectedIndex].peso_base = parsed.val;
                            setLocalEst(copy);
                          }}
                          className="bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-[10px] text-slate-300 font-mono w-full font-black"
                        />
                        {inputErrors[`est_${selectedIndex}`] && (
                          <span className="text-[7px] text-red-200 mt-0.5">{inputErrors[`est_${selectedIndex}`]}</span>
                        )}
                      </div>
                    </>
                  )}

                  {activeSubTab === "nom" && (
                    <>
                      {/* ID Semente */}
                      <div className="relative pl-4 pr-3 py-1 flex flex-col text-left group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-amber-400 group-hover/prop:border-amber-500 transition-colors absolute -left-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">ID Semente (id_nome)</span>
                        <input
                          type="text"
                          value={localNom[selectedIndex].id_nome}
                          onChange={(e) => {
                            const copy = [...localNom];
                            copy[selectedIndex].id_nome = e.target.value;
                            setLocalNom(copy);
                          }}
                          className="bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-[10px] text-slate-300 font-mono w-full font-medium"
                        />
                      </div>

                      {/* Tags Requeridas (Filtro) */}
                      <div className="relative pl-4 pr-3 py-1 flex flex-col text-left group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-amber-400 group-hover/prop:border-amber-500 transition-colors absolute -left-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">Tags Requeridas (Filtro)</span>
                        <input
                          type="text"
                          value={(localNom[selectedIndex].req_tags || []).join(", ")}
                          onChange={(e) => {
                            const copy = [...localNom];
                            copy[selectedIndex].req_tags = parseTagsInput(e.target.value);
                            setLocalNom(copy);
                          }}
                          placeholder="Sem restrições de tags"
                          className="bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-[10px] text-slate-300 font-mono w-full font-medium"
                        />
                      </div>

                      {/* Peso Base */}
                      <div className="relative pl-4 pr-3 py-1 flex flex-col text-left group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-amber-400 group-hover/prop:border-amber-500 transition-colors absolute -left-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">Peso Base</span>
                        <input
                          type="text"
                          value={localNom[selectedIndex].peso_base}
                          onChange={(e) => {
                            const parsed = getNormalizedWeight(e.target.value, `nom_${selectedIndex}`);
                            const copy = [...localNom];
                            copy[selectedIndex].peso_base = parsed.val;
                            setLocalNom(copy);
                          }}
                          className="bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-[10px] text-slate-300 font-mono w-full font-black"
                        />
                        {inputErrors[`nom_${selectedIndex}`] && (
                          <span className="text-[7px] text-red-200 mt-0.5">{inputErrors[`nom_${selectedIndex}`]}</span>
                        )}
                      </div>
                    </>
                  )}

                  {activeSubTab === "tags" && (
                    <>
                      {/* Tag ID */}
                      <div className="relative pl-4 pr-3 py-1 flex flex-col text-left group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-amber-400 group-hover/prop:border-amber-500 transition-colors absolute -left-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">Tag ID</span>
                        <input
                          type="text"
                          value={localTags[selectedIndex].tag}
                          onChange={(e) => {
                            const copy = [...localTags];
                            copy[selectedIndex].tag = e.target.value;
                            setLocalTags(copy);
                          }}
                          className="bg-transparent border-none p-0 outline-none focus:outline-none focus:ring-0 text-[10px] text-amber-400 font-mono w-full font-black"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* COLUNA DIREITA: OUTPUTS */}
                <div className="flex-1 flex flex-col gap-3 py-4 overflow-visible relative">
                  <div className="px-4 pb-1.5 flex items-center justify-end gap-1.5 opacity-65 border-b border-slate-800/40 select-none">
                    <span className="text-[7px] font-mono tracking-wider uppercase text-slate-400">OUTPUTS (SAÍDAS / EFEITOS)</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow animate-pulse" />
                  </div>

                  {activeSubTab === "demo" && (
                    <div className="relative pr-4 pl-3 py-1 flex flex-col text-right items-end group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                      <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-blue-400 group-hover/prop:border-blue-450 transition-colors absolute -right-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold mb-1.5">Gera Atributos / Tags Aditivas ({localDemo[selectedIndex].add_tags.length})</span>
                      <div className="flex flex-wrap items-center justify-end gap-1.5 font-mono w-full">
                        {localDemo[selectedIndex].add_tags.map(t => 
                          renderTagPill(t, () => {
                            const copy = [...localDemo];
                            copy[selectedIndex].add_tags = localDemo[selectedIndex].add_tags.filter(tg => tg !== t);
                            setLocalDemo(copy);
                          })
                        )}
                        <input
                          type="text"
                          placeholder="+ Adicionar Tag [Enter]"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const target = e.currentTarget;
                              const cleanVal = target.value.trim().toLowerCase().replace(/\s+/g, "_");
                              if (cleanVal && !localDemo[selectedIndex].add_tags.includes(cleanVal)) {
                                const copy = [...localDemo];
                                copy[selectedIndex].add_tags = [...localDemo[selectedIndex].add_tags, cleanVal];
                                setLocalDemo(copy);
                                target.value = "";
                              }
                              e.preventDefault();
                            }
                          }}
                          className="bg-transparent border-none p-0 outline-none text-[9.5px] uppercase font-mono text-slate-300 text-right focus:text-white placeholder:text-slate-500 w-32 placeholder:text-right"
                        />
                      </div>
                    </div>
                  )}

                  {activeSubTab === "socio" && (
                    <div className="relative pr-4 pl-3 py-1 flex flex-col text-right items-end group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                      <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-blue-400 group-hover/prop:border-blue-450 transition-colors absolute -right-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold mb-1.5">Sinalizadores Aditivos ({localSocio[selectedIndex].add_tags.length})</span>
                      <div className="flex flex-wrap items-center justify-end gap-1.5 font-mono w-full">
                        {localSocio[selectedIndex].add_tags.map(t => 
                          renderTagPill(t, () => {
                            const copy = [...localSocio];
                            copy[selectedIndex].add_tags = localSocio[selectedIndex].add_tags.filter(tg => tg !== t);
                            setLocalSocio(copy);
                          })
                        )}
                        <input
                          type="text"
                          placeholder="+ Sinalizador [Enter]"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const target = e.currentTarget;
                              const cleanVal = target.value.trim().toLowerCase().replace(/\s+/g, "_");
                              if (cleanVal && !localSocio[selectedIndex].add_tags.includes(cleanVal)) {
                                const copy = [...localSocio];
                                copy[selectedIndex].add_tags = [...localSocio[selectedIndex].add_tags, cleanVal];
                                setLocalSocio(copy);
                                target.value = "";
                              }
                              e.preventDefault();
                            }
                          }}
                          className="bg-transparent border-none p-0 outline-none text-[9.5px] uppercase font-mono text-slate-300 text-right focus:text-white placeholder:text-slate-500 w-32 placeholder:text-right"
                        />
                      </div>
                    </div>
                  )}

                  {activeSubTab === "cid" && (
                    <div className="relative pr-4 pl-3 py-1 flex flex-col text-right items-end group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                      <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-blue-400 group-hover/prop:border-blue-450 transition-colors absolute -right-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold mb-1.5">Tags Regionais Adicionais ({localCid[selectedIndex].add_tags.length})</span>
                      <div className="flex flex-wrap items-center justify-end gap-1.5 font-mono w-full">
                        {localCid[selectedIndex].add_tags.map(t => 
                          renderTagPill(t, () => {
                            const copy = [...localCid];
                            copy[selectedIndex].add_tags = localCid[selectedIndex].add_tags.filter(tg => tg !== t);
                            setLocalCid(copy);
                          })
                        )}
                        <input
                          type="text"
                          placeholder="+ Tag Regional [Enter]"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const target = e.currentTarget;
                              const cleanVal = target.value.trim().toLowerCase().replace(/\s+/g, "_");
                              if (cleanVal && !localCid[selectedIndex].add_tags.includes(cleanVal)) {
                                const copy = [...localCid];
                                copy[selectedIndex].add_tags = [...localCid[selectedIndex].add_tags, cleanVal];
                                setLocalCid(copy);
                                target.value = "";
                              }
                              e.preventDefault();
                            }
                          }}
                          className="bg-transparent border-none p-0 outline-none text-[9.5px] uppercase font-mono text-slate-300 text-right focus:text-white placeholder:text-slate-500 w-32 placeholder:text-right"
                        />
                      </div>
                    </div>
                  )}

                  {activeSubTab === "est" && (
                    <div className="relative pr-4 pl-3 py-1 flex flex-col text-right items-end group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                      <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-blue-400 group-hover/prop:border-blue-450 transition-colors absolute -right-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold mb-1.5">Matriz Clima / Tags aditivas ({localEst[selectedIndex].add_tags.length})</span>
                      <div className="flex flex-wrap items-center justify-end gap-1.5 font-mono w-full">
                        {localEst[selectedIndex].add_tags.map(t => 
                          renderTagPill(t, () => {
                            const copy = [...localEst];
                            copy[selectedIndex].add_tags = localEst[selectedIndex].add_tags.filter(tg => tg !== t);
                            setLocalEst(copy);
                          })
                        )}
                        <input
                          type="text"
                          placeholder="+ Tag Clima [Enter]"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const target = e.currentTarget;
                              const cleanVal = target.value.trim().toLowerCase().replace(/\s+/g, "_");
                              if (cleanVal && !localEst[selectedIndex].add_tags.includes(cleanVal)) {
                                const copy = [...localEst];
                                copy[selectedIndex].add_tags = [...localEst[selectedIndex].add_tags, cleanVal];
                                setLocalEst(copy);
                                target.value = "";
                              }
                              e.preventDefault();
                            }
                          }}
                          className="bg-transparent border-none p-0 outline-none text-[9.5px] uppercase font-mono text-slate-300 text-right focus:text-white placeholder:text-slate-500 w-32 placeholder:text-right"
                        />
                      </div>
                    </div>
                  )}

                  {activeSubTab === "nom" && (
                    <div className="relative pr-4 pl-3 py-1 flex flex-col text-right items-end group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                      <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-blue-400 group-hover/prop:border-blue-450 transition-colors absolute -right-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                      <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold mb-1 select-none">Nome de Saída</span>
                      <input
                        type="text"
                        value={localNom[selectedIndex].nome}
                        onChange={(e) => {
                          const copy = [...localNom];
                          copy[selectedIndex].nome = e.target.value;
                          setLocalNom(copy);
                        }}
                        className="bg-transparent border-none p-0 outline-none text-[11px] font-black font-sans text-emerald-400 text-right focus:text-white w-full uppercase"
                      />
                    </div>
                  )}

                  {activeSubTab === "tags" && (
                    <>
                      {/* Mod Saúde */}
                      <div className="relative pr-4 pl-3 py-1 flex flex-col text-right items-end group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-blue-400 group-hover/prop:border-blue-450 transition-colors absolute -right-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">Mod Saúde (Inteiro +/-)</span>
                        <input
                          type="number"
                          value={localTags[selectedIndex].mod_saude}
                          onChange={(e) => {
                            const copy = [...localTags];
                            copy[selectedIndex].mod_saude = parseInt(e.target.value, 10) || 0;
                            setLocalTags(copy);
                          }}
                          className="bg-transparent border-none p-0 outline-none text-[10px] font-mono text-slate-300 text-right focus:text-white font-medium"
                        />
                      </div>

                      {/* Mod Felicidade */}
                      <div className="relative pr-4 pl-3 py-1 flex flex-col text-right items-end group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-blue-400 group-hover/prop:border-blue-450 transition-colors absolute -right-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">Mod Felicidade (Inteiro +/-)</span>
                        <input
                          type="number"
                          value={localTags[selectedIndex].mod_felicidade}
                          onChange={(e) => {
                            const copy = [...localTags];
                            copy[selectedIndex].mod_felicidade = parseInt(e.target.value, 10) || 0;
                            setLocalTags(copy);
                          }}
                          className="bg-transparent border-none p-0 outline-none text-[10px] font-mono text-slate-300 text-right focus:text-white font-medium"
                        />
                      </div>

                      {/* Mod Renda Mensal */}
                      <div className="relative pr-4 pl-3 py-1 flex flex-col text-right items-end group/prop min-h-[44px] justify-center hover:bg-slate-800/10 transition-colors">
                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-slate-800 group-hover/prop:bg-blue-400 group-hover/prop:border-blue-450 transition-colors absolute -right-1.5 top-1/2 -translate-y-1/2 z-20 shadow cursor-pointer" />
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono font-bold">Mod Renda Mensal (+/- Valor)</span>
                        <input
                          type="number"
                          value={localTags[selectedIndex].mod_renda_mensal}
                          onChange={(e) => {
                            const copy = [...localTags];
                            copy[selectedIndex].mod_renda_mensal = parseInt(e.target.value, 10) || 0;
                            setLocalTags(copy);
                          }}
                          className="bg-transparent border-none p-0 outline-none text-[10px] font-mono text-slate-300 text-right focus:text-white font-bold"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* LIST OF CURRENT INJECTED MODIFIERS FOR THE ACTIVE ITEM */}
              {selectedIndex !== -1 && (
                (() => {
                  const currentItem = activeSubTab === "demo" ? localDemo[selectedIndex] :
                                      activeSubTab === "socio" ? localSocio[selectedIndex] :
                                      activeSubTab === "cid" ? localCid[selectedIndex] :
                                      activeSubTab === "est" ? localEst[selectedIndex] :
                                      activeSubTab === "nom" ? localNom[selectedIndex] :
                                      localTags[selectedIndex];
                  const dynamicKeys = getDynamicKeysOfItem(currentItem);

                  return (
                    <>
                      {dynamicKeys.length > 0 && (
                        <div className="bg-black/35 rounded-lg p-2.5 border border-white/5 space-y-2 mt-1">
                          <span className="text-[9px] uppercase tracking-wider text-[#FFBF00] font-mono font-bold block text-left">
                            Modificadores Dinâmicos Injetados nesta Linha
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-white font-semibold">
                            {dynamicKeys.map((key) => {
                              const val = (currentItem as any)[key];
                              return (
                                <div key={key} className="flex items-center gap-1.5 bg-white/5 px-2 py-1.5 rounded border border-white/5">
                                  <span className="font-mono text-[9px] text-[#0088e5] truncate flex-1 text-left" title={key}>
                                    {key}:
                                  </span>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={val === undefined || val === null ? "" : val}
                                    onChange={(e) => {
                                      const numVal = parseFloat(e.target.value);
                                      const parsedVal = isNaN(numVal) ? 1.0 : numVal;
                                      
                                      if (activeSubTab === "demo") {
                                        const copy = [...localDemo];
                                        (copy[selectedIndex] as any)[key] = parsedVal;
                                        setLocalDemo(copy);
                                      } else if (activeSubTab === "socio") {
                                        const copy = [...localSocio];
                                        (copy[selectedIndex] as any)[key] = parsedVal;
                                        setLocalSocio(copy);
                                      } else if (activeSubTab === "cid") {
                                        const copy = [...localCid];
                                        (copy[selectedIndex] as any)[key] = parsedVal;
                                        setLocalCid(copy);
                                      } else if (activeSubTab === "est") {
                                        const copy = [...localEst];
                                        (copy[selectedIndex] as any)[key] = parsedVal;
                                        setLocalEst(copy);
                                      } else if (activeSubTab === "nom") {
                                        const copy = [...localNom];
                                        (copy[selectedIndex] as any)[key] = parsedVal;
                                        setLocalNom(copy);
                                      } else if (activeSubTab === "tags") {
                                        const copy = [...localTags];
                                        (copy[selectedIndex] as any)[key] = parsedVal;
                                        setLocalTags(copy);
                                      }
                                    }}
                                    className="w-16 px-1 py-0.5 bg-stone-950 text-white font-mono text-[9px] rounded border border-white/10 outline-none text-center"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Remover modificador ${key} desta linha?`)) {
                                        if (activeSubTab === "demo") {
                                          const copy = [...localDemo];
                                          delete (copy[selectedIndex] as any)[key];
                                          setLocalDemo(copy);
                                        } else if (activeSubTab === "socio") {
                                          const copy = [...localSocio];
                                          delete (copy[selectedIndex] as any)[key];
                                          setLocalSocio(copy);
                                        } else if (activeSubTab === "cid") {
                                          const copy = [...localCid];
                                          delete (copy[selectedIndex] as any)[key];
                                          setLocalCid(copy);
                                        } else if (activeSubTab === "est") {
                                          const copy = [...localEst];
                                          delete (copy[selectedIndex] as any)[key];
                                          setLocalEst(copy);
                                        } else if (activeSubTab === "nom") {
                                          const copy = [...localNom];
                                          delete (copy[selectedIndex] as any)[key];
                                          setLocalNom(copy);
                                        } else if (activeSubTab === "tags") {
                                          const copy = [...localTags];
                                          delete (copy[selectedIndex] as any)[key];
                                          setLocalTags(copy);
                                        }
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-400 rounded transition-all cursor-pointer"
                                    title="Excluir Modificador"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* COMPONENTE DE ADIÇÃO DE COLUNAS (NO EDITOR) */}
                      <div className="bg-[#10121a]/95 rounded-lg p-2.5 border border-[#884df2]/20 space-y-2 mt-2 text-left">
                        <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-white font-mono font-bold">
                          <Plus className="w-3 h-3 text-[#884df2]" />
                          <span>Criar Novo Modificador (Coluna)</span>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setNewModPrefix("mult_")}
                              className={`py-1 px-2.5 rounded font-mono text-[9px] font-bold border transition-all cursor-pointer ${
                                newModPrefix === "mult_"
                                  ? "bg-[#884df2] text-white border-[#884df2]"
                                  : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900"
                              }`}
                            >
                              mult_ (Multiplicador)
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewModPrefix("mod_")}
                              className={`py-1 px-2.5 rounded font-mono text-[9px] font-bold border transition-all cursor-pointer ${
                                newModPrefix === "mod_"
                                  ? "bg-[#884df2] text-white border-[#884df2]"
                                  : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900"
                              }`}
                            >
                              mod_ (Modificador)
                            </button>
                          </div>
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              placeholder="Nome da Tag (ex: Startups)"
                              value={newModTag}
                              onChange={(e) => setNewModTag(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleAddDynamicModifier();
                                  e.preventDefault();
                                }
                              }}
                              className="w-full px-2 py-1 bg-stone-950 border border-white/10 text-white rounded font-mono text-[9px] outline-none focus:border-[#884df2] placeholder:text-stone-600"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleAddDynamicModifier}
                            className="py-1 px-3 bg-[#884df2] hover:bg-[#9d6ef5] text-white font-bold font-mono text-[9px] uppercase rounded transition-all cursor-pointer text-center"
                          >
                            Criar e Injetar
                          </button>
                        </div>
                        <p className="text-[8px] text-slate-400 font-mono">
                          Ao clicar em "Criar e Injetar", o sistema adicionará a propriedade <span className="text-[#FFBF00] font-bold">{newModPrefix}{newModTag ? newModTag : "Tag"}</span> a este item e ela será automaticamente tratada como uma nova coluna no CSV ao exportar.
                        </p>
                      </div>
                    </>
                  );
                })()
              )}

              {/* Conclude Button to save/exit focus cleanly on mobile */}
              <div className="flex items-center justify-end select-none bg-black/5 p-1 rounded-md mt-1">
                <button
                  type="button"
                  onClick={() => setSelectedBlockKey(null)}
                  className="py-1 px-3 bg-white text-stone-950 rounded font-black font-mono text-[9px] cursor-pointer hover:bg-white/90 active:scale-95 transition-all"
                >
                  Concluir Edição ✓
                </button>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* FOOTER MULTI-EXPORT INTERACTIVE ZONE */}
      <div className="bg-[#10121a]/95 border border-slate-800 rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 select-none mt-2">
        <div className="space-y-0.5 text-left">
          <h3 className="text-[10px] sm:text-xs font-black tracking-tight text-white uppercase font-display flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ffbf00] animate-pulse" />
            <span>Zona de Sincronização da Infraestrutura</span>
          </h3>
          <p className="text-[8px] text-slate-400 font-mono">
            Copie a matriz atualizada ou o prompt de remapeamento dinâmico para a Inteligência Artificial.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {/* BOTÃO 1: Copiar Matriz Completa (CSV) */}
          <button
            type="button"
            onClick={handleCopyMatrixCSV}
            className="py-1.5 px-3 bg-[#0088e5] hover:bg-sky-500 text-white font-black font-mono text-[9px] uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md text-center"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-sky-100" />
            <span>Copiar Matriz Completa (CSV)</span>
          </button>

          {/* BOTÃO 2: Copiar Prompt de Sincronização Engine */}
          <button
            type="button"
            onClick={handleCopyPromptSync}
            className="py-1.5 px-3 bg-[#884df2] hover:bg-[#9d6ef5] text-white font-black font-mono text-[9px] uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md text-center"
          >
            <Workflow className="w-3.5 h-3.5 text-purple-200" />
            <span>Copiar Prompt de Sincronização Engine</span>
          </button>

          {/* BOTÃO 3: Sincronização direta por Planilhas GAPI */}
          {!googleToken ? (
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="py-1.5 px-3 bg-gradient-to-r from-[#ea4335] to-[#fbbc05] hover:from-[#d33a2c] hover:to-[#e5ac04] text-white font-black font-mono text-[9px] uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md text-center"
            >
              <Cloud className="w-3.5 h-3.5 text-white animate-pulse" />
              <span>Conectar c/ Google</span>
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
              <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-md text-[8px] font-mono text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="max-w-[75px] truncate text-slate-300 font-bold" title={googleUser?.displayName}>
                  {googleUser?.displayName || "Conectado"}
                </span>
                <button
                  type="button"
                  onClick={handleGoogleLogout}
                  className="ml-1 text-[8px] text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer shrink-0"
                >
                  Sair
                </button>
              </div>

              <button
                type="button"
                onClick={handleSyncActiveTabToGoogleSheets}
                className="py-1.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black font-mono text-[9px] uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md text-center"
              >
                <CloudUpload className="w-3.5 h-3.5 text-emerald-100" />
                <span>Sincronizar c/ Nuvem</span>
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
