import { useState, useEffect } from "react";
import { useLoaderData, useSubmit, useNavigate } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { getDB } from "~/utils/db";
import type { CodeTemplate, CodeBatch } from "~/types";

interface LoaderData {
  templates: CodeTemplate[];
}

export async function loader({ context }: LoaderFunctionArgs): Promise<LoaderData> {
  const db = getDB(context as { DB: D1Database });
  const templates = await db.getTemplates();
  return { templates };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const db = getDB(context as { DB: D1Database });
  const formData = await request.formData();
  
  const templateId = formData.get("template_id") as string;
  const startNumber = parseInt(formData.get("start_number") as string);
  const count = parseInt(formData.get("count") as string);
  
  const template = await db.getTemplate(templateId);
  if (!template) {
    return { error: "模板不存在" };
  }
  
  // Check for conflicts
  const existingBatches = await db.getBatches(1000);
  for (const batch of existingBatches) {
    if (batch.template_id === templateId && batch.status === 'active') {
      if (startNumber <= batch.end_number && (startNumber + count - 1) >= batch.start_number) {
        return { error: `编号区间与批次 ${batch.id} 冲突` };
      }
    }
  }
  
  const batchId = `B${String(existingBatches.length + 1).padStart(3, '0')}`;
  const endNumber = startNumber + count - 1;
  
  // Create batch
  await db.createBatch({
    id: batchId,
    template_id: templateId,
    start_number: startNumber,
    end_number: endNumber,
    count,
    status: 'active',
    created_at: new Date().toISOString(),
  });
  
  // Create code items
  const items = [];
  for (let i = 0; i < count; i++) {
    const serialNum = startNumber + i;
    const codeText = template.prefix + String(serialNum).padStart(template.padding_length, '0');
    items.push({
      batch_id: batchId,
      serial_number: serialNum,
      code_text: codeText,
    });
  }
  await db.createCodeItems(items);
  
  return { success: true, batchId };
}

export default function BatchGenerate() {
  const { templates } = useLoaderData<LoaderData>();
  const submit = useSubmit();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<CodeTemplate | null>(null);
  const [startNumber, setStartNumber] = useState<number>(1);
  const [count, setCount] = useState<number>(100);
  const [lastBatch, setLastBatch] = useState<CodeBatch | null>(null);

  useEffect(() => {
    if (selectedTemplate) {
      fetchLastBatch();
    }
  }, [selectedTemplate]);

  const fetchLastBatch = async () => {
    if (!selectedTemplate) return;
    // We'll get this from the loader later, for now use default
    setStartNumber(1);
  };

  const handleSelectTemplate = (template: CodeTemplate) => {
    setSelectedTemplate(template);
    setTimeout(() => setStep(2), 300);
  };

  const handleAutoContinue = () => {
    if (lastBatch) {
      setStartNumber(lastBatch.end_number + 1);
    }
  };

  const handlePreview = () => {
    if (!startNumber || startNumber < 1) {
      alert('请输入有效的起始序号');
      return;
    }
    if (!count || count < 1 || count > 1000) {
      alert('生成数量必须在 1-1000 之间');
      return;
    }
    setStep(3);
  };

  const handleGenerate = () => {
    if (!selectedTemplate) return;
    
    const formData = new FormData();
    formData.append("template_id", selectedTemplate.id);
    formData.append("start_number", startNumber.toString());
    formData.append("count", count.toString());
    
    submit(formData, { method: "post" });
  };

  const formatCode = (num: number) => {
    if (!selectedTemplate) return '';
    return selectedTemplate.prefix + String(num).padStart(selectedTemplate.padding_length, '0');
  };

  return (
    <>
      <header className="h-16 flex-shrink-0 flex items-center px-10 border-b border-[#f1f1f1] bg-white">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          <h1 className="text-lg font-medium text-black">批次生成</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-10 py-12">
          {/* 步骤指示器 */}
          <div className="flex items-center justify-center mb-12">
            <div className="flex items-center gap-4">
              {[1, 2, 3].map((s, index) => (
                <div key={s} className="flex items-center">
                  <div className={`flex items-center gap-2 ${s > step ? 'opacity-50' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      s <= step ? 'bg-black text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {s}
                    </div>
                    <span className={`text-sm ${s <= step ? 'font-medium text-black' : 'text-slate-500'}`}>
                      {s === 1 ? '选择模板' : s === 2 ? '设置参数' : '生成确认'}
                    </span>
                  </div>
                  {index < 2 && <div className="w-12 h-px bg-slate-200 mx-4" />}
                </div>
              ))}
            </div>
          </div>

          {/* 步骤 1: 选择模板 */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-light text-black mb-8">选择编码模板</h2>
              {templates.length === 0 ? (
                <div className="text-center py-20">
                  <span className="material-symbols-outlined text-4xl text-slate-200 mb-4">folder_open</span>
                  <p className="text-sm text-slate-400 mb-4">暂无可用模板</p>
                  <a href="/templates" className="inline-block px-4 py-2 bg-black text-white text-xs rounded-sm">创建模板</a>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <div 
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className="cursor-pointer p-6 border border-slate-200 rounded-lg hover:border-black hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-medium text-black group-hover:text-black">{template.name}</h3>
                          <p className="text-xs text-slate-400 mt-1">{template.remark || '无备注'}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-medium ${
                          template.type === '二维码' ? 'bg-slate-100 text-slate-600' : 'bg-black text-white'
                        }`}>
                          {template.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="font-mono">前缀: {template.prefix}</span>
                        <span>填充: {template.padding_length}位</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 步骤 2: 设置参数 */}
          {step === 2 && selectedTemplate && (
            <div>
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setStep(1)} className="text-slate-400 hover:text-black transition-colors">
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h2 className="text-xl font-light text-black">设置生成参数</h2>
              </div>

              <div className="bg-slate-50 rounded-lg p-8 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">起始序号</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={startNumber}
                        onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                        className="flex-1 px-4 py-3 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-black" 
                        placeholder="输入起始序号"
                      />
                      <button 
                        onClick={handleAutoContinue}
                        className="px-4 py-3 bg-white border border-slate-200 rounded-sm text-xs text-slate-600 hover:border-black hover:text-black transition-all whitespace-nowrap"
                      >
                        自动接续
                      </button>
                    </div>
                    {lastBatch && (
                      <p className="text-xs text-slate-400 mt-2">
                        上次生成到: {formatCode(lastBatch.end_number)}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">生成数量</label>
                    <input 
                      type="number" 
                      value={count}
                      onChange={(e) => setCount(parseInt(e.target.value) || 100)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-sm text-sm focus:outline-none focus:border-black" 
                      placeholder="输入生成数量" 
                      min="1" 
                      max="1000"
                    />
                    <p className="text-xs text-slate-400 mt-2">单次最多生成 1000 个</p>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-200">
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">预览编码规则</label>
                  <div className="flex items-center gap-4 p-4 bg-white rounded border border-slate-200">
                    <div className="w-32 h-16 flex items-center justify-center bg-white border border-slate-100">
                      <span className="text-xs text-slate-400">预览</span>
                    </div>
                    <div>
                      <p className="text-sm font-mono text-black">{formatCode(startNumber)}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatCode(startNumber)} - {formatCode(startNumber + count - 1)} ({count}个)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={handlePreview}
                  className="px-8 py-3 bg-black text-white rounded-sm text-sm hover:bg-slate-800 transition-all"
                >
                  下一步：预览生成
                </button>
              </div>
            </div>
          )}

          {/* 步骤 3: 生成确认 */}
          {step === 3 && selectedTemplate && (
            <div>
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setStep(2)} className="text-slate-400 hover:text-black transition-colors">
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h2 className="text-xl font-light text-black">确认生成</h2>
              </div>

              <div className="bg-slate-50 rounded-lg p-8 mb-8">
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">模板</p>
                    <p className="text-lg font-medium text-black">{selectedTemplate.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">类型</p>
                    <p className="text-lg font-medium text-black">{selectedTemplate.type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">编号区间</p>
                    <p className="text-lg font-mono text-black">
                      {formatCode(startNumber)} - {formatCode(startNumber + count - 1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">生成数量</p>
                    <p className="text-lg font-medium text-black">{count} 个</p>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <p className="text-xs text-amber-600 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    生成后编号将锁定，无法修改，请仔细核对
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button 
                  onClick={() => setStep(2)} 
                  className="px-6 py-3 border border-slate-200 rounded-sm text-sm text-slate-600 hover:border-black hover:text-black transition-all"
                >
                  返回修改
                </button>
                <button 
                  onClick={handleGenerate}
                  className="px-8 py-3 bg-black text-white rounded-sm text-sm hover:bg-slate-800 transition-all"
                >
                  确认生成
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
