// utils/reference.ts
import { PrismaClient } from "@prisma/client";
import { format } from "date-fns";

const DEFAULT_RANDOM_LENGTH = 4;

export async function generateRefNumber(
  prisma: PrismaClient,
  randomLength = DEFAULT_RANDOM_LENGTH,
  prefix: string
): Promise<string> {
  // 1. Build the date portion
  const datePart = format(new Date(), "yyyyMMdd");

  // 2. Random digits helper
  const makeRandom = () =>
    Math.floor(Math.random() * 10 ** randomLength)
      .toString()
      .padStart(randomLength, "0");

  let candidate: string;
  let conflict = true;

  // 3. Loop until we find a non‐existent one
  while (conflict) {
    candidate = `${prefix}-${datePart}-${makeRandom()}`;

    const existing = await prisma.purchaseReturn.findFirst({
      where: { referenceNumber: candidate },
      select: { id: true },
    });

    if (!existing) {
      conflict = false;
    }
  }

  return candidate!;
}
