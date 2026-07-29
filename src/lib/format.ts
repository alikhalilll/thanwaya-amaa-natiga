const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toArabicDigits(input: number | string): string {
  const s = typeof input === 'number' ? input.toString() : input;
  return s.replace(/[0-9]/g, (d) => ARABIC_DIGITS[+d]);
}

export function fromArabicDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

export function pct(degree: number, max = 320): number {
  return Math.round((degree / max) * 1000) / 10;
}

export function degreeColor(degree: number, max = 320): string {
  const p = degree / max;
  if (p >= 0.95) return 'from-emerald-400 to-emerald-600';
  if (p >= 0.85) return 'from-teal-400 to-cyan-600';
  if (p >= 0.7) return 'from-sky-400 to-blue-600';
  if (p >= 0.5) return 'from-amber-400 to-orange-600';
  return 'from-rose-400 to-red-600';
}

export function statusStyle(statusIndex: number): {
  label: string;
  chip: string;
  ring: string;
} {
  switch (statusIndex) {
    case 0:
      return {
        label: 'ناجح دور أول',
        chip: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
        ring: 'ring-emerald-400/40',
      };
    case 1:
      return {
        label: 'دور ثانٍ',
        chip: 'bg-amber-500/15 text-amber-200 border-amber-400/30',
        ring: 'ring-amber-400/40',
      };
    case 2:
      return {
        label: 'راسب دور أول',
        chip: 'bg-rose-500/15 text-rose-200 border-rose-400/30',
        ring: 'ring-rose-400/40',
      };
    case 3:
      return {
        label: 'غياب كلي',
        chip: 'bg-slate-500/15 text-slate-200 border-slate-400/30',
        ring: 'ring-slate-400/40',
      };
    default:
      return {
        label: 'غير معروف',
        chip: 'bg-slate-500/15 text-slate-200 border-slate-400/30',
        ring: 'ring-slate-400/40',
      };
  }
}

const AR_TATWEEL = /ـ/g;
const AR_DIACRITICS = /[ً-ٰٟ]/g;

export function normalizeArabic(s: string): string {
  return s
    .replace(AR_TATWEEL, '')
    .replace(AR_DIACRITICS, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}
