import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Print one thing (a receipt, a QR card) on its own, without the rest of the page.
 * `const [printArea, print] = usePrint(); … print(<Receipt …/>, { page: '80mm auto' })`
 * then render `{printArea}` anywhere. Uses the browser's print window (staff pick the printer,
 * or "Save as PDF"). index.css hides everything else while printing.
 */
export function usePrint() {
  const [job, setJob] = useState(null);

  useEffect(() => {
    if (!job) return undefined;
    const html = document.documentElement;
    html.classList.add('print-area-active');
    const style = document.createElement('style');
    style.textContent = `@media print { @page { size: ${job.page}; margin: ${job.margin}; } }`;
    document.head.appendChild(style);
    const done = () => setJob(null);
    window.addEventListener('afterprint', done);
    const timer = setTimeout(() => window.print(), 50);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('afterprint', done);
      html.classList.remove('print-area-active');
      style.remove();
    };
  }, [job]);

  const print = useCallback((content, { page = 'A4', margin = '12mm' } = {}) => {
    setJob({ content, page, margin, key: Date.now() });
  }, []);

  const area = job
    ? createPortal(
        <div id="print-area" key={job.key}>
          {job.content}
        </div>,
        document.body,
      )
    : null;
  return [area, print];
}
