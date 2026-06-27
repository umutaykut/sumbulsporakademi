import { prisma } from "@/lib/prisma";

type ScoreKey = "effortScore" | "disciplineScore" | "teamworkScore" | "confidenceResponsibilityScore" | "footballGoalScore";
type ObservationRow = Awaited<ReturnType<typeof getRows>>[number];

function getRows(start: Date, end: Date) {
  return prisma.observation.findMany({
    where: { session: { date: { gte: start, lt: end } }, student: { isActive: true } },
    include: { session: true, student: { include: { group: true } } },
    orderBy: { session: { date: "asc" } },
  });
}

function average(rows: ObservationRow[], key: ScoreKey) {
  const values = rows.map(row => row[key]).filter((value): value is number => value !== null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function developmentText(area: string, value: number | null) {
  if (value === null) return `${area} alanında değerlendirme oluşturmak için yeterli gözlem bulunmuyor.`;
  if (value >= 4) return `${area} alanında güçlü ve istikrarlı gelişim gösterdi.`;
  if (value >= 2.75) return `${area} alanında yaş düzeyine uygun gelişimini sürdürüyor.`;
  return `${area} alanının desteklenmesi ve gelecek ay düzenli olarak takip edilmesi önerilir.`;
}

const areaNames: Record<ScoreKey, string> = {
  effortScore: "Çaba ve antrenmana katılım",
  disciplineScore: "Kurallara uyum ve disiplin",
  teamworkScore: "Takım uyumu",
  confidenceResponsibilityScore: "Özgüven ve sorumluluk",
  footballGoalScore: "Futbol gelişimi",
};

export async function generateMonthlyReports(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const rows = await getRows(start, end);
  const byStudent = new Map<string, ObservationRow[]>();
  for (const row of rows) byStudent.set(row.studentId, [...(byStudent.get(row.studentId) ?? []), row]);
  let created = 0, updated = 0, skipped = 0;

  for (const [studentId, observations] of byStudent) {
    const student = observations[0].student;
    const present = observations.filter(row => row.attendance === "PRESENT");
    const absent = observations.filter(row => row.attendance === "ABSENT").length;
    const excused = observations.filter(row => row.attendance === "EXCUSED").length;
    const scores = Object.fromEntries(Object.keys(areaNames).map(key => [key, average(present, key as ScoreKey)])) as Record<ScoreKey, number | null>;
    const strengths = (Object.keys(areaNames) as ScoreKey[]).filter(key => (scores[key] ?? 0) >= 4).map(key => areaNames[key]);
    const supportNeeds = (Object.keys(areaNames) as ScoreKey[]).filter(key => scores[key] !== null && scores[key]! < 2.75).map(key => areaNames[key]);

    const weekly = new Map<number, number[]>();
    for (const row of present) {
      const values = (Object.keys(areaNames) as ScoreKey[]).map(key => row[key]).filter((value): value is number => value !== null);
      if (!values.length) continue;
      const week = Math.ceil(row.session.date.getDate() / 7);
      weekly.set(week, [...(weekly.get(week) ?? []), values.reduce((sum, value) => sum + value, 0) / values.length]);
    }
    const weekNumbers = [...weekly.keys()].sort((a, b) => a - b);
    const weekAverage = (week: number | undefined) => {
      const values = week ? weekly.get(week) ?? [] : [];
      return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    };
    const firstWeek = weekAverage(weekNumbers[0]);
    const lastWeek = weekAverage(weekNumbers.at(-1));
    const trendText = firstWeek !== null && lastWeek !== null && lastWeek - firstWeek >= .4
      ? "Ay içinde düzenli ve gözle görülür bir gelişim gösterdi."
      : "Gelişim süreci yaş düzeyi ve bireysel ihtiyaçları doğrultusunda takip edilmeye devam edecektir.";

    const attendanceSummary = `${observations.length} çalışmanın ${present.length} tanesine katıldı${absent ? `, ${absent} çalışmaya katılmadı` : ""}${excused ? `, ${excused} mazeretli katılım kaydı bulunuyor` : ""}.`;
    const footballText = developmentText("Futbol hedefleri", scores.footballGoalScore);
    const effortText = developmentText("Çaba ve antrenmana katılım", scores.effortScore);
    const disciplineText = developmentText("Kurallara uyum ve disiplin", scores.disciplineScore);
    const teamworkText = developmentText("Takım uyumu", scores.teamworkScore);
    const confidenceText = developmentText("Özgüven ve sorumluluk", scores.confidenceResponsibilityScore);
    const strengthsText = strengths.length ? `${strengths.join(", ")} güçlü gelişim alanları olarak öne çıktı.` : "Güçlü yönleri düzenli gözlemlerle görünür hâle getirilmeye devam edecektir.";
    const supportNeedsText = supportNeeds.length ? `${supportNeeds.join(", ")} alanlarının desteklenmesi önerilir.` : "Gelişim alanlarında belirgin bir yoğun destek ihtiyacı gözlenmedi.";
    const nextMonthGoal = supportNeeds.length ? `Gelecek ay öncelikli hedef: ${supportNeeds[0].toLocaleLowerCase("tr-TR")} alanını oyun ve tekrarlarla desteklemek.` : "Gelecek ay mevcut güçlü gelişimi sürdürmek ve futbol hedeflerini oyun içinde daha istikrarlı uygulamak.";
    const monthName = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(start);
    const draftText = `${monthName} Aylık Gelişim Karnesi

Katılım Özeti
${attendanceSummary}

Futbol Gelişimi
${footballText}

Çaba ve Antrenmana Katılım
${effortText}

Kurallara Uyum / Disiplin
${disciplineText}

Takım Uyumu
${teamworkText}

Özgüven / Sorumluluk
${confidenceText}

Güçlü Yönler
${strengthsText}

Desteklenecek Yönler
${supportNeedsText}

Gelecek Ay Hedefi
${nextMonthGoal}

Genel Gelişim
${trendText}`;

    await prisma.monthlyReport.upsert({
      where: { studentId_month_year: { studentId, month, year } },
      update: { groupId: student.groupId, attendanceSummary, footballDevelopmentText: footballText, effortText, disciplineText, teamworkText, confidenceText, strengthsText, supportNeedsText, nextMonthGoal },
      create: { studentId, groupId: student.groupId, month, year, attendanceSummary, footballDevelopmentText: footballText, effortText, disciplineText, teamworkText, confidenceText, strengthsText, supportNeedsText, nextMonthGoal },
    });
    const existing = await prisma.parentReport.findFirst({ where: { studentId, reportType: "MONTHLY", month, year } });
    if (existing && ["APPROVED", "PUBLISHED"].includes(existing.status)) { skipped++; continue; }
    if (existing) {
      await prisma.parentReport.update({ where: { id: existing.id }, data: { draftText, coordinatorEditedText: null, status: "DRAFT", approvedByCoordinatorId: null, publishedAt: null } });
      updated++;
    } else {
      await prisma.parentReport.create({ data: { studentId, reportType: "MONTHLY", month, year, draftText, status: "DRAFT" } });
      created++;
    }
  }
  return { created, updated, skipped, observationCount: rows.length, studentCount: byStudent.size };
}
