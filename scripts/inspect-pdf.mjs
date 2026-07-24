import { PDFDocument } from 'pdf-lib';
import { readFileSync } from 'node:fs';

const bytes = readFileSync(new URL('../assets/template.pdf', import.meta.url));
const pdf = await PDFDocument.load(bytes);
const pages = pdf.getPages();

pages.forEach((p, i) => {
  const { width, height } = p.getSize();
  const mediaBox = p.getMediaBox();
  const trimBox = (() => { try { return p.getTrimBox(); } catch { return null; } })();
  const bleedBox = (() => { try { return p.getBleedBox(); } catch { return null; } })();
  const cropBox = (() => { try { return p.getCropBox(); } catch { return null; } })();
  console.log(`Page ${i + 1}:`);
  console.log('  size (pts):', width, 'x', height);
  console.log('  size (mm):', (width * 25.4 / 72).toFixed(1), 'x', (height * 25.4 / 72).toFixed(1));
  console.log('  MediaBox:', mediaBox);
  console.log('  TrimBox:', trimBox);
  console.log('  BleedBox:', bleedBox);
  console.log('  CropBox:', cropBox);
});
