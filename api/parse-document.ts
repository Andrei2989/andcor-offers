export const config = { runtime: 'edge' };

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You are a procurement document parser. Extract all line items and return ONLY a valid JSON array.
Each element must have:
- "name": the FULL original product description, unchanged, including all details (do NOT truncate or summarize)
- "manufacturer_ref": part code, OEM code, or chassis/VIN number found in the row; empty string if none
- "unit": unit of measure from the document (BUC, SET, KIT, L, KG, etc.); use "buc" if missing
- "quantity": numeric quantity from the document

Rules:
- Extract EVERY product row, do not skip any
- Preserve the exact original text for "name", do not translate or shorten
- Ignore header rows, total rows, and footnotes
- Do not wrap output in markdown code blocks
- Output ONLY the JSON array, nothing else`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured on server' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = await req.json() as { content?: Array<{ type: string; [k: string]: unknown }> };
  const content = body.content;
  if (!content) {
    return new Response(JSON.stringify({ error: 'Missing content' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const response = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            ...content,
            { type: 'text', text: 'Extract all product line items as a JSON array [{name, manufacturer_ref, unit, quantity}]. Include every row.' },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    return new Response(JSON.stringify({ error: `Claude API error: ${errBody}` }), {
      status: response.status,
      headers: { 'content-type': 'application/json' },
    });
  }

  const data = await response.json() as { content?: Array<{ text?: string }> };
  const text = data.content?.[0]?.text ?? '';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) {
    return new Response(JSON.stringify({ error: 'Claude returned no JSON array' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const items = JSON.parse(match[0]) as Array<{ name?: unknown; manufacturer_ref?: unknown; unit?: unknown; quantity?: unknown }>;
  const parsed = items
    .filter((i) => i.name && String(i.name).trim())
    .map((i) => ({
      name: String(i.name ?? '').trim(),
      manufacturer_ref: String(i.manufacturer_ref ?? '').trim(),
      unit: String(i.unit ?? 'buc').trim() || 'buc',
      quantity: Number(i.quantity) || 1,
    }));

  return new Response(JSON.stringify(parsed), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}