'use client';

import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { InvoiceItem, Settings } from './types';
import { formatCurrency, formatQuantity } from './format';
import { createEstimateLayout } from './estimate-layout';

const { pageWidth: PAGE_WIDTH, pageHeight: PAGE_HEIGHT, marginX: MARGIN_X, top: TOP, nameRight: NAME_RIGHT, quantityLeft: QTY_LEFT, quantityRight: QTY_RIGHT, priceLeft: PRICE_LEFT, priceRight: PRICE_RIGHT, totalLeft: TOTAL_LEFT, summaryLeft: SUMMARY_LEFT, text: TEXT_SIZES, row: ROW } = {
  ...createEstimateLayout([], { address: '', discountPercent: 0 }).constants,
};
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

  const layout = createEstimateLayout(items, settings);
  const fontBytes = await loadFont();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });

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

  const drawTable = (rows: InvoiceItem[]) => {
    if (!rows.length) return;
    ensureSpace(72);

    const xName = MARGIN_X;
    const right = PAGE_WIDTH - MARGIN_X;
    const headerLabel = layout.sections.find((section) => section.items === rows)?.title ?? '';

    page.drawLine({ start: { x: MARGIN_X, y: y - 4 }, end: { x: right, y: y - 4 }, thickness: 1, color: BLUE });
    const headerY = y - 18;
    text(headerLabel, xName, headerY, TEXT_SIZES.section, MUTED);
    text('Кол.', centeredTextX(font, 'Кол.', TEXT_SIZES.section, QTY_LEFT, QTY_RIGHT), headerY, TEXT_SIZES.section, MUTED);
    text('Цена', centeredTextX(font, 'Цена', TEXT_SIZES.section, PRICE_LEFT, PRICE_RIGHT), headerY, TEXT_SIZES.section, MUTED);
    text('Сумма', centeredTextX(font, 'Сумма', TEXT_SIZES.section, TOTAL_LEFT, right), headerY, TEXT_SIZES.section, MUTED);
    y -= 34;

    for (const item of rows) {
      const nameLines = wrapText(item.name, font, TEXT_SIZES.name, NAME_RIGHT - xName - 12);
      const descLines = item.description ? wrapText(item.description, font, TEXT_SIZES.description, NAME_RIGHT - xName - 12) : [];
      const contentHeight = nameLines.length * ROW.nameLineHeight + descLines.length * ROW.descriptionLineHeight;
      const rowHeight = Math.max(ROW.minHeight, contentHeight + 14);
      ensureSpace(rowHeight + 8);

      const blockTopY = y - 1 - (rowHeight - 8 - contentHeight) / 2;
      nameLines.forEach((line, index) => text(line, xName, blockTopY - index * ROW.nameLineHeight, TEXT_SIZES.name));
      const descStartY = blockTopY - nameLines.length * ROW.nameLineHeight - 2;
      descLines.forEach((line, index) => text(line, xName, descStartY - index * ROW.descriptionLineHeight, TEXT_SIZES.description, MUTED));

      const qty = `${formatQuantity(item.quantity)} ${item.unit}`;
      const price = money(item.priceKopecks);
      const total = money(Math.round(item.priceKopecks * item.quantity));
      const valueY = y - 1 - (rowHeight - 8) / 2 + 3;
      text(qty, centeredTextX(font, qty, TEXT_SIZES.values, QTY_LEFT, QTY_RIGHT), valueY, TEXT_SIZES.values);
      text(price, centeredTextX(font, price, TEXT_SIZES.values, PRICE_LEFT, PRICE_RIGHT), valueY, TEXT_SIZES.values);
      text(total, centeredTextX(font, total, TEXT_SIZES.values, TOTAL_LEFT, right), valueY, TEXT_SIZES.values);

      const lastTextY = descLines.length
        ? descStartY - (descLines.length - 1) * ROW.descriptionLineHeight
        : blockTopY - (nameLines.length - 1) * ROW.nameLineHeight;
      const lineY = lastTextY - 7;
      page.drawLine({ start: { x: MARGIN_X, y: lineY }, end: { x: right, y: lineY }, thickness: 0.5, color: BORDER });
      y -= rowHeight;
    }
  };

  page.drawLine({ start: { x: MARGIN_X, y }, end: { x: rightOfPage(), y }, thickness: 2, color: BLUE });
  y -= 17;

  const documentTitle = `СЧЕТ №${layout.number}`;
  text(documentTitle, MARGIN_X, y, TEXT_SIZES.title, TEXT);
  if (layout.address) {
    const prefix = 'Объект: ';
    const address = layout.address;
    const objectSize = TEXT_SIZES.object;
    const availableWidth = PAGE_WIDTH - MARGIN_X * 2 - font.widthOfTextAtSize(documentTitle, TEXT_SIZES.title) - 18;
    const fullObject = `${prefix}${address}`;
    const objectLines = wrapText(fullObject, font, objectSize, Math.max(120, availableWidth));
    const firstLine = objectLines.join(' ');
    const visibleObject = font.widthOfTextAtSize(firstLine, objectSize) <= availableWidth
      ? firstLine
      : `${prefix}${address.slice(0, Math.max(1, Math.floor(address.length * 0.72)))}…`;
    const titleWidth = font.widthOfTextAtSize(documentTitle, TEXT_SIZES.title);
    text(visibleObject, MARGIN_X + titleWidth + 18, y + 1, objectSize, MUTED);
  }
  y -= 13;

  for (const section of layout.sections) {
    drawTable(section.items);
  }

  ensureSpace(65);
  y -= 10;
  const summaryRight = PAGE_WIDTH - MARGIN_X;
  page.drawLine({ start: { x: SUMMARY_LEFT, y }, end: { x: summaryRight, y }, thickness: 1.5, color: BLUE });
  y -= 15;

  if (layout.showSectionSummary) {
    const serviceValue = money(layout.totals.servicesKopecks);
    text('Работы:', SUMMARY_LEFT, y, TEXT_SIZES.values, MUTED);
    text(serviceValue, rightTextX(font, serviceValue, TEXT_SIZES.values, summaryRight), y, TEXT_SIZES.values);
    y -= 13;

    const productValue = money(layout.totals.productsKopecks);
    text('Материалы:', SUMMARY_LEFT, y, TEXT_SIZES.values, MUTED);
    text(productValue, rightTextX(font, productValue, TEXT_SIZES.values, summaryRight), y, TEXT_SIZES.values);
    y -= 13;
  }

  if (layout.totals.discountKopecks > 0) {
    text(`Скидка ${layout.discountPercent}%:`, SUMMARY_LEFT, y, TEXT_SIZES.values, MUTED);
    const discountValue = `−${money(layout.totals.discountKopecks)}`;
    text(discountValue, rightTextX(font, discountValue, TEXT_SIZES.values, summaryRight), y, TEXT_SIZES.values);
    y -= 15;
  } else {
    y -= 2;
  }

  page.drawLine({ start: { x: SUMMARY_LEFT, y: y + 3 }, end: { x: summaryRight, y: y + 3 }, thickness: 0.7, color: BORDER });
  y -= 11;
  text('ИТОГО К ОПЛАТЕ:', SUMMARY_LEFT, y, TEXT_SIZES.grandLabel, BLUE);
  const grand = money(layout.totals.grandTotalKopecks);
  text(grand, rightTextX(font, grand, TEXT_SIZES.grandValue, summaryRight), y - 1, TEXT_SIZES.grandValue, BLUE);

  const bytes = await pdf.save();
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const filename = `Smeta_${layout.number}.pdf`;
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.target = '_blank';
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);

  function rightOfPage() {
    return PAGE_WIDTH - MARGIN_X;
  }
}
