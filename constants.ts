import { prisma } from "@/lib/prisma";

type ScoreKey = "effortScore" | "disciplineScore" | "teamworkScore" | "confidenceResponsibilityScore" | "footballGoalScore";

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function rounded(value: number | null) {
  return value === null ? "veri yok" : value.toFixed(1);
}

function includesAny(text: string, words: string[]) {
  const normalized = text.toLocaleLowerCase("tr-TR");
  return words.some(word => normalized.includes(word));
}

export async function generateBadgeSuggestionsForMonth(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const [observations, badges] = await Promise.all([
    prisma.observation.findMany({
      where: { session: { date: { gte: start, lt: end } }, student: { isActive: true } },
      include: { session: true, student: true },
      orderBy: { session: { date: "asc" } },
    }),
    prisma.badge.findMany({ where: { isActive: true } }),
  ]);
  const badgeByName = new Map(badges.map(badge => [badge.name, badge]));
  const byStudent = new Map<string, typeof observations>();
  for (const observation of observations) {
    const rows = byStudent.get(observation.studentId) ?? [];
    rows.push(observation);
    byStudent.set(observation.studentId, rows);
  }

  let created = 0;
  let updated = 0;
  for (const [studentId, rows] of byStudent) {
    const presentRows = rows.filter(row => row.attendance === "PRESENT");
    if (!presentRows.length) continue;
    const score = (key: ScoreKey) => average(presentRows.map(row => row[key]));
    const effort = score("effortScore");
    const discipline = score("disciplineScore");
    const teamwork = score("teamworkScore");
    const confidence = score("confidenceResponsibilityScore");
    const football = score("footballGoalScore");
    const attendanceRate = rows.length ? presentRows.length / rows.length : 0;
    const notes = presentRows.map(row => row.note ?? "").join(" ");

    const weekValues = new Map<number, number[]>();
    for (const row of presentRows) {
      const values = [row.effortScore, row.disciplineScore, row.teamworkScore, row.confidenceResponsibilityScore, row.footballGoalScore].filter((value): value is number => value !== null);
      if (!values.length) continue;
      const week = Math.ceil(row.session.date.getDate() / 7);
      const weekly = weekValues.get(week) ?? [];
      weekly.push(values.reduce((sum, value) => sum + value, 0) / values.length);
      weekValues.set(week, weekly);
    }
    const weeks = [...weekValues.keys()].sort((a, b) => a - b);
    const firstWeek = weeks.length ? average(weekValues.get(weeks[0]) ?? []) : null;
    const lastWeek = weeks.length ? average(weekValues.get(weeks.at(-1) ?? 0) ?? []) : null;
    const growth = firstWeek !== null && lastWeek !== null ? lastWeek - firstWeek : null;

    const footballWeeks = new Map<number, number[]>();
    for (const row of presentRows) {
      if (row.footballGoalScore === null) continue;
      const week = Math.ceil(row.session.date.getDate() / 7);
      footballWeeks.set(week, [...(footballWeeks.get(week) ?? []), row.footballGoalScore]);
    }
    const footballWeekNumbers = [...footballWeeks.keys()].sort((a, b) => a - b);
    const firstFootball = footballWeekNumbers.length ? average(footballWeeks.get(footballWeekNumbers[0]) ?? []) : null;
    const lastFootball = footballWeekNumbers.length ? average(footballWeeks.get(footballWeekNumbers.at(-1) ?? 0) ?? []) : null;

    const candidates: Array<{ name: string; qualifies: boolean; reason: string }> = [
      { name: "Disiplinli Sporcu", qualifies: attendanceRate >= .8 && (discipline ?? 0) >= 4, reason: `Katılım oranı %${Math.round(attendanceRate * 100)}, kurallara uyum ortalaması ${rounded(discipline)}.` },
      { name: "Takım Oyuncusu", qualifies: (teamwork ?? 0) >= 4 && includesAny(notes, ["paylaş", "arkadaş", "iletişim", "takım"]), reason: `Takım uyumu ortalaması ${rounded(teamwork)}; antrenör notlarında paylaşım, iletişim veya takım davranışı gözlendi.` },
      { name: "Cesur Oyuncu", qualifies: (confidence ?? 0) >= 4 && includesAny(notes, ["deneme", "1’e 1", "1'e 1", "şut", "cesaret", "sorumluluk"]), reason: `Özgüven/sorumluluk ortalaması ${rounded(confidence)}; deneme cesareti veya sorumluluk davranışı gözlendi.` },
      { name: "Gelişim Yıldızı", qualifies: (growth ?? 0) >= .6, reason: `İlk hafta genel ortalaması ${rounded(firstWeek)}, son hafta ${rounded(lastWeek)}; ay içinde ${growth?.toFixed(1)} puan gelişim görüldü.` },
      { name: "Teknik Gelişim", qualifies: (lastFootball ?? 0) >= 4 && (firstFootball === null || lastFootball! > firstFootball), reason: `Futbol hedefi ilk hafta ${rounded(firstFootball)}, son hafta ${rounded(lastFootball)}; teknik hedeflerde gelişim görüldü.` },
      { name: "Mücadeleci Sporcu", qualifies: (effort ?? 0) >= 4, reason: `Aylık çaba ortalaması ${rounded(effort)}; antrenmanlara güçlü çabayla katıldı.` },
      { name: "Arkadaşını Destekleyen Sporcu", qualifies: (teamwork ?? 0) >= 4 && includesAny(notes, ["arkadaşını destek", "arkadaşına destek", "yardım", "teşvik"]), reason: `Takım uyumu ortalaması ${rounded(teamwork)}; antrenör notlarında arkadaş desteği davranışı gözlendi.` },
      { name: "Sorumluluk Alan Sporcu", qualifies: (confidence ?? 0) >= 4 && includesAny(notes, ["lider", "kaptan", "görev", "sorumluluk"]), reason: `Özgüven/sorumluluk ortalaması ${rounded(confidence)}; görev alma veya liderlik davranışı gözlendi.` },
    ];

    for (const candidate of candidates.filter(item => item.qualifies)) {
      const badge = badgeByName.get(candidate.name);
      if (!badge) continue;
      const existing = await prisma.badgeSuggestion.findUnique({
        where: { studentId_month_year_badgeId: { studentId, month, year, badgeId: badge.id } },
      });
      if (existing && existing.status !== "SUGGESTED") continue;
      if (existing) {
        await prisma.badgeSuggestion.update({ where: { id: existing.id }, data: { reason: candidate.reason } });
        updated++;
      } else {
        await prisma.badgeSuggestion.create({ data: { studentId, month, year, badgeId: badge.id, reason: candidate.reason, status: "SUGGESTED" } });
        created++;
      }
    }
  }
  return { created, updated, observationCount: observations.length, studentCount: byStudent.size };
}
