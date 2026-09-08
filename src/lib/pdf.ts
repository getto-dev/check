'use client';
import type { InvoiceItem, Settings } from './types';
import { calculateTotals } from './format';

export async function exportToPdf(_items: InvoiceItem[], _settings: Settings) {
  if (typeof window === 'undefined') return;
  calculateTotals(_items, _settings.discount);
  window.print();
}
