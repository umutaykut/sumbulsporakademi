import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const relationLabels = { MOTHER: "Anne", FATHER: "Baba", GUARDIAN: "Vasi", OTHER: "Diğer" } as const;

export default async function CoachParentContacts() {
  const user = await requireUser(["COACH"]);
  const assignments = await prisma.coachGroup.findMany({
    where: { coachId: user.id },
    include: {
      group: {
        include: {
          students: {
            where: { isActive: true },
            include: { parents: { include: { parent: true } } },
            orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          },
        },
      },
    },
    orderBy: { group: { ageMin: "asc" } },
  });
  const total = assignments.reduce((count, assignment) => count + assignment.group.students.length, 0);

  return <AppShell user={user}>
    <div className="topbar"><div><div className="eyebrow">Kendi gruplarım</div><h1 className="title">Veli iletişim bilgileri</h1><p className="muted">Yalnızca size atanmış gruplardaki aktif sporcular gösterilir.</p></div></div>
    <div className="notice" style={{marginBottom:16}}>Veli iletişim bilgilerini yalnızca antrenman, güvenlik ve gerekli bilgilendirme amaçlarıyla kullanınız. Gelişim veya özel durum görüşmelerini koordinatörle birlikte yürütünüz.</div>
    <div className="card" style={{marginBottom:16}}><div className="stat-label">Erişebildiğim aktif sporcu</div><div className="stat-value">{total}</div></div>
    <div className="grid">{assignments.map(assignment => <section className="card" key={assignment.id}>
      <div className="section-head"><div><div className="eyebrow">{assignment.group.ageMin}-{assignment.group.ageMax} yaş</div><h2>{assignment.group.name}</h2></div><span className="badge">{assignment.group.students.length} kişi</span></div>
      {assignment.group.students.length === 0 ? <p className="muted">Bu grupta aktif sporcu bulunmuyor.</p> : <div className="table-wrap"><table className="table">
        <thead><tr><th>Sıra</th><th>Sporcu</th><th>Veli</th><th>Yakınlık</th><th>İletişim no</th><th>E-posta</th></tr></thead>
        <tbody>{assignment.group.students.map((student, index) => {
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
    </section>)}
    {assignments.length === 0 && <div className="card muted">Size atanmış bir yaş grubu bulunmuyor.</div>}</div>
  </AppShell>;
}
