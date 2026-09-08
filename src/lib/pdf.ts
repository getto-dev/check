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

function centeredTextX(font: { widthOfTextAtSize: (text: string, size: number) => number }, value: string, size: number, left: number, right: number) {
  return left + (right - left - font.widthOfTextAtSize(value, size)) / 2;
}

function rightTextX(font: { widthOfTextAtSize: (text: string, size: number) => number }, value: string, size: number, right: number) {
  return right - font.widthOfTextAtSize(value, size);
}

export async function exportToPdf(items: InvoiceItem[], settings: Settings) {
  if (typeof window === 'undefined' || !items.length) return;

  const fontBytes = await loadFont();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });
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
    ensureSpace(86);
    text(title, MARGIN_X, y, 10, BLUE);
    y -= 14;

    const xName = MARGIN_X;
    const nameRight = 380;
    const qtyLeft = 380;
    const qtyRight = 435;
    const priceLeft = 435;
    const priceRight = 500;
    const totalLeft = 500;
    const totalRight = PAGE_WIDTH - MARGIN_X;
    const right = PAGE_WIDTH - MARGIN_X;

    page.drawLine({ start: { x: MARGIN_X, y: y - 3 }, end: { x: right, y: y - 3 }, thickness: 1, color: BLUE });
    text('Наименование', xName, y - 17, 8, MUTED);
    text('Кол.', centeredTextX(font, 'Кол.', 8, qtyLeft, qtyRight), y - 17, 8, MUTED);
    text('Цена', centeredTextX(font, 'Цена', 8, priceLeft, priceRight), y - 17, 8, MUTED);
    text('Сумма', centeredTextX(font, 'Сумма', 8, totalLeft, totalRight), y - 17, 8, MUTED);
    y -= 31;

    for (const item of rows) {
      const nameSize = 9;
      const descriptionSize = 7;
      const nameLines = wrapText(item.name, font, nameSize, nameRight - xName - 12);
      const descLines = item.description ? wrapText(item.description, font, descriptionSize, nameRight - xName - 12) : [];
      const nameLineHeight = 11;
      const descLineHeight = 9;
      const contentHeight = nameLines.length * nameLineHeight + descLines.length * descLineHeight;
      const rowHeight = Math.max(28, contentHeight + 12);
      ensureSpace(rowHeight + 6);

      const blockHeight = contentHeight;
      const blockTopY = y + (rowHeight - 6 - blockHeight) / 2;
      nameLines.forEach((line, index) => text(line, xName, blockTopY - index * nameLineHeight, nameSize));
      const descStartY = blockTopY - nameLines.length * nameLineHeight - 1;
      descLines.forEach((line, index) => text(line, xName, descStartY - index * descLineHeight, descriptionSize, MUTED));

      const qty = `${formatQuantity(item.quantity)} ${item.unit}`;
      const price = money(item.priceKopecks);
      const total = money(Math.round(item.priceKopecks * item.quantity));
      const valueY = y - (rowHeight - 6) / 2 + 3;
      text(qty, centeredTextX(font, qty, 8, qtyLeft, qtyRight), valueY, 8);
      text(price, centeredTextX(font, price, 8, priceLeft, priceRight), valueY, 8);
      text(total, centeredTextX(font, total, 8, totalLeft, totalRight), valueY, 8);

      const lineY = y - rowHeight + 6;
      page.drawLine({ start: { x: MARGIN_X, y: lineY }, end: { x: right, y: lineY }, thickness: 0.5, color: BORDER });
      y -= rowHeight;
    }
  };

  const headerY = y;
  page.drawLine({ start: { x: MARGIN_X, y: headerY }, end: { x: PAGE_WIDTH - MARGIN_X, y: headerY }, thickness: 2, color: BLUE });
  y -= 17;

  const title = `СЧЕТ №${number}`;
  text(title, MARGIN_X, y, 10, TEXT);
  if (settings.address.trim()) {
    const prefix = 'Объект: ';
    const address = settings.address.trim();
    const objectSize = 8;
    const availableWidth = PAGE_WIDTH - MARGIN_X * 2 - font.widthOfTextAtSize(title, 10) - 18;
    const fullObject = `${prefix}${address}`;
    const objectLines = wrapText(fullObject, font, objectSize, Math.max(120, availableWidth));
    const firstLine = objectLines.join(' ');
    const visibleObject = font.widthOfTextAtSize(firstLine, objectSize) <= availableWidth
      ? firstLine
      : `${prefix}${address.slice(0, Math.max(1, Math.floor(address.length * 0.72)))}…`;
    const titleWidth = font.widthOfTextAtSize(title, 10);
    text(visibleObject, MARGIN_X + titleWidth + 18, y + 1, objectSize, MUTED);
  }
  y -= 22;

  drawTable('РАБОТЫ И УСЛУГИ', services);
  drawTable('МАТЕРИАЛЫ И ТОВАРЫ', products);

  ensureSpace(65);
  y -= 10;
  const summaryLeft = 360;
  const summaryRight = PAGE_WIDTH - MARGIN_X;
  page.drawLine({ start: { x: summaryLeft, y }, end: { x: summaryRight, y }, thickness: 1.5, color: BLUE });
  y -= 15;

  if (services.length) {
    text('Работы:', summaryLeft, y, 8, MUTED);
    const serviceValue = money(totals.servicesKopecks);
    text(serviceValue, rightTextX(font, serviceValue, 8, summaryRight), y, 8);
    y -= 13;
  }

  if (products.length) {
    text('Материалы:', summaryLeft, y, 8, MUTED);
    const productValue = money(totals.productsKopecks);
    text(productValue, rightTextX(font, productValue, 8, summaryRight), y, 8);
    y -= 13;
  }

  if (totals.discountKopecks > 0) {
    text(`Скидка ${settings.discount}%:`, summaryLeft, y, 8, MUTED);
    const discountValue = `−${money(totals.discountKopecks)}`;
    text(discountValue, rightTextX(font, discountValue, 8, summaryRight), y, 8);
    y -= 15;
  } else {
    y -= 2;
  }

  page.drawLine({ start: { x: summaryLeft, y: y + 3 }, end: { x: summaryRight, y: y + 3 }, thickness: 0.7, color: BORDER });
  y -= 11;
  text('ИТОГО К ОПЛАТЕ:', summaryLeft, y, 10, BLUE);
  const grand = money(totals.grandTotalKopecks);
  text(grand, rightTextX(font, grand, 13, summaryRight), y - 1, 13, BLUE);

  const bytes = await pdf.save();
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
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
