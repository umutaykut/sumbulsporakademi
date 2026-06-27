import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const relationLabels = { MOTHER: "Anne", FATHER: "Baba", GUARDIAN: "Vasi", OTHER: "Diğer" } as const;

export default async function ParentContacts() {
  const user = await requireUser(["COORDINATOR", "ADMIN"]);
  const [groups, students] = await Promise.all([
    prisma.group.findMany({ orderBy: { ageMin: "asc" } }),
    prisma.student.findMany({
      where: { isActive: true },
      include: { group: true, parents: { include: { parent: true } } },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);
  const contactCount = students.filter(student => student.parentPhone || student.parentEmail || student.parents[0]?.parent.email).length;

  return <AppShell user={user}>
    <div className="topbar"><div><div className="eyebrow">Hızlı erişim</div><h1 className="title">Veli iletişim bilgileri</h1><p className="muted">Aktif sporcuların veli telefon ve e-posta bilgileri yaş grubuna göre listelenir.</p></div></div>
    <div className="grid grid-3" style={{marginBottom:18}}>
      <div className="card"><div className="stat-label">Aktif sporcu</div><div className="stat-value">{students.length}</div></div>
      <div className="card"><div className="stat-label">İletişim bilgisi bulunan</div><div className="stat-value">{contactCount}</div></div>
      <div className="card"><div className="stat-label">Yaş grubu</div><div className="stat-value">{groups.length}</div></div>
    </div>

    <div className="grid">{groups.map(group => {
      const groupStudents = students.filter(student => student.groupId === group.id);
      return <section className="card" key={group.id}>
        <div className="section-head"><div><div className="eyebrow">{group.ageMin}-{group.ageMax} yaş</div><h2>{group.name}</h2></div><span className="badge">{groupStudents.length} kişi</span></div>
        {groupStudents.length === 0 ? <p className="muted">Bu grupta aktif sporcu bulunmuyor.</p> : <div className="table-wrap"><table className="table">
          <thead><tr><th>Sıra</th><th>Sporcu</th><th>Veli</th><th>Yakınlık</th><th>İletişim no</th><th>E-posta</th></tr></thead>
          <tbody>{groupStudents.map((student, index) => {
            const link = student.parents[0];
            const phone = student.parentPhone?.trim();
            const email = link?.parent.email ?? student.parentEmail;
            return <tr key={student.id}>
              <td><strong>{index + 1}.</strong></td>
              <td><strong>{student.firstName} {student.lastName}</strong></td>
              <td>{link?.parent.name ?? student.parentName ?? "—"}</td>
              <td>{link ? relationLabels[link.relationType] : "—"}</td>
              <td>{phone ? <a className="button secondary small" href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a> : <span className="muted">Girilememiş</span>}</td>
              <td>{email ? <a href={`mailto:${email}`}>{email}</a> : <span className="muted">Girilememiş</span>}</td>
            </tr>;
          })}</tbody>
        </table></div>}
      </section>;
    })}</div>
  </AppShell>;
}
