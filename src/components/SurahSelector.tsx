import React, { useState, useMemo } from 'react';
import { Surah, UserProgress, MemorizationStatus } from '../types';
import { Search, BookOpen, Sparkles, Star, CheckCircle, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    // Remove diacritics (tashkeel)
    .replace(/[\u064B-\u0652]/g, '')
    // Remove superscript Alif
    .replace(/\u0670/g, '')
    // Remove Tatweel (Kashida)
    .replace(/\u0640/g, '')
    // Normalize Alifs
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize Teh Marbuta to Heh
    .replace(/ة/g, 'ه')
    // Normalize Alef Maksura to Yeh
    .replace(/ى/g, 'ي')
    .trim()
    .toLowerCase();
}

interface SurahSelectorProps {
  surahs: Surah[];
  userProgress: UserProgress;
  onSelectSurah: (surahNumber: number, mode: 'sequential' | 'random') => void;
}

export default function SurahSelector({ surahs, userProgress, onSelectSurah }: SurahSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Meccan' | 'Medinan'>('all');
  const [sortBy, setSortBy] = useState<'number' | 'name' | 'ayahs' | 'progress'>('number');

  // Helper to calculate progress for a specific surah
  const getSurahStats = (surahNumber: number, totalAyahs: number) => {
    const progress = userProgress[surahNumber] || {};
    let masteredCount = 0;
    let practiceCount = 0;

    Object.values(progress).forEach((status) => {
      if (status === 'mastered') masteredCount++;
      if (status === 'needs_practice') practiceCount++;
    });

    const percent = Math.round((masteredCount / totalAyahs) * 100);

    return {
      masteredCount,
      practiceCount,
      percent,
    };
  };

  // Filter and sort surahs
  const filteredSurahs = useMemo(() => {
    const normalizedQuery = normalizeArabicText(searchTerm);
    return surahs
      .filter((surah) => {
        const normalizedSurahName = normalizeArabicText(surah.name);
        const matchesSearch =
          normalizedSurahName.includes(normalizedQuery) ||
          surah.englishName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          surah.englishNameTranslation.toLowerCase().includes(searchTerm.toLowerCase()) ||
          surah.number.toString() === searchTerm;

        const matchesType = filterType === 'all' || surah.revelationType === filterType;

        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === 'number') {
          return a.number - b.number;
        }
        if (sortBy === 'name') {
          return a.englishName.localeCompare(b.englishName);
        }
        if (sortBy === 'ayahs') {
          return b.numberOfAyahs - a.numberOfAyahs;
        }
        if (sortBy === 'progress') {
          const statsA = getSurahStats(a.number, a.numberOfAyahs).percent;
          const statsB = getSurahStats(b.number, b.numberOfAyahs).percent;
          return statsB - statsA; // Higher progress first
        }
        return 0;
      });
  }, [surahs, searchTerm, filterType, sortBy, userProgress]);

  // Overall statistics
  const overallStats = useMemo(() => {
    let totalAyahs = 0;
    let totalMastered = 0;
    let totalPracticed = 0;

    surahs.forEach((s) => {
      totalAyahs += s.numberOfAyahs;
      const progress = userProgress[s.number] || {};
      Object.values(progress).forEach((status) => {
        if (status === 'mastered') totalMastered++;
        if (status === 'needs_practice') totalPracticed++;
      });
    });

    const overallPercent = totalAyahs > 0 ? Math.round((totalMastered / totalAyahs) * 100) : 0;

    return {
      totalAyahs,
      totalMastered,
      totalPracticed,
      percent: overallPercent,
    };
  }, [surahs, userProgress]);

  return (
    <div className="space-y-8" id="surah-selector-root">
      {/* Search and Filters Section */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-emerald-100/50 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-emerald-950 font-sans tracking-tight">قائمة سور القرآن الكريم</h2>
            <p className="text-sm text-emerald-800/70">ابحث عن السورة التي ترغب في مراجعتها وابدأ الاختبار الحفظي</p>
          </div>
          
          {/* Quick stats badge */}
          {overallStats.totalMastered > 0 && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl">
              <div className="text-right">
                <span className="block text-xs text-emerald-800 font-medium">مستوى الإتقان الكلي</span>
                <span className="text-sm font-bold text-emerald-950 font-mono">
                  {overallStats.totalMastered} / {overallStats.totalAyahs} آية ({overallStats.percent}%)
                </span>
              </div>
              <div className="relative w-10 h-10 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold font-mono text-sm">
                {overallStats.percent}%
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Search Input */}
          <div className="relative col-span-1 md:col-span-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600 w-5 h-5" />
            <input
              type="text"
              placeholder="ابحث باسم السورة (مثال: الفاتحة، البقرة)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-11 py-3 bg-emerald-50/50 border border-emerald-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 text-sm text-emerald-950 placeholder-emerald-800/40 font-medium text-right"
              dir="rtl"
              id="surah-search"
            />
          </div>

          {/* Revelation Type Filter */}
          <div className="flex bg-emerald-50/50 p-1 rounded-xl border border-emerald-100">
            <button
              onClick={() => setFilterType('all')}
              className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${
                filterType === 'all'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-emerald-800 hover:bg-emerald-100/50'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilterType('Meccan')}
              className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${
                filterType === 'Meccan'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-emerald-800 hover:bg-emerald-100/50'
              }`}
            >
              مكية
            </button>
            <button
              onClick={() => setFilterType('Medinan')}
              className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${
                filterType === 'Medinan'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-emerald-800 hover:bg-emerald-100/50'
              }`}
            >
              مدنية
            </button>
          </div>

          {/* Sort Filter */}
          <div className="flex bg-emerald-50/50 p-1 rounded-xl border border-emerald-100">
            <button
              onClick={() => setSortBy('number')}
              className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${
                sortBy === 'number'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-emerald-800 hover:bg-emerald-100/50'
              }`}
            >
              حسب الترتيب
            </button>
            <button
              onClick={() => setSortBy('ayahs')}
              className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${
                sortBy === 'ayahs'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-emerald-800 hover:bg-emerald-100/50'
              }`}
            >
              الأطول آياتٍ
            </button>
            <button
              onClick={() => setSortBy('progress')}
              className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${
                sortBy === 'progress'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-emerald-800 hover:bg-emerald-100/50'
              }`}
            >
              حسب الإتقان
            </button>
          </div>
        </div>
      </div>

      {/* Surahs Grid */}
      {filteredSurahs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSurahs.map((surah) => {
            const stats = getSurahStats(surah.number, surah.numberOfAyahs);
            return (
              <motion.div
                key={surah.number}
                layoutId={`surah-card-${surah.number}`}
                whileHover={{ y: -3, scale: 1.01 }}
                transition={{ duration: 0.2 }}
                className="bg-white hover:bg-emerald-50/5 rounded-2xl p-5 border border-emerald-100/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
                onClick={() => onSelectSurah(surah.number, 'sequential')}
              >
                {/* Upper portion: index & metadata & Arabic name */}
                <div className="flex items-start justify-between gap-3">
                  {/* Decorative Islamic Number Emblem */}
                  <div className="relative flex items-center justify-center w-11 h-11 shrink-0 bg-emerald-50 text-emerald-800 rounded-xl font-bold font-mono text-sm border border-emerald-100 group-hover:bg-emerald-700 group-hover:text-white group-hover:border-emerald-700 transition-colors">
                    {surah.number}
                  </div>

                  {/* Name in elegant Arabic script */}
                  <div className="text-right">
                    <h3 className="text-xl font-bold text-emerald-950 font-sans group-hover:text-emerald-800 transition-colors">
                      {surah.name}
                    </h3>
                    <div className="flex items-center gap-2 justify-end mt-1">
                      <span className="text-xs text-emerald-800/60 font-medium">
                        {surah.englishName}
                      </span>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-200" />
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                        surah.revelationType === 'Meccan' 
                          ? 'bg-amber-50 text-amber-800 border border-amber-100' 
                          : 'bg-teal-50 text-teal-800 border border-teal-100'
                      }`}>
                        {surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Middle portion: Stats and progress */}
                <div className="mt-5 pt-4 border-t border-emerald-50 space-y-3">
                  <div className="flex justify-between text-xs text-emerald-800/70">
                    <span className="font-mono">{surah.numberOfAyahs} آية</span>
                    <span>عدد الآيات</span>
                  </div>

                  {/* Progress Bar */}
                  {stats.masteredCount > 0 ? (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-medium text-emerald-800">
                        <span className="font-mono">{stats.percent}%</span>
                        <span>تم إتقان {stats.masteredCount} من {surah.numberOfAyahs}</span>
                      </div>
                      <div className="w-full h-1.5 bg-emerald-50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-l from-emerald-600 to-teal-500 rounded-full"
                          style={{ width: `${stats.percent}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1.5 text-xs text-emerald-800/40 py-1">
                      <span>لم يتم المراجعة بعد</span>
                      <HelpCircle className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                {/* Bottom portion: Actions */}
                <div className="mt-4 pt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onSelectSurah(surah.number, 'sequential')}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs py-2 rounded-xl border border-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-700/10 active:scale-95"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    مراجعة متتالية
                  </button>
                  <button
                    onClick={() => onSelectSurah(surah.number, 'random')}
                    className="flex-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 hover:border-emerald-300 font-medium text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    اختبار عشوائي
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-emerald-100 shadow-sm space-y-3">
          <BookOpen className="w-12 h-12 text-emerald-300 mx-auto" />
          <h3 className="text-lg font-bold text-emerald-950">لا توجد نتائج مطابقة لبحثك</h3>
          <p className="text-sm text-emerald-800/60 max-w-md mx-auto">
            تأكد من كتابة الاسم بشكل صحيح أو جرب استخدام أحرف أخرى (مثلاً بدون ال التعريف أو الهمزات).
          </p>
          <button
            onClick={() => { setSearchTerm(''); setFilterType('all'); }}
            className="mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
          >
            إعادة تعيين الفلاتر
          </button>
        </div>
      )}
    </div>
  );
}
