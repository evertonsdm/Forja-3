import { NomeDef, CidadeDef, Demografia, Estado, TagDef } from "../types";

// Safe CSV Row parser
function parseCSVRow(rowText: string, separator: string): string[] {
  const fields: string[] = [];
  let field = "";
  let insideStr = false;

  for (let j = 0; j < rowText.length; j++) {
    const c = rowText[j];
    if (c === '"') {
      insideStr = !insideStr;
    } else if (c === separator && !insideStr) {
      fields.push(field.trim());
      field = "";
    } else {
      field += c;
    }
  }
  fields.push(field.trim());
  return fields;
}

// Universal parser helper
export function parseCSVToRawRows(csvText: string): any[] {
  if (!csvText || !csvText.trim()) return [];

  const lines: string[] = [];
  let currentLine = "";
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
      currentLine += char;
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && csvText[i + 1] === "\n") {
        i++;
      }
      if (currentLine.trim() !== "") {
        lines.push(currentLine);
      }
      currentLine = "";
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim() !== "") {
    lines.push(currentLine);
  }

  if (lines.length <= 1) return [];

  const headerLine = lines[0];
  const separator = headerLine.includes(";") ? ";" : ",";
  const headers = parseCSVRow(headerLine, separator).map(h => h.trim());

  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine.trim()) continue;

    const cells = parseCSVRow(rawLine, separator);
    const rowObj: any = {};
    headers.forEach((header, cellIdx) => {
      if (!header) return;
      const cellVal = cells[cellIdx];
      if (cellVal !== undefined && cellVal !== null && cellVal.trim() !== "") {
        rowObj[header] = cellVal.trim();
      }
    });
    rows.push(rowObj);
  }
  return rows;
}

export function parseNomesCSV(csvText: string): NomeDef[] {
  const rows = parseCSVToRawRows(csvText);
  return rows.map((row, i) => {
    const keys = Object.keys(row);
    const idKey = keys.find(k => k.toLowerCase() === "id_nome" || k.toLowerCase() === "id") || "id_nome";
    const nomeKey = keys.find(k => k.toLowerCase() === "nome" || k.toLowerCase() === "name") || "nome";
    const pesoKey = keys.find(k => k.toLowerCase() === "peso_base" || k.toLowerCase() === "peso" || k.toLowerCase() === "weight") || "peso_base";
    const reqTagsKey = keys.find(k => k.toLowerCase() === "req_tags" || k.toLowerCase() === "req" || k.toLowerCase() === "tags") || "req_tags";

    const idVal = row[idKey] || `NOM_CSV_${i + 1}`;
    const nomeVal = row[nomeKey] || "";
    const pesoRaw = row[pesoKey] || "50";
    const pesoVal = parseFloat(pesoRaw.replace(",", ".")) || 50;

    const reqTagsRaw = row[reqTagsKey] || "";
    let reqTags: string[] = [];
    if (reqTagsRaw) {
      reqTags = reqTagsRaw
        .replace(/[\[\]"']/g, "")
        .split(/[,,;]/)
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0 && t !== "none" && t !== "null");
    }

    const item: any = {
      id_nome: idVal,
      nome: nomeVal,
      peso_base: pesoVal,
      req_tags: reqTags
    };

    keys.forEach(k => {
      const kl = k.toLowerCase().trim();
      if (kl.startsWith("mult_") || kl.startsWith("mod_")) {
        const valRaw = row[k];
        if (valRaw !== undefined && valRaw !== null && valRaw.trim() !== "") {
          const val = parseFloat(valRaw.replace(",", "."));
          if (!isNaN(val)) {
            item[kl] = val;
          }
        }
      }
    });

    return item;
  }).filter(item => item.nome);
}

export function parseCidadesCSV(csvText: string): CidadeDef[] {
  const rows = parseCSVToRawRows(csvText);
  return rows.map((row, i) => {
    const keys = Object.keys(row);
    const idKey = keys.find(k => k.toLowerCase() === "id_cidade" || k.toLowerCase() === "id") || "id_cidade";
    const nomeKey = keys.find(k => k.toLowerCase() === "nome_cidade" || k.toLowerCase() === "nome" || k.toLowerCase() === "cidade" || k.toLowerCase() === "city") || "nome_cidade";
    const pesoKey = keys.find(k => k.toLowerCase() === "peso_base" || k.toLowerCase() === "peso" || k.toLowerCase() === "weight") || "peso_base";
    const reqTagsKey = keys.find(k => k.toLowerCase() === "req_tags" || k.toLowerCase() === "req" || k.toLowerCase() === "reqtags") || "req_tags";
    const addTagsKey = keys.find(k => k.toLowerCase() === "add_tags" || k.toLowerCase() === "add" || k.toLowerCase() === "addtags") || "add_tags";

    const idVal = row[idKey] || `CID_CSV_${i + 1}`;
    const nomeVal = row[nomeKey] || "";
    const pesoRaw = row[pesoKey] || "50";
    const pesoVal = parseFloat(pesoRaw.replace(",", ".")) || 50;

    const parseTagsStr = (raw: string) => {
      if (!raw) return [];
      return raw
        .replace(/[\[\]"']/g, "")
        .split(/[,,;]/)
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0 && t !== "none" && t !== "null");
    };

    const reqTags = parseTagsStr(row[reqTagsKey] || "");
    const addTags = parseTagsStr(row[addTagsKey] || "");

    const item: any = {
      id_cidade: idVal,
      nome_cidade: nomeVal,
      peso_base: pesoVal,
      req_tags: reqTags,
      add_tags: addTags
    };

    keys.forEach(k => {
      const kl = k.toLowerCase().trim();
      if (kl.startsWith("mult_") || kl.startsWith("mod_")) {
        const valRaw = row[k];
        if (valRaw !== undefined && valRaw !== null && valRaw.trim() !== "") {
          const val = parseFloat(valRaw.replace(",", "."));
          if (!isNaN(val)) {
            item[kl] = val;
          }
        }
      }
    });

    return item;
  }).filter(item => item.nome_cidade);
}

export interface RawSocioDef {
  id_socio: string;
  profissao: string;
  req_tags: string[];
  mult_tags: Record<string, number>;
  peso_base: number;
  add_tags: string[];
}

export function parseSocioeconomicoCSV(csvText: string): RawSocioDef[] {
  const rows = parseCSVToRawRows(csvText);
  return rows.map((row, i) => {
    const keys = Object.keys(row);
    const idKey = keys.find(k => k.toLowerCase() === "id_prof" || k.toLowerCase() === "id_socio" || k.toLowerCase() === "id") || "id_socio";
    const profKey = keys.find(k => k.toLowerCase() === "profissao" || k.toLowerCase() === "profession" || k.toLowerCase() === "profissão") || "profissao";
    const pesoKey = keys.find(k => k.toLowerCase() === "peso_base" || k.toLowerCase() === "peso" || k.toLowerCase() === "weight") || "peso_base";
    const reqTagsKey = keys.find(k => k.toLowerCase() === "req_tags" || k.toLowerCase() === "req") || "req_tags";
    const addTagsKey = keys.find(k => k.toLowerCase() === "add_tags" || k.toLowerCase() === "add") || "add_tags";
    const multTagsKey = keys.find(k => k.toLowerCase() === "mult_tags" || k.toLowerCase() === "mult" || k.toLowerCase() === "multiplicadores") || "mult_tags";

    const idVal = row[idKey] || `SOC_CSV_${i + 1}`;
    const profVal = row[profKey] || "";
    const pesoRaw = row[pesoKey] || "50";
    const pesoVal = parseFloat(pesoRaw.replace(",", ".")) || 50;

    const parseTagsStr = (raw: string) => {
      if (!raw) return [];
      return raw
        .replace(/[\[\]"']/g, "")
        .split(/[,,;]/)
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0 && t !== "none" && t !== "null");
    };

    const reqTags = parseTagsStr(row[reqTagsKey] || "");
    const addTags = parseTagsStr(row[addTagsKey] || "");

    let multTags: Record<string, number> = {};
    const multTagsRaw = row[multTagsKey] || "";
    if (multTagsRaw) {
      try {
        const cleaned = multTagsRaw.trim();
        if (cleaned.startsWith("{")) {
          multTags = JSON.parse(cleaned);
        } else {
          const parts = cleaned.split(/[;,]/);
          for (const part of parts) {
            const sub = part.split(":");
            if (sub.length >= 2) {
              const k = sub[0].trim();
              const v = parseFloat(sub[1].trim());
              if (k && !isNaN(v)) {
                multTags[k] = v;
              }
            }
          }
        }
      } catch (e) {
        console.warn("Failed to parse multiplier:", multTagsRaw, e);
      }
    }

    const item: any = {
      id_socio: idVal,
      profissao: profVal,
      peso_base: pesoVal,
      req_tags: reqTags,
      add_tags: addTags,
      mult_tags: multTags
    };

    keys.forEach(k => {
      const kl = k.toLowerCase().trim();
      if (kl.startsWith("mult_") || kl.startsWith("mod_")) {
        const valRaw = row[k];
        if (valRaw !== undefined && valRaw !== null && valRaw.trim() !== "") {
          const val = parseFloat(valRaw.replace(",", "."));
          if (!isNaN(val)) {
            item[kl] = val;
          }
        }
      }
    });

    return item;
  }).filter(item => item.profissao);
}

export function parseDemografiaCSV(csvText: string): Demografia[] {
  const rows = parseCSVToRawRows(csvText);
  return rows.map((row, i) => {
    const keys = Object.keys(row);
    const idKey = keys.find(k => k.toLowerCase() === "id_demo" || k.toLowerCase() === "id") || "id_demo";
    const descKey = keys.find(k => k.toLowerCase() === "descricao" || k.toLowerCase() === "descrição" || k.toLowerCase() === "desc") || "descricao";
    const idadeMinKey = keys.find(k => k.toLowerCase() === "idade_min" || k.toLowerCase() === "id_min") || "idade_min";
    const idadeMaxKey = keys.find(k => k.toLowerCase() === "idade_max" || k.toLowerCase() === "id_max") || "idade_max";
    const pesoKey = keys.find(k => k.toLowerCase() === "peso_base" || k.toLowerCase() === "peso" || k.toLowerCase() === "weight") || "peso_base";
    const addTagsKey = keys.find(k => k.toLowerCase() === "add_tags" || k.toLowerCase() === "add") || "add_tags";

    const idVal = row[idKey] || `DEM_CSV_${i + 1}`;
    const descVal = row[descKey] || "";
    const idMin = parseInt(row[idadeMinKey] || "0") || 0;
    const idMax = parseInt(row[idadeMaxKey] || "120") || 120;
    const pesoRaw = row[pesoKey] || "50";
    const pesoVal = parseFloat(pesoRaw.replace(",", ".")) || 50;

    const parseTagsStr = (raw: string) => {
      if (!raw) return [];
      return raw
        .replace(/[\[\]"']/g, "")
        .split(/[,,;]/)
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0 && t !== "none" && t !== "null");
    };

    const addTags = parseTagsStr(row[addTagsKey] || "");

    const item: any = {
      id_demo: idVal,
      descricao: descVal,
      idade_min: idMin,
      idade_max: idMax,
      peso_base: pesoVal,
      add_tags: addTags
    };

    keys.forEach(k => {
      const kl = k.toLowerCase().trim();
      if (kl.startsWith("mult_") || kl.startsWith("mod_")) {
        const valRaw = row[k];
        if (valRaw !== undefined && valRaw !== null && valRaw.trim() !== "") {
          const val = parseFloat(valRaw.replace(",", "."));
          if (!isNaN(val)) {
            item[kl] = val;
          }
        }
      }
    });

    return item;
  }).filter(item => item.descricao);
}

export function parseEstadosCSV(csvText: string): Estado[] {
  const rows = parseCSVToRawRows(csvText);
  return rows.map((row, i) => {
    const keys = Object.keys(row);
    const idKey = keys.find(k => k.toLowerCase() === "id_estado" || k.toLowerCase() === "id") || "id_estado";
    const nomeKey = keys.find(k => k.toLowerCase() === "nome_estado" || k.toLowerCase() === "nome" || k.toLowerCase() === "estado" || k.toLowerCase() === "state") || "nome_estado";
    const pesoKey = keys.find(k => k.toLowerCase() === "peso_base" || k.toLowerCase() === "peso" || k.toLowerCase() === "weight") || "peso_base";
    const addTagsKey = keys.find(k => k.toLowerCase() === "add_tags" || k.toLowerCase() === "add") || "add_tags";

    const idVal = row[idKey] || `EST_CSV_${i + 1}`;
    const nomeVal = row[nomeKey] || "";
    const pesoRaw = row[pesoKey] || "50";
    const pesoVal = parseFloat(pesoRaw.replace(",", ".")) || 50;

    const parseTagsStr = (raw: string) => {
      if (!raw) return [];
      return raw
        .replace(/[\[\]"']/g, "")
        .split(/[,,;]/)
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0 && t !== "none" && t !== "null");
    };

    const addTags = parseTagsStr(row[addTagsKey] || "");

    const item: any = {
      id_estado: idVal,
      nome_estado: nomeVal,
      peso_base: pesoVal,
      add_tags: addTags
    };

    keys.forEach(k => {
      const kl = k.toLowerCase().trim();
      if (kl.startsWith("mult_") || kl.startsWith("mod_")) {
        const valRaw = row[k];
        if (valRaw !== undefined && valRaw !== null && valRaw.trim() !== "") {
          const val = parseFloat(valRaw.replace(",", "."));
          if (!isNaN(val)) {
            item[kl] = val;
          }
        }
      }
    });

    return item;
  }).filter(item => item.nome_estado);
}

export function parseTagDefCSV(csvText: string): TagDef[] {
  const rows = parseCSVToRawRows(csvText);
  return rows.map((row, i) => {
    const keys = Object.keys(row);
    const tagKey = keys.find(k => k.toLowerCase() === "tag") || "tag";
    const saudeKey = keys.find(k => k.toLowerCase() === "mod_saude" || k.toLowerCase() === "saude") || "mod_saude";
    const felKey = keys.find(k => k.toLowerCase() === "mod_felicidade" || k.toLowerCase() === "felicidade") || "mod_felicidade";
    const rendaKey = keys.find(k => k.toLowerCase() === "mod_renda_mensal" || k.toLowerCase() === "renda") || "mod_renda_mensal";

    const tagVal = row[tagKey] || "";
    const saudeVal = parseFloat((row[saudeKey] || "0").replace(",", ".")) || 0;
    const felVal = parseFloat((row[felKey] || "0").replace(",", ".")) || 0;
    const rendaVal = parseFloat((row[rendaKey] || "0").replace(",", ".")) || 0;

    const item: TagDef = {
      tag: tagVal,
      mod_saude: saudeVal,
      mod_felicidade: felVal,
      mod_renda_mensal: rendaVal
    };

    return item;
  }).filter(item => item.tag);
}
