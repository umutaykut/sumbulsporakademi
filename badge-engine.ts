import { createStudentAction, restoreStudentAction } from "@/app/actions";
import { AppShell } from "@/components/AppShell";
import { ParentPasswordReset } from "@/components/ParentPasswordReset";
import { StudentArchiveControls } from "@/components/StudentArchiveControls";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function Students({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(["COORDINATOR", "ADMIN"]);
  const q = await searchParams;
  const [students, groups] = await Promise.all([
    prisma.student.findMany({
      include: { group: true, parents: { include: { parent: true } } },
      orderBy: { firstName: "asc" },
    }),
    prisma.group.findMany({ orderBy: { ageMin: "asc" } }),
  ]);
  const activeStudents = students.filter(student => student.isActive);
  const archivedStudents = students.filter(student => !student.isActive);

  const loginText = q.kullanici ? `Sümbülspor Akademi Veli Giriş Bilgileri

Sayın ${q.veli},

Çocuğunuz ${q.ogrenci} için Sümbülspor Akademi veli bilgilendirme hesabınız oluşturulmuştur.

Veli panelinde çocuğunuzun gelişim karnesini, haftalık bilgilendirme notlarını ve kazandığı rozetleri takip edebilirsiniz.

Kullanıcı adı: ${q.kullanici}
Geçici şifre: ${q.sifre}

İlk girişinizde güvenliğiniz için şifrenizi değiştirmeniz istenecektir.

Giriş adresi: ${process.env.NEXT_PUBLIC_APP_URL}/login

Sümbülspor Akademi` : null;

  return <AppShell user={user}>
    <div className="topbar">
      <div>
        <div className="eyebrow">Kayıt ve erişim</div>
        <h1 className="title">Sporcular</h1>
        <div className="muted">Grup ataması antrenör görünümünü otomatik günceller.</div>
      </div>
    </div>

    {loginText && <div className="card success notice">
      <strong>Veli hesabı oluşturuldu — bu şifre yalnızca şimdi gösterilir.</strong>
      <textarea className="input" readOnly value={loginText} style={{ height: 260, marginTop: 12 }}/>
    </div>}
    {q.arsivlendi && <div className="notice success">Sporcu kaydı arşivlendi. Veli erişimi kapatıldı; geçmiş veriler korundu.</div>}
    {q.geriAlindi && <div className="notice success">Sporcu kaydı ve bağlı veli erişimi yeniden etkinleştirildi.</div>}
    {q.veliBaglandi && <div className="notice success">Sporcu kaydedildi ve mevcut veli hesabına bağlandı. Mevcut kullanıcı adı ve şifre değişmedi.</div>}
    {q.guncellendi && <div className="notice success">Sporcu ve veli bilgileri güncellendi.</div>}
    {q.hata && <div className="notice">{q.hata}</div>}

    <section className="section">
      <div className="card row between" style={{marginBottom:16}}>
        <div><div className="stat-label">Toplam aktif sporcu</div><div className="stat-value">{activeStudents.length}</div></div>
        <span className="badge">{groups.length} yaş grubu</span>
      </div>
      <div className="grid grid-3" style={{marginBottom:16}}>
        {groups.map(group => {
          const count = activeStudents.filter(student => student.groupId === group.id).length;
          return <div className="card" key={group.id}>
            <div className="stat-label">{group.ageMin}-{group.ageMax} Yaş Grubu</div>
            <div className="stat-value">{count}</div>
            <div className="stat-hint">{count} kişi var</div>
          </div>;
        })}
      </div>

      <div className="grid">
        {groups.map(group => {
          const groupStudents = activeStudents.filter(student => student.groupId === group.id);
          return <div className="card" key={group.id}>
            <div className="section-head">
              <div><div className="eyebrow">{group.ageMin}-{group.ageMax} yaş</div><h2>{group.name}</h2></div>
              <span className="badge">{groupStudents.length} kişi var</span>
            </div>
            {groupStudents.length === 0
              ? <p className="muted">Bu grupta henüz aktif sporcu bulunmuyor.</p>
              : <div className="table-wrap"><table className="table">
                <thead><tr><th style={{width:46}}>Sıra</th><th>Sporcu</th><th>Veli</th><th>Durum</th><th>Hesap erişimi</th><th>Kayıt</th></tr></thead>
                <tbody>{groupStudents.map((student, index) => {
                  const parent = student.parents[0]?.parent;
                  return <tr key={student.id}>
                    <td><span className="avatar" style={{width:32,height:32,borderRadius:9}}>{index + 1}.</span></td>
                    <td><strong>{student.firstName} {student.lastName}</strong></td>
                    <td>{parent?.name ?? student.parentName ?? "—"}</td>
                    <td><span className="badge">Aktif</span></td>
                    <td>{parent
                      ? <ParentPasswordReset parentUserId={parent.id}/>
                      : <span className="muted">Veli hesabı yok</span>}
                    </td>
                    <td><div className="row" style={{alignItems:"flex-start",flexWrap:"wrap"}}><Link className="button ghost small" href={`/coordinator/sporcular/${student.id}/duzenle`}>Düzenle</Link><StudentArchiveControls studentId={student.id} studentName={`${student.firstName} ${student.lastName}`}/></div></td>
                  </tr>;
                })}</tbody>
              </table></div>}
          </div>;
        })}
      </div>
    </section>

    <section className="section card">
      <div className="section-head"><h2>Arşivlenen sporcular</h2><span className="badge warn">{archivedStudents.length} kayıt</span></div>
      {archivedStudents.length === 0
        ? <p className="muted">Arşivlenmiş sporcu bulunmuyor.</p>
        : <div className="table-wrap"><table className="table">
          <thead><tr><th>Sporcu</th><th>Grup</th><th>Veli</th><th>Arşiv tarihi</th><th>Neden</th><th>İşlem</th></tr></thead>
          <tbody>{archivedStudents.map(student => <tr key={student.id}>
            <td><strong>{student.firstName} {student.lastName}</strong></td>
            <td>{student.group.name}</td>
            <td>{student.parents[0]?.parent.name ?? student.parentName ?? "—"}</td>
            <td>{student.deactivatedAt?.toLocaleDateString("tr-TR") ?? "—"}</td>
            <td>{student.deactivationReason ?? "—"}</td>
            <td><div className="row" style={{flexWrap:"wrap"}}><Link className="button ghost small" href={`/coordinator/sporcular/${student.id}/duzenle`}>Düzenle</Link><form action={restoreStudentAction}><input type="hidden" name="studentId" value={student.id}/><button className="button secondary small">Yeniden etkinleştir</button></form></div></td>
          </tr>)}</tbody>
        </table></div>}
      <p className="muted" style={{fontSize:12}}>Arşivleme geçmiş gözlem, rapor ve gelişim verilerini silmez; koordinatör kayıtlarında tutar.</p>
    </section>

    <section className="section card" id="yeni">
      <div className="section-head"><h2>Yeni sporcu ekle</h2><span className="muted">* zorunlu alan</span></div>
      <form action={createStudentAction} className="form-grid">
        <div className="field"><label>Ad *</label><input className="input" name="firstName" required/></div>
        <div className="field"><label>Soyad *</label><input className="input" name="lastName" required/></div>
        <div className="field"><label>Doğum tarihi *</label><input className="input" type="date" name="birthDate" required/></div>
        <div className="field"><label>Yaş grubu *</label><select className="input" name="groupId" required>{groups.map(group => <option value={group.id} key={group.id}>{group.name}</option>)}</select></div>
        <div className="field"><label>Veli adı soyadı *</label><input className="input" name="parentName" required/></div>
        <div className="field"><label>Yakınlık</label><select className="input" name="relationType"><option value="MOTHER">Anne</option><option value="FATHER">Baba</option><option value="GUARDIAN">Vasi</option><option value="OTHER">Diğer</option></select></div>
        <div className="field"><label>Telefon</label><input className="input" name="parentPhone" type="tel"/></div>
        <div className="field"><label>E-posta *</label><input className="input" name="parentEmail" type="email" required/></div>
        <div className="field full"><label>Sağlık notu</label><textarea className="input" name="healthNotes" maxLength={500}/></div>
        <label className="row field full"><input type="checkbox" name="createParent" defaultChecked/> Veli kullanıcı hesabı ve güvenli geçici şifre oluştur</label>
        <div className="field full"><button className="button" type="submit">Sporcuyu kaydet</button></div>
      </form>
    </section>
  </AppShell>;
}
