import { Route, Routes } from 'react-router'
import { Home } from './pages/Home'
import { Navbar } from './components/Navbar'
import { CreatePostPage } from './pages/CreatePostPage';
import { PostPage } from './pages/PostPage';
import { useEffect, useState } from 'react';
import { supabase } from './supabase-client';
import { CreateCommunityPage } from './pages/CreateCommunityPage';
import { CommunitiesPage } from './pages/CommunitiesPage';
import { CommunityPage } from './pages/CommunityPage';

function App() {
  const [showScroll, setShowScroll] = useState(false);

  useEffect(() => {
    const validateSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          await supabase.auth.signOut();
        }
      }
    };

    validateSession();

    // КОРИГИРАНО: Появява се много по-рано (при 100px скрол)
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setShowScroll(true);
      } else {
        setShowScroll(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        console.log("User signed out");
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen bg-gray-950 text-white overflow-x-hidden selection:bg-purple-500/40">
      {/* Background Aurora Layers */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-60">
        <div className="absolute -top-[10%] -left-[10%] w-[70%] h-[70%] rounded-full bg-indigo-600/30 blur-[120px] animate-aurora-visual" />
        <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-emerald-500/20 blur-[100px] animate-aurora-visual-slow" />
        <div className="absolute top-[40%] left-[15%] w-[50%] h-[50%] rounded-full bg-blue-500/25 blur-[110px] animate-aurora-visual" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-[10%] left-[20%] w-[60%] h-[60%] rounded-full bg-purple-600/30 blur-[130px] animate-aurora-visual-slow" style={{ animationDelay: '4s' }} />
      </div>

      <header className="relative z-50">
        <Navbar />
      </header>

      <main className="relative z-10 container mx-auto px-6 pt-24 pb-12">
        <div className="animate-reveal">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreatePostPage />} />
            <Route path="/post/:id" element={<PostPage />} />
            <Route path="/community/create" element={<CreateCommunityPage />} />
            <Route path="/communities" element={<CommunitiesPage />} />
            <Route path="/community/:id" element={<CommunityPage />} />
          </Routes>
        </div>
      </main>

      {/* БУТОН ЗА СКРОЛ - Появява се рано и работи навсякъде */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 z-[100] p-3 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-cyan-400 shadow-2xl transition-all duration-500 group ${
          showScroll ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-50 pointer-events-none'
        } hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:scale-110 active:scale-95`}
      >
        <svg 
          className="w-6 h-6 transition-transform group-hover:-translate-y-1" 
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}

export default App;