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
  RotateCcw,
  Timer,
  Printer,
  ClipboardCheck,
  Mic,
  Award,
  Check
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
  initialMode?: 'sequential' | 'random' | 'reciter';
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

  // Reciter mode specific state
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(initialMode === 'reciter');
  const [mistakenAyahs, setMistakenAyahs] = useState<{ [ayahNumberInSurah: number]: boolean }>({});
  const [isAuditMode, setIsAuditMode] = useState(false);
  const [mistakenWords, setMistakenWords] = useState<{ [ayahNumberInSurah: number]: { [wordIndex: number]: boolean } }>({});
  
  // Random mode custom quiz states
  const [randomQuestionLimit, setRandomQuestionLimit] = useState<number | 'open'>('open');
  const [testCompleted, setTestCompleted] = useState(false);

  // Reciter mode timer effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && settings.mode === 'reciter') {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, settings.mode]);

  // Export PDF Handler
  const handleExportPDF = () => {
    // Create a new window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('يرجى تفعيل النوافذ المنبثقة لتنزيل التقرير.');
      return;
    }

    const today = new Date().toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const minutes = Math.floor(timeElapsed / 60);
    const seconds = timeElapsed % 60;
    const timeStr = `${minutes} دقيقة و ${seconds} ثانية`;

    const mistakenAyahsList = surah.ayahs.filter(a => mistakenAyahs[a.numberInSurah]);

    let ayahsHtml = '';
    if (mistakenAyahsList.length === 0) {
      ayahsHtml = `<div style="text-align: center; padding: 40px; color: #047857; font-size: 1.2rem; font-weight: bold;">
        الحمد لله! لم يتم تسجيل أي أخطاء أثناء تسميع هذه السورة الكريمة. 🎉
      </div>`;
    } else {
      mistakenAyahsList.forEach((ayah) => {
        // Simple fallback parsing for text
        const cleanText = ayah.text.replace(/[\u064B-\u0652]/g, '').replace(/^(بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ)/, '').trim();
        const wordsFromText = cleanText.split(/\s+/);
        const originalWords = ayah.text.split(/\s+/);
        
        // If Uthmanic words list matches split
        const actualWordsToUse = originalWords.length === wordsFromText.length ? originalWords : wordsFromText;

        let wordsHtml = '';
        actualWordsToUse.forEach((word, wordIdx) => {
          const isWordMistaken = mistakenWords[ayah.numberInSurah]?.[wordIdx];
          if (isWordMistaken) {
            wordsHtml += `<span style="color: #dc2626; text-decoration: underline double #dc2626; font-weight: bold; background-color: #fef2f2; padding: 2px 4px; border-radius: 4px; margin: 0 2px;">${word}</span> `;
          } else {
            wordsHtml += `<span style="color: #1e293b; margin: 0 2px;">${word}</span> `;
          }
        });

        ayahsHtml += `
          <div style="margin-bottom: 24px; padding: 18px; border-right: 4px solid #f59e0b; background-color: #fffbeb; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 0.9rem; color: #78350f; font-family: sans-serif;">
              <strong>الآية رقم ${ayah.numberInSurah}</strong>
              <span style="background-color: #fef3c7; padding: 2px 8px; border-radius: 9999px; font-weight: bold;">بحاجة لتثبيت ⚠️</span>
            </div>
            <div style="font-family: 'Amiri', 'Traditional Arabic', serif; font-size: 1.6rem; line-height: 2.2; text-align: right; direction: rtl;">
              ${wordsHtml}
            </div>
          </div>
        `;
      });
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير تسميع سورة ${surah.name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@400;700&display=swap');
          
          body {
            font-family: 'Tajawal', sans-serif;
            background-color: #ffffff;
            color: #1e293b;
            margin: 40px;
            padding: 0;
            direction: rtl;
          }
          
          .certificate-container {
            border: 4px double #047857;
            border-radius: 16px;
            padding: 30px;
            position: relative;
            background-color: #fdfdfc;
          }

          .certificate-watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-15deg);
            font-size: 8rem;
            color: rgba(4, 120, 87, 0.03);
            font-family: 'Amiri', serif;
            pointer-events: none;
            white-space: nowrap;
            z-index: 0;
          }

          .header {
            text-align: center;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
            margin-bottom: 30px;
            position: relative;
            z-index: 10;
          }

          .logo-title {
            font-family: 'Amiri', serif;
            font-size: 2.5rem;
            font-weight: bold;
            color: #047857;
            margin: 0;
          }

          .subtitle {
            font-size: 0.9rem;
            color: #64748b;
            margin-top: 5px;
            letter-spacing: 1px;
          }

          .report-title {
            text-align: center;
            font-size: 1.8rem;
            color: #0f172a;
            margin: 20px 0;
            font-weight: bold;
          }

          .meta-grid {
            display: grid;
            grid-template-cols: 1fr 1fr;
            gap: 16px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
            font-size: 1rem;
            position: relative;
            z-index: 10;
          }

          .meta-item {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px dashed #e2e8f0;
            padding-bottom: 8px;
          }
          .meta-item:last-child {
            border-bottom: none;
          }

          .meta-label {
            color: #475569;
            font-weight: bold;
          }

          .meta-value {
            color: #0f172a;
            font-weight: bold;
          }

          .section-title {
            font-size: 1.3rem;
            color: #047857;
            border-right: 4px solid #047857;
            padding-right: 10px;
            margin-top: 40px;
            margin-bottom: 20px;
            font-weight: bold;
          }

          .footer-note {
            text-align: center;
            margin-top: 50px;
            font-size: 0.85rem;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
          }

          @media print {
            body {
              margin: 20px;
            }
            .certificate-container {
              border: 4px double #047857;
              padding: 20px;
            }
            button {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="certificate-container">
          <div class="certificate-watermark">مُرْتَقَى</div>
          
          <div class="header">
            <h1 class="logo-title">مُرْتَقَى</h1>
            <div class="subtitle">تَسْمِيعُ وَمُرَاجَعَةُ القُرْآنِ الكَرِيمِ</div>
          </div>

          <div class="report-title">📝 تقرير مراجعة وتسميع سورة ${surah.name}</div>

          <div class="meta-grid">
            <div class="meta-item">
              <span class="meta-label">التاريخ:</span>
              <span class="meta-value">${today}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">السورة الكريمة:</span>
              <span class="meta-value">${surah.name} (${surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'})</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">الزمن المستغرق للتسميع:</span>
              <span class="meta-value">${timeStr}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">إجمالي عدد الآيات:</span>
              <span class="meta-value">${surah.numberOfAyahs} آية</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">الآيات التي بها أخطاء:</span>
              <span class="meta-value" style="color: ${mistakenAyahsList.length > 0 ? '#dc2626' : '#047857'}">
                ${mistakenAyahsList.length} آية
              </span>
            </div>
            <div class="meta-item">
              <span class="meta-label">حالة التسميع الكلية:</span>
              <span class="meta-value" style="color: ${mistakenAyahsList.length === 0 ? '#047857' : '#d97706'}">
                ${mistakenAyahsList.length === 0 ? 'متقن تماماً ✨' : 'يحتاج إلى تثبيت ومراجعة ⚠️'}
              </span>
            </div>
          </div>

          <div class="section-title"> تفصيل الأخطاء ومواضع التدقيق</div>
          
          <div style="position: relative; z-index: 10;">
            ${ayahsHtml}
          </div>

          <div class="footer-note">
            تم توليد هذا التقرير آلياً بواسطة منصة <strong>مُرْتَقَى</strong> لمساعدة حفظة القرآن الكريم.
            <br>
            <em>"خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ"</em>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

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

  const selectRandomIndexWithoutRepeating = (currentHist: number[]) => {
    const totalAyahs = surah.ayahs.length;
    if (totalAyahs <= 0) return 0;
    if (totalAyahs === 1) return 0;
    
    // Find all indices that have not been visited
    const unvisitedIndices: number[] = [];
    for (let i = 0; i < totalAyahs; i++) {
      if (!currentHist.includes(i)) {
        unvisitedIndices.push(i);
      }
    }

    if (unvisitedIndices.length === 0) {
      return -1; // All visited
    }

    // Pick a random index from the unvisited ones
    const randomIndex = Math.floor(Math.random() * unvisitedIndices.length);
    return unvisitedIndices[randomIndex];
  };

  const handleRestartTest = () => {
    setTestCompleted(false);
    if (settings.mode === 'random') {
      const initialRandIndex = selectRandomIndexWithoutRepeating([]);
      setRandomHistory([initialRandIndex]);
      setHistoryPointer(0);
      setCurrentIndex(initialRandIndex);
    } else {
      setCurrentIndex(0);
    }
    setRevealed(false);
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
        const maxQuestions = randomQuestionLimit === 'open' ? surah.ayahs.length : Math.min(randomQuestionLimit, surah.ayahs.length);
        if (randomHistory.length >= maxQuestions) {
          setTestCompleted(true);
          return;
        }

        const nextIndex = selectRandomIndexWithoutRepeating(randomHistory);
        if (nextIndex === -1) {
          // No more unique ayahs left
          setTestCompleted(true);
          return;
        }

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

  // Switch between Sequential, Random, and Reciter modes
  const handleModeChange = (mode: 'sequential' | 'random' | 'reciter') => {
    setSettings((prev) => ({ ...prev, mode }));
    setTestCompleted(false);
    if (mode === 'random') {
      const initialRandIndex = selectRandomIndexWithoutRepeating([]);
      setRandomHistory([initialRandIndex]);
      setHistoryPointer(0);
      setCurrentIndex(initialRandIndex);
    } else if (mode === 'sequential') {
      setCurrentIndex(0);
    } else if (mode === 'reciter') {
      setTimeElapsed(0);
      setIsTimerRunning(true);
      setIsAuditMode(false);
      setMistakenAyahs({});
      setMistakenWords({});
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

      {/* Reciter Timer & Controls Bar */}
      {settings.mode === 'reciter' && (
        <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-sm border border-amber-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Timer className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-right">
              <span className="block text-[11px] text-slate-500 font-semibold">مؤقت التسميع الجاري</span>
              <span className="text-base font-bold text-slate-800 font-mono">
                {Math.floor(timeElapsed / 60).toString().padStart(2, '0')}:{(timeElapsed % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          <div className="text-right flex-1 px-4">
            <span className="block text-[11px] text-emerald-800/60 font-semibold">توجيه التسميع</span>
            <p className="text-xs font-semibold text-slate-700">
              {isAuditMode 
                ? "انقر على الكلمات المحددة التي أخطأت فيها لتلوينها وتصديرها بتقرير الـ PDF."
                : "اقرأ السورة غيباً، وانقر مرتين (Double Click) على أي آية أخطأت فيها لتسجيلها."
              }
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isAuditMode ? (
              <button
                onClick={() => {
                  setIsTimerRunning(false);
                  setIsAuditMode(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4" />
                إنهاء وتدقيق الأخطاء
              </button>
            ) : (
              <button
                onClick={handleExportPDF}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                تصدير PDF بالتقرير
              </button>
            )}
          </div>
        </div>
      )}

      {settings.mode === 'reciter' ? (
        /* Reciter Panel View */
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-md border border-emerald-100/60 space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#047857_0.4px,transparent_0.4px)] [background-size:16px_16px] opacity-[0.03] pointer-events-none" />

          {isAuditMode ? (
            <div className="relative z-10 space-y-6 text-right" dir="rtl">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-emerald-50">
                <div>
                  <h3 className="text-lg font-bold text-emerald-950">🔍 مرحلة تدقيق الكلمات المحددة</h3>
                  <p className="text-xs text-slate-500">انقر على الكلمات التي أخطأت فيها لتظليلها باللون الأحمر.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsAuditMode(false);
                      setIsTimerRunning(true);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    استئناف التسميع
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    تصدير تقرير الأخطاء PDF
                  </button>
                </div>
              </div>

              {Object.keys(mistakenAyahs).filter(num => mistakenAyahs[parseInt(num)]).length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <Award className="w-12 h-12 text-amber-500 mx-auto" />
                  <h4 className="text-base font-bold text-emerald-950">لم يتم تسجيل أي أخطاء!</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">ما شاء الله، لقد أتممت تسميع السورة الكريمة بنجاح ودون أخطاء مسجلة.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {surah.ayahs
                    .filter(a => mistakenAyahs[a.numberInSurah])
                    .map((ayah) => {
                      const cleanText = ayah.text.replace(/[\u064B-\u0652]/g, '').replace(/^(بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ)/, '').trim();
                      const wordsFromText = cleanText.split(/\s+/);
                      const originalWords = ayah.text.split(/\s+/);
                      const actualWordsToUse = originalWords.length === wordsFromText.length ? originalWords : wordsFromText;
                      
                      return (
                        <div key={ayah.number} className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between text-xs text-amber-800 font-semibold border-b border-amber-100/50 pb-2">
                            <span>الآية {ayah.numberInSurah}</span>
                            <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full text-[10px]">اضغط على الكلمات الخاطئة لتلوينها</span>
                          </div>
                          <div 
                            className="text-2xl text-slate-850 text-right leading-relaxed font-medium"
                            style={{ fontFamily: "'Amiri', serif", direction: 'rtl' }}
                          >
                            {actualWordsToUse.map((word, wordIdx) => {
                              const isWordMistaken = mistakenWords[ayah.numberInSurah]?.[wordIdx];
                              return (
                                <span
                                  key={wordIdx}
                                  onClick={() => {
                                    setMistakenWords(prev => {
                                      const ayahWords = prev[ayah.numberInSurah] || {};
                                      return {
                                        ...prev,
                                        [ayah.numberInSurah]: {
                                          ...ayahWords,
                                          [wordIdx]: !ayahWords[wordIdx]
                                        }
                                      };
                                    });
                                  }}
                                  className={`inline-block px-1 mx-1 rounded cursor-pointer transition-all select-none hover:bg-amber-100 ${
                                    isWordMistaken
                                      ? 'text-red-600 bg-red-50 border-b-2 border-red-500 font-bold'
                                      : 'text-slate-800'
                                  }`}
                                >
                                  {word}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          ) : (
            /* Active Recitation View */
            <div className="relative z-10 space-y-8 text-right" dir="rtl">
              <div className="text-center space-y-2 border-b border-emerald-50 pb-4">
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">تلاوة وتسميع كامل السورة</span>
                <p className="text-xs text-slate-500">انقر نقراً مزدوجاً (Double Click) على الآية التي وقعت في خطأ لتسجيلها باللون الأحمر.</p>
              </div>

              {surah.number !== 1 && surah.number !== 9 && (
                <div 
                  className="text-emerald-800 font-bold text-2xl text-center font-sans tracking-wide leading-loose opacity-80"
                  style={{ fontFamily: "'Amiri', serif" }}
                >
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </div>
              )}

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar text-right">
                {surah.ayahs.map((ayah) => {
                  const isMarkedMistake = !!mistakenAyahs[ayah.numberInSurah];
                  
                  return (
                    <div
                      key={ayah.number}
                      onDoubleClick={() => {
                        setMistakenAyahs(prev => ({
                          ...prev,
                          [ayah.numberInSurah]: !prev[ayah.numberInSurah]
                        }));
                      }}
                      className={`group p-4 rounded-2xl border transition-all duration-300 select-none cursor-pointer text-right ${
                        isMarkedMistake
                          ? 'bg-red-50/80 border-red-200 hover:bg-red-50 shadow-sm'
                          : 'bg-[#fdfdfa] hover:bg-emerald-50/30 border-emerald-100/40 hover:border-emerald-100/80'
                      }`}
                      title="انقر مرتين لتسجيل خطأ في هذه الآية"
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center justify-center text-[10px] font-bold font-mono">
                            {ayah.numberInSurah}
                          </span>
                          {isMarkedMistake && (
                            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              ⚠️ تم تسجيل خطأ (انقر مرتين للإلغاء)
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          انقر نقراً مزدوجاً لتحديد خطأ
                        </span>
                      </div>
                      <p 
                        className={`text-2xl leading-relaxed font-medium transition-colors text-right ${
                          isMarkedMistake ? 'text-red-950 font-semibold' : 'text-slate-800'
                        }`}
                        style={{ fontFamily: "'Amiri', serif" }}
                      >
                        {ayah.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Main Flashcard Panel */
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-md border border-emerald-100/60 flex flex-col justify-between min-h-[420px] relative overflow-hidden">
          
          {/* Background watermark/art */}
          <div className="absolute inset-0 bg-[radial-gradient(#047857_0.4px,transparent_0.4px)] [background-size:16px_16px] opacity-[0.03] pointer-events-none" />

          {testCompleted ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-8 relative z-10"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                <Award className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-emerald-950 dark:text-white">لقد أتممت الاختبار العشوائي بنجاح! ✨</h3>
                <p className="text-sm text-slate-500 dark:text-emerald-300 max-w-md mx-auto">
                  لقد راجعت بنجاح {randomHistory.length} آية عشوائية من سورة {surah.name} دون تكرار للآيات.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <button
                  onClick={handleRestartTest}
                  className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-700/10 transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  إعادة الاختبار
                </button>
                <button
                  onClick={onBack}
                  className="px-6 py-3 bg-slate-100 dark:bg-emerald-800 dark:text-white dark:hover:bg-emerald-700 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  العودة للمصحف
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Card Header: Ayah Details & Status Pill */}
              <div className="flex items-center justify-between relative z-10 border-b border-emerald-50 pb-5 mb-6">
                <div className="flex items-center gap-2">
                  {settings.mode === 'random' ? (
                    <div className="flex items-center gap-1.5 bg-emerald-50/50 p-1 rounded-xl border border-emerald-100/30">
                      <span className="text-[10px] font-bold text-emerald-800 px-1">عدد الأسئلة:</span>
                      <select
                        value={randomQuestionLimit}
                        onChange={(e) => {
                          const val = e.target.value === 'open' ? 'open' : parseInt(e.target.value);
                          setRandomQuestionLimit(val);
                          const maxQ = val === 'open' ? surah.ayahs.length : val;
                          if (randomHistory.length < maxQ) {
                            setTestCompleted(false);
                          } else {
                            setTestCompleted(true);
                          }
                        }}
                        className="bg-white text-emerald-950 text-[11px] font-bold py-1 px-2 rounded-lg border border-emerald-100 focus:outline-none focus:ring-1 focus:ring-emerald-700/20"
                      >
                        <option value="open">حد مفتوح</option>
                        <option value="5">5 أسئلة</option>
                        <option value="10">10 أسئلة</option>
                        <option value="15">15 سؤالاً</option>
                        <option value="20">20 سؤالاً</option>
                        <option value="30">30 سؤالاً</option>
                      </select>
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>

                <div className="text-right font-mono text-xs md:text-sm text-emerald-800/80 font-bold bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100/40">
                  {settings.mode === 'random' ? (
                    `السؤال ${historyPointer + 1} من ${randomQuestionLimit === 'open' ? surah.ayahs.length : Math.min(randomQuestionLimit, surah.ayahs.length)}`
                  ) : (
                    `الآية ${currentAyah.numberInSurah} من ${surah.numberOfAyahs}`
                  )}
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
        </>
      )}

      </div>
      )}

      {/* Keyboard hints */}
      {settings.mode !== 'reciter' && (
        <div className="hidden md:flex justify-center items-center gap-6 text-[11px] text-emerald-800/50 font-medium font-sans">
          <span><kbd className="bg-white px-2 py-0.5 border border-emerald-100 rounded shadow-sm text-xs font-mono">Space</kbd> كشف/إخفاء</span>
          <span><kbd className="bg-white px-2 py-0.5 border border-emerald-100 rounded shadow-sm text-xs font-mono">→</kbd> الآية التالية</span>
          <span><kbd className="bg-white px-2 py-0.5 border border-emerald-100 rounded shadow-sm text-xs font-mono">←</kbd> الآية السابقة</span>
          <span><kbd className="bg-white px-2 py-0.5 border border-emerald-100 rounded shadow-sm text-xs font-mono">M</kbd> إتقان</span>
          <span><kbd className="bg-white px-2 py-0.5 border border-emerald-100 rounded shadow-sm text-xs font-mono">R</kbd> مراجعة</span>
          <span><kbd className="bg-white px-2 py-0.5 border border-emerald-100 rounded shadow-sm text-xs font-mono">P</kbd> تشغيل التلاوة</span>
        </div>
      )}

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
                <div className="grid grid-cols-3 bg-emerald-50 p-1 rounded-xl border border-emerald-100 gap-1">
                  <button
                    onClick={() => handleModeChange('sequential')}
                    className={`text-center py-2 text-[10px] font-bold rounded-lg transition-all ${
                      settings.mode === 'sequential'
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'text-emerald-800 hover:bg-emerald-100/40'
                    }`}
                  >
                    متسلسلة
                  </button>
                  <button
                    onClick={() => handleModeChange('random')}
                    className={`text-center py-2 text-[10px] font-bold rounded-lg transition-all ${
                      settings.mode === 'random'
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'text-emerald-800 hover:bg-emerald-100/40'
                    }`}
                  >
                    عشوائي
                  </button>
                  <button
                    onClick={() => handleModeChange('reciter')}
                    className={`text-center py-2 text-[10px] font-bold rounded-lg transition-all ${
                      settings.mode === 'reciter'
                        ? 'bg-emerald-700 text-white shadow-sm'
                        : 'text-emerald-800 hover:bg-emerald-100/40'
                    }`}
                  >
                    المُسَمِّع
                  </button>
                </div>
              </div>

              {/* Setting: Random Test Question Count (Show only if random mode selected) */}
              {settings.mode === 'random' && (
                <div className="space-y-2 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                  <label className="text-sm font-semibold text-emerald-950 block">عدد أسئلة الاختبار العشوائي</label>
                  <div className="grid grid-cols-5 gap-1">
                    {(['open', 5, 10, 15, 20] as const).map((opt) => {
                      const isSelected = randomQuestionLimit === opt;
                      const label = opt === 'open' ? 'مفتوح' : `${opt}`;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setRandomQuestionLimit(opt);
                            const maxQ = opt === 'open' ? surah.ayahs.length : opt;
                            if (randomHistory.length < maxQ) {
                              setTestCompleted(false);
                            } else {
                              setTestCompleted(true);
                            }
                          }}
                          className={`text-center py-2 text-xs font-bold rounded-lg transition-all border ${
                            isSelected
                              ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                              : 'bg-white text-emerald-800 border-emerald-100 hover:bg-emerald-100/40'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-emerald-800/60 font-medium">
                    سيقوم التطبيق باختيار آيات عشوائية دون تكرار حتى تنتهي من عدد الأسئلة المحدد.
                  </p>
                </div>
              )}

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
