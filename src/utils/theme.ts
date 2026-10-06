export type AccentColorId = 'cyan' | 'emerald' | 'purple' | 'amber' | 'rose' | 'blue';

export interface AccentTheme {
  id: AccentColorId;
  name: string;
  enName: string;
  hex: string;
  glowRgb: string;
  desc: string;
  badgeClass: string;
  borderClass: string;
  bgTintClass: string;
  textClass: string;
  gradientClass: string;
}

export const ACCENT_THEMES: Record<AccentColorId, AccentTheme> = {
  cyan: {
    id: 'cyan',
    name: 'ฟ้าไอออน (Cyan)',
    enName: 'Cyan Arc',
    hex: '#06b6d4',
    glowRgb: '6, 182, 212',
    desc: 'สีฟ้าปฏิกรณ์ดั้งเดิมของ ATOM เท่ สว่าง ล้ำยุค',
    badgeClass: 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300',
    borderClass: 'border-cyan-500/40',
    bgTintClass: 'bg-cyan-950/40',
    textClass: 'text-cyan-400',
    gradientClass: 'from-cyan-500 to-blue-600',
  },
  emerald: {
    id: 'emerald',
    name: 'เขียวมรกต (Emerald)',
    enName: 'Emerald Tactical',
    hex: '#10b981',
    glowRgb: '16, 185, 129',
    desc: 'สีเขียวเทคโนโลยี สไตล์ F.R.I.D.A.Y. สบายตา ชัดเจน',
    badgeClass: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300',
    borderClass: 'border-emerald-500/40',
    bgTintClass: 'bg-emerald-950/40',
    textClass: 'text-emerald-400',
    gradientClass: 'from-emerald-500 to-teal-600',
  },
  purple: {
    id: 'purple',
    name: 'ม่วงควอนตัม (Purple)',
    enName: 'Quantum Purple',
    hex: '#a855f7',
    glowRgb: '168, 85, 247',
    desc: 'สีม่วงลึกลับทรงพลัง ดุดันแบบไซไฟยุคใหม่',
    badgeClass: 'bg-purple-950/80 border-purple-500/40 text-purple-300',
    borderClass: 'border-purple-500/40',
    bgTintClass: 'bg-purple-950/40',
    textClass: 'text-purple-400',
    gradientClass: 'from-purple-500 to-indigo-600',
  },
  amber: {
    id: 'amber',
    name: 'ทองอาร์ค (Amber)',
    enName: 'Iron Man Gold',
    hex: '#f59e0b',
    glowRgb: '245, 158, 11',
    desc: 'สีทองประกายเปลวเพลิง Mark VII ของ Tony Stark หรูหรา อบอุ่น',
    badgeClass: 'bg-amber-950/80 border-amber-500/40 text-amber-300',
    borderClass: 'border-amber-500/40',
    bgTintClass: 'bg-amber-950/40',
    textClass: 'text-amber-400',
    gradientClass: 'from-amber-500 to-orange-600',
  },
  rose: {
    id: 'rose',
    name: 'แดงคริมสัน (Crimson)',
    enName: 'Ultron Crimson',
    hex: '#f43f5e',
    glowRgb: '244, 63, 94',
    desc: 'สีแดงอาร์ครีแอคเตอร์ สไตล์ U.L.T.R.O.N. เข้มข้น ตื่นตัว ดุดัน',
    badgeClass: 'bg-rose-950/80 border-rose-500/40 text-rose-300',
    borderClass: 'border-rose-500/40',
    bgTintClass: 'bg-rose-950/40',
    textClass: 'text-rose-400',
    gradientClass: 'from-rose-500 to-red-600',
  },
  blue: {
    id: 'blue',
    name: 'น้ำเงินโคบอลต์ (Cobalt)',
    enName: 'Cobalt Deep Space',
    hex: '#3b82f6',
    glowRgb: '59, 130, 246',
    desc: 'สีน้ำเงินอวกาศ สุขุม นิ่ง ลึก น่าเชื่อถือ',
    badgeClass: 'bg-blue-950/80 border-blue-500/40 text-blue-300',
    borderClass: 'border-blue-500/40',
    bgTintClass: 'bg-blue-950/40',
    textClass: 'text-blue-400',
    gradientClass: 'from-blue-500 to-cyan-600',
  },
};

const STORAGE_KEY = 'atom_accent_color';

export function getSavedAccentColor(): AccentColorId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as AccentColorId;
    if (saved && ACCENT_THEMES[saved]) {
      return saved;
    }
  } catch (e) {
    console.warn('Failed to read accent color from localStorage:', e);
  }
  return 'cyan';
}

export function saveAccentColor(color: AccentColorId): void {
  try {
    localStorage.setItem(STORAGE_KEY, color);
    applyAccentColorToDOM(color);
  } catch (e) {
    console.warn('Failed to save accent color to localStorage:', e);
  }
}

export function applyAccentColorToDOM(color: AccentColorId): void {
  const theme = ACCENT_THEMES[color] || ACCENT_THEMES.cyan;
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.style.setProperty('--accent-hex', theme.hex);
    root.style.setProperty('--accent-rgb', theme.glowRgb);
    root.setAttribute('data-accent-color', color);
  }
}
