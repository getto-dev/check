import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { InvoiceItem, Settings } from './types';
import { formatCurrency, calculateTotals } from './format';

let cachedFont: Uint8Array | null = null;

const FONT_PATH = './fonts/Roboto-Regular.ttf';

async function loadFont(): Promise<Uint8Array | null> {
  // Try from memory cache first
  if (cachedFont) {
    return cachedFont;
  }

  // Try from Cache API (Service Worker cache) - search all caches
  if ('caches' in window) {
    try {
      // Method 1: Try to find in any cache
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(FONT_PATH);
        if (cachedResponse && cachedResponse.ok) {
          const fontArrayBuffer = await cachedResponse.arrayBuffer();
          cachedFont = new Uint8Array(fontArrayBuffer);
          console.log('Font loaded from cache:', cacheName);
          return cachedFont;
        }
      }
    } catch (e) {
      console.warn('Cache API error:', e);
    }
  }

  // Fallback: try fetch with relative path (Service Worker will intercept)
  try {
    const fontResponse = await fetch(FONT_PATH);
    if (fontResponse.ok) {
      const fontArrayBuffer = await fontResponse.arrayBuffer();
      cachedFont = new Uint8Array(fontArrayBuffer);
      console.log('Font loaded via fetch');
      return cachedFont;
    }
  } catch (e) {
    console.warn('Fetch font error:', e);
  }

  return null;
}

export const exportToPdf = async (items: InvoiceItem[], settings: Settings) => {
  const d = new Date();
  const num = `${d.getFullYear().toString().slice(-2)}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}-01`;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 30;
  let y = pageHeight - margin;

  const primaryColor = rgb(0.2, 0.2, 0.2);
  const grayColor = rgb(0.47, 0.47, 0.47);
  const blueColor = rgb(0.2, 0.6, 0.86);
  const redColor = rgb(0.91, 0.3, 0.24);
  const lightGray = rgb(0.97, 0.97, 0.97);

  let font;
  try {
    const fontData = await loadFont();
    if (fontData) {
      font = await pdfDoc.embedFont(fontData);
    }
  } catch (error) {
    console.warn('Could not load Cyrillic font:', error);
  }

  if (!font) {
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }

  let page = pdfDoc.addPage([pageWidth, pageHeight]);

  const titleSize = 16;
  const headerSize = 8;
  const rowSize = 9;
  const descSize = 8;
  const subtotalSize = 8;

  const tableWidth = pageWidth - 2 * margin;
  const colNameWidth = tableWidth * 0.73;
  const colQtyWidth = tableWidth * 0.07;
  const colPriceWidth = tableWidth * 0.10;
  const colTotalWidth = tableWidth * 0.10;

  const colQtyX = margin + colNameWidth;
  const colPriceX = colQtyX + colQtyWidth;
  const colTotalX = colPriceX + colPriceWidth;

  const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
    if (!text) return [];
    const lines: string[] = [];
    const words = text.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  };

  const address = settings.address || 'объект не указан';

  // Header: title
  page.drawText(`СЧЕТ №${num}`, { x: margin, y, size: titleSize, font, color: blueColor });

  // Header: address (right side)
  const labelText = 'ОБЪЕКТ:';
  const addressText = ` ${address}`;
  const labelWidth = font.widthOfTextAtSize(labelText, 7);
  const addressWidth = font.widthOfTextAtSize(addressText, 9);
  page.drawText(labelText, { x: pageWidth - margin - labelWidth - addressWidth, y: y - 2, size: 7, font, color: grayColor });
  page.drawText(addressText, { x: pageWidth - margin - addressWidth, y: y - 2, size: 9, font, color: primaryColor });

  // Blue line under header
  y -= 20;
  page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 2, color: blueColor });
  y -= 16;

  const services = items.filter(i => i.type === 'service');
  const products = items.filter(i => i.type === 'product');

  const addItemsTable = (itemsList: InvoiceItem[], title: string): number => {
    if (itemsList.length === 0) return y;

    // Table header
    page.drawText(title, { x: margin + 6, y, size: headerSize, font, color: primaryColor });
    page.drawText('Кол.', { x: colQtyX + 6, y, size: headerSize, font, color: primaryColor });
    page.drawText('Цена', { x: colPriceX + 6, y, size: headerSize, font, color: primaryColor });
    page.drawText('Всего', { x: colTotalX + 6, y, size: headerSize, font, color: primaryColor });

    // Header line
    y -= 8;
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1.5, color: primaryColor });
    y -= 14;

    let subtotal = 0;

    itemsList.forEach((item) => {
      if (y < margin + 50) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }

      // Name and description
      const name = item.name;
      const desc = item.description || '';
      const fullText = desc ? `${name} (${desc})` : name;

      // Wrap text for name column
      const lines = wrapText(fullText, colNameWidth - 12, rowSize);

      // Calculate row height
      const rowHeight = Math.max(16, lines.length * 12 + 4);

      // Draw name column
      let textY = y - 8;
      lines.forEach((line, idx) => {
        if (idx === 0) {
          // First line: name is bold (we simulate with regular font)
          page.drawText(line, { x: margin + 6, y: textY, size: rowSize, font, color: primaryColor });
        } else {
          page.drawText(line, { x: margin + 6, y: textY, size: descSize, font, color: grayColor });
        }
        textY -= 11;
      });

      // Draw other columns
      const qtyText = `${item.quantity} ${item.unit}`;
      const qtyWidth = font.widthOfTextAtSize(qtyText, rowSize);
      page.drawText(qtyText, { x: colQtyX + (colQtyWidth - qtyWidth) / 2, y: y - 8, size: rowSize, font, color: primaryColor });

      const priceText = formatCurrency(item.price);
      const priceWidth = font.widthOfTextAtSize(priceText, rowSize);
      page.drawText(priceText, { x: colPriceX + (colPriceWidth - priceWidth) / 2, y: y - 8, size: rowSize, font, color: primaryColor });

      const totalText = formatCurrency(item.amount);
      const totalWidth = font.widthOfTextAtSize(totalText, rowSize);
      page.drawText(totalText, { x: colTotalX + (colTotalWidth - totalWidth) / 2, y: y - 8, size: rowSize, font, color: primaryColor });

      // Row line
      y -= rowHeight;
      page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.5, color: rgb(0.93, 0.93, 0.93) });
      y -= 2;

      subtotal += item.amount;
    });

    // Subtotal row
    y -= 4;
    page.drawRectangle({
      x: margin,
      y: y - 12,
      width: tableWidth,
      height: 14,
      color: lightGray
    });

    const subtotalText = `Итого за ${title === 'РАБОТЫ И УСЛУГИ' ? 'услуги' : 'материалы'}: ${formatCurrency(subtotal)}`;
    const subtotalTextWidth = font.widthOfTextAtSize(subtotalText, subtotalSize);
    page.drawText(subtotalText, { x: pageWidth - margin - subtotalTextWidth - 10, y: y - 6, size: subtotalSize, font, color: primaryColor });
    y -= 22;

    return y;
  };

  y = addItemsTable(services, 'РАБОТЫ И УСЛУГИ');
  y = addItemsTable(products, 'МАТЕРИАЛЫ И ТОВАРЫ');

  if (y < margin + 60) {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  }

  const totals = calculateTotals(items, settings.discount);
  const { subtotalServices, subtotalProducts, discountAmount, grandTotal } = totals;

  // Blue line before totals
  page.drawLine({ start: { x: pageWidth - margin - 195, y }, end: { x: pageWidth - margin, y }, thickness: 2, color: blueColor });
  y -= 16;

  // Discount line
  if (settings.discount > 0) {
    const discountLabel = `Скидка на работы (${settings.discount}%):`;
    const discountValue = `- ${formatCurrency(discountAmount)}`;
    const discountValueWidth = font.widthOfTextAtSize(discountValue, rowSize);

    page.drawText(discountLabel, { x: pageWidth - margin - 195, y, size: rowSize, font, color: primaryColor });
    page.drawText(discountValue, { x: pageWidth - margin - discountValueWidth, y, size: rowSize, font, color: redColor });
    y -= 14;
  }

  // Grand total
  y -= 4;
  page.drawLine({ start: { x: pageWidth - margin - 195, y }, end: { x: pageWidth - margin, y }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
  y -= 10;

  const totalLabel = 'ИТОГО К ОПЛАТЕ:';
  const totalValue = formatCurrency(grandTotal);
  const totalValueWidth = font.widthOfTextAtSize(totalValue, 11);

  page.drawText(totalLabel, { x: pageWidth - margin - 195, y, size: headerSize, font, color: primaryColor });
  page.drawText(totalValue, { x: pageWidth - margin - totalValueWidth, y, size: 11, font, color: blueColor });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([new Uint8Array(pdfBytes).buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `Smeta_${num}.pdf`;
  link.click();

  URL.revokeObjectURL(url);
};
