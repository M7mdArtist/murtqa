import { Surah, SurahDetail } from './types';

const BASE_URL = 'https://api.alquran.cloud/v1';

// Simple in-memory cache
const surahCache: { [key: number]: SurahDetail } = {};
let surahListCache: Surah[] | null = null;

export async function fetchSurahs(): Promise<Surah[]> {
  if (surahListCache) {
    return surahListCache;
  }

  try {
    const response = await fetch(`${BASE_URL}/surah`);
    if (!response.ok) {
      throw new Error('Failed to fetch Surah list');
    }
    const json = await response.json();
    if (json.code === 200 && json.status === 'OK') {
      surahListCache = json.data as Surah[];
      return surahListCache;
    }
    throw new Error(json.data || 'Invalid response from Quran API');
  } catch (error) {
    console.error('Error in fetchSurahs:', error);
    throw error;
  }
}

export async function fetchSurahDetail(surahNumber: number): Promise<SurahDetail> {
  if (surahCache[surahNumber]) {
    return surahCache[surahNumber];
  }

  try {
    // We use quran-uthmani for beautiful Arabic script with correct diacritics
    const response = await fetch(`${BASE_URL}/surah/${surahNumber}/quran-uthmani`);
    if (!response.ok) {
      throw new Error(`Failed to fetch details for Surah ${surahNumber}`);
    }
    const json = await response.json();
    if (json.code === 200 && json.status === 'OK') {
      const detail = json.data as SurahDetail;
      surahCache[surahNumber] = detail;
      return detail;
    }
    throw new Error(json.data || 'Invalid response from Quran API');
  } catch (error) {
    console.error(`Error in fetchSurahDetail for Surah ${surahNumber}:`, error);
    throw error;
  }
}

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

/**
 * Utility to clean or handle Bismillah at the beginning of the first verse.
 * Most Surahs in the quran-uthmani text start with Bismillah in the first Ayah.
 * We want to separate it so the user can see it as a header, but the actual quiz starts with the actual verse words.
 */
export function processAyahText(text: string, surahNumber: number, ayahNumberInSurah: number): {
  bismillah: string | null;
  cleanText: string;
} {
  // Surah 1 (Al-Fatiha) has Bismillah as the first actual Ayah.
  // Surah 9 (At-Tawbah) does not start with Bismillah.
  if (surahNumber === 1 || surahNumber === 9) {
    return { bismillah: null, cleanText: text };
  }

  if (ayahNumberInSurah === 1) {
    const normalizedText = normalizeArabicText(text);
    const normalizedBismillah = "بسم الله الرحمن الرحيم";
    
    if (normalizedText.startsWith(normalizedBismillah)) {
      let normIdx = 0;
      let origIdx = 0;
      
      while (normIdx < normalizedBismillah.length && origIdx < text.length) {
        const origChar = text[origIdx];
        const normOrigChar = normalizeArabicText(origChar);
        
        // If it's a diacritic or formatting character, it normalizes to empty string.
        // We skip it in the original text but don't advance the normalized index.
        if (normOrigChar === '' && origChar !== ' ') {
          origIdx++;
          continue;
        }
        
        const bismillahChar = normalizedBismillah[normIdx];
        if (normOrigChar === bismillahChar || (origChar === ' ' && bismillahChar === ' ')) {
          normIdx++;
          origIdx++;
        } else {
          break;
        }
      }
      
      if (normIdx === normalizedBismillah.length) {
        const bismillahPart = text.substring(0, origIdx).trim();
        const cleanTextPart = text.substring(origIdx).trim();
        return {
          bismillah: bismillahPart,
          cleanText: cleanTextPart || text
        };
      }
    }
  }

  return { bismillah: null, cleanText: text };
}

/**
 * Get the audio URL for a specific Ayah using global Ayah number.
 * Uses the high quality Sheikh Alafasy recitation.
 */
export function getAyahAudioUrl(globalAyahNumber: number, reciter: string = 'ar.alafasy'): string {
  // We can construct the audio URL from the public islamic.network CDN or return an API endpoint
  // Mishary Alafasy is the default
  return `https://cdn.islamic.network/quran/audio/128/${reciter}/${globalAyahNumber}.mp3`;
}

export const RECITERS = [
  { id: 'ar.alafasy', name: 'مشاري العفاسي (الأصل)', englishName: 'Mishary Alafasy' },
  { id: 'ar.abdurrahmaansudais', name: 'عبد الرحمن السديس', englishName: 'Abdul Rahman Al-Sudais' },
  { id: 'ar.hudhaify', name: 'علي الحذيفي', englishName: 'Ali Al-Huthaify' },
  { id: 'ar.husary', name: 'محمود خليل الحصري', englishName: 'Mahmoud Khalil Al-Husary' },
  { id: 'ar.mahermuaiqly', name: 'ماهر المعيقلي', englishName: 'Maher Al-Muaiqly' },
  { id: 'ar.minshawi', name: 'محمد صديق المنشاوي', englishName: 'Muhammad Siddiq Al-Minshawi' }
];
