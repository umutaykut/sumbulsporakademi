import { AppShell } from "@/components/AppShell";
import { ReportApprovalCard } from "@/components/ReportApprovalCard";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateMonthlyReportsAction } from "@/app/actions";

export default async function Reports({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(["COORDINATOR", "ADMIN"]);
  const q = await searchParams;
  const now = new Date();
  const reports = await prisma.parentReport.findMany({
    include: { student: true },
    orderBy: { createdAt: "desc" },
  });
  return <AppShell user={user}>
    <div className="topbar"><div><div className="eyebrow">Onay zinciri</div><h1 className="title">Veli bilgilendirmeleri</h1><p className="muted">Taslağı düzenleyin, onaylayın ve ardından veliye yayımlayın.</p></div></div>
    <div className="notice" style={{marginBottom:16}}>Veli yalnızca <strong>Yayımlandı</strong> durumundaki metinleri görebilir. Onaylanan bir metin yayımlanana kadar içeride kalır.</div>
    {q.uretildi && <div className="notice success" style={{marginBottom:16}}>{q.gozlem} günlük gözlem analiz edildi; {q.yeni} yeni aylık karne oluşturuldu, {q.guncel} taslak güncellendi, daha önce onaylanan/yayımlanan {q.korundu} karne korundu.</div>}
    {q.islem === "kaydedildi" && <div className="notice success" style={{marginBottom:16}}>Düzenleme kaydedildi; koordinatör onayı bekliyor.</div>}
    {q.islem === "onaylandi" && <div className="notice success" style={{marginBottom:16}}>Bilgilendirme onaylandı. Şimdi veliye yayımlayabilirsiniz.</div>}
    {q.islem === "yayimlandi" && <div className="notice success" style={{marginBottom:16}}>Bilgilendirme veli panelinde yayımlandı.</div>}
    {q.hata && <div className="notice" style={{marginBottom:16}}>{q.hata}</div>}
    <section className="card" style={{marginBottom:16}}>
      <div className="section-head"><div><div className="eyebrow">Ham veri göstermeden</div><h2>Aylık gelişim karnesi oluştur</h2></div><span className="badge">Gelişim dili</span></div>
      <p className="muted">Antrenörün günlük katılım ve gözlem verileri ay boyunca birleştirilir. Sayısal puanlar ve günlük notlar veli metnine aktarılmaz.</p>
      <form action={generateMonthlyReportsAction} className="row" style={{flexWrap:"wrap"}}>
        <div className="field"><label>Ay</label><input className="input" type="number" name="month" min={1} max={12} defaultValue={now.getMonth() + 1} required/></div>
        <div className="field"><label>Yıl</label><input className="input" type="number" name="year" min={2020} defaultValue={now.getFullYear()} required/></div>
        <button className="button" style={{alignSelf:"flex-end"}}>Aylık karne taslaklarını oluştur</button>
      </form>
    </section>
    <div className="grid">
      {reports.map(report => <ReportApprovalCard
        key={report.id}
        id={report.id}
        studentName={`${report.student.firstName} ${report.student.lastName}`}
        reportType={report.reportType}
        text={report.coordinatorEditedText ?? report.draftText}
        status={report.status}
      />)}
      {!reports.length && <div className="card muted">Henüz bilgilendirme taslağı yok.</div>}
    </div>
  </AppShell>;
}
