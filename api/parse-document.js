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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' });
  }

  const { content } = req.body || {};
  if (!content) {
    return res.status(400).json({ error: 'Missing content' });
  }

  try {
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
      return res.status(response.status).json({ error: `Claude API error: ${errBody}` });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      return res.status(500).json({ error: 'Claude returned no JSON array' });
    }

    const items = JSON.parse(match[0]);
    const parsed = items
      .filter((i) => i.name && String(i.name).trim())
      .map((i) => ({
        name: String(i.name ?? '').trim(),
        manufacturer_ref: String(i.manufacturer_ref ?? '').trim(),
        unit: String(i.unit ?? 'buc').trim() || 'buc',
        quantity: Number(i.quantity) || 1,
      }));

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}