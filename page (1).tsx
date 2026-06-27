"use server";
import { prisma } from "@/lib/prisma";
import { createSession, requireUser, roleHome } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { containsLabel, dayProgram } from "@/lib/constants";
import { generateBadgeSuggestionsForMonth } from "@/lib/badge-engine";
import { generateMonthlyReports } from "@/lib/report-engine";
import { sendPreRegistrationWhatsApp } from "@/lib/whatsapp";
import { randomBytes, randomInt } from "crypto";

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?hata=${encodeURIComponent(message)}`);
}

export type PasswordResetState = {
  ok: boolean;
  message: string;
  username?: string;
  temporaryPassword?: string;
  createdAt?: string;
} | null;

export async function loginAction(form: FormData) {
  const login = String(form.get("login") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await prisma.user.findFirst({ where: { isActive: true, OR: [{ email: login }, { username: login }] } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) redirectWithError("/login", "Kullanıcı adı veya şifre hatalı.");
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession({ id: user.id, name: user.name, role: user.role, mustChangePassword: user.mustChangePassword });
  if (user.mustChangePassword) redirect("/sifre-degistir");
  redirect(roleHome(user.role));
}

export async function logoutAction() { (await cookies()).delete("sumbul_session"); redirect("/login"); }

export async function changePasswordAction(form: FormData) {
  const { getSession } = await import("@/lib/auth");
  const user = await getSession();
  if (!user) redirect("/login");
  const password = String(form.get("password") ?? "");
  if (!/^(?=.*[A-Za-zÇĞİÖŞÜçğıöşü])(?=.*\d).{8,}$/.test(password)) redirectWithError("/sifre-degistir", "Şifre en az 8 karakter, bir harf ve bir rakam içermelidir.");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 12), mustChangePassword: false } });
  await createSession({ ...user, mustChangePassword: false });
  redirect(roleHome(user.role));
}

function slugify(value: string) { return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, ""); }
async function uniqueUsername(name: string) { const base = `veli.${slugify(name)}`; let value = base, n = 2; while (await prisma.user.findUnique({ where: { username: value } })) value = `${base}${n++}`; return value; }

export async function createStudentAction(form: FormData) {
  await requireUser(["COORDINATOR", "ADMIN"]);
  const firstName = String(form.get("firstName")), lastName = String(form.get("lastName")), groupId = String(form.get("groupId"));
  const parentName = String(form.get("parentName") ?? ""), parentEmail = String(form.get("parentEmail") ?? "").toLowerCase(), createParent = form.get("createParent") === "on";
  const temporaryPassword = `Sumbul2026-${randomInt(1000, 9999)}`;
  const existingParent = createParent ? await prisma.user.findUnique({ where: { email: parentEmail } }) : null;
  if (existingParent && existingParent.role !== "PARENT") {
    redirect(`/coordinator/sporcular?hata=${encodeURIComponent("Bu e-posta başka bir kullanıcı rolüne ait. Farklı bir veli e-postası kullanınız.")}`);
  }
  const result = await prisma.$transaction(async tx => {
    const student = await tx.student.create({ data: { firstName, lastName, birthDate: new Date(String(form.get("birthDate"))), groupId, parentName, parentPhone: String(form.get("parentPhone") ?? ""), parentEmail, healthNotes: String(form.get("healthNotes") ?? "") } });
    let username = "", accountCreated = false;
    if (createParent) {
      let parent;
      if (existingParent) {
        parent = await tx.user.update({ where: { id: existingParent.id }, data: { isActive: true } });
        username = parent.username;
      } else {
        username = await uniqueUsername(parentName);
        parent = await tx.user.create({ data: { name: parentName, email: parentEmail, username, passwordHash: await bcrypt.hash(temporaryPassword, 12), role: "PARENT", mustChangePassword: true, temporaryPasswordCreatedAt: new Date() } });
        accountCreated = true;
      }
      await tx.parentStudent.create({ data: { parentUserId: parent.id, studentId: student.id, relationType: String(form.get("relationType") ?? "OTHER") as "MOTHER" | "FATHER" | "GUARDIAN" | "OTHER" } });
    }
    return { student, username, accountCreated };
  });
  revalidatePath("/coordinator/sporcular");
  const query = result.accountCreated
    ? `?olusturuldu=1&veli=${encodeURIComponent(parentName)}&ogrenci=${encodeURIComponent(`${firstName} ${lastName}`)}&kullanici=${encodeURIComponent(result.username)}&sifre=${encodeURIComponent(temporaryPassword)}`
    : result.username ? `?olusturuldu=1&veliBaglandi=1&kullanici=${encodeURIComponent(result.username)}` : "?olusturuldu=1";
  redirect(`/coordinator/sporcular${query}`);
}

export async function updateStudentAction(form: FormData) {
  await requireUser(["COORDINATOR", "ADMIN"]);
  const studentId = String(form.get("studentId") ?? "");
  const firstName = String(form.get("firstName") ?? "").trim();
  const lastName = String(form.get("lastName") ?? "").trim();
  const groupId = String(form.get("groupId") ?? "");
  const birthDate = new Date(String(form.get("birthDate") ?? ""));
  const parentName = String(form.get("parentName") ?? "").trim();
  const parentPhone = String(form.get("parentPhone") ?? "").trim();
  const parentEmail = String(form.get("parentEmail") ?? "").trim().toLowerCase();
  const healthNotes = String(form.get("healthNotes") ?? "").trim();
  const relationType = String(form.get("relationType") ?? "OTHER") as "MOTHER" | "FATHER" | "GUARDIAN" | "OTHER";
  if (!firstName || !lastName || !groupId || Number.isNaN(birthDate.getTime())) {
    redirectWithError(`/coordinator/sporcular/${studentId}/duzenle`, "Zorunlu sporcu bilgileri eksik veya geçersiz.");
  }
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { parents: { include: { parent: true } } },
  });
  if (!student) redirectWithError("/coordinator/sporcular", "Sporcu bulunamadı.");
  const parentLink = student.parents[0];
  if (parentLink && parentEmail) {
    const emailOwner = await prisma.user.findUnique({ where: { email: parentEmail } });
    if (emailOwner && emailOwner.id !== parentLink.parentUserId) {
      redirectWithError(`/coordinator/sporcular/${studentId}/duzenle`, "Bu veli e-postası başka bir kullanıcı hesabında kayıtlı.");
    }
  }
  await prisma.$transaction(async tx => {
    await tx.student.update({
      where: { id: studentId },
      data: { firstName, lastName, birthDate, groupId, parentName, parentPhone, parentEmail, healthNotes },
    });
    if (parentLink) {
      await tx.parentStudent.update({ where: { id: parentLink.id }, data: { relationType } });
      await tx.user.update({
        where: { id: parentLink.parentUserId },
        data: { name: parentName || parentLink.parent.name, ...(parentEmail ? { email: parentEmail } : {}) },
      });
    }
  });
  revalidatePath("/coordinator/sporcular");
  revalidatePath("/coordinator/veli-iletisim");
  revalidatePath("/coach/dashboard");
  revalidatePath("/coach/gozlem");
  revalidatePath("/coach/veli-iletisim");
  revalidatePath("/parent/dashboard");
  redirect("/coordinator/sporcular?guncellendi=1");
}

export async function createPreRegistrationAction(form: FormData) {
  if (String(form.get("website") ?? "")) redirect("/on-kayit?basarili=1");
  const studentFirstName = String(form.get("studentFirstName") ?? "").trim();
  const studentLastName = String(form.get("studentLastName") ?? "").trim();
  const birthDate = new Date(String(form.get("birthDate") ?? ""));
  const parentName = String(form.get("parentName") ?? "").trim();
  const parentPhone = String(form.get("parentPhone") ?? "").trim();
  const parentEmail = String(form.get("parentEmail") ?? "").trim().toLowerCase();
  const preferredGroupId = String(form.get("preferredGroupId") ?? "") || null;
  const note = String(form.get("note") ?? "").trim().slice(0, 500);
  const consentAccepted = form.get("consentAccepted") === "on";
  if (!studentFirstName || !studentLastName || Number.isNaN(birthDate.getTime()) || !parentName || !parentPhone || !consentAccepted) {
    redirectWithError("/on-kayit", "Zorunlu alanları doldurup bilgilendirme onayını işaretleyiniz.");
  }
  const registration = await prisma.preRegistration.create({
    data: { studentFirstName, studentLastName, birthDate, parentName, parentPhone, parentEmail: parentEmail || null, preferredGroupId, note: note || null, consentAccepted, whatsappStatus: "PARENT_SEND_PENDING" },
  });
  revalidatePath("/coordinator/on-kayitlar");
  redirect(`/on-kayit?basarili=1&kayit=${encodeURIComponent(registration.id)}`);
}

async function updatePreRegistrationStatus(id: string, status: "CONTACTED" | "APPROVED" | "REJECTED") {
  await requireUser(["COORDINATOR", "ADMIN"]);
  await prisma.preRegistration.update({ where: { id }, data: { status } });
  revalidatePath("/coordinator/on-kayitlar");
  redirect(`/coordinator/on-kayitlar?islem=${status.toLocaleLowerCase("tr-TR")}`);
}

export async function markPreRegistrationContactedAction(form: FormData) {
  return updatePreRegistrationStatus(String(form.get("id") ?? ""), "CONTACTED");
}

export async function approvePreRegistrationAction(form: FormData) {
  return updatePreRegistrationStatus(String(form.get("id") ?? ""), "APPROVED");
}

export async function rejectPreRegistrationAction(form: FormData) {
  return updatePreRegistrationStatus(String(form.get("id") ?? ""), "REJECTED");
}

export async function retryPreRegistrationWhatsAppAction(form: FormData) {
  await requireUser(["COORDINATOR", "ADMIN"]);
  await sendPreRegistrationWhatsApp(String(form.get("id") ?? ""));
  revalidatePath("/coordinator/on-kayitlar");
  redirect("/coordinator/on-kayitlar?islem=whatsapp");
}

export async function resetParentPasswordAction(
  _previousState: PasswordResetState,
  form: FormData,
): Promise<PasswordResetState> {
  const coordinator = await requireUser(["COORDINATOR", "ADMIN"]);
  const parentUserId = String(form.get("parentUserId") ?? "");
  const parent = await prisma.user.findFirst({
    where: { id: parentUserId, role: "PARENT", isActive: true },
    select: { id: true, username: true },
  });
  if (!parent) return { ok: false, message: "Aktif veli hesabı bulunamadı." };

  const temporaryPassword = `Akademi!${randomInt(1000, 9999)}-${randomBytes(2).toString("hex").toUpperCase()}`;
  const createdAt = new Date();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: parent.id },
      data: {
        passwordHash: await bcrypt.hash(temporaryPassword, 12),
        mustChangePassword: true,
        temporaryPasswordCreatedAt: createdAt,
      },
    }),
    prisma.passwordResetAudit.create({
      data: { targetUserId: parent.id, performedByUserId: coordinator.id, createdAt },
    }),
  ]);

  revalidatePath("/coordinator/sporcular");
  return {
    ok: true,
    message: "Yeni geçici şifre oluşturuldu. Bu bilgi yalnızca şimdi gösterilir.",
    username: parent.username,
    temporaryPassword,
    createdAt: createdAt.toISOString(),
  };
}

export async function archiveStudentAction(form: FormData) {
  const coordinator = await requireUser(["COORDINATOR", "ADMIN"]);
  const studentId = String(form.get("studentId") ?? "");
  const reason = String(form.get("reason") ?? "Kayıt sonlandırma talebi").trim().slice(0, 250);
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { parents: true },
  });
  if (!student) redirectWithError("/coordinator/sporcular", "Sporcu bulunamadı.");

  await prisma.$transaction(async tx => {
    await tx.student.update({
      where: { id: student.id },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        deactivationReason: reason || "Kayıt sonlandırma talebi",
        deactivatedByUserId: coordinator.id,
      },
    });
    for (const link of student.parents) {
      const activeStudentCount = await tx.parentStudent.count({
        where: {
          parentUserId: link.parentUserId,
          studentId: { not: student.id },
          student: { isActive: true },
        },
      });
      if (activeStudentCount === 0) {
        await tx.user.update({ where: { id: link.parentUserId }, data: { isActive: false } });
      }
    }
  });
  revalidatePath("/coordinator/sporcular");
  revalidatePath("/parent/dashboard");
  redirect("/coordinator/sporcular?arsivlendi=1");
}

export async function restoreStudentAction(form: FormData) {
  await requireUser(["COORDINATOR", "ADMIN"]);
  const studentId = String(form.get("studentId") ?? "");
  const student = await prisma.student.findUnique({ where: { id: studentId }, include: { parents: true } });
  if (!student) redirectWithError("/coordinator/sporcular", "Sporcu bulunamadı.");
  await prisma.$transaction([
    prisma.student.update({
      where: { id: student.id },
      data: { isActive: true, deactivatedAt: null, deactivationReason: null, deactivatedByUserId: null },
    }),
    ...student.parents.map(link => prisma.user.update({
      where: { id: link.parentUserId },
      data: { isActive: true },
    })),
  ]);
  revalidatePath("/coordinator/sporcular");
  revalidatePath("/parent/dashboard");
  redirect("/coordinator/sporcular?geriAlindi=1");
}

export async function saveObservationsAction(form: FormData) {
  const user = await requireUser(["COACH"]);
  const accepted = await prisma.coachStandardsAcceptance.findUnique({ where: { coachId: user.id } });
  if (!accepted) redirect("/coach/standartlar");
  const groupId = String(form.get("groupId"));
  const allowed = await prisma.coachGroup.findUnique({ where: { coachId_groupId: { coachId: user.id, groupId } } });
  if (!allowed) redirect("/yetkisiz");
  const students = await prisma.student.findMany({ where: { groupId, isActive: true } });
  const now = new Date(), program = dayProgram(now);
  const session = await prisma.session.upsert({ where: { date_groupId: { date: new Date(now.toISOString().slice(0,10)), groupId } }, update: {}, create: { date: new Date(now.toISOString().slice(0,10)), dayOfWeek: now.getDay(), weekNumber: Math.ceil(now.getDate()/7), groupId, coachId: user.id, ...program, hasPool: now.getDay() === 6, hasFilm: now.getDay() === 6 && [2,4].includes(Math.ceil(now.getDate()/7)) } });
  for (const student of students) {
    const attendance = String(form.get(`${student.id}.attendance`) ?? "PRESENT") as "PRESENT" | "ABSENT" | "EXCUSED";
    const note = String(form.get(`${student.id}.note`) ?? "").trim();
    if (containsLabel(note)) redirect(`/coach/gozlem?hata=${encodeURIComponent("Bu ifade çocuğu etiketleyebilir. Lütfen davranışa ve gelişime odaklanan bir ifade kullanınız.")}`);
    const score = (key: string) => attendance === "PRESENT" ? Number(form.get(`${student.id}.${key}`) ?? 3) : null;
    const data = { coachId: user.id, attendance, effortScore: score("effort"), disciplineScore: score("discipline"), teamworkScore: score("teamwork"), confidenceResponsibilityScore: score("confidence"), footballGoalScore: score("football"), note: note || null, flaggedNote: false };
    const old = await prisma.observation.findUnique({ where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } } });
    const saved = await prisma.observation.upsert({ where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } }, update: data, create: { sessionId: session.id, studentId: student.id, ...data } });
    if (old) await prisma.observationEditHistory.create({ data: { observationId: saved.id, editedByUserId: user.id, oldValueJson: JSON.stringify(old), newValueJson: JSON.stringify(saved) } });
  }
  await generateBadgeSuggestionsForMonth(now.getFullYear(), now.getMonth() + 1);
  revalidatePath("/coach/dashboard"); redirect("/coach/dashboard?kaydedildi=1");
}

export type ReportActionState = { ok: boolean; message: string } | null;

export async function generateMonthlyReportsAction(form: FormData) {
  await requireUser(["COORDINATOR", "ADMIN"]);
  const month = Number(form.get("month"));
  const year = Number(form.get("year"));
  if (month < 1 || month > 12 || year < 2020) redirectWithError("/coordinator/raporlar", "Ay veya yıl geçersiz.");
  const result = await generateMonthlyReports(year, month);
  revalidatePath("/coordinator/raporlar");
  redirect(`/coordinator/raporlar?uretildi=1&yeni=${result.created}&guncel=${result.updated}&korundu=${result.skipped}&gozlem=${result.observationCount}`);
}

export async function reportAction(_previousState: ReportActionState, form: FormData): Promise<ReportActionState> {
  const user = await requireUser(["COORDINATOR", "ADMIN"]);
  const id = String(form.get("id")), intent = String(form.get("intent"));
  const text = String(form.get("text") ?? "").trim();
  if (!text) return { ok: false, message: "Bilgilendirme metni boş bırakılamaz." };
  const report = await prisma.parentReport.findUnique({ where: { id }, include: { student: true } });
  if (!report) return { ok: false, message: "Bilgilendirme kaydı bulunamadı." };
  if (!report.student.isActive) return { ok: false, message: "Arşivlenmiş sporcu için veli yayını yapılamaz." };

  if (intent === "save") {
    await prisma.parentReport.update({ where: { id }, data: { status: "EDITED", coordinatorEditedText: text, approvedByCoordinatorId: null, publishedAt: null } });
    revalidatePath("/coordinator/raporlar");
    return { ok: true, message: "Düzenleme kaydedildi; koordinatör onayı bekliyor." };
  }
  if (intent === "approve") {
    await prisma.parentReport.update({ where: { id }, data: { status: "APPROVED", coordinatorEditedText: text, approvedByCoordinatorId: user.id, publishedAt: null } });
    revalidatePath("/coordinator/raporlar");
    return { ok: true, message: "Bilgilendirme onaylandı. Veliye açmak için şimdi yayımlayabilirsiniz." };
  }
  if (intent === "publish") {
    if (report.status !== "APPROVED") return { ok: false, message: "Önce bilgilendirmeyi onaylamalısınız." };
    await prisma.parentReport.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    revalidatePath("/coordinator/raporlar");
    revalidatePath("/parent/dashboard");
    return { ok: true, message: "Bilgilendirme veli panelinde yayımlandı." };
  }
  return { ok: false, message: "Geçersiz işlem." };
}

async function runReportFormAction(intent: "save" | "approve" | "publish", form: FormData) {
  const user = await requireUser(["COORDINATOR", "ADMIN"]);
  const id = String(form.get("id") ?? "");
  const text = String(form.get("text") ?? "").trim();
  if (!text) redirectWithError("/coordinator/raporlar", "Bilgilendirme metni boş bırakılamaz.");
  const report = await prisma.parentReport.findUnique({ where: { id }, include: { student: true } });
  if (!report) redirectWithError("/coordinator/raporlar", "Bilgilendirme kaydı bulunamadı.");
  if (!report.student.isActive) redirectWithError("/coordinator/raporlar", "Arşivlenmiş sporcu için veli yayını yapılamaz.");

  if (intent === "save") {
    await prisma.parentReport.update({ where: { id }, data: { status: "EDITED", coordinatorEditedText: text, approvedByCoordinatorId: null, publishedAt: null } });
    revalidatePath("/coordinator/raporlar");
    redirect("/coordinator/raporlar?islem=kaydedildi");
  }
  if (intent === "approve") {
    await prisma.parentReport.update({ where: { id }, data: { status: "APPROVED", coordinatorEditedText: text, approvedByCoordinatorId: user.id, publishedAt: null } });
    revalidatePath("/coordinator/raporlar");
    redirect("/coordinator/raporlar?islem=onaylandi");
  }
  if (report.status !== "APPROVED") redirectWithError("/coordinator/raporlar", "Önce bilgilendirmeyi onaylamalısınız.");
  await prisma.parentReport.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
  revalidatePath("/coordinator/raporlar");
  revalidatePath("/parent/dashboard");
  redirect("/coordinator/raporlar?islem=yayimlandi");
}

export async function saveReportFormAction(form: FormData) {
  return runReportFormAction("save", form);
}

export async function approveReportFormAction(form: FormData) {
  return runReportFormAction("approve", form);
}

export async function publishReportFormAction(form: FormData) {
  return runReportFormAction("publish", form);
}

export async function createBadgeSuggestionAction(form: FormData) {
  const coordinator = await requireUser(["COORDINATOR", "ADMIN"]);
  const studentId = String(form.get("studentId") ?? "");
  const badgeId = String(form.get("badgeId") ?? "");
  const month = Number(form.get("month"));
  const year = Number(form.get("year"));
  const reason = String(form.get("reason") ?? "").trim().slice(0, 500);
  const [student, badge] = await Promise.all([
    prisma.student.findFirst({ where: { id: studentId, isActive: true } }),
    prisma.badge.findFirst({ where: { id: badgeId, isActive: true } }),
  ]);
  if (!student || !badge || !reason || month < 1 || month > 12) redirectWithError("/coordinator/rozetler", "Rozet bilgileri eksik veya geçersiz.");
  await prisma.badgeSuggestion.upsert({
    where: { studentId_month_year_badgeId: { studentId, month, year, badgeId } },
    update: { reason, status: "SUGGESTED", coordinatorId: coordinator.id, rejectionReason: null },
    create: { studentId, month, year, badgeId, reason, status: "SUGGESTED", coordinatorId: coordinator.id },
  });
  revalidatePath("/coordinator/rozetler");
  redirect("/coordinator/rozetler?onerildi=1");
}

export async function generateBadgeSuggestionsAction(form: FormData) {
  await requireUser(["COORDINATOR", "ADMIN"]);
  const month = Number(form.get("month"));
  const year = Number(form.get("year"));
  if (month < 1 || month > 12 || year < 2020) redirectWithError("/coordinator/rozetler", "Ay veya yıl geçersiz.");
  const result = await generateBadgeSuggestionsForMonth(year, month);
  revalidatePath("/coordinator/rozetler");
  redirect(`/coordinator/rozetler?hesaplandi=1&yeni=${result.created}&guncel=${result.updated}&gozlem=${result.observationCount}`);
}

export async function badgeSuggestionAction(form: FormData) {
  const coordinator = await requireUser(["COORDINATOR", "ADMIN"]);
  const id = String(form.get("id") ?? "");
  const intent = String(form.get("intent") ?? "");
  const suggestion = await prisma.badgeSuggestion.findUnique({ where: { id } });
  if (!suggestion) redirectWithError("/coordinator/rozetler", "Rozet önerisi bulunamadı.");
  if (intent === "approve") {
    await prisma.badgeSuggestion.update({ where: { id }, data: { status: "COORDINATOR_APPROVED", coordinatorId: coordinator.id, rejectionReason: null } });
  } else if (intent === "publish") {
    if (suggestion.status !== "COORDINATOR_APPROVED") redirectWithError("/coordinator/rozetler", "Rozeti yayımlamadan önce onaylamalısınız.");
    await prisma.badgeSuggestion.update({ where: { id }, data: { status: "PUBLISHED", coordinatorId: coordinator.id } });
    revalidatePath("/parent/dashboard");
  } else if (intent === "reject") {
    await prisma.badgeSuggestion.update({ where: { id }, data: { status: "REJECTED", coordinatorId: coordinator.id, rejectionReason: String(form.get("rejectionReason") ?? "Koordinatör tarafından uygun bulunmadı.").slice(0, 250) } });
  }
  revalidatePath("/coordinator/rozetler");
  redirect("/coordinator/rozetler?guncellendi=1");
}

async function runBadgeFormAction(intent: "approve" | "publish" | "reject", form: FormData) {
  const coordinator = await requireUser(["COORDINATOR", "ADMIN"]);
  const id = String(form.get("id") ?? "");
  const suggestion = await prisma.badgeSuggestion.findUnique({ where: { id } });
  if (!suggestion) redirectWithError("/coordinator/rozetler", "Rozet önerisi bulunamadı.");
  if (intent === "approve") {
    await prisma.badgeSuggestion.update({ where: { id }, data: { status: "COORDINATOR_APPROVED", coordinatorId: coordinator.id, rejectionReason: null } });
    revalidatePath("/coordinator/rozetler");
    redirect("/coordinator/rozetler?islem=onaylandi");
  }
  if (intent === "publish") {
    if (suggestion.status !== "COORDINATOR_APPROVED") redirectWithError("/coordinator/rozetler", "Rozeti yayımlamadan önce onaylamalısınız.");
    await prisma.badgeSuggestion.update({ where: { id }, data: { status: "PUBLISHED", coordinatorId: coordinator.id } });
    revalidatePath("/coordinator/rozetler");
    revalidatePath("/parent/dashboard");
    redirect("/coordinator/rozetler?islem=yayimlandi");
  }
  const rejectionReason = String(form.get("rejectionReason") ?? "").trim();
  if (!rejectionReason) redirectWithError("/coordinator/rozetler", "Rozeti reddetmek için neden yazmalısınız.");
  await prisma.badgeSuggestion.update({ where: { id }, data: { status: "REJECTED", coordinatorId: coordinator.id, rejectionReason: rejectionReason.slice(0, 250) } });
  revalidatePath("/coordinator/rozetler");
  redirect("/coordinator/rozetler?islem=reddedildi");
}

export async function approveBadgeFormAction(form: FormData) {
  return runBadgeFormAction("approve", form);
}

export async function publishBadgeFormAction(form: FormData) {
  return runBadgeFormAction("publish", form);
}

export async function rejectBadgeFormAction(form: FormData) {
  return runBadgeFormAction("reject", form);
}
