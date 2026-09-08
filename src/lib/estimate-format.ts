import type { EstimateFileV1, InvoiceItem, Settings } from './types';
import { formatCurrency, formatQuantity } from './format';
import { createEstimateLayout } from './estimate-layout';

export class EstimateFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EstimateFileError';
  }
}

export const ESTIMATE_FORMAT_VERSION = 1 as const;
const SCRIPT_ID = 'estimate-data';

const esc = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const safeJson = (value: string) => value
  .replaceAll('<', '\\u003c')
  .replaceAll('>', '\\u003e')
  .replaceAll('&', '\\u0026')
  .replaceAll('</script', '<\\/script')
  .replaceAll('<!--', '<\\!--');

const validItem = (value: unknown): value is InvoiceItem => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string'
    && typeof item.name === 'string'
    && typeof item.description === 'string'
    && typeof item.quantity === 'number'
    && Number.isFinite(item.quantity)
    && item.quantity > 0
    && typeof item.priceKopecks === 'number'
    && Number.isInteger(item.priceKopecks)
    && item.priceKopecks >= 0
    && typeof item.unit === 'string'
    && (item.type === 'service' || item.type === 'product')
    && typeof item.categoryId === 'string'
    && (item.catalogId === undefined || typeof item.catalogId === 'string');
};

const parse = (raw: unknown): EstimateFileV1 => {
  if (!raw || typeof raw !== 'object') throw new EstimateFileError('Неверный формат файла.');
  const data = raw as Record<string, unknown>;
  if (data.version !== 1 || data.app !== 'santeh-schet') {
    throw new EstimateFileError(`Неподдерживаемая версия файла: ${String(data.version ?? 'неизвестно')}`);
  }
  if (!Array.isArray(data.items) || !data.items.every(validItem)) {
    throw new EstimateFileError('Список позиций сметы повреждён.');
  }
  const sourceSettings = data.settings as Record<string, unknown> | null;
  if (!sourceSettings || typeof sourceSettings.address !== 'string') {
    throw new EstimateFileError('Настройки сметы повреждены.');
  }
  const discount = typeof sourceSettings.discount === 'number'
    ? sourceSettings.discount
    : typeof sourceSettings.discountPercent === 'number'
      ? sourceSettings.discountPercent
      : 0;
  const settings = {
    address: sourceSettings.address,
    discount: Math.max(0, Math.min(50, discount)),
    discountPercent: Math.max(0, Math.min(50, discount)),
  };
  return {
    version: 1,
    app: 'santeh-schet',
    name: typeof data.name === 'string' && data.name ? data.name : 'Импортированная смета',
    items: data.items as InvoiceItem[],
    settings,
    savedAt: typeof data.savedAt === 'number' ? data.savedAt : Date.now(),
  };
};

const money = (value: number) => formatCurrency(value).replace(/\u00a0/g, ' ');

const htmlStyles = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; color: #23272b; }
body { font-family: Roboto, Arial, sans-serif; font-size: 8pt; }
.estimate-page { width: 595.28px; min-height: 841.89px; margin: 0 auto; padding: 34px; background: #fff; }
.header-line { height: 2px; background: #2388c9; width: 100%; }
.document-title { margin-top: 15px; margin-bottom: 13px; height: 13px; display: flex; align-items: flex-start; gap: 18px; white-space: nowrap; overflow: hidden; }
.document-number { font-size: 10pt; line-height: 10pt; }
.document-object { font-size: 8pt; line-height: 10pt; color: #697078; overflow: hidden; text-overflow: ellipsis; }
.section { margin: 0; }
.section-top-line { height: 1px; background: #2388c9; width: 100%; }
.table-header { display: grid; grid-template-columns: 346px 55px 65px 61.28px; height: 33px; align-items: start; padding-top: 13px; color: #697078; font-size: 8pt; line-height: 8pt; }
.table-header > :not(:first-child) { text-align: center; }
.row { display: grid; grid-template-columns: 346px 55px 65px 61.28px; min-height: 30px; align-items: center; border-bottom: 0.5px solid #d8dce0; }
.row-name { grid-column: 1; padding: 7px 12px 7px 0; font-size: 9pt; line-height: 11pt; }
.row-description { margin-top: -1px; color: #697078; font-size: 7pt; line-height: 9pt; }
.row-values { grid-column: 2 / 5; display: grid; grid-template-columns: 55px 65px 61.28px; align-items: center; font-size: 8pt; line-height: 8pt; text-align: center; }
.row-values > div { text-align: center; }
.summary { margin-top: 18px; margin-left: 326px; width: 235.28px; }
.summary-top-line { height: 1.5px; background: #2388c9; width: 100%; margin-bottom: 15px; }
.summary-row { display: flex; justify-content: space-between; align-items: baseline; min-height: 13px; color: #697078; font-size: 8pt; line-height: 8pt; }
.summary-row + .summary-row { margin-top: 5px; }
.summary-divider { height: 0.7px; background: #d8dce0; margin-top: 4px; margin-bottom: 11px; }
.grand-total { display: flex; justify-content: space-between; align-items: baseline; color: #2388c9; }
.grand-total-label { font-size: 10pt; line-height: 10pt; }
.grand-total-value { font-size: 13pt; line-height: 13pt; }
@media print {
  body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .estimate-page { margin: 0; }
}
@media screen {
  body { padding: 24px; }
  .estimate-page { box-shadow: 0 4px 24px rgba(0,0,0,.12); }
}
`;

const itemHtml = (item: InvoiceItem) => {
  const name = esc(item.name);
  const description = item.description ? `<div class="row-description">${esc(item.description)}</div>` : '';
  const qty = esc(`${formatQuantity(item.quantity)} ${item.unit}`);
  const price = esc(money(item.priceKopecks));
  const total = esc(money(Math.round(item.priceKopecks * item.quantity)));
  return `<div class="row"><div class="row-name">${name}${description}</div><div class="row-values"><div>${qty}</div><div>${price}</div><div>${total}</div></div></div>`;
};

const renderSection = (title: string, items: InvoiceItem[]) => {
  if (!items.length) return '';
  const rows = items.map(itemHtml).join('');
  return `<section class="section"><div class="section-top-line"></div><div class="table-header"><div>${esc(title)}</div><div>Кол.</div><div>Цена</div><div>Сумма</div></div>${rows}</section>`;
};

export const serializeEstimate = (items: InvoiceItem[], settings: Settings, name: string) => {
  const data: EstimateFileV1 = {
    version: 1,
    app: 'santeh-schet',
    name,
    items,
    settings,
    savedAt: Date.now(),
  };
  const layout = createEstimateLayout(items, settings);
  const objectHtml = layout.address ? `<span class="document-object">Объект: ${esc(layout.address)}</span>` : '';
  const sectionsHtml = layout.sections.map((section) => renderSection(section.title, section.items)).join('');
  const summaryLines = layout.showSectionSummary
    ? `<div class="summary-row"><span>Работы:</span><span>${esc(money(layout.totals.servicesKopecks))}</span></div><div class="summary-row"><span>Материалы:</span><span>${esc(money(layout.totals.productsKopecks))}</span></div>`
    : '';
  const discountHtml = layout.totals.discountKopecks > 0
    ? `<div class="summary-row"><span>Скидка ${esc(String(layout.discountPercent))}%:</span><span>−${esc(money(layout.totals.discountKopecks))}</span></div>`
    : '';
  const siteFontUrl = typeof window !== 'undefined'
    ? new URL(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/fonts/roboto-all-400-normal.woff`, window.location.origin).href
    : `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/fonts/roboto-all-400-normal.woff`;

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Смета ${esc(layout.number)}</title><style>@font-face{font-family:Roboto;src:url('${siteFontUrl}') format('woff');font-weight:400;font-style:normal;} ${htmlStyles}</style></head><body><main class="estimate-page"><div class="header-line"></div><div class="document-title"><span class="document-number">СЧЕТ №${esc(layout.number)}</span>${objectHtml}</div>${sectionsHtml}<div class="summary"><div class="summary-top-line"></div>${summaryLines}${discountHtml}<div class="summary-divider"></div><div class="grand-total"><span class="grand-total-label">ИТОГО К ОПЛАТЕ:</span><span class="grand-total-value">${esc(money(layout.totals.grandTotalKopecks))}</span></div></div><script type="application/json" id="${SCRIPT_ID}">${safeJson(JSON.stringify(data))}</script></main></body></html>`;
};

export const saveEstimateToFile = (items: InvoiceItem[], settings: Settings, customName?: string) => {
  if (!items.length || typeof window === 'undefined') return null;
  const name = customName?.trim() || settings.address.trim() || `Смета от ${new Date().toLocaleDateString('ru-RU')}`;
  const fileName = `Smeta_${name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, '_').slice(0, 60) || 'Smeta'}_${new Date().toISOString().slice(0, 10)}.html`;
  const html = serializeEstimate(items, settings, name);
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
};

export const loadEstimateFromFile = async (file: File) => {
  if (!file) throw new EstimateFileError('Файл не выбран');
  if (file.size > 5 * 1024 * 1024) throw new EstimateFileError('Файл слишком большой (макс. 5 МБ).');
  const text = await file.text();
  const match = text.match(new RegExp(`<script[^>]*id=["']${SCRIPT_ID}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'i'));
  if (!match?.[1]) throw new EstimateFileError('В файле нет данных сметы.');
  try {
    return parse(JSON.parse(match[1].replaceAll('<\\/script', '</script').replaceAll('<\\!--', '<!--')));
  } catch (error) {
    if (error instanceof EstimateFileError) throw error;
    throw new EstimateFileError('Не удалось разобрать данные сметы.');
  }
};
