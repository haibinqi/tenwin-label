import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getDB } from "~/utils/db";
import type { CodeBatchWithTemplate } from "~/types";

interface LoaderData {
  todayCount: number;
  activeBatches: number;
  templateCount: number;
  recentBatches: CodeBatchWithTemplate[];
}

export async function loader({ context }: LoaderFunctionArgs): Promise<LoaderData> {
  try {
    // 检查数据库上下文
    if (!(context as { DB?: D1Database }).DB) {
      console.log("DB not available in context");
      return { todayCount: 0, activeBatches: 0, templateCount: 0, recentBatches: [] };
    }
    
    const db = getDB(context as { DB: D1Database });
    
    const [todayCount, activeBatches, templateCount, recentBatches] = await Promise.all([
      db.getTodayCount(),
      db.getActiveBatchCount(),
      db.getTemplateCount(),
      db.getBatches(5),
    ]);
    
    return { todayCount, activeBatches, templateCount, recentBatches };
  } catch (error) {
    console.error("Loader error:", error);
    return { todayCount: 0, activeBatches: 0, templateCount: 0, recentBatches: [] };
  }
}

export default function Dashboard() {
  const { todayCount, activeBatches, templateCount, recentBatches } = useLoaderData<LoaderData>();

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

  return (
    <>
      <header className="h-16 flex-shrink-0 flex items-center justify-between px-10 border-b border-[#f1f1f1] bg-white">
        <div className="flex items-center gap-8 flex-1">
          <div className="relative w-full max-w-sm">
            <span className="material-symbols-outlined absolute left-0 top-1/2 -translate-y-1/2 text-slate-300">search</span>
            <input 
              className="w-full bg-transparent border-none py-2 pl-8 pr-4 text-sm focus:ring-0 placeholder:text-slate-300" 
              placeholder="搜索模板或批次..." 
              type="text"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-10 pt-12 pb-6 max-w-7xl mx-auto w-full">
        {/* 页面标题 */}
        <div className="flex items-end justify-between mb-16">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-black">仪表盘</h1>
            <p className="text-sm text-slate-400 mt-2">轻量化一维码/二维码生成与打印管理工具。</p>
          </div>
          <div className="flex gap-4">
            <Link 
              to="/templates" 
              className="px-6 py-2.5 border border-slate-200 rounded-sm text-xs text-slate-600 hover:border-black hover:text-black transition-all font-medium"
            >
              创建新模板
            </Link>
            <Link 
              to="/batches" 
              className="px-6 py-2.5 bg-black text-white rounded-sm text-xs hover:bg-slate-800 transition-all font-medium"
            >
              开始新批次
            </Link>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-20">
          <div className="group">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">今日已生成总码数</p>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-extralight text-black tracking-tighter">{todayCount.toLocaleString()}</span>
              <span className="text-xs text-slate-400 font-medium">+12%</span>
            </div>
          </div>
          <div className="group">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">活跃批次</p>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-extralight text-black tracking-tighter">{String(activeBatches).padStart(2, '0')}</span>
              <span className="text-xs text-slate-400 font-medium">正在进行</span>
            </div>
          </div>
          <div className="group">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">模板总数</p>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-extralight text-black tracking-tighter">{String(templateCount).padStart(2, '0')}</span>
              <span className="text-xs text-slate-400 font-medium">可用</span>
            </div>
          </div>
        </div>

        {/* 最近生成批次 */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xs font-bold text-black uppercase tracking-[0.2em]">最近生成批次</h2>
            <Link className="text-[11px] text-slate-400 hover:text-black transition-colors" to="/history">查看全部记录 →</Link>
          </div>
          <div className="border-t border-slate-100">
            {recentBatches.length === 0 ? (
              <div className="py-20 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-200 mb-4">inbox</span>
                <p className="text-sm text-slate-400">暂无生成记录</p>
                <Link to="/batches" className="inline-block mt-4 px-4 py-2 bg-black text-white text-xs rounded-sm">开始第一批生成</Link>
              </div>
            ) : (
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="text-[10px] text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">
                    <th className="py-5 font-semibold w-1/5">批次编号</th>
                    <th className="py-5 font-semibold w-1/5">模板名称</th>
                    <th className="py-5 font-semibold w-1/5">编号区间</th>
                    <th className="py-5 font-semibold w-1/5 text-center">数量</th>
                    <th className="py-5 font-semibold w-1/5 text-right">创建时间</th>
                  </tr>
                </thead>
                <tbody className="text-[13px]">
                  {recentBatches.map((batch) => (
                    <tr key={batch.id} className="group hover:bg-[#fafafa] transition-colors border-b border-slate-50">
                      <td className="py-5 font-medium text-black truncate">{batch.id}</td>
                      <td className="py-5 font-medium text-black truncate">{batch.template_name}</td>
                      <td className="py-5 text-slate-500 font-mono text-[11px] truncate">
                        {formatCode(batch.start_number, batch.template_prefix, batch.template_padding)} - {formatCode(batch.end_number, batch.template_prefix, batch.template_padding)}
                      </td>
                      <td className="py-5 text-center font-mono text-black font-medium truncate">{batch.count}</td>
                      <td className="py-5 text-slate-400 text-right truncate">{formatDate(batch.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <footer className="h-16 flex-shrink-0 flex items-center justify-between px-10 border-t border-[#f1f1f1] bg-white text-[10px] text-slate-400 uppercase tracking-widest font-light">
        <p className="font-normal">© 2024 <span className="text-black font-medium">TENWIN SYSTEMS</span>. 极简工业设计体系</p>
        <div className="flex gap-8">
          <a className="hover:text-black transition-colors" href="#">文档手册</a>
          <a className="hover:text-black transition-colors" href="#">API 接口</a>
          <a className="hover:text-black transition-colors" href="#">技术支持</a>
        </div>
      </footer>
    </>
  );
}
