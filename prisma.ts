export const SCORE_LABELS = ["", "Yoğun desteklenmeli", "Desteklenmeli", "Gelişiyor", "Güçlü", "Çok güçlü"];
export const BANNED_WORDS = ["yeteneksiz", "kötü", "berbat", "disiplinsiz", "isteksiz", "tembel", "takımı bozuyor", "sorunlu", "zayıf", "başarısız", "işe yaramaz"];
export const NOTE_WARNING = "Bu ifade çocuğu etiketleyebilir. Lütfen davranışa ve gelişime odaklanan bir ifade kullanınız.";

export function containsLabel(text: string) {
  const normalized = text.toLocaleLowerCase("tr-TR");
  return BANNED_WORDS.find((word) => normalized.includes(word));
}

export function dayProgram(date = new Date()) {
  const day = date.getDay();
  if (day === 1) return { theme: "Teknik temel", footballGoal: "Haftanın futbol hedefi", pedagogicalGoal: "Öğrenmeye açıklık" };
  if (day === 3) return { theme: "Bireysel beceri", footballGoal: "Top hâkimiyeti ve fiziksel gelişim", pedagogicalGoal: "Özgüven" };
  if (day === 5) return { theme: "Takım oyunu", footballGoal: "Küçük alan oyunu ve maç", pedagogicalGoal: "Takım uyumu" };
  if (day === 6) return { theme: "Kapalı tesis", footballGoal: "Salon futbolu ve havuz", pedagogicalGoal: "Güvenlik ve sorumluluk" };
  return { theme: "Planlama günü", footballGoal: "Program dışı", pedagogicalGoal: "Gelişim farkındalığı" };
}
