/**
 * International Holiday and Special Calendar Utility Helpers
 * Supports country holiday calculations and Japanese/Chinese date overlays.
 */

export interface HolidayItem {
  name: string;
  country: string; // "US" | "JP" | "CN" | "DE" | "UK"
}

export function getHolidaysForDate(date: Date, countryFilter: string): HolidayItem[] {
  const m = date.getMonth() + 1; // 1-12
  const d = date.getDate();
  const y = date.getFullYear();
  const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon ...

  const holidays: HolidayItem[] = [];

  const add = (name: string, country: string) => {
    if (countryFilter === "ALL" || countryFilter === country) {
      holidays.push({ name, country });
    }
  };

  // Fixed International Holidays
  if (m === 1 && d === 1) {
    add("New Year's Day", "US");
    add("Gantan (New Year)", "JP");
    add("Yuan Dan", "CN");
    add("Neujahr", "DE");
    add("New Year's Day", "UK");
  }
  if (m === 2 && d === 14) add("Valentine's Day", "US");
  if (m === 3 && d === 3) add("Hinamatsuri", "JP");
  if (m === 4 && d === 29) add("Showa Day", "JP");
  if (m === 5 && d === 1) {
    add("Labor Day", "CN");
    add("Tag der Arbeit", "DE");
  }
  if (m === 5 && d === 3) add("Constitution Day", "JP");
  if (m === 5 && d === 5) add("Children's Day", "JP");
  if (m === 7 && d === 4) add("Independence Day", "US");
  if (m === 7 && d === 7) add("Tanabata", "JP");
  if (m === 10 && d === 1) add("National Day", "CN");
  if (m === 10 && d === 3) add("German Unity Day", "DE");
  if (m === 10 && d === 31) add("Halloween", "US");
  if (m === 11 && d === 3) add("Culture Day", "JP");
  if (m === 11 && d === 23) add("Labor Thanksgiving", "JP");
  if (m === 12 && d === 25) {
    add("Christmas Day", "US");
    add("Christmas Day", "UK");
    add("Weihnachten", "DE");
  }

  // Dynamic floating holidays (US Thanksgiving = 4th Thurs of Nov)
  if (m === 11 && dayOfWeek === 4 && d >= 22 && d <= 28) {
    add("Thanksgiving Day", "US");
  }

  return holidays;
}

/**
 * Calculates Japanese Era (Reiwa, Heisei, Showa) string
 */
export function getJapaneseEraString(date: Date): string {
  const y = date.getFullYear();
  if (y >= 2019) {
    const r = y - 2018;
    return r === 1 ? "令和元年" : `令和${r}年`;
  }
  if (y >= 1989) {
    const h = y - 1988;
    return h === 1 ? "平成元年" : `平成${h}年`;
  }
  return `${y}年`;
}

/**
 * Calculates approximate Chinese Lunar date label
 */
export function getLunarDateString(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const lunarMonths = [
    "正月", "二月", "三月", "四月", "五月", "六月",
    "七月", "八月", "九月", "十月", "冬月", "腊月"
  ];
  const lunarDays = [
    "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
    "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
    "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"
  ];

  const monthIdx = (m - 1) % 12;
  const dayIdx = (d - 1) % 30;
  return `${lunarMonths[monthIdx]}${lunarDays[dayIdx]}`;
}
