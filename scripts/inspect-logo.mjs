import { PDFDocument } from 'pdf-lib';
import { readFileSync } from 'node:fs';

const bytes = readFileSync(new URL('../assets/logo-aw.pdf', import.meta.url));
const pdf = await PDFDocument.load(bytes);
const pages = pdf.getPages();

pages.forEach((p, i) => {
  const { width, height } = p.getSize();
  console.log(`Page ${i + 1}: ${width.toFixed(1)} x ${height.toFixed(1)} pts (${(width * 25.4 / 72).toFixed(1)} x ${(height * 25.4 / 72).toFixed(1)} mm)`);
});
