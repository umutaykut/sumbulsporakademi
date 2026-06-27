import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

const groupData = [
  { name:"7-10 Yaş Temel Gelişim Grubu", ageMin:7, ageMax:10, description:"Futbol sevgisi, temel beceri, kurallara uyum ve deneme cesareti" },
  { name:"11-14 Yaş Gelişim Grubu", ageMin:11, ageMax:14, description:"Teknik gelişim, karar verme, takım oyunu ve sorumluluk" },
  { name:"15-18 Yaş Performans Grubu", ageMin:15, ageMax:18, description:"Teknik-taktik kalite, tempo, liderlik ve hedef bilinci" },
];
const badgeData = ["Disiplinli Sporcu","Takım Oyuncusu","Cesur Oyuncu","Gelişim Yıldızı","Teknik Gelişim","Mücadeleci Sporcu","Arkadaşını Destekleyen Sporcu","Sorumluluk Alan Sporcu"];
const moduleData = ["Sümbülspor Akademi Mantığı","Yaş Gruplarına Göre Antrenörlük","Pedagojik Dil ve Geri Bildirim","Günlük Gözlem Sistemi","Güvenlik ve Sınırlar"];

async function main(){
  const passwordHash=await bcrypt.hash("Sumbul2026!",12);
  const groups=[];for(const g of groupData)groups.push(await prisma.group.upsert({where:{name:g.name},update:g,create:g}));
  const accounts=[
    ["Sümbül Koordinatörü","coordinator@example.com","koordinator","COORDINATOR"],
    ["Elif Antrenör","coach7@example.com","antrenor.7","COACH"],
    ["Mert Antrenör","coach11@example.com","antrenor.11","COACH"],
    ["Deniz Antrenör","coach15@example.com","antrenor.15","COACH"],
    ["Ayşe Yılmaz","parent@example.com","veli.ayse.yilmaz","PARENT"],
  ] as const;
  const users=[];for(const [name,email,username,role] of accounts)users.push(await prisma.user.upsert({where:{email},update:{name,username,passwordHash,role},create:{name,email,username,passwordHash,role}}));
  for(let i=0;i<3;i++)await prisma.coachGroup.upsert({where:{coachId_groupId:{coachId:users[i+1].id,groupId:groups[i].id}},update:{},create:{coachId:users[i+1].id,groupId:groups[i].id}});
  const names=[["Ali","Yılmaz"],["Zeynep","Kaya"],["Mehmet","Demir"],["Ece","Aydın"],["Can","Şahin"]];
  let firstStudentId="";
  for(let g=0;g<3;g++)for(let i=0;i<5;i++){
    const firstName=g===0?names[i][0]:`${names[i][0]} ${g+1}`;const lastName=names[i][1];
    const existing=await prisma.student.findFirst({where:{firstName,lastName,groupId:groups[g].id}});
    const student=existing??await prisma.student.create({data:{firstName,lastName,birthDate:new Date(`${2017-g*3-i%2}-05-12`),groupId:groups[g].id,parentName:i===0?"Ayşe Yılmaz":`${names[i][0]} Velisi`,parentEmail:i===0?"parent@example.com":`veli${g}${i}@example.com`}});
    if(g===0&&i===0)firstStudentId=student.id;
  }
  await prisma.parentStudent.upsert({where:{parentUserId_studentId:{parentUserId:users[4].id,studentId:firstStudentId}},update:{},create:{parentUserId:users[4].id,studentId:firstStudentId,relationType:"MOTHER"}});
  await prisma.parentReport.upsert({where:{id:"seed-weekly-report"},update:{},create:{id:"seed-weekly-report",studentId:firstStudentId,reportType:"WEEKLY",weekNumber:3,year:2026,draftText:"Ali bu hafta 3 antrenmana katıldı. Çalışmalara istekli katılım gösterdi. Takım oyunlarında arkadaşlarıyla iletişimi gelişiyor.",coordinatorEditedText:"Ali bu hafta antrenmanlara düzenli ve istekli katıldı. Pas ve kontrol çalışmalarında deneme cesareti gösterdi; takım oyunlarında arkadaşlarıyla iletişimi gelişiyor.",status:"PUBLISHED",approvedByCoordinatorId:users[0].id,publishedAt:new Date()}});
  for(const name of badgeData)await prisma.badge.upsert({where:{name},update:{},create:{name,description:`${name} gelişimini görünür kılan pedagojik rozet.`,criteriaDescription:"Aylık gözlemler sonucunda sistem önerir, koordinatör onaylar."}});
  for(let i=0;i<moduleData.length;i++)await prisma.coachTrainingModule.upsert({where:{title:moduleData[i]},update:{order:i+1},create:{title:moduleData[i],content:"Bu modül Sümbülspor Akademi'nin çocuk odaklı gelişim yaklaşımını açıklar.",order:i+1}});
  console.log("Seed tamamlandı. Ortak demo şifresi: Sumbul2026!");
}
main().finally(()=>prisma.$disconnect());
