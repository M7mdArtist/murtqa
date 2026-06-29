import React, { useState, useEffect } from 'react';
import { Surah, SurahDetail, UserProgress, MemorizationStatus, AppView } from './types';
import { fetchSurahs, fetchSurahDetail } from './api';
import SurahSelector from './components/SurahSelector';
import RevisionDashboard from './components/RevisionDashboard';
import ProgressStats from './components/ProgressStats';
import { BookOpen, BarChart3, Heart, Award, Sparkles, RefreshCw, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const LOCAL_STORAGE_KEY = 'murtaqa_quran_progress_v1';

export default function App() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress>({});
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('murtaqa_dark_mode_v1');
    return saved === 'true';
  });

  // Sync theme with document class
  useEffect(() => {
    localStorage.setItem('murtaqa_dark_mode_v1', String(isDarkMode));
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Navigation & test states
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number | null>(null);
  const [selectedSurahDetail, setSelectedSurahDetail] = useState<SurahDetail | null>(null);
  const [testMode, setTestMode] = useState<'sequential' | 'random' | 'reciter'>('sequential');
  const [initialAyahNumber, setInitialAyahNumber] = useState<number | undefined>(undefined);

  // Loading & error states
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Load Surah list and user progress on mount
  useEffect(() => {
    async function initApp() {
      try {
        setLoadingList(true);
        setError(null);
        
        // Fetch Surahs from API
        const data = await fetchSurahs();
        setSurahs(data);

        // Load progress from localStorage
        const storedProgress = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedProgress) {
          try {
            setUserProgress(JSON.parse(storedProgress));
          } catch (e) {
            console.error('Failed to parse stored progress:', e);
          }
        }
      } catch (err: any) {
        setError(err.message || 'حدث خطأ أثناء تحميل سور القرآن الكريم. يرجى التأكد من اتصال الإنترنت وإعادة المحاولة.');
      } finally {
        setLoadingList(false);
      }
    }

    initApp();
  }, []);

  // 2. Fetch Surah details when a Surah is selected
  const handleSelectSurah = async (surahNumber: number, mode: 'sequential' | 'random' | 'reciter' = 'sequential', startingAyah?: number) => {
    try {
      setLoadingDetail(true);
      setError(null);
      setTestMode(mode);
      setInitialAyahNumber(startingAyah);
      setSelectedSurahNumber(surahNumber);

      const detail = await fetchSurahDetail(surahNumber);
      setSelectedSurahDetail(detail);
    } catch (err: any) {
      setError(err.message || `فشل تحميل تفاصيل سورة رقم ${surahNumber}. يرجى المحاولة مرة أخرى.`);
      setSelectedSurahNumber(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // 3. Jump to a specific Ayah from the progress statistics list
  const handleJumpToAyah = (surahNumber: number, ayahNumberInSurah: number) => {
    handleSelectSurah(surahNumber, 'sequential', ayahNumberInSurah);
  };

  // 4. Update status of an Ayah
  const handleUpdateStatus = (surahNumber: number, ayahNumberInSurah: number, status: MemorizationStatus) => {
    setUserProgress((prev) => {
      const updatedSurahProgress = {
        ...(prev[surahNumber] || {}),
        [ayahNumberInSurah]: status,
      };

      // If status is 'none' (reset), clean up empty entries to keep storage light
      if (status === 'none') {
        delete updatedSurahProgress[ayahNumberInSurah];
      }

      const updatedProgress = {
        ...prev,
        [surahNumber]: updatedSurahProgress,
      };

      // If a surah has no tracked ayahs left, clean it up
      if (Object.keys(updatedSurahProgress).length === 0) {
        delete updatedProgress[surahNumber];
      }

      // Save to localStorage
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedProgress));
      return updatedProgress;
    });
  };

  const handleBackToSelector = () => {
    setSelectedSurahNumber(null);
    setSelectedSurahDetail(null);
    setInitialAyahNumber(undefined);
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-[#fcfbf7]" dir="rtl" id="app-root">
      
      {/* Decorative top border layout bar */}
      <div className="h-2 bg-gradient-to-l from-amber-500 via-emerald-700 to-emerald-950 w-full" />

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:py-10 flex flex-col space-y-8">
        
        {/* Navigation & Brand Header - Hidden during active test for full focus, but shown on selector/dashboard */}
        {!selectedSurahNumber && (
          <header className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-emerald-100/40">
            {/* Brand Logo & Name */}
            <div className="text-center sm:text-right space-y-1">
              <div className="flex items-center gap-2.5 justify-center sm:justify-start">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-900 shadow-md shadow-emerald-800/10 flex items-center justify-center border border-emerald-600/30">
                  <Heart className="w-5.5 h-5.5 text-amber-400 fill-amber-400/20" />
                </div>
                <h1 className="text-2xl font-black text-emerald-950 font-sans tracking-tight">
                  مُرْتَقَى
                </h1>
              </div>
              <p className="text-xs text-emerald-800/60 font-semibold tracking-wide">
                مِنَصَّةُ تَسْمِيعِ وَمُرَاجَعَةِ القُرْآنِ الكَرِيمِ
              </p>
            </div>

            {/* View Tabs Selector */}
            <div className="flex items-center gap-3">
              <div className="flex bg-emerald-50 border border-emerald-100 p-1.5 rounded-2xl shadow-sm">
                <button
                  onClick={() => { setCurrentView('home'); handleBackToSelector(); }}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'home'
                      ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/10'
                      : 'text-emerald-800 hover:bg-emerald-100/50'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  المصحف والمراجعة
                </button>
                <button
                  onClick={() => { setCurrentView('stats'); handleBackToSelector(); }}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentView === 'stats'
                      ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/10'
                      : 'text-emerald-800 hover:bg-emerald-100/50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  لوحة الإنجاز والحفظ
                </button>
              </div>

              {/* Header Dark Mode Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 hover:bg-emerald-100/50 hover:text-emerald-950 transition-all active:scale-95 cursor-pointer shadow-sm flex items-center justify-center"
                title={isDarkMode ? "الوضع النهاري" : "الوضع الليلي"}
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-amber-500 animate-pulse" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
            </div>
          </header>
        )}

        {/* Dynamic Main Body Content */}
        <main className="flex-1 flex flex-col justify-center">
          
          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-red-800 space-y-3 mb-6 max-w-2xl mx-auto text-center">
              <p className="text-sm font-semibold">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-100 hover:bg-red-200 text-red-900 font-bold text-xs px-4 py-2 rounded-xl transition-all inline-flex items-center gap-1.5 active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                إعادة تحميل الصفحة
              </button>
            </div>
          )}

          {/* Loaders */}
          {loadingList && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              {/* Islamic Pattern Shimmer Animation */}
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-100 border-t-emerald-700 animate-spin" />
                <Award className="w-6 h-6 text-amber-500 animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-sm font-bold text-emerald-950">جاري تحميل سور القرآن الكريم...</h3>
                <p className="text-xs text-emerald-800/50">يرجى الانتظار قليلاً لتهيئة المصحف للمراجعة</p>
              </div>
            </div>
          )}

          {loadingDetail && (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-50 border-t-emerald-700 animate-spin" />
                <BookOpen className="w-5 h-5 text-emerald-700 animate-bounce" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-sm font-bold text-emerald-950">جاري جلب آيات السورة الكريمة...</h3>
                <p className="text-xs text-emerald-800/50">نقوم بتنزيل النص القرآني الموثوق من خوادم السحاب</p>
              </div>
            </div>
          )}

          {/* Display Views when not loading */}
          {!loadingList && !loadingDetail && (
            <AnimatePresence mode="wait">
              {selectedSurahNumber && selectedSurahDetail ? (
                // 1. Revision / Test dashboard view
                <motion.div
                  key="revision-dashboard"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                >
                  <RevisionDashboard
                    surah={selectedSurahDetail}
                    userProgress={userProgress[selectedSurahNumber] || {}}
                    onUpdateStatus={handleUpdateStatus}
                    onBack={handleBackToSelector}
                    initialMode={testMode}
                    initialAyahNumber={initialAyahNumber}
                  />
                </motion.div>
              ) : currentView === 'home' ? (
                // 2. Surah Selector Home View
                <motion.div
                  key="surah-selector"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <SurahSelector
                    surahs={surahs}
                    userProgress={userProgress}
                    onSelectSurah={handleSelectSurah}
                  />
                </motion.div>
              ) : (
                // 3. Progress Statistics View
                <motion.div
                  key="progress-stats"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ProgressStats
                    surahs={surahs}
                    userProgress={userProgress}
                    onJumpToAyah={handleJumpToAyah}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}

        </main>

        {/* Footer */}
        <footer className="pt-8 border-t border-emerald-100/40 text-center space-y-3 pb-8">
          <p className="text-xs md:text-sm text-emerald-800/60 dark:text-emerald-300/60 leading-relaxed max-w-xl mx-auto font-medium">
            مُرْتقى أداة تم صنعها عن طريق الذكاء الاصطناعي لمساعدة حفظة كتاب الله مراجعة وتعزيز حفظهم ولمساعدة كل من يريد حفظ كتاب الله.
          </p>
          <div className="flex justify-center items-center gap-1 text-xs text-emerald-800/40 font-medium">
            <span>مُرتَقَى © 2026</span>
            <span>•</span>
            <span>صدقة جارية لكل حافظ لكتاب الله عز وجل</span>
          </div>
          <p className="text-[10px] text-emerald-800/30 leading-relaxed max-w-md mx-auto">
            النص القرآني والتلاوات مستقاة بشكل حي من خوادم <a href="https://alquran.cloud" target="_blank" rel="noopener noreferrer" className="underline hover:text-emerald-700">Alquran.cloud</a> المعتمدة والموثقة.
          </p>
        </footer>

      </div>

      {/* Floating Dark Mode Toggle Button (Accessible during tests) */}
      <button
        onClick={() => setIsDarkMode(!isDarkMode)}
        className="fixed bottom-6 left-6 z-50 p-3.5 rounded-full shadow-lg border transition-all active:scale-95 cursor-pointer flex items-center justify-center bg-white dark:bg-emerald-900 border-emerald-100 dark:border-emerald-800 text-emerald-800 dark:text-amber-400 hover:shadow-xl hover:-translate-y-0.5"
        title={isDarkMode ? "الوضع النهاري" : "الوضع الليلي"}
        id="floating-theme-toggle"
      >
        {isDarkMode ? (
          <Sun className="w-5.5 h-5.5 text-amber-500 animate-pulse" />
        ) : (
          <Moon className="w-5.5 h-5.5 text-emerald-800" />
        )}
      </button>

    </div>
  );
}
