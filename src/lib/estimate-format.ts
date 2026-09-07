import type { EstimateFileV1, InvoiceItem, Settings } from './types';

export class EstimateFileError extends Error {
  constructor(message: string) { super(message); this.name = 'EstimateFileError'; }
}

export const ESTIMATE_FORMAT_VERSION = 1 as const;
const SCRIPT_ID = 'estimate-data';

const escapeHtml = (value: string): string => value
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const escapeJsonForScript = (json: string): string =>
  json.replaceAll('<\/script', '<\\/script').replaceAll('<!--', '<\\!--');

const validateItem = (value: unknown): value is EstimateFileV1['items'][number] => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.name === 'string' &&
    typeof item.description === 'string' && typeof item.quantity === 'number' && Number.isFinite(item.quantity) &&
    typeof item.priceKopecks === 'number' && Number.isFinite(item.priceKopecks) && item.priceKopecks >= 0 &&
    typeof item.unit === 'string' && (item.type === 'service' || item.type === 'product') &&
    typeof item.categoryId === 'string' && (item.catalogId === undefined || typeof item.catalogId === 'string');
};

const parseEstimateData = (raw: unknown): EstimateFileV1 => {
  if (!raw || typeof raw !== 'object') throw new EstimateFileError('Неверный формат файла.');
  const data = raw as Record<string, unknown>;
  if (data.version !== 1 || data.app !== 'santeh-schet') {
    throw new EstimateFileError(`Неподдерживаемая версия файла: ${String(data.version ?? 'неизвестно')}`);
  }
  if (!Array.isArray(data.items) || !data.items.every(validateItem)) {
    throw new EstimateFileError('Список позиций сметы повреждён.');
  }
  const settings = data.settings as Record<string, unknown> | null;
  if (!settings || typeof settings.address !== 'string' || typeof settings.discountPercent !== 'number') {
    throw new EstimateFileError('Настройки сметы повреждены.');
  }
  const discountPercent = Math.min(100, Math.max(0, settings.discountPercent));
  return {
    version: 1,
    app: 'santeh-schet',
    name: typeof data.name === 'string' && data.name ? data.name : 'Импортированная смета',
    items: data.items,
    settings: { address: settings.address, discountPercent },
    savedAt: typeof data.savedAt === 'number' ? data.savedAt : Date.now(),
  };
};

export const serializeEstimate = (items: InvoiceItem[], settings: Settings, name: string): string => {
  const data: EstimateFileV1 = {
    version: ESTIMATE_FORMAT_VERSION,
    app: 'santeh-schet',
    name,
    items: items.map(({ id, catalogId, name: itemName, description, quantity, priceKopecks, unit, type, categoryId }) => ({
      id, catalogId, name: itemName, description, quantity, priceKopecks, unit, type, categoryId,
    })),
    settings,
    savedAt: Date.now(),
  };
  const readableRows = items.map((item, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(String(item.quantity))} ${escapeHtml(item.unit)}</td><td>${escapeHtml((item.priceKopecks / 100).toFixed(2))} ₽</td></tr>`).join('');
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${escapeHtml(name)}</title><style>body{font:14px system-ui;max-width:900px;margin:40px auto;padding:0 16px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left}</style></head><body><h1>${escapeHtml(name)}</h1><p>${escapeHtml(settings.address)}</p><table><thead><tr><th>№</th><th>Наименование</th><th>Кол-во</th><th>Цена</th></tr></thead><tbody>${readableRows}</tbody></table><script type="application/json" id="${SCRIPT_ID}">${escapeJsonForScript(JSON.stringify(data))}</script></body></html>`;
};

export const saveEstimateToFile = (items: InvoiceItem[], settings: Settings, customName?: string): string | null => {
  if (!items.length || typeof window === 'undefined') return null;
  const name = customName?.trim() || settings.address.trim() || `Смета от ${new Date().toLocaleDateString('ru-RU')}`;
  const safeName = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, '_').slice(0, 60) || 'Smeta';
  const html = serializeEstimate(items, settings, name);
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Smeta_${safeName}_${new Date().toISOString().slice(0, 10)}.html`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return anchor.download;
};

export const loadEstimateFromFile = async (file: File): Promise<EstimateFileV1> => {
  if (file.size > 5 * 1024 * 1024) throw new EstimateFileError('Файл слишком большой (макс. 5 МБ).');
  const text = await file.text();
  const match = text.match(new RegExp(`<script[^>]*id=["']${SCRIPT_ID}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'i'));
  if (!match?.[1]) throw new EstimateFileError('В файле нет данных сметы.');
  try {
    const json = match[1].replaceAll('<\\/script', '</script').replaceAll('<\\!--', '<!--');
    return parseEstimateData(JSON.parse(json));
  } catch (error) {
    if (error instanceof EstimateFileError) throw error;
    throw new EstimateFileError('Не удалось разобрать данные сметы.');
  }
};
