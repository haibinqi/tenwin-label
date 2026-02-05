import { useEffect, useState, useRef } from "react";
import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getDB } from "~/utils/db";
import type { CodeBatchWithTemplate, CodeItem } from "~/types";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

interface LoaderData {
  batch: CodeBatchWithTemplate;
  items: CodeItem[];
}

export async function loader({ params, context }: LoaderFunctionArgs): Promise<LoaderData> {
  const db = getDB(context as { DB: D1Database });
  const batchId = params.batchId as string;
  
  const [batch, items] = await Promise.all([
    db.getBatch(batchId),
    db.getCodeItems(batchId),
  ]);
  
  if (!batch) {
    throw new Response("Batch not found", { status: 404 });
  }
  
  return { batch, items };
}

const labelTemplates: Record<string, {
  cols: number;
  labelWidth: string;
  labelHeight: string;
  gap: string;
  padding: string;
}> = {
  'a4-3x8': {
    cols: 3,
    labelWidth: '63.5mm',
    labelHeight: '33.9mm',
    gap: '3mm',
    padding: '5mm',
  },
  'a4-4x10': {
    cols: 4,
    labelWidth: '48.5mm',
    labelHeight: '25.4mm',
    gap: '2mm',
    padding: '4mm',
  },
  'a4-2x5': {
    cols: 2,
    labelWidth: '96mm',
    labelHeight: '52mm',
    gap: '4mm',
    padding: '6mm',
  },
  'continuous': {
    cols: 1,
    labelWidth: '76mm',
    labelHeight: '30mm',
    gap: '2mm',
    padding: '3mm',
  },
};

export default function PrintPreview() {
  const { batch, items } = useLoaderData<LoaderData>();
  const [template, setTemplate] = useState('a4-3x8');
  const [printStart, setPrintStart] = useState(1);
  const [printEnd, setPrintEnd] = useState(items.length);
  const [displayItems, setDisplayItems] = useState<CodeItem[]>(items);
  const barcodeRefs = useRef<(HTMLCanvasElement | SVGSVGElement | null)[]>([]);

  useEffect(() => {
    setPrintStart(1);
    setPrintEnd(items.length);
    setDisplayItems(items);
  }, [items]);

  useEffect(() => {
    renderCodes();
  }, [displayItems, template]);

  const renderCodes = async () => {
    const isQR = batch.template_type === '二维码';
    
    for (let i = 0; i < displayItems.length; i++) {
      const item = displayItems[i];
      const element = barcodeRefs.current[i];
      
      if (!element) continue;
      
      try {
        if (isQR) {
          // Clear canvas
          const canvas = element as HTMLCanvasElement;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
          await QRCode.toCanvas(canvas, item.code_text, {
            width: 48,
            height: 48,
            margin: 0,
            errorCorrectionLevel: 'M',
          });
        } else {
          // Clear SVG
          const svg = element as SVGSVGElement;
          while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
          }
          JsBarcode(svg, item.code_text, {
            format: 'CODE128',
            width: 1.2,
            height: 28,
            displayValue: false,
            margin: 0,
          });
        }
      } catch (e) {
        console.error('Error rendering code:', e);
      }
    }
  };

  const handleApplyRange = () => {
    const start = Math.max(1, printStart) - 1;
    const end = Math.min(items.length, printEnd);
    setDisplayItems(items.slice(start, end));
  };

  const currentTemplate = labelTemplates[template];

  return (
    <div className="min-h-screen bg-slate-100">
      {/* 打印控制栏 */}
      <div className="no-print fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-50">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.history.back()} 
              className="flex items-center gap-2 text-slate-600 hover:text-black transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              <span className="text-sm">返回</span>
            </button>
            <div className="h-4 w-px bg-slate-200"></div>
            <h1 className="text-sm font-medium text-black">打印预览: {batch.id}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <select 
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-sm text-xs focus:outline-none focus:border-black"
            >
              <option value="a4-3x8">A4 3列x8行 (24个/页)</option>
              <option value="a4-4x10">A4 4列x10行 (40个/页)</option>
              <option value="a4-2x5">A4 2列x5行 (10个/页)</option>
              <option value="continuous">连续小票样式</option>
            </select>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">打印范围:</span>
              <input 
                type="number" 
                value={printStart}
                onChange={(e) => setPrintStart(parseInt(e.target.value) || 1)}
                className="w-16 px-2 py-1 border border-slate-200 rounded-sm text-xs" 
                placeholder="起始"
                min={1}
                max={items.length}
              />
              <span className="text-xs text-slate-400">-</span>
              <input 
                type="number" 
                value={printEnd}
                onChange={(e) => setPrintEnd(parseInt(e.target.value) || items.length)}
                className="w-16 px-2 py-1 border border-slate-200 rounded-sm text-xs" 
                placeholder="结束"
                min={1}
                max={items.length}
              />
              <button 
                onClick={handleApplyRange}
                className="px-3 py-1 bg-slate-100 text-slate-600 rounded-sm text-xs hover:bg-slate-200 transition-colors"
              >
                应用
              </button>
            </div>

            <div className="h-4 w-px bg-slate-200"></div>

            <button 
              onClick={() => window.print()} 
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-sm text-xs hover:bg-slate-800 transition-all"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              打印
            </button>
          </div>
        </div>
      </div>

      {/* 打印区域 */}
      <div className="print-area pt-20 pb-10 px-4">
        <div 
          className="mx-auto bg-white"
          style={{ 
            maxWidth: template === 'continuous' ? '80mm' : '210mm',
            padding: '10mm',
          }}
        >
          <div 
            className="flex flex-wrap justify-center"
            style={{ gap: currentTemplate.gap }}
          >
            {displayItems.map((item, index) => (
              <div 
                key={item.id}
                className="label-item flex flex-col items-center justify-center border border-slate-200 bg-white"
                style={{
                  width: currentTemplate.labelWidth,
                  height: currentTemplate.labelHeight,
                  padding: currentTemplate.padding,
                  breakInside: 'avoid',
                  pageBreakInside: 'avoid',
                }}
              >
                {batch.template_type === '二维码' ? (
                  <canvas 
                    ref={(el) => { barcodeRefs.current[index] = el; }}
                    width={48}
                    height={48}
                    className="mb-1"
                  />
                ) : (
                  <svg 
                    ref={(el) => { barcodeRefs.current[index] = el; }}
                    className="mb-1 w-full"
                    style={{ maxHeight: '60%' }}
                  />
                )}
                <p className="font-mono text-[9px] text-slate-600 text-center truncate w-full">
                  {item.code_text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 批次信息 */}
      <div className="hidden print:block fixed bottom-4 right-4 text-xs text-slate-400">
        {batch.id} | {batch.template_name} | {new Date().toLocaleDateString('zh-CN')}
      </div>
    </div>
  );
}
