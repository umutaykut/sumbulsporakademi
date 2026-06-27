import { updateStudentAction } from "@/app/actions";
import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EditStudent({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ hata?: string }> }) {
  const user = await requireUser(["COORDINATOR", "ADMIN"]);
  const { id } = await params;
  const { hata } = await searchParams;
  const [student, groups] = await Promise.all([
    prisma.student.findUnique({ where: { id }, include: { parents: { include: { parent: true } } } }),
    prisma.group.findMany({ orderBy: { ageMin: "asc" } }),
  ]);
  if (!student) notFound();
  const parentLink = student.parents[0];
  return <AppShell user={user}>
    <div className="topbar"><div><div className="eyebrow">Kayıt düzeltme</div><h1 className="title">{student.firstName} {student.lastName}</h1><p className="muted">Sporcu, grup ve veli iletişim bilgilerini güncelleyin.</p></div><Link className="button ghost" href="/coordinator/sporcular">Listeye dön</Link></div>
    {hata && <div className="notice" style={{marginBottom:16}}>{hata}</div>}
    <section className="card">
      <form action={updateStudentAction} className="form-grid">
        <input type="hidden" name="studentId" value={student.id}/>
        <div className="field"><label>Ad *</label><input className="input" name="firstName" defaultValue={student.firstName} required/></div>
        <div className="field"><label>Soyad *</label><input className="input" name="lastName" defaultValue={student.lastName} required/></div>
        <div className="field"><label>Doğum tarihi *</label><input className="input" type="date" name="birthDate" defaultValue={student.birthDate.toISOString().slice(0, 10)} required/></div>
        <div className="field"><label>Yaş grubu *</label><select className="input" name="groupId" defaultValue={student.groupId} required>{groups.map(group => <option value={group.id} key={group.id}>{group.name}</option>)}</select></div>
        <div className="field"><label>Veli adı soyadı</label><input className="input" name="parentName" defaultValue={parentLink?.parent.name ?? student.parentName ?? ""}/></div>
        <div className="field"><label>Yakınlık</label><select className="input" name="relationType" defaultValue={parentLink?.relationType ?? "OTHER"}><option value="MOTHER">Anne</option><option value="FATHER">Baba</option><option value="GUARDIAN">Vasi</option><option value="OTHER">Diğer</option></select></div>
        <div className="field"><label>Veli iletişim no</label><input className="input" name="parentPhone" type="tel" defaultValue={student.parentPhone ?? ""}/></div>
        <div className="field"><label>Veli e-posta</label><input className="input" name="parentEmail" type="email" defaultValue={parentLink?.parent.email ?? student.parentEmail ?? ""}/></div>
        <div className="field full"><label>Sağlık notu</label><textarea className="input" name="healthNotes" maxLength={500} defaultValue={student.healthNotes ?? ""}/></div>
        <div className="notice field full">Yaş grubu değiştirildiğinde sporcu eski antrenör listesinden çıkar ve yeni grubun antrenör paneline otomatik olarak geçer.</div>
        <div className="field full row"><button className="button" type="submit">Değişiklikleri kaydet</button><Link className="button ghost" href="/coordinator/sporcular">Vazgeç</Link></div>
      </form>
    </section>
  </AppShell>;
}
