export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: 'Meccan' | 'Medinan';
}

export interface Ayah {
  number: number; // Global ayah number (1 to 6236)
  text: string;
  numberInSurah: number;
  juz: number;
  page: number;
}

export interface SurahDetail extends Surah {
  ayahs: Ayah[];
}

export type MemorizationStatus = 'mastered' | 'needs_practice' | 'none';

export interface UserProgress {
  // Key: surahNumber, Value: another map of { ayahNumberInSurah: status }
  [surahNumber: number]: {
    [ayahNumberInSurah: number]: MemorizationStatus;
  };
}

export type AppView = 'home' | 'test' | 'stats';

export interface TestSettings {
  wordsToShow: number; // Number of words to show at the beginning of the ayah (default 3)
  mode: 'sequential' | 'random' | 'reciter';
  includeBismillah: boolean;
  audioReciter: string;
}
