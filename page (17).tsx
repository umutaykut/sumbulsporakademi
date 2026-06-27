import { approvePreRegistrationAction, markPreRegistrationContactedAction, rejectPreRegistrationAction, retryPreRegistrationWhatsAppAction } from "@/app/actions";
import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const statusLabels = { NEW:"Yeni", CONTACTED:"İletişime geçildi", APPROVED:"Onaylandı", REJECTED:"Reddedildi" } as const;
const whatsappLabels: Record<string,string> = { PENDING:"Bekliyor", SENT:"Gönderildi", FAILED:"Gönderilemedi", NOT_CONFIGURED:"Yapılandırılmadı", PARENT_SEND_PENDING:"Veli WhatsApp'a yönlendirildi" };

export default async function PreRegistrations({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const user = await requireUser(["COORDINATOR","ADMIN"]);
  const q = await searchParams;
  const registrations = await prisma.preRegistration.findMany({ include:{preferredGroup:true}, orderBy:{createdAt:"desc"} });
  const newCount = registrations.filter(item => item.status === "NEW").length;
  return <AppShell user={user}>
    <div className="topbar"><div><div className="eyebrow">Başvuru havuzu</div><h1 className="title">Ön kayıtlar</h1><p className="muted">Web formundan gelen başvurular ve WhatsApp bildirim durumları.</p></div><span className="badge warn">{newCount} yeni başvuru</span></div>
    {q.islem && <div className="notice success" style={{marginBottom:16}}>Ön kayıt durumu güncellendi.</div>}
    <div className="grid">{registrations.map(item => <article className="card" key={item.id}>
      <div className="row between" style={{alignItems:"flex-start"}}><div><div className="eyebrow">{item.createdAt.toLocaleString("tr-TR")}</div><h2 style={{margin:"4px 0"}}>{item.studentFirstName} {item.studentLastName}</h2><div className="muted">{item.preferredGroup?.name ?? "Grup koordinatör tarafından belirlenecek"}</div></div><div style={{textAlign:"right"}}><span className={`badge ${item.status === "NEW" ? "warn" : item.status === "REJECTED" ? "red" : ""}`}>{statusLabels[item.status]}</span><div style={{marginTop:7}}><span className={`badge ${item.whatsappStatus === "SENT" ? "" : "warn"}`}>WhatsApp: {whatsappLabels[item.whatsappStatus] ?? item.whatsappStatus}</span></div></div></div>
      <div className="grid grid-3" style={{marginTop:16}}><div><div className="stat-label">Veli</div><strong>{item.parentName}</strong></div><div><div className="stat-label">Telefon</div><a href={`tel:${item.parentPhone.replace(/\s/g,"")}`}><strong>{item.parentPhone}</strong></a></div><div><div className="stat-label">E-posta</div><span>{item.parentEmail || "—"}</span></div></div>
      {item.note && <p><strong>Not:</strong> {item.note}</p>}
      {item.whatsappError && <div className="notice" style={{marginTop:10}}>WhatsApp: {item.whatsappError}</div>}
      <div className="row" style={{marginTop:14,flexWrap:"wrap"}}>
        <form action={markPreRegistrationContactedAction}><input type="hidden" name="id" value={item.id}/><button className="button secondary small">İletişime geçildi</button></form>
        <form action={approvePreRegistrationAction}><input type="hidden" name="id" value={item.id}/><button className="button small">Başvuruyu onayla</button></form>
        <form action={rejectPreRegistrationAction}><input type="hidden" name="id" value={item.id}/><button className="button danger small">Reddet</button></form>
        {item.whatsappStatus !== "SENT" && item.whatsappStatus !== "PARENT_SEND_PENDING" && <form action={retryPreRegistrationWhatsAppAction}><input type="hidden" name="id" value={item.id}/><button className="button ghost small">WhatsApp API'yi yeniden dene</button></form>}
      </div>
    </article>)}{registrations.length === 0 && <div className="card muted">Henüz ön kayıt başvurusu bulunmuyor.</div>}</div>
  </AppShell>;
}
