# Sümbülspor Akademi - Yayına Alma Rehberi

Bu paket, Sümbülspor Akademi sitesini canlıya almak için **Vercel + Supabase** yapısına göre hazırlanmıştır.

## Neden Vercel + Supabase?

- Proje Next.js olduğu için Vercel en uyumlu hosting seçeneğidir.
- Canlı ortamda SQLite yerine PostgreSQL gerekir; Supabase ücretsiz başlangıç için uygundur.
- Alan adı olarak `sumbulspor.com` Vercel'e kolayca bağlanabilir.

## 1. Supabase veritabanı oluştur

1. https://supabase.com adresine gir.
2. Yeni proje oluştur.
3. Project Settings > Database bölümünden bağlantı bilgilerini al.
4. Vercel'de kullanılacak iki değişken gerekir:
   - `DATABASE_URL`: Pooler/Transaction bağlantısı
   - `DIRECT_URL`: Direct connection bağlantısı

## 2. Vercel'e yükle

En kolay yol:

1. Bu klasörü GitHub'a yükle.
2. https://vercel.com adresinde “New Project” de.
3. GitHub reposunu seç.
4. Framework otomatik olarak Next.js görünür.
5. Environment Variables bölümüne aşağıdakileri ekle:

```text
DATABASE_URL=Supabase pooler connection string
DIRECT_URL=Supabase direct connection string
AUTH_SECRET=uzun-rastgele-guclu-bir-sifre
NEXT_PUBLIC_APP_URL=https://sumbulspor.com
WHATSAPP_NOTIFICATION_PHONE=905432647205
```

WhatsApp Cloud API kullanılacaksa ayrıca şu değişkenler de doldurulur:

```text
WHATSAPP_GRAPH_API_VERSION=vXX.X
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_TEMPLATE_NAME=yeni_on_kayit
WHATSAPP_TEMPLATE_LANGUAGE=tr
```

## 3. Veritabanı tablolarını oluştur

İlk yayınlamadan önce bilgisayarında bu komutlar çalıştırılır:

```bash
pnpm install
pnpm db:push
pnpm db:seed
```

Bu işlem demo kullanıcıları, yaş gruplarını ve başlangıç verilerini Supabase veritabanına kurar.

## 4. Alan adını bağla

1. Vercel > Project > Settings > Domains bölümüne gir.
2. `sumbulspor.com` alan adını ekle.
3. Alan adını aldığın yerde Vercel'in verdiği DNS kayıtlarını gir.
4. DNS oturunca site `https://sumbulspor.com` üzerinden açılır.

## Demo giriş bilgileri

Tüm demo hesaplarının başlangıç şifresi:

```text
Sumbul2026!
```

- Koordinatör: `koordinator`
- 7-10 yaş antrenörü: `antrenor.7`
- 11-14 yaş antrenörü: `antrenor.11`
- 15-18 yaş antrenörü: `antrenor.15`

## Not

Canlı sistemde ilk iş olarak koordinatör ve antrenör şifrelerini değiştirmek iyi olur.
