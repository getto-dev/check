import { InvoiceItem, Settings, CompressedItem } from './types';
import { formatCurrency, formatQuantity, calculateTotals } from './format';

/**
 * On-disk estimate file format.
 *
 * We store the estimate as a self-contained HTML file:
 *   1. A human-readable rendering of the estimate (visible in any browser)
 *   2. An embedded JSON blob inside <script type="application/json" id="estimate-data">
 *      that the app parses to restore the editable estimate.
 *
 * The HTML wrapper makes the file feel "real" to users — they can preview it,
 * email it, print it — and only our app knows how to extract the editable data.
 */

const FILE_FORMAT_VERSION = 1;
const DATA_SCRIPT_ID = 'estimate-data';

export interface EstimateFileData {
  version: number;
  app: string;
  name: string;
  items: CompressedItem[];
  settings: Settings;
  savedAt: number;
}

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeJsonForScript = (json: string): string =>
  json
    .replace(/<\//g, '<\\/')
    .replace(/<!--/g, '<\\!--');

const compressItems = (items: InvoiceItem[]): CompressedItem[] =>
  items.map((i) => ({
    i: i.catalogId ?? String(i.id),
    n: i.name,
    d: i.description,
    q: i.quantity,
    p: i.price,
    u: i.unit,
    t: i.type,
    c: i.category,
    a: i.amount,
  }));

const decompressItems = (data: CompressedItem[]): InvoiceItem[] =>
  data.map((i, index) => ({
    id: parseInt(i.i) || Date.now() + index,
    catalogId: i.i,
    name: i.n,
    description: i.d ?? '',
    quantity: i.q ?? 1,
    price: i.p ?? 0,
    unit: i.u ?? 'шт',
    type: i.t ?? 'service',
    category: i.c ?? '',
    amount: i.a ?? (i.q ?? 1) * (i.p ?? 0),
  }));

const sanitizeFileName = (name: string): string =>
  name
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 60) || 'Smeta';

const buildDateStamp = (): string => {
  const d = new Date();
  return `${d.getFullYear().toString().slice(-2)}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
};

const buildReadableHtml = (items: InvoiceItem[], settings: Settings, name: string, savedAt: number): string => {
  const services = items.filter((i) => i.type === 'service');
  const products = items.filter((i) => i.type === 'product');
  const totals = calculateTotals(items, settings.discount);

  const renderRows = (list: InvoiceItem[]): string =>
    list
      .map(
        (item, idx) => `
      <tr>
        <td class="num">${idx + 1}</td>
        <td class="name">
          <div class="name-title">${escapeHtml(item.name)}</div>
          ${item.description ? `<div class="name-desc">${escapeHtml(item.description)}</div>` : ''}
        </td>
        <td class="qty">${escapeHtml(formatQuantity(item.quantity))} ${escapeHtml(item.unit)}</td>
        <td class="price">${escapeHtml(formatCurrency(item.price))}</td>
        <td class="total">${escapeHtml(formatCurrency(item.amount))}</td>
      </tr>`
      )
      .join('');

  const renderSection = (list: InvoiceItem[], title: string): string =>
    list.length === 0
      ? ''
      : `
    <section>
      <h2>${escapeHtml(title)}</h2>
      <table>
        <thead>
          <tr>
            <th class="num">№</th>
            <th class="name">Наименование</th>
            <th class="qty">Кол-во</th>
            <th class="price">Цена</th>
            <th class="total">Сумма</th>
          </tr>
        </thead>
        <tbody>
          ${renderRows(list)}
        </tbody>
      </table>
      <div class="subtotal">Итого за ${escapeHtml(title.toLowerCase())}: ${escapeHtml(formatCurrency(list.reduce((s, i) => s + i.amount, 0)))}</div>
    </section>`;

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Смета — ${escapeHtml(name)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 24px 16px 48px;
      color: #1a1a1a;
      background: #fff;
      line-height: 1.5;
    }
    header { border-bottom: 2px solid #8b5cf6; padding-bottom: 12px; margin-bottom: 24px; }
    h1 { font-size: 22px; margin: 0 0 6px; color: #1a1a1a; }
    section { margin-bottom: 28px; }
    h2 {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #8b5cf6;
      margin: 0 0 10px;
    }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 8px 10px; text-align: left; vertical-align: top; }
    thead th {
      border-bottom: 2px solid #1a1a1a;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1a1a1a;
    }
    tbody tr { border-bottom: 1px solid #eee; }
    tbody tr:last-child { border-bottom: none; }
    td.num { color: #999; width: 32px; text-align: right; font-variant-numeric: tabular-nums; }
    td.qty, td.price, td.total { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    td.total { font-weight: 700; }
    .name-title { font-weight: 700; }
    .name-desc { font-size: 12px; color: #666; margin-top: 2px; }
    .subtotal {
      margin-top: 8px;
      text-align: right;
      font-size: 13px;
      font-weight: 700;
      background: #f5f5f5;
      padding: 6px 10px;
      border-radius: 4px;
    }
    .totals {
      margin-top: 24px;
      padding: 16px 20px;
      background: #faf5ff;
      border-radius: 12px;
      border: 2px solid #8b5cf6;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 14px;
    }
    .totals-row.grand {
      margin-top: 8px;
      padding-top: 12px;
      border-top: 1px solid #8b5cf6;
      font-size: 18px;
      font-weight: 800;
    }
    .totals-row.discount { color: #dc2626; }
    .totals-row .label { color: #666; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; }
    .totals-row.grand .label { color: #1a1a1a; font-size: 14px; }
  </style>
</head>
<body>
  ${renderSection(services, 'Работы и услуги')}
  ${renderSection(products, 'Материалы и товары')}

  <div class="totals">
    <div class="totals-row"><span class="label">Работы и услуги</span><span>${escapeHtml(formatCurrency(totals.subtotalServices))}</span></div>
    <div class="totals-row"><span class="label">Материалы</span><span>${escapeHtml(formatCurrency(totals.subtotalProducts))}</span></div>
    ${settings.discount > 0 ? `<div class="totals-row discount"><span class="label">Скидка ${settings.discount}%</span><span>−${escapeHtml(formatCurrency(totals.discountAmount))}</span></div>` : ''}
    <div class="totals-row grand"><span class="label">Итого к оплате</span><span>${escapeHtml(formatCurrency(totals.grandTotal))}</span></div>
  </div>

  <script type="application/json" id="${DATA_SCRIPT_ID}">
${escapeJsonForScript(JSON.stringify({
  version: FILE_FORMAT_VERSION,
  app: 'santech-schyet',
  name,
  items: compressItems(items),
  settings,
  savedAt,
}, null, 2))}
  </script>
</body>
</html>`;
};

/**
 * Save the current estimate as a self-contained HTML file on the user's device.
 * The HTML is human-readable AND contains an embedded JSON blob the app can
 * re-import to restore the editable estimate.
 */
export const saveEstimateToFile = (
  items: InvoiceItem[],
  settings: Settings,
  customName?: string
): { filename: string; name: string } | null => {
  if (items.length === 0) return null;

  const name = (customName ?? '').trim() || settings.address.trim() || `Смета от ${new Date().toLocaleDateString('ru-RU')}`;
  const savedAt = Date.now();
  const html = buildReadableHtml(items, settings, name, savedAt);

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const filename = `Smeta_${sanitizeFileName(name)}_${buildDateStamp()}.html`;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Defer revocation slightly so the browser can read the blob during download
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { filename, name };
};

export interface LoadedEstimate {
  name: string;
  items: InvoiceItem[];
  settings: Settings;
  savedAt: number;
}

export class EstimateFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EstimateFileError';
  }
}

/**
 * Read an estimate from an HTML file previously produced by `saveEstimateToFile`.
 * Throws EstimateFileError on malformed input so the UI can show a friendly toast.
 */
export const loadEstimateFromFile = async (file: File): Promise<LoadedEstimate> => {
  if (!file) throw new EstimateFileError('Файл не выбран');
  if (file.size > 5 * 1024 * 1024) throw new EstimateFileError('Файл слишком большой (макс 5 МБ)');

  const text = await file.text();

  // Extract the embedded JSON from <script id="estimate-data">...</script>
  // We use a regex because DOMParser may strip <script> contents in some browsers
  // when parsing with text/html, and a regex is simpler & reliable here.
  const scriptMatch = text.match(
    new RegExp(
      `<script[^>]*id=["']${DATA_SCRIPT_ID}["'][^>]*>([\\s\\S]*?)<\\/script>`,
      'i'
    )
  );

  if (!scriptMatch || !scriptMatch[1]) {
    throw new EstimateFileError(
      'В файле нет данных сметы. Убедитесь, что это файл, сохранённый приложением СантехСчёт.'
    );
  }

  let data: EstimateFileData;
  try {
    // Reverse the </ -> <\/ escaping we applied when writing
    const jsonText = scriptMatch[1].replace(/<\\\//g, '</').replace(/<\\!--/g, '<!--').trim();
    data = JSON.parse(jsonText);
  } catch (e) {
    throw new EstimateFileError('Не удалось разобрать данные сметы (повреждённый JSON).');
  }

  if (!data || typeof data !== 'object') {
    throw new EstimateFileError('Неверная структура файла сметы.');
  }
  if (!Array.isArray(data.items)) {
    throw new EstimateFileError('В файле нет списка позиций сметы.');
  }
  if (!data.settings || typeof data.settings !== 'object') {
    data.settings = { address: '', discount: 0 };
  }

  return {
    name: typeof data.name === 'string' && data.name ? data.name : 'Импортированная смета',
    items: decompressItems(data.items),
    settings: {
      address: typeof data.settings.address === 'string' ? data.settings.address : '',
      discount: typeof data.settings.discount === 'number' ? data.settings.discount : 0,
    },
    savedAt: typeof data.savedAt === 'number' ? data.savedAt : Date.now(),
  };
};
