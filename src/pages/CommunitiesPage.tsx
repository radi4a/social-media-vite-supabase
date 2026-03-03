import { CommunityList } from "../components/CommunityList";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";

export const CommunitiesPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as "all" | "mine" | "followed" | null;
  const [activeTab, setActiveTab] = useState<"all" | "mine" | "followed">(tabParam || "all");

  const [showScroll, setShowScroll] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScroll(window.scrollY > 100);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // Смяна на таб и обновяване на query параметър
  const handleTabChange = (tab: "all" | "mine" | "followed") => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-6 md:space-y-10 relative">
      {/* Заглавие */}
      <div className="flex flex-col gap-6 border-b border-white/10 pb-6 md:pb-8">
        <div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">
            {activeTab === "all" ? (
              <>
                <span className="text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">Всички</span>
                <br className="md:hidden" />
                <span className="text-white ml-0 md:ml-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">общности</span>
              </>
            ) : activeTab === "mine" ? (
              <>
                <span className="text-purple-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]">Моите</span>
                <br className="md:hidden" />
                <span className="text-white ml-0 md:ml-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">общности</span>
              </>
            ) : (
              <>
                <span className="text-yellow-400 drop-shadow-[0_0_15px_rgba(255,211,0,0.8)]">Следени</span>
                <br className="md:hidden" />
                <span className="text-white ml-0 md:ml-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">общности</span>
              </>
            )}
          </h2>
        </div>

        {user && (
          <div className="flex w-full md:w-fit bg-gray-900/80 p-1.5 rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <button
              onClick={() => handleTabChange("all")}
              className={`flex-1 md:flex-none px-8 py-3 md:py-2.5 rounded-xl text-sm font-black transition-all duration-300 ${activeTab === "all" ? "bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.6)] scale-105" : "text-gray-500 hover:text-cyan-400"}`}
            >
              Всички
            </button>

            <button
              onClick={() => handleTabChange("mine")}
              className={`flex-1 md:flex-none px-8 py-3 md:py-2.5 rounded-xl text-sm font-black transition-all duration-300 ${activeTab === "mine" ? "bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.6)] scale-103" : "text-gray-500 hover:text-purple-400"}`}
            >
              Ваши
            </button>

            <button
              onClick={() => handleTabChange("followed")}
              className={`flex-1 md:flex-none px-8 py-3 md:py-2.5 rounded-xl text-sm font-black transition-all duration-300 ${activeTab === "followed" ? "bg-yellow-500 text-white shadow-[0_0_20px_rgba(255,211,0,0.6)] scale-103" : "text-gray-500 hover:text-yellow-400"}`}
            >
              Следени
            </button>
          </div>
        )}
      </div>

      {/* Community List */}
      <div className="animate-reveal">
        <CommunityList
          filterUserId={activeTab === "mine" ? user?.id : undefined}
          followedUserId={activeTab === "followed" ? user?.id : undefined}
          currentUserId={user?.id} // за бутона „Следвай“
        />
      </div>

      {/* Scroll to top */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 z-[100] p-3 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-cyan-400 shadow-2xl transition-all duration-500 group ${showScroll ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-10 scale-50 pointer-events-none"} hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:scale-110 active:scale-95`}
      >
        <svg className="w-6 h-6 transition-transform group-hover:-translate-y-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
};
