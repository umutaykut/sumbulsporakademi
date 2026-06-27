import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ObservationLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["COACH"]);
  const accepted = await prisma.coachStandardsAcceptance.findUnique({ where: { coachId: user.id } });
  if (!accepted) redirect("/coach/standartlar");
  return children;
}
