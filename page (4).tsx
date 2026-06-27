import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PreRegistrationForm } from "@/components/PreRegistrationForm";

export const dynamic = "force-dynamic";

const ageGroups = [
  { range: "7–10", title: "Temel Hareket", text: "Oyunla öğrenme, koordinasyon ve futbola güvenli bir başlangıç." },
  { range: "11–14", title: "Teknik Gelişim", text: "Top hâkimiyeti, takım bilinci ve doğru karar verme alışkanlığı." },
  { range: "15–18", title: "Performans", text: "Taktik gelişim, sorumluluk ve müsabakaya hazırlık." },
];

export default async function Home() {
  const groups = await prisma.group.findMany({ orderBy: { ageMin: "asc" }, select: { id: true, name: true } });
  return <main className="club-site">
    <header className="club-nav">
      <div className="club-container nav-inner">
        <Link href="/" className="club-brand"><Image src="/media/logo.png" alt="Sümbülspor Kulübü" width={54} height={54} priority /><span><b>Sümbülspor</b><small>Futbol Akademisi</small></span></Link>
        <nav className="club-links"><a href="#akademi">Akademi</a><a href="#gruplar">Yaş grupları</a><a href="#galeri">Galeri</a><a href="#miras">Mirasımız</a></nav>
        <div className="nav-actions"><Link href="/login" className="login-link">Giriş yap</Link><a href="#on-kayit" className="club-button">Ön kayıt</a></div>
      </div>
    </header>

    <section className="club-hero">
      <Image src="/media/login-mountain.jpg" alt="Hakkâri'nin karlı dağları" fill priority sizes="100vw" className="hero-photo hero-mountain-photo" />
      <div className="hero-shade" />
      <div className="club-container hero-content">
        <div className="hero-copy"><span className="hero-kicker">Hakkâri • 1974'ten beri</span><h1>Dağların gücü,<br /><em>sahanın ruhu.</em></h1><p>Çocukların yalnızca iyi futbolcu değil; özgüvenli, sorumluluk sahibi ve takım ruhu güçlü bireyler olarak yetiştiği bir akademi.</p><div className="hero-actions"><a href="#on-kayit" className="club-button large">Akademiye katıl</a><a href="#akademi" className="club-button outline large">Bizi tanıyın</a></div></div>
        <div className="hero-badge"><Image src="/media/logo.png" alt="Sümbülspor 1974 arması" width={270} height={270} priority /></div>
      </div>
      <div className="hero-stats club-container"><div><b>1974</b><span>Köklü kulüp kültürü</span></div><div><b>3</b><span>Gelişim yaş grubu</span></div><div><b>1 takım</b><span>Ortak değerler</span></div></div>
    </section>

    <section className="club-section intro" id="akademi"><div className="club-container intro-grid"><div><span className="section-kicker">Sümbülspor Akademi</span><h2>Futbolu öğretirken karakteri de güçlendiriyoruz.</h2></div><div><p>Her sporcuyu kendi gelişim hızında izleyen, antrenör değerlendirmelerini anlamlı gelişim raporlarına dönüştüren çocuk odaklı bir sistem kurduk.</p><p>Teknik becerinin yanında disiplin, dayanışma, fair play ve spor sevgisini aynı sahanın parçası kabul ediyoruz.</p></div></div></section>

    <section className="club-section age-section" id="gruplar"><div className="club-container"><span className="section-kicker light">Doğru yaşta doğru gelişim</span><div className="section-heading"><h2>Her yaşa özel<br />antrenman yaklaşımı</h2><p>Çocukların fiziksel ve pedagojik gelişimine uygun, kademeli çalışma grupları.</p></div><div className="age-grid">{ageGroups.map((group, i) => <article className="age-card" key={group.range}><span>0{i + 1}</span><strong>{group.range}<small> yaş</small></strong><h3>{group.title}</h3><p>{group.text}</p></article>)}</div></div></section>

    <section className="club-section gallery-section" id="galeri"><div className="club-container"><span className="section-kicker">Hakkâri'de futbol</span><div className="section-heading dark"><h2>Dağların eteklerinde<br />aynı heyecanın peşindeyiz.</h2><p>Antrenmanlardan ve Hakkâri'nin eşsiz futbol atmosferinden kareler.</p></div><div className="photo-grid"><figure><Image src="/media/field-winter.jpeg" alt="Karlı dağlar önünde futbol sahası" fill sizes="(max-width: 760px) 100vw, 33vw" /></figure><figure><Image src="/media/field-action-snow.jpeg" alt="Sümbülspor futbol antrenmanı" fill sizes="(max-width: 760px) 100vw, 33vw" /></figure><figure><Image src="/media/field-sunny.jpeg" alt="Hakkâri futbol sahası" fill sizes="(max-width: 760px) 100vw, 33vw" /></figure></div></div></section>

    <section className="club-section heritage" id="miras"><div className="club-container"><div className="heritage-intro"><span className="section-kicker light">Mirasımız</span><h2>Hakkâri futboluna adanmış bir ömür.</h2><p>Gençleri sporla buluşturan, kız futbolunun önünü açan ve fair play değerlerini sahaya taşıyan Adnan Aykut'un çalışmaları Sümbülspor Akademi'nin güçlü mirasını oluşturuyor.</p></div><div className="heritage-stories"><article className="heritage-story"><div className="story-image"><Image src="/media/fair-play-award.jpeg" alt="TFF İl Temsilcisi Adnan Aykut'a Fair Play ödülü haberi" fill sizes="(max-width: 760px) 100vw, 50vw" /></div><div className="story-body"><span>21 Nisan 2009 • Türkiye Futbol Federasyonu</span><h3>Adnan Aykut'a Fair Play Şeref Diploması</h3><p>Türkiye Millî Olimpiyat Komitesi Fair Play Komisyonu, Hakkâri TFF İl Temsilcisi Adnan Aykut'u gençleri spora yönlendirmesi, kent futbolunun gelişimine katkısı ve kız futbol takımını kurması nedeniyle “Kariyer” dalında şeref diplomasına değer gördü.</p><a href="https://www.tff.org/default.aspx?pageID=285&ftxtID=6832" target="_blank" rel="noopener noreferrer">Haberi TFF'de görüntüle <b>↗</b></a></div></article><article className="heritage-story reverse"><div className="story-image"><Image src="/media/girls-football-news-1.jpeg" alt="Hakkârili kızlar futbol takımı kurdu haberi" fill sizes="(max-width: 760px) 100vw, 50vw" /></div><div className="story-body"><span>26 Nisan 2008 • Hürriyet</span><h3>Hakkârili kızlar futbol takımı kurdu</h3><p>Adnan Aykut, Hakkâri'deki 13 okulda futbola ilgi duyan öğrencileri belirleyerek 16 kızdan oluşan bir takım kurdu. Genç sporcular, zor şartlara rağmen Hakkâri'yi Türkiye finallerinde temsil etme hedefiyle çalışmalarını sürdürdü.</p><a href="https://www.hurriyet.com.tr/avrupa/hakkarili-kizlar-futbol-takimi-kurdu-1201284" target="_blank" rel="noopener noreferrer">Haberi Hürriyet'te görüntüle <b>↗</b></a></div></article></div></div></section>

    <section className="club-section prereg-section" id="on-kayit"><div className="club-container prereg-layout"><div className="prereg-copy"><span className="section-kicker light">Ön kayıt</span><h2>Çocuğunuzun futbol yolculuğu burada başlasın.</h2><p>Formu doldurun; başvurunuz koordinatör ekranına düşsün. Ardından hazır mesajla WhatsApp üzerinden bizimle iletişime geçebilirsiniz.</p><div className="contact-chip"><span>WhatsApp iletişim</span><b>0543 264 72 05</b></div></div><div className="prereg-card"><h3>Sporcu ön kayıt formu</h3><p>Yıldızlı alanların doldurulması zorunludur.</p><PreRegistrationForm groups={groups} dark /></div></div></section>

    <footer className="club-footer"><div className="club-container footer-grid"><Link href="/" className="club-brand"><Image src="/media/logo.png" alt="Sümbülspor" width={62} height={62} /><span><b>Sümbülspor</b><small>Futbol Akademisi • Hakkâri</small></span></Link><p>Futbol, gelişim ve güçlü bir gelecek.</p><div><a href="#on-kayit">Ön kayıt</a><Link href="/login">Sistem girişi</Link></div></div></footer>
  </main>;
}
