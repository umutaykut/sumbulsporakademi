import { approveBadgeFormAction, createBadgeSuggestionAction, generateBadgeSuggestionsAction, publishBadgeFormAction, rejectBadgeFormAction } from "@/app/actions";
import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const statusLabels = {
  SUGGESTED: "Önerildi",
  COACH_REVIEWED: "Antrenör değerlendirdi",
  COORDINATOR_APPROVED: "Koordinatör onayladı",
  REJECTED: "Reddedildi",
  PUBLISHED: "Veliye yayımlandı",
} as const;

export default async function Badges({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(["COORDINATOR", "ADMIN"]);
  const q = await searchParams;
  const [students, badges, suggestions] = await Promise.all([
    prisma.student.findMany({ where: { isActive: true }, include: { group: true }, orderBy: [{ group: { ageMin: "asc" } }, { firstName: "asc" }] }),
    prisma.badge.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.badgeSuggestion.findMany({ include: { student: true, badge: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const now = new Date();
  return <AppShell user={user}>
    <div className="topbar"><div><div className="eyebrow">Gelişimi görünür kıl</div><h1 className="title">Rozet yönetimi</h1><p className="muted">Rozetler önce önerilir, koordinatör onayından sonra veliye yayımlanır.</p></div></div>
    {q.onerildi && <div className="notice success">Rozet önerisi oluşturuldu. Veliye görünmesi için önce onaylayın, ardından yayımlayın.</div>}
    {q.guncellendi && <div className="notice success">Rozet durumu güncellendi.</div>}
    {q.islem === "onaylandi" && <div className="notice success">Rozet onaylandı. Şimdi “Veliye yayımla” düğmesini kullanabilirsiniz.</div>}
    {q.islem === "yayimlandi" && <div className="notice success">Rozet veli panelinde yayımlandı.</div>}
    {q.islem === "reddedildi" && <div className="notice success">Rozet önerisi reddedildi.</div>}
    {q.hesaplandi && <div className="notice success">Antrenör gözlemleri analiz edildi: {q.gozlem} gözlemden {q.yeni} yeni öneri üretildi, {q.guncel} öneri güncellendi.</div>}
    {q.hata && <div className="notice">{q.hata}</div>}

    <section className="section card">
      <div className="section-head"><div><div className="eyebrow">Antrenör verilerinden otomatik</div><h2>Sistem rozet önerilerini hesapla</h2></div><span className="badge">Koordinatör kontrollü</span></div>
      <p className="muted">Katılım, 1–5 gelişim puanları, ilk–son hafta değişimi ve antrenörün gelişim notları birlikte değerlendirilir. Sistem yalnızca önerir; rozeti koordinatör onaylar ve yayımlar.</p>
      <form action={generateBadgeSuggestionsAction} className="row" style={{flexWrap:"wrap"}}>
        <div className="field"><label>Ay</label><input className="input" type="number" name="month" min={1} max={12} defaultValue={now.getMonth() + 1} required/></div>
        <div className="field"><label>Yıl</label><input className="input" type="number" name="year" min={2020} defaultValue={now.getFullYear()} required/></div>
        <button className="button" style={{alignSelf:"flex-end"}}>Antrenör verilerini analiz et</button>
      </form>
    </section>

    <details className="section card">
      <summary style={{cursor:"pointer",fontWeight:800}}>İstisnai durumda manuel öneri oluştur</summary>
      <p className="muted" style={{fontSize:13}}>Gözlem verisine henüz yansımamış özel bir gelişim davranışı varsa gerekçesiyle kullanılabilir.</p>
      <form action={createBadgeSuggestionAction} className="form-grid">
        <div className="field"><label>Sporcu</label><select className="input" name="studentId" required>{students.map(student => <option value={student.id} key={student.id}>{student.firstName} {student.lastName} · {student.group.ageMin}-{student.group.ageMax} yaş</option>)}</select></div>
        <div className="field"><label>Rozet</label><select className="input" name="badgeId" required>{badges.map(badge => <option value={badge.id} key={badge.id}>{badge.name}</option>)}</select></div>
        <div className="field"><label>Ay</label><input className="input" type="number" name="month" min={1} max={12} defaultValue={now.getMonth() + 1} required/></div>
        <div className="field"><label>Yıl</label><input className="input" type="number" name="year" min={2020} defaultValue={now.getFullYear()} required/></div>
        <div className="field full"><label>Gelişim gerekçesi</label><textarea className="input" name="reason" maxLength={500} required placeholder="Bu rozeti kazanmasını destekleyen gözlem ve gelişim davranışını yazın."/></div>
        <div className="field full"><button className="button">Rozet önerisi oluştur</button></div>
      </form>
    </details>

    <section className="section">
      <div className="section-head"><h2>Öneriler ve kazanılan rozetler</h2><span className="badge">{suggestions.length} kayıt</span></div>
      <div className="grid">{suggestions.map(suggestion => <div className="card" key={suggestion.id}>
        <div className="row between"><div className="row"><div className="avatar">★</div><div><strong>{suggestion.student.firstName} {suggestion.student.lastName}</strong><div className="muted">{suggestion.badge.name} · {suggestion.month}/{suggestion.year}</div></div></div><span className={`badge ${suggestion.status === "REJECTED" ? "red" : suggestion.status === "SUGGESTED" ? "warn" : ""}`}>{statusLabels[suggestion.status]}</span></div>
        <p><strong>Sistem gerekçesi:</strong> {suggestion.reason}</p>
        <p className="muted" style={{fontSize:13}}><strong>Kriter:</strong> {suggestion.badge.criteriaDescription}</p>
        {suggestion.status !== "PUBLISHED" && suggestion.status !== "REJECTED" && <form className="row" style={{flexWrap:"wrap"}}>
          <input type="hidden" name="id" value={suggestion.id}/>
          {suggestion.status !== "COORDINATOR_APPROVED" && <button className="button small" formAction={approveBadgeFormAction}>Onayla</button>}
          {suggestion.status === "COORDINATOR_APPROVED" && <button className="button small" formAction={publishBadgeFormAction}>Veliye yayımla</button>}
          <input className="input" name="rejectionReason" placeholder="Reddetme nedeni" style={{maxWidth:260}}/>
          <button className="button danger small" formAction={rejectBadgeFormAction}>Reddet</button>
        </form>}
      </div>)}{suggestions.length === 0 && <div className="card muted">Henüz rozet önerisi yok.</div>}</div>
    </section>
  </AppShell>;
}
