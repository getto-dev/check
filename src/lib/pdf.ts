'use client';

import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { InvoiceItem, Settings } from './types';
import { calculateTotals, formatCurrency, formatQuantity } from './format';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 34;
const TOP = 34;
const BLUE = rgb(35 / 255, 136 / 255, 201 / 255);
const TEXT = rgb(35 / 255, 39 / 255, 43 / 255);
const MUTED = rgb(105 / 255, 112 / 255, 120 / 255);
const BORDER = rgb(216 / 255, 220 / 255, 224 / 255);
const FONT_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/fonts/roboto-all-400-normal.woff`;

let cachedFontPromise: Promise<Uint8Array> | null = null;

function loadFont(): Promise<Uint8Array> {
  if (!cachedFontPromise) {
    cachedFontPromise = fetch(FONT_URL, { cache: 'force-cache' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Font request failed: ${response.status}`);
        return new Uint8Array(await response.arrayBuffer());
      })
      .catch((error) => {
        cachedFontPromise = null;
        throw error;
      });
  }
  return cachedFontPromise;
}

function wrapText(text: string, font: { widthOfTextAtSize: (text: string, size: number) => number }, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (!line || font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines;
}

function money(value: number) {
  return formatCurrency(value).replace(/\u00a0/g, ' ');
}

export async function exportToPdf(items: InvoiceItem[], settings: Settings) {
  if (typeof window === 'undefined' || !items.length) return;

  const [fontBytes] = await Promise.all([loadFont()]);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const bold = font;
  const totals = calculateTotals(items, settings.discount);
  const services = items.filter((item) => item.type === 'service');
  const products = items.filter((item) => item.type === 'product');
  const now = new Date();
  const number = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-01`;

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - TOP;

  const text = (value: string, x: number, yy: number, size: number, color = TEXT) => {
    page.drawText(value, { x, y: yy, size, font, color });
  };

  const ensureSpace = (height: number) => {
    if (y - height < 38) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - TOP;
    }
  };

  const drawTable = (title: string, rows: InvoiceItem[]) => {
    if (!rows.length) return;
    ensureSpace(100);
    text(title, MARGIN_X, y, 11, BLUE);
    y -= 17;

    const xName = MARGIN_X;
    const xQty = 390;
    const xPrice = 456;
    const xTotal = 526;
    const right = PAGE_WIDTH - MARGIN_X;
    const tableTop = y + 5;
    page.drawLine({ start: { x: MARGIN_X, y: y - 4 }, end: { x: right, y: y - 4 }, thickness: 1, color: BLUE });
    text('Наименование', xName, y - 19, 8, MUTED);
    text('Кол.', xQty, y - 19, 8, MUTED);
    text('Цена', xPrice, y - 19, 8, MUTED);
    text('Всего', xTotal, y - 19, 8, MUTED);
    y -= 34;

    for (const item of rows) {
      const nameSize = 9;
      const descriptionSize = 7;
      const nameLines = wrapText(item.name, font, nameSize, xQty - xName - 14);
      const descLines = item.description ? wrapText(item.description, font, descriptionSize, xQty - xName - 14) : [];
      const lineHeight = 12;
      const rowHeight = Math.max(29, (nameLines.length + descLines.length) * lineHeight + 10);
      ensureSpace(rowHeight + 8);

      nameLines.forEach((line, index) => text(line, xName, y - index * lineHeight, nameSize));
      descLines.forEach((line, index) => text(line, xName, y - (nameLines.length + index) * 10 - 2, descriptionSize, MUTED));
      const qty = `${formatQuantity(item.quantity)} ${item.unit}`;
      const qtyX = xQty + 30 - font.widthOfTextAtSize(qty, 8) / 2;
      text(qty, qtyX, y, 8);
      const price = money(item.priceKopecks);
      const total = money(Math.round(item.priceKopecks * item.quantity));
      text(price, xPrice, y, 8);
      text(total, xTotal, y, 8);
      page.drawLine({ start: { x: MARGIN_X, y: y - rowHeight + 8 }, end: { x: right, y: y - rowHeight + 8 }, thickness: 0.5, color: BORDER });
      y -= rowHeight;
    }

    const subtotal = rows.reduce((sum, item) => sum + Math.round(item.priceKopecks * item.quantity), 0);
    ensureSpace(24);
    const label = title === 'РАБОТЫ И УСЛУГИ' ? 'Итого за услуги' : 'Итого за материалы';
    const value = money(subtotal);
    text(label, xPrice - 48, y - 2, 8, MUTED);
    text(value, xTotal, y - 2, 8);
    y -= 23;
    void tableTop;
  };

  page.drawLine({ start: { x: MARGIN_X, y }, end: { x: PAGE_WIDTH - MARGIN_X, y }, thickness: 3, color: BLUE });
  y -= 25;
  text(`СЧЕТ №${number}`, MARGIN_X, y, 20);
  y -= 19;
  text('СантехСчёт', MARGIN_X, y, 9, MUTED);
  const objectLabel = 'ОБЪЕКТ:';
  text(objectLabel, 365, y, 8, MUTED);
  const object = settings.address || 'объект не указан';
  const objectLines = wrapText(object, font, 8, PAGE_WIDTH - MARGIN_X - 365);
  objectLines.slice(0, 3).forEach((line, index) => text(line, 416, y - index * 10, 8));
  y -= Math.max(30, objectLines.slice(0, 3).length * 10 + 13);

  drawTable('РАБОТЫ И УСЛУГИ', services);
  drawTable('МАТЕРИАЛЫ И ТОВАРЫ', products);

  ensureSpace(80);
  y -= 9;
  page.drawLine({ start: { x: 360, y }, end: { x: PAGE_WIDTH - MARGIN_X, y }, thickness: 2, color: BLUE });
  y -= 19;
  text('Работы', 360, y, 9, MUTED);
  text(money(totals.servicesKopecks), 470, y, 9);
  y -= 15;
  text('Материалы', 360, y, 9, MUTED);
  text(money(totals.productsKopecks), 470, y, 9);
  if (totals.discountKopecks > 0) {
    y -= 15;
    text(`Скидка ${settings.discount}%`, 360, y, 9, MUTED);
    text(`−${money(totals.discountKopecks)}`, 470, y, 9);
  }
  y -= 24;
  text('ИТОГО К ОПЛАТЕ:', 360, y, 11, BLUE);
  const grand = money(totals.grandTotalKopecks);
  text(grand, PAGE_WIDTH - MARGIN_X - font.widthOfTextAtSize(grand, 14), y - 1, 14, BLUE);

  const bytes = await pdf.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const filename = `Smeta_${number}.pdf`;
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.target = '_blank';
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
