import JSZip from 'jszip';
import * as XLSX from 'xlsx';

export interface ParsedItem {
  name: string;
  unit: string;
  quantity: number;
}

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

async function callClaude(
  content: Array<{ type: string; [k: string]: unknown }>,
  apiKey: string
): Promise<ParsedItem[]> {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system:
        'You are a procurement document parser. Extract all line items from the document and return ONLY a valid JSON array. Each element must have: "name" (full product description as a string), "unit" (unit of measure, e.g. BUC, SET, KIT, L, KG — use the value from the document or "buc" if missing), "quantity" (numeric value). Ignore headers, totals, and footnotes. Do not wrap in markdown. Output only the JSON array.',
      messages: [
        {
          role: 'user',
          content: [
            ...content,
            { type: 'text', text: 'Extract all line items as a JSON array [{name, unit, quantity}].' },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? '';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Claude returned no JSON array');

  const items = JSON.parse(match[0]) as Array<{ name?: unknown; unit?: unknown; quantity?: unknown }>;
  return items
    .filter((i) => i.name && String(i.name).trim())
    .map((i) => ({
      name: String(i.name ?? '').trim(),
      unit: String(i.unit ?? 'buc').trim() || 'buc',
      quantity: Number(i.quantity) || 1,
    }));
}

async function extractDocxText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file('word/document.xml')?.async('text');
  if (!xml) throw new Error('word/document.xml not found in docx');
  return xml.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
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

export async function parseDocument(file: File, apiKey: string): Promise<ParsedItem[]> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'docx') {
    const text = await extractDocxText(file);
    return callClaude([{ type: 'text', text }], apiKey);
  }

  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    const text = await extractXlsxText(file);
    return callClaude([{ type: 'text', text }], apiKey);
  }

  if (ext === 'pdf') {
    const base64 = await readFileAsBase64(file);
    return callClaude(
      [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }],
      apiKey
    );
  }

  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    const base64 = await readFileAsBase64(file);
    const mediaType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    return callClaude(
      [{ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } }],
      apiKey
    );
  }

  throw new Error(`Format nesuportat: .${ext}. Acceptat: .docx, .xlsx, .xls, .csv, .pdf, .jpg, .png, .webp`);
}
