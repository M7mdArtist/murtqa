import React, { useMemo } from 'react';
import { Surah, UserProgress } from '../types';
import { Award, CheckCircle2, AlertCircle, BookOpen, Clock, Play, HelpCircle, Flame } from 'lucide-react';
import { motion } from 'motion/react';

interface ProgressStatsProps {
  surahs: Surah[];
  userProgress: UserProgress;
  onJumpToAyah: (surahNumber: number, ayahNumberInSurah: number) => void;
}

export default function ProgressStats({ surahs, userProgress, onJumpToAyah }: ProgressStatsProps) {
  
  // Calculate total stats
  const stats = useMemo(() => {
    let totalQuranAyahs = 6236; // total verses in Quran
    let masteredCount = 0;
    let practiceCount = 0;
    let reviewedSurahsCount = 0;

    const needsPracticeList: Array<{
      surahNumber: number;
      surahName: string;
      ayahNumberInSurah: number;
    }> = [];

    // Map of surah numbers to names for quick lookup
    const surahNamesMap = new Map<number, string>();
    surahs.forEach(s => surahNamesMap.set(s.number, s.name));

    Object.entries(userProgress).forEach(([surahNumStr, ayahsMap]) => {
      const surahNum = parseInt(surahNumStr);
      const surahName = surahNamesMap.get(surahNum) || `سورة ${surahNum}`;
      
      let hasProgress = false;

      Object.entries(ayahsMap).forEach(([ayahNumStr, status]) => {
        const ayahNum = parseInt(ayahNumStr);
        if (status === 'mastered') {
          masteredCount++;
          hasProgress = true;
        } else if (status === 'needs_practice') {
          practiceCount++;
          hasProgress = true;
          needsPracticeList.push({
            surahNumber: surahNum,
            surahName,
            ayahNumberInSurah: ayahNum
          });
        }
      });

      if (hasProgress) {
        reviewedSurahsCount++;
      }
    });

    const totalReviewedAyahs = masteredCount + practiceCount;
    const masteryPercentage = totalReviewedAyahs > 0 ? Math.round((masteredCount / totalReviewedAyahs) * 100) : 0;
    const overallQuranPercentage = ((masteredCount / totalQuranAyahs) * 100).toFixed(2);

    return {
      masteredCount,
      practiceCount,
      reviewedSurahsCount,
      totalReviewedAyahs,
      masteryPercentage,
      overallQuranPercentage,
      needsPracticeList: needsPracticeList.sort((a, b) => a.surahNumber - b.surahNumber || a.ayahNumberInSurah - b.ayahNumberInSurah)
    };
  }, [surahs, userProgress]);

  // Encouragement quote based on progress
  const encouragement = useMemo(() => {
    if (stats.masteredCount === 0) {
      return {
        quote: "«خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»",
        author: "حديث شريف (رواه البخاري)",
        tip: "اختر سورة قصيرة من جزء عمّ لتبدأ أولى خطوات المراجعة والتسميع."
      };
    } else if (stats.percent < 10) {
      return {
        quote: "«الَّذِي يَقْرَأُ الْقُرْآنَ وَهُوَ مَاهِرٌ بِهِ مَعَ السَّفَرَةِ الْكِرَامِ الْبَرَرَةِ»",
        author: "حديث شريف (متفق عليه)",
        tip: "خطوة ممتازة! الاستمرار والمداومة هما سر رسوخ الحفظ في الصدر."
      };
    } else {
      return {
        quote: "«يُقَالُ لِصَاحِبِ الْقُرْآنِ: اقْرَأْ وَارْتَقِ وَرَتِّلْ كَمَا كُنْتَ تُرَتِّلُ فِي الدُّنْيَا»",
        author: "حديث شريف (رواه الترمذي)",
        tip: "أنت تبلي بلاءً رائعاً! خصص وقتاً ثابتاً يومياً لتثبيت الآيات التي تحتاج مراجعة."
      };
    }
  }, [stats.masteredCount]);

  return (
    <div className="space-y-8" id="progress-stats-root" dir="rtl">
      
      {/* Hadith Banner card */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-6 md:p-8 rounded-3xl shadow-md border border-emerald-700/30 text-center space-y-3 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-700/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
        
        <Award className="w-8 h-8 text-amber-400 mx-auto opacity-90 animate-bounce" />
        <p className="text-sm md:text-base text-amber-300 font-bold" style={{ fontFamily: "'Amiri', serif" }}>
          قال رسول الله ﷺ:
        </p>
        <h3 className="text-xl md:text-2xl font-sans font-bold leading-relaxed max-w-2xl mx-auto italic" style={{ fontFamily: "'Amiri', serif" }}>
          {encouragement.quote}
        </h3>
        <p className="text-xs text-emerald-100/75 font-semibold font-sans">{encouragement.author}</p>
        <div className="h-px bg-emerald-700/50 w-24 mx-auto my-1" />
        <p className="text-sm text-amber-200 font-medium">💡 نصيحة: {encouragement.tip}</p>
      </div>

      {/* Bento Grid Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Mastered Card */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100/50 shadow-sm flex items-center justify-between gap-4">
          <div className="space-y-1 text-right">
            <span className="text-xs text-emerald-800/60 font-bold block">الآيات المتقنة</span>
            <span className="text-2xl font-black text-emerald-950 font-mono block">
              {stats.masteredCount}
            </span>
            <span className="text-[10px] text-emerald-800 font-medium block">
              من أصل 6236 آية ({stats.overallQuranPercentage}%)
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Needs Practice Card */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100/50 shadow-sm flex items-center justify-between gap-4">
          <div className="space-y-1 text-right">
            <span className="text-xs text-emerald-800/60 font-bold block">آيات بحاجة لمراجعة</span>
            <span className="text-2xl font-black text-amber-600 font-mono block">
              {stats.practiceCount}
            </span>
            <span className="text-[10px] text-amber-700 font-medium block">
              تحتاج إلى إعادة تسميع وتثبيت
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Reviewed Surahs Card */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100/50 shadow-sm flex items-center justify-between gap-4">
          <div className="space-y-1 text-right">
            <span className="text-xs text-emerald-800/60 font-bold block">السور التي روجعت</span>
            <span className="text-2xl font-black text-emerald-950 font-mono block">
              {stats.reviewedSurahsCount}
            </span>
            <span className="text-[10px] text-emerald-800 font-medium block">
              من أصل 114 سورة في القرآن
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        {/* Mastery Ratio Card */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100/50 shadow-sm flex items-center justify-between gap-4">
          <div className="space-y-1 text-right">
            <span className="text-xs text-emerald-800/60 font-bold block">نسبة الإتقان المنجز</span>
            <span className="text-2xl font-black text-emerald-950 font-mono block">
              {stats.masteryPercentage}%
            </span>
            <span className="text-[10px] text-emerald-800 font-medium block">
              نسبة المتقن من مجمل ما روجع
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
            <Flame className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Two-Column Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Mistakes log (بحاجة لمراجعة) - 2 Columns */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-emerald-100/50 shadow-sm space-y-4">
          <div>
            <h3 className="text-lg font-bold text-emerald-950">سجل الآيات التي تحتاج لمراجعة</h3>
            <p className="text-xs text-emerald-800/60">
              قائمة بالآيات التي قمت بتعليمها بـ "بحاجة لمراجعة" أثناء التسميع. اضغط على أي آية للذهاب إليها مباشرة وإعادة اختبارها.
            </p>
          </div>

          {stats.needsPracticeList.length > 0 ? (
            <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2.5 divide-y divide-emerald-50 scrollbar-thin">
              {stats.needsPracticeList.map((item, idx) => (
                <div 
                  key={`${item.surahNumber}-${item.ayahNumberInSurah}`}
                  onClick={() => onJumpToAyah(item.surahNumber, item.ayahNumberInSurah)}
                  className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 group cursor-pointer hover:bg-emerald-50/40 p-2 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center text-xs font-bold font-mono">
                      {idx + 1}
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-950 group-hover:text-emerald-700 transition-colors">
                        {item.surahName}
                      </span>
                      <span className="text-xs text-emerald-800/60 mr-2">
                        الآية {item.ayahNumberInSurah}
                      </span>
                    </div>
                  </div>

                  <button className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100/60 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                    <Play className="w-3 h-3 ml-0.5 shrink-0" />
                    تسميع الآن
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-emerald-100 rounded-xl space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-950">صدرك خالٍ من الأخطاء والحمد لله</h4>
              <p className="text-xs text-emerald-800/60 max-w-xs mx-auto">
                جميع الآيات التي قمت بمراجعتها حتى الآن متقنة تماماً! استمر في التسميع وسجل ما يشكل عليك.
              </p>
            </div>
          )}
        </div>

        {/* Informative / Memorization Guidelines Column */}
        <div className="bg-emerald-50/50 rounded-2xl p-6 border border-emerald-100/60 shadow-sm space-y-5">
          <h3 className="text-base font-bold text-emerald-950">قواعد ذهبية لمراجعة متينة</h3>
          
          <ul className="space-y-4 text-xs text-emerald-900/80 leading-relaxed list-none">
            <li className="flex gap-2">
              <span className="text-emerald-700 font-bold">١.</span>
              <p>
                <strong>البدايات والروابط:</strong> ركز دائماً على ربط أواخر الآيات بأوائلها، فهذا هو المكان الأكثر شيوعاً للتوقف أو الخطأ.
              </p>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-700 font-bold">٢.</span>
              <p>
                <strong>الاستماع النشط:</strong> استخدم زر التلاوة الصوتية المتوفر في لوحة التسميع للاستماع للآية بصوت الشيخ العفاسي فور الانتهاء من تسميعها لتصحيح التجويد ومخارج الحروف.
              </p>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-700 font-bold">٣.</span>
              <p>
                <strong>المراجعة المتراكمة:</strong> الآيات المعلمة باللون الأصفر (بحاجة لمراجعة) يجب أن تعاد يومياً حتى تتقنها تماماً وتنقلها للون الأخضر.
              </p>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-700 font-bold">٤.</span>
              <p>
                <strong>التبسيط بالتسميع:</strong> يمكنك تغيير خيارات الكلمات المفتاحية في الإعدادات من كلمة واحدة وحتى ٦ كلمات حسب مستوى ثبات حفظك للسورة.
              </p>
            </li>
          </ul>
        </div>

      </div>

    </div>
  );
}
