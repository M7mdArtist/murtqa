import React, { useState, useEffect, useRef } from 'react';
import { SurahDetail, Ayah, MemorizationStatus, TestSettings } from '../types';
import { processAyahText, getAyahAudioUrl, RECITERS } from '../api';
import { 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  Pause, 
  Eye, 
  Volume2, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  Sparkles,
  Settings,
  X,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NextAyahAudioButtonProps {
  globalAyahNumber: number;
  reciter: string;
}

function NextAyahAudioButton({ globalAyahNumber, reciter }: NextAyahAudioButtonProps) {
  const [isPlayingNext, setIsPlayingNext] = useState(false);
  const audioRefNext = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRefNext.current) {
        audioRefNext.current.pause();
      }
    };
  }, []);

  const handleToggleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlayingNext) {
      if (audioRefNext.current) {
        audioRefNext.current.pause();
      }
      setIsPlayingNext(false);
    } else {
      const audioUrl = getAyahAudioUrl(globalAyahNumber, reciter);
      const audio = new Audio(audioUrl);
      audioRefNext.current = audio;
      audio.play().then(() => {
        setIsPlayingNext(true);
      }).catch((err) => {
        console.error('Failed to play next ayah audio:', err);
      });
      audio.onended = () => {
        setIsPlayingNext(false);
      };
    }
  };

  return (
    <button
      onClick={handleToggleNext}
      className={`p-2 rounded-xl border transition-all active:scale-95 ${
        isPlayingNext
          ? 'bg-amber-500 text-white border-amber-500 animate-pulse'
          : 'bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-emerald-100'
      }`}
      title="استمع لتلاوة الآية"
    >
      {isPlayingNext ? <Pause className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
    </button>
  );
}

interface RevisionDashboardProps {
  surah: SurahDetail;
  userProgress: { [ayahNumberInSurah: number]: MemorizationStatus };
  onUpdateStatus: (surahNumber: number, ayahNumberInSurah: number, status: MemorizationStatus) => void;
  onBack: () => void;
  initialMode?: 'sequential' | 'random';
  initialAyahNumber?: number;
}

export default function RevisionDashboard({ 
  surah, 
  userProgress, 
  onUpdateStatus, 
  onBack,
  initialMode = 'sequential',
  initialAyahNumber
}: RevisionDashboardProps) {
  // Current Ayah index in the surah.ayahs array
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initialAyahNumber && initialAyahNumber > 0 && initialAyahNumber <= surah.ayahs.length) {
      return initialAyahNumber - 1;
    }
    return 0;
  });
  const [revealed, setRevealed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Progress state for linking verses
  const [revealedNextCount, setRevealedNextCount] = useState(0);
  const [revealedNextVerses, setRevealedNextVerses] = useState<{ [index: number]: boolean }>({});
  
  // Settings state
  const [settings, setSettings] = useState<TestSettings>({
    wordsToShow: 3,
    mode: initialMode,
    includeBismillah: false,
    audioReciter: 'ar.alafasy'
  });

  // History for random mode to support back navigation
  const [randomHistory, setRandomHistory] = useState<number[]>([]);
  const [historyPointer, setHistoryPointer] = useState(-1);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentAyah = surah.ayahs[currentIndex];
  
  // Process the text to split Bismillah if it exists
  const { bismillah, cleanText } = processAyahText(currentAyah.text, surah.number, currentAyah.numberInSurah);

  // Compute the starting words
  const startingWords = (() => {
    const words = cleanText.split(/\s+/);
    const count = Math.min(settings.wordsToShow, words.length);
    const head = words.slice(0, count).join(' ');
    const tail = words.slice(count).join(' ');
    return { head, tail };
  })();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSettings) return; // ignore when setting popup is open
      
      if (e.code === 'Space') {
        e.preventDefault();
        setRevealed((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        // In Arabic layout, Next is ArrowLeft or ArrowRight. Let's make:
        // ArrowRight: Previous, ArrowLeft: Next (Standard RTL navigation)
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        handlePrev();
      } else if (e.code === 'KeyM') {
        // Mark as Mastered
        handleStatusClick('mastered');
      } else if (e.code === 'KeyR') {
        // Mark as Needs Practice
        handleStatusClick('needs_practice');
      } else if (e.code === 'KeyP') {
        // Play Audio
        toggleAudio();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, revealed, isPlaying, settings.mode, randomHistory, historyPointer, currentAyah]);

  // Audio loading & handling
  useEffect(() => {
    // Reset audio and reveal state when ayah changes
    setRevealed(false);
    setIsPlaying(false);
    setRevealedNextCount(0);
    setRevealedNextVerses({});
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [currentIndex]);

  const toggleAudio = () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      const audioUrl = getAyahAudioUrl(currentAyah.number, settings.audioReciter);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error('Audio play failed:', err);
      });

      audio.onended = () => {
        setIsPlaying(false);
      };
    }
  };

  const selectRandomIndex = () => {
    if (surah.ayahs.length <= 1) return 0;
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * surah.ayahs.length);
    } while (nextIndex === currentIndex && surah.ayahs.length > 1);
    return nextIndex;
  };

  const handleNext = () => {
    if (settings.mode === 'sequential') {
      if (currentIndex < surah.ayahs.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    } else {
      // Random mode with navigation history support
      if (historyPointer < randomHistory.length - 1) {
        const nextPointer = historyPointer + 1;
        setHistoryPointer(nextPointer);
        setCurrentIndex(randomHistory[nextPointer]);
      } else {
        const nextIndex = selectRandomIndex();
        const newHistory = [...randomHistory, nextIndex];
        setRandomHistory(newHistory);
        setHistoryPointer(newHistory.length - 1);
        setCurrentIndex(nextIndex);
      }
    }
  };

  const handlePrev = () => {
    if (settings.mode === 'sequential') {
      if (currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      }
    } else {
      // Random mode navigation back in history
      if (historyPointer > 0) {
        const nextPointer = historyPointer - 1;
        setHistoryPointer(nextPointer);
        setCurrentIndex(randomHistory[nextPointer]);
      }
    }
  };

  const handleStatusClick = (status: MemorizationStatus) => {
    const currentStatus = userProgress[currentAyah.numberInSurah] || 'none';
    // Toggle status if clicked again, otherwise set it
    const newStatus = currentStatus === status ? 'none' : status;
    onUpdateStatus(surah.number, currentAyah.numberInSurah, newStatus);
    
    // Automatically reveal when marked
    if (newStatus !== 'none') {
      setRevealed(true);
    }
  };

  // Switch between Sequential and Random modes
  const handleModeChange = (mode: 'sequential' | 'random') => {
    setSettings((prev) => ({ ...prev, mode }));
    if (mode === 'random') {
      const initialRandIndex = selectRandomIndex();
      setRandomHistory([initialRandIndex]);
      setHistoryPointer(0);
      setCurrentIndex(initialRandIndex);
    } else {
      setCurrentIndex(0);
    }
  };

  const currentAyahStatus = userProgress[currentAyah.numberInSurah] || 'none';

  return (
    <div className="max-w-3xl mx-auto space-y-6" id="revision-dashboard-root">
      
      {/* Header bar */}
      <div className="flex items-center justify-between bg-white/80 backdrop-blur-md px-6 py-4 rounded-2xl shadow-sm border border-emerald-100/50">
        <button 
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-colors"
        >
          <ArrowRight className="w-4 h-4 ml-0.5" />
          العودة للمصحف
        </button>

        <div className="text-center">
          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100/70 px-2.5 py-0.5 rounded-full uppercase">
            {surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}
          </span>
          <h2 className="text-xl font-bold text-emerald-950 font-sans mt-0.5">
            {surah.name}
          </h2>
        </div>

        <button 
          onClick={() => setShowSettings(true)}
          className="p-2.5 hover:bg-emerald-50 rounded-xl border border-emerald-100/10 hover:border-emerald-100 text-emerald-800 transition-all active:scale-95"
          title="خيارات الاختبار"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Progress indicators for sequential mode */}
      {settings.mode === 'sequential' && (
        <div className="bg-white/40 rounded-full h-2 overflow-hidden border border-emerald-100/20">
          <div 
            className="h-full bg-emerald-700 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / surah.ayahs.length) * 100}%` }}
          />
        </div>
      )}

      {/* Main Flashcard Panel */}
      <div className="bg-white rounded-3xl p-8 md:p-12 shadow-md border border-emerald-100/60 flex flex-col justify-between min-h-[420px] relative overflow-hidden">
        
        {/* Background watermark/art */}
        <div className="absolute inset-0 bg-[radial-gradient(#047857_0.4px,transparent_0.4px)] [background-size:16px_16px] opacity-[0.03] pointer-events-none" />

        {/* Card Header: Ayah Details & Status Pill */}
        <div className="flex items-center justify-between relative z-10 border-b border-emerald-50 pb-5 mb-6">
          <div className="flex items-center gap-2">
            {currentAyahStatus === 'mastered' && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                متقن
              </span>
            )}
            {currentAyahStatus === 'needs_practice' && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                بحاجة لمراجعة
              </span>
            )}
            {currentAyahStatus === 'none' && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">
                غير محدّد
              </span>
            )}
          </div>

          <div className="text-right font-mono text-sm text-emerald-800/80 font-bold bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100/40">
            الآية {currentAyah.numberInSurah} من {surah.numberOfAyahs}
          </div>
        </div>

        {/* Card Content: Quranic Verses Display */}
        <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6 my-4 relative z-10">
          
          {/* Optional Centered Bismillah Header */}
          {bismillah && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-emerald-800 font-bold text-xl md:text-2xl font-sans tracking-wide leading-loose opacity-80"
              style={{ fontFamily: "'Amiri', serif" }}
            >
              {bismillah}
            </motion.div>
          )}

          {/* Core Ayah Text */}
          <div className="w-full space-y-8 select-none">
            
            {/* The Prompt / Beginning of Verse */}
            <div 
              className="text-3xl md:text-4xl text-emerald-950 tracking-wide font-medium text-center px-4"
              style={{ fontFamily: "'Amiri', serif", direction: 'rtl', lineHeight: '2.5' }}
            >
              {/* Highlight starting words */}
              <span className="text-emerald-800 font-bold drop-shadow-[0_1px_1px_rgba(4,120,87,0.05)] border-b-2 border-emerald-200 pb-1 me-2 inline-block">
                {startingWords.head}
              </span>
              
              {/* Blur/Hide remaining words unless revealed */}
              <AnimatePresence mode="wait">
                {revealed ? (
                  <motion.span
                    initial={{ opacity: 0, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-stone-800 font-normal inline"
                  >
                    {startingWords.tail}
                  </motion.span>
                ) : (
                  <span 
                    className="text-stone-300 font-normal select-none blur-[5px] cursor-pointer hover:text-stone-400 transition-all duration-300 inline"
                    onClick={() => setRevealed(true)}
                    title="انقر للكشف عن باقي الآية"
                  >
                    {startingWords.tail || '... ... ... ...'}
                  </span>
                )}
              </AnimatePresence>
            </div>

            {/* Quick Helper text when hidden */}
            {!revealed && (
              <p className="text-xs text-emerald-800/40 font-medium">
                حاول تسميع الآية غيباً، ثم انقر على "كشف الآية" للتأكد من صحة تسميعك
              </p>
            )}

          </div>

          {/* Link to Next Verses Section */}
          {surah.ayahs.length - 1 - currentIndex > 0 && (
            <div className="w-full pt-6 mt-4 border-t border-emerald-100/40 space-y-4 select-none">
              {revealedNextCount === 0 ? (
                <div className="flex justify-center">
                  <button
                    onClick={() => setRevealedNextCount(1)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100/70 text-emerald-800 border border-emerald-100 rounded-2xl text-xs font-bold transition-all hover:scale-101 active:scale-95 cursor-pointer shadow-sm"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span>🔗 اختبار ربط الآية التالية (الآية {currentAyah.numberInSurah + 1})</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-right w-full" dir="rtl">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                      تتابع الآيات الموالية لربط الحفظ وتأكيد التلاوة
                    </span>
                    <button
                      onClick={() => {
                        setRevealedNextCount(0);
                        setRevealedNextVerses({});
                      }}
                      className="text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      إخفاء آيات الربط
                    </button>
                  </div>

                  <div className="space-y-3">
                    {Array.from({ length: revealedNextCount }).map((_, offset) => {
                      const nextIndex = currentIndex + 1 + offset;
                      if (nextIndex >= surah.ayahs.length) return null;
                      
                      const nextAyah = surah.ayahs[nextIndex];
                      const isNextRevealed = !!revealedNextVerses[nextIndex];
                      const { cleanText: nextCleanText } = processAyahText(nextAyah.text, surah.number, nextAyah.numberInSurah);

                      return (
                        <motion.div
                          key={nextAyah.number}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-emerald-50/20 border border-emerald-100/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 hover:bg-emerald-50/40 transition-colors"
                        >
                          {/* Ayah Number */}
                          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                            <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center text-xs font-bold font-mono">
                              {nextAyah.numberInSurah}
                            </span>
                            <span className="text-xs font-bold text-emerald-800/70">الآية التالية</span>
                          </div>

                          {/* Verse Text (Blurred/Shown) */}
                          <div className="flex-1 text-center sm:text-right px-2">
                            <p
                              className={`text-xl md:text-2xl text-emerald-950 transition-all select-none cursor-pointer ${
                                isNextRevealed ? '' : 'blur-[5px] text-emerald-900/20 hover:text-emerald-900/40'
                              }`}
                              style={{ fontFamily: "'Amiri', serif", lineHeight: '2.2' }}
                              onClick={() => {
                                if (!isNextRevealed) {
                                  setRevealedNextVerses(prev => ({ ...prev, [nextIndex]: true }));
                                }
                              }}
                              title={isNextRevealed ? '' : 'انقر لكشف الآية'}
                            >
                              {nextCleanText}
                            </p>
                          </div>

                          {/* Control button for next ayah */}
                          <div className="flex items-center gap-2 shrink-0">
                            <NextAyahAudioButton globalAyahNumber={nextAyah.number} reciter={settings.audioReciter} />
                            <button
                              onClick={() => {
                                setRevealedNextVerses(prev => ({ ...prev, [nextIndex]: !isNextRevealed }));
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                isNextRevealed
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200'
                                  : 'bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800 shadow-sm shadow-emerald-700/10'
                              }`}
                            >
                              {isNextRevealed ? 'إخفاء' : 'كشف الآية'}
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Progressively add more subsequent ayahs */}
                  {currentIndex + 1 + revealedNextCount < surah.ayahs.length && (
                    <div className="flex justify-start pt-1">
                      <button
                        onClick={() => setRevealedNextCount(prev => prev + 1)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100/40 hover:bg-emerald-100/70 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-bold transition-all hover:scale-102 active:scale-95 cursor-pointer"
                      >
                        <span>➕ أظهر الآية التالية (الآية {currentAyah.numberInSurah + revealedNextCount + 1})</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Card Footer: Action Bar */}
        <div className="relative z-10 mt-8 pt-6 border-t border-emerald-50 flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Left: Memorization state controllers */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStatusClick('mastered')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-semibold border transition-all active:scale-95 ${
                currentAyahStatus === 'mastered'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm shadow-emerald-700/25'
                  : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              أتقنتُها
            </button>
            <button
              onClick={() => handleStatusClick('needs_practice')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-semibold border transition-all active:scale-95 ${
                currentAyahStatus === 'needs_practice'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-600/25'
                  : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50 hover:border-amber-300'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              بحاجة لمراجعة
            </button>
          </div>

          {/* Center: Reveal and Recitation player controls */}
          <div className="flex items-center gap-3">
            {/* Audio Recitation Button */}
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-full border transition-all active:scale-95 ${
                isPlaying
                  ? 'bg-amber-500 text-white border-amber-500 animate-pulse'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-emerald-100'
              }`}
              title="استمع لتلاوة الآية للتثبيت"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Core Reveal Button */}
            <button
              onClick={() => setRevealed(!revealed)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-sm hover:shadow transition-all flex items-center gap-2 active:scale-95"
            >
              <Eye className="w-4 h-4" />
              {revealed ? 'إخفاء التكملة' : 'كشف باقي الآية'}
            </button>
          </div>

          {/* Right: Previous / Next navigators */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={settings.mode === 'sequential' ? currentIndex === 0 : historyPointer <= 0}
              className="p-2.5 bg-white border border-emerald-200 text-emerald-800 rounded-xl hover:bg-emerald-50 hover:border-emerald-300 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
              title="الآية السابقة"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="text-xs text-slate-500 font-medium font-mono min-w-8 text-center">
              {settings.mode === 'sequential' 
                ? `${currentIndex + 1} / ${surah.ayahs.length}`
                : `عشوائي`
              }
            </span>
            <button
              onClick={handleNext}
              disabled={settings.mode === 'sequential' && currentIndex === surah.ayahs.length - 1}
              className="p-2.5 bg-white border border-emerald-200 text-emerald-800 rounded-xl hover:bg-emerald-50 hover:border-emerald-300 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
              title="الآية التالية"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

        </div>

      </div>

      {/* Keyboard hints */}
      <div className="hidden md:flex justify-center items-center gap-6 text-[11px] text-emerald-800/50 font-medium font-sans">
        <span><kbd className="bg-white px-2 py-0.5 border border-emerald-100 rounded shadow-sm text-xs font-mono">Space</kbd> كشف/إخفاء</span>
        <span><kbd className="bg-white px-2 py-0.5 border border-emerald-100 rounded shadow-sm text-xs font-mono">→</kbd> الآية التالية</span>
        <span><kbd className="bg-white px-2 py-0.5 border border-emerald-100 rounded shadow-sm text-xs font-mono">←</kbd> الآية السابقة</span>
        <span><kbd className="bg-white px-2 py-0.5 border border-emerald-100 rounded shadow-sm text-xs font-mono">M</kbd> إتقان</span>
        <span><kbd className="bg-white px-2 py-0.5 border border-emerald-100 rounded shadow-sm text-xs font-mono">R</kbd> مراجعة</span>
        <span><kbd className="bg-white px-2 py-0.5 border border-emerald-100 rounded shadow-sm text-xs font-mono">P</kbd> تشغيل التلاوة</span>
      </div>

      {/* Settings Dialog Backdrop */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl border border-emerald-100 text-right space-y-6"
              dir="rtl"
            >
              {/* Settings Header */}
              <div className="flex items-center justify-between border-b border-emerald-50 pb-3">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-emerald-700" />
                  خيارات التسميع والاختبار
                </h3>
              </div>

              {/* Setting: Words to Show */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-950 font-mono bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/50">
                    {settings.wordsToShow === 1 ? 'أول كلمة فقط' : 
                     settings.wordsToShow === 2 ? 'أول كلمتين' : 
                     `أول ${settings.wordsToShow} كلمات`}
                  </span>
                  <label className="text-sm font-semibold text-emerald-950">الكلمات المفتاحية المكتشفة</label>
                </div>
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={settings.wordsToShow}
                  onChange={(e) => setSettings((prev) => ({ ...prev, wordsToShow: parseInt(e.target.value) }))}
                  className="w-full accent-emerald-700 cursor-pointer h-1.5 bg-emerald-50 rounded-full"
                />
                <p className="text-[11px] text-emerald-800/60 font-medium">
                  يتحكم هذا في عدد الكلمات التي تظهر كمفتاح في بداية الآية لمساعدتك على تذكرها.
                </p>
              </div>

              {/* Setting: Test Mode */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-emerald-950 block">طريقة المراجعة</label>
                <div className="flex bg-emerald-50 p-1 rounded-xl border border-emerald-100">
                  <button
                    onClick={() => handleModeChange('sequential')}
                    className={`flex-1 text-center py-2.5 text-xs font-bold rounded-lg transition-all ${
                      settings.mode === 'sequential'
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'text-emerald-800 hover:bg-emerald-100/40'
                    }`}
                  >
                    مراجعة متسلسلة (آية بآية)
                  </button>
                  <button
                    onClick={() => handleModeChange('random')}
                    className={`flex-1 text-center py-2.5 text-xs font-bold rounded-lg transition-all ${
                      settings.mode === 'random'
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'text-emerald-800 hover:bg-emerald-100/40'
                    }`}
                  >
                    اختبار عشوائي بالسور
                  </button>
                </div>
              </div>

              {/* Setting: Audio Reciter Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-emerald-950 block">القارئ للتسميع المسموع</label>
                <select
                  value={settings.audioReciter}
                  onChange={(e) => setSettings((prev) => ({ ...prev, audioReciter: e.target.value }))}
                  className="w-full p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-semibold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                >
                  {RECITERS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.englishName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset progress of this Surah button */}
              <div className="pt-2 border-t border-emerald-50">
                <button
                  onClick={() => {
                    if (window.confirm('هل أنت متأكد من رغبتك في إعادة تعيين تقدم حفظ هذه السورة؟')) {
                      surah.ayahs.forEach((a) => {
                        onUpdateStatus(surah.number, a.numberInSurah, 'none');
                      });
                      setCurrentIndex(0);
                      setRevealed(false);
                      setShowSettings(false);
                    }
                  }}
                  className="w-full py-2.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-100 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  إعادة تعيين تقدم السورة
                </button>
              </div>

              {/* Apply settings button */}
              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold transition-all"
              >
                تطبيق الإعدادات
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
