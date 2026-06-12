import JSZip from 'jszip';
import * as XLSX from 'xlsx';

export interface ParsedItem {
  name: string;
  manufacturer_ref: string;
  unit: string;
  quantity: number;
}

async function callClaude(
  content: Array<{ type: string; [k: string]: unknown }>
): Promise<ParsedItem[]> {
  const res = await fetch('/api/parse-document', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Eroare server ${res.status}: ${body}`);
  }

  return res.json() as Promise<ParsedItem[]>;
}

async function extractDocText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const chunks: string[] = [];

  function isPrintable(b: number) {
    return (b >= 32 && b < 127) || b === 9 || b === 10 || b === 13;
  }

  let i = 0;
  while (i < bytes.length - 3) {
    if (bytes[i + 1] === 0 && isPrintable(bytes[i])) {
      const start = i;
      let nChars = 0;
      while (i + 1 < bytes.length && bytes[i + 1] === 0 && isPrintable(bytes[i])) {
        nChars++;
        i += 2;
      }
      if (nChars >= 4) {
        const s = new TextDecoder('utf-16le').decode(bytes.slice(start, start + nChars * 2)).trim();
        if (s) chunks.push(s);
      }
    } else {
      i++;
    }
  }

  i = 0;
  while (i < bytes.length) {
    if (bytes[i] >= 32 && bytes[i] < 127) {
      const start = i;
      while (i < bytes.length && isPrintable(bytes[i])) i++;
      if (i - start >= 8) {
        const s = new TextDecoder('windows-1252').decode(bytes.slice(start, i)).trim();
        if (s) chunks.push(s);
      }
    } else {
      i++;
    }
  }

  if (!chunks.length) throw new Error('Nu am putut extrage text din fișierul .doc');
  return chunks.join('\n');
}

async function extractDocxText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file('word/document.xml')?.async('text');
  if (!xml) throw new Error('word/document.xml not found in docx');

  const lines: string[] = [];
  const tableRowRegex = /<w:tr[ >][\s\S]*?<\/w:tr>/g;
  const cellRegex = /<w:tc[ >][\s\S]*?<\/w:tc>/g;
  const textRegex = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;

  let tableMatch;

  while ((tableMatch = tableRowRegex.exec(xml)) !== null) {
    const row = tableMatch[0];
    const cells: string[] = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(row)) !== null) {
      const cellText: string[] = [];
      let tMatch;
      while ((tMatch = textRegex.exec(cellMatch[0])) !== null) {
        if (tMatch[1].trim()) cellText.push(tMatch[1]);
      }
      cells.push(cellText.join(''));
      textRegex.lastIndex = 0;
    }
    cellRegex.lastIndex = 0;
    const line = cells.join('\t');
    if (line.trim()) lines.push(line);
  }

  const paraRegex = /<w:p[ >][\s\S]*?<\/w:p>/g;
  let paraMatch;
  while ((paraMatch = paraRegex.exec(xml)) !== null) {
    const paraText: string[] = [];
    let tMatch;
    while ((tMatch = textRegex.exec(paraMatch[0])) !== null) {
      if (tMatch[1].trim()) paraText.push(tMatch[1]);
    }
    textRegex.lastIndex = 0;
    const line = paraText.join(' ').trim();
    if (line) lines.push(line);
  }

  return lines.join('\n');
}

function extractXlsxText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const lines: string[] = [];
        for (const name of wb.SheetNames) {
          const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name]);
          if (csv.trim()) lines.push(csv);
        }
        resolve(lines.join('\n'));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target!.result as string;
      resolve(url.split(',')[1]);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function parseDocument(file: File): Promise<ParsedItem[]> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'docx') {
    const text = await extractDocxText(file);
    return callClaude([{ type: 'text', text }]);
  }

  if (ext === 'doc') {
    const text = await extractDocText(file);
    return callClaude([{ type: 'text', text }]);
  }

  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    const text = await extractXlsxText(file);
    return callClaude([{ type: 'text', text }]);
  }

  if (ext === 'pdf') {
    const base64 = await readFileAsBase64(file);
    return callClaude(
      [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }]
    );
  }

  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    const base64 = await readFileAsBase64(file);
    const mediaType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    return callClaude(
      [{ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } }]
    );
  }

  throw new Error(`Format nesuportat: .${ext}. Acceptat: .doc, .docx, .xlsx, .xls, .csv, .pdf, .jpg, .png, .webp`);
}
