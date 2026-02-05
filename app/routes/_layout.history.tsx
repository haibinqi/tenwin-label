import { useState } from "react";
import { useLoaderData, useSubmit, Link } from "react-router";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { getDB } from "~/utils/db";
import type { CodeBatchWithTemplate } from "~/types";

interface LoaderData {
  batches: CodeBatchWithTemplate[];
}

export async function loader({ context }: LoaderFunctionArgs): Promise<LoaderData> {
  const db = getDB(context as { DB: D1Database });
  const batches = await db.getBatches(100);
  return { batches };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const db = getDB(context as { DB: D1Database });
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const batchId = formData.get("batch_id") as string;

  if (intent === "void") {
    await db.voidBatch(batchId);
  }

  return null;
}

export default function BatchHistory() {
  const { batches } = useLoaderData<LoaderData>();
  const submit = useSubmit();
  const [filter, setFilter] = useState("all");
  const [detailBatch, setDetailBatch] = useState<CodeBatchWithTemplate | null>(null);
  const [voidConfirm, setVoidConfirm] = useState<string | null>(null);

  const filteredBatches = filter === "all" 
    ? batches 
    : batches.filter(b => b.status === filter);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCode = (num: number, prefix: string, padding: number) => {
    return prefix + String(num).padStart(padding, '0');
  };

  const handleVoid = (batchId: string) => {
    setVoidConfirm(batchId);
  };

  const confirmVoid = () => {
    if (voidConfirm) {
      const formData = new FormData();
      formData.append("intent", "void");
      formData.append("batch_id", voidConfirm);
      submit(formData, { method: "post" });
      setVoidConfirm(null);
      setDetailBatch(null);
    }
  };

  const generatePreviewNumbers = (batch: CodeBatchWithTemplate) => {
    const numbers = [];
    for (let i = 0; i < Math.min(5, batch.count); i++) {
      numbers.push(batch.start_number + i);
    }
    if (batch.count > 10) {
      numbers.push(-1); // ellipsis marker
    }
    if (batch.count > 5) {
      for (let i = Math.max(5, batch.count - 5); i < batch.count; i++) {
        numbers.push(batch.start_number + i);
      }
    }
    return numbers;
  };

  return (
    <>
      <header className="h-16 flex-shrink-0 flex items-center justify-between px-10 border-b border-[#f1f1f1] bg-white">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          <h1 className="text-lg font-medium text-black">生成历史</h1>
        </div>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-sm text-xs focus:outline-none focus:border-black"
        >
          <option value="all">全部状态</option>
          <option value="active">正常</option>
          <option value="void">已作废</option>
        </select>
      </header>

      <div className="flex-1 overflow-y-auto px-10 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="border-t border-slate-100">
            {filteredBatches.length === 0 ? (
              <div className="py-20 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-200 mb-4">inbox</span>
                <p className="text-sm text-slate-400">暂无生成记录</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="text-[10px] text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">
                    <th className="py-5 font-semibold w-[15%]">批次编号</th>
                    <th className="py-5 font-semibold w-[20%]">模板名称</th>
                    <th className="py-5 font-semibold w-[25%]">编号区间</th>
                    <th className="py-5 font-semibold w-[10%] text-center">数量</th>
                    <th className="py-5 font-semibold w-[10%] text-center">状态</th>
                    <th className="py-5 font-semibold w-[20%] text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {filteredBatches.map((batch) => (
                    <tr key={batch.id} className="group hover:bg-[#fafafa] transition-colors border-b border-slate-50">
                      <td className="py-5 font-medium text-black">{batch.id}</td>
                      <td className="py-5 font-medium text-black truncate">{batch.template_name}</td>
                      <td className="py-5 text-slate-500 font-mono text-[11px] truncate">
                        {formatCode(batch.start_number, batch.template_prefix, batch.template_padding)} - 
                        {formatCode(batch.end_number, batch.template_prefix, batch.template_padding)}
                      </td>
                      <td className="py-5 text-center font-mono text-black font-medium">{batch.count}</td>
                      <td className="py-5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                          batch.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {batch.status === 'active' ? '正常' : '已作废'}
                        </span>
                      </td>
                      <td className="py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setDetailBatch(batch)} 
                            className="p-1.5 text-slate-400 hover:text-black transition-colors"
                            title="详情"
                          >
                            <span className="material-symbols-outlined text-lg">visibility</span>
                          </button>
                          <Link 
                            to={`/print/${batch.id}`}
                            target="_blank"
                            className="p-1.5 text-slate-400 hover:text-black transition-colors"
                            title="打印"
                          >
                            <span className="material-symbols-outlined text-lg">print</span>
                          </Link>
                          {batch.status === 'active' && (
                            <button 
                              onClick={() => handleVoid(batch.id)} 
                              className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                              title="作废"
                            >
                              <span className="material-symbols-outlined text-lg">block</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <footer className="h-16 flex-shrink-0 flex items-center justify-between px-10 border-t border-[#f1f1f1] bg-white text-[10px] text-slate-400 uppercase tracking-widest font-light">
        <p className="font-normal">© 2024 <span className="text-black font-medium">TENWIN SYSTEMS</span></p>
        <div className="flex gap-8">
          <a className="hover:text-black transition-colors" href="#">文档手册</a>
          <a className="hover:text-black transition-colors" href="#">技术支持</a>
        </div>
      </footer>

      {/* Detail Modal */}
      {detailBatch && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setDetailBatch(null)}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-medium text-black">批次详情</h3>
              <button onClick={() => setDetailBatch(null)} className="text-slate-400 hover:text-black transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">批次编号</p>
                    <p className="text-lg font-medium text-black">{detailBatch.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">模板名称</p>
                    <p className="text-lg font-medium text-black">{detailBatch.template_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">编码类型</p>
                    <p className="text-base text-black">{detailBatch.template_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">生成数量</p>
                    <p className="text-base text-black">{detailBatch.count} 个</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">起始编号</p>
                    <p className="font-mono text-base text-black">
                      {formatCode(detailBatch.start_number, detailBatch.template_prefix, detailBatch.template_padding)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">结束编号</p>
                    <p className="font-mono text-base text-black">
                      {formatCode(detailBatch.end_number, detailBatch.template_prefix, detailBatch.template_padding)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">创建时间</p>
                    <p className="text-sm text-slate-600">{formatDate(detailBatch.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">状态</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      detailBatch.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {detailBatch.status === 'active' ? '正常' : '已作废'}
                    </span>
                  </div>
                </div>
                
                <div className="border-t border-slate-100 pt-6">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-4">编号预览</p>
                  <div className="grid grid-cols-5 gap-2">
                    {generatePreviewNumbers(detailBatch).map((num, idx) => (
                      num === -1 ? (
                        <div key={idx} className="text-center text-slate-300 py-2">...</div>
                      ) : (
                        <div key={idx} className="text-center py-2 px-1 bg-slate-50 rounded text-xs font-mono text-slate-600 truncate">
                          {formatCode(num, detailBatch.template_prefix, detailBatch.template_padding)}
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button 
                onClick={() => setDetailBatch(null)} 
                className="px-4 py-2 border border-slate-200 rounded-sm text-xs text-slate-600 hover:border-black hover:text-black transition-all"
              >
                关闭
              </button>
              <Link 
                to={`/print/${detailBatch.id}`}
                target="_blank"
                className="px-4 py-2 bg-black text-white rounded-sm text-xs hover:bg-slate-800 transition-all"
              >
                打印标签
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Void Confirm Modal */}
      {voidConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-amber-500">warning</span>
              <h3 className="text-lg font-medium text-black">确认作废</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">作废后该批次将不能再用于打印，但历史记录会保留。</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setVoidConfirm(null)} 
                className="px-4 py-2 border border-slate-200 rounded-sm text-xs text-slate-600 hover:border-black hover:text-black transition-all"
              >
                取消
              </button>
              <button 
                onClick={confirmVoid} 
                className="px-4 py-2 bg-red-600 text-white rounded-sm text-xs hover:bg-red-700 transition-all"
              >
                作废
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
