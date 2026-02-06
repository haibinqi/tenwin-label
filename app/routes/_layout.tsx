import { Link, NavLink, Outlet, useNavigation } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getDB } from "~/utils/db";

export async function loader({ context }: LoaderFunctionArgs) {
  try {
    // 检查数据库上下文
    if (!(context as { DB?: D1Database }).DB) {
      console.log("DB not available in context");
      return { todayCount: 0, activeBatches: 0, templateCount: 0 };
    }
    
    const db = getDB(context as { DB: D1Database });
    
    const [todayCount, activeBatches, templateCount] = await Promise.all([
      db.getTodayCount(),
      db.getActiveBatchCount(),
      db.getTemplateCount(),
    ]);
    
    return { todayCount, activeBatches, templateCount };
  } catch (error) {
    console.error("Loader error:", error);
    return { todayCount: 0, activeBatches: 0, templateCount: 0 };
  }
}

export default function Layout() {
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 侧边栏 */}
      <aside className="w-64 flex-shrink-0 border-r border-[#f1f1f1] bg-white flex flex-col">
        <div className="h-16 flex items-center px-8">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-black">qr_code_2</span>
            <span className="text-sm font-bold tracking-widest text-black">TENWIN</span>
          </div>
        </div>
        <nav className="flex-1 px-4 mt-6 space-y-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 rounded transition-all ${
                isActive
                  ? "text-black bg-slate-50 font-medium"
                  : "text-slate-500 hover:text-black hover:bg-slate-50"
              }`
            }
          >
            <span className="material-symbols-outlined">grid_view</span>
            <span className="text-[13px]">仪表盘</span>
          </NavLink>
          <NavLink
            to="/templates"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 rounded transition-all ${
                isActive
                  ? "text-black bg-slate-50 font-medium"
                  : "text-slate-500 hover:text-black hover:bg-slate-50"
              }`
            }
          >
            <span className="material-symbols-outlined">description</span>
            <span className="text-[13px]">标签模板</span>
          </NavLink>
          <NavLink
            to="/batches"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 rounded transition-all ${
                isActive
                  ? "text-black bg-slate-50 font-medium"
                  : "text-slate-500 hover:text-black hover:bg-slate-50"
              }`
            }
          >
            <span className="material-symbols-outlined">add_circle</span>
            <span className="text-[13px]">批次生成</span>
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 rounded transition-all ${
                isActive
                  ? "text-black bg-slate-50 font-medium"
                  : "text-slate-500 hover:text-black hover:bg-slate-50"
              }`
            }
          >
            <span className="material-symbols-outlined">history</span>
            <span className="text-[13px]">生成历史</span>
          </NavLink>
        </nav>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        {isNavigating && (
          <div className="fixed top-0 left-0 right-0 h-0.5 bg-slate-100 z-50">
            <div className="h-full bg-black animate-pulse w-1/3" />
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
