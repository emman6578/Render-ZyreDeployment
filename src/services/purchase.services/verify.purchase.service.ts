import { PrismaClient, Prisma, ActionType } from "@prisma/client";

const prisma = new PrismaClient();

interface VerifyPurchaseParams {
  purchaseId: number;
  userId: number;
  ipAddress?: string;
  userAgent?: string;
}

interface VerifyPurchaseResponse {
  id: number;
  batchNumber: string;
  verification: {
    verifiedBy: string;
    verificationDate: Date;
  };
  supplier: string;
  totalProducts: number;
  totalQuantity: number;
  verificationTimestamp: string;
}

export const verifyPurchase_service = async (
  params: VerifyPurchaseParams
): Promise<VerifyPurchaseResponse> => {
  const { purchaseId, userId, ipAddress, userAgent } = params;

  try {
    // Check if purchase exists and get current user's name
    const [purchase, user] = await Promise.all([
      prisma.purchase.findUnique({
        where: { id: purchaseId },
        select: {
          id: true,
          batchNumber: true,
          verifiedBy: true,
          verificationDate: true,
          status: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullname: true,
        },
      }),
    ]);

    if (!purchase) {
      throw new Error("Purchase not found");
    }

    if (!user) {
      throw new Error("User not found");
    }

    // Check if already verified
    if (purchase.verifiedBy && purchase.verificationDate) {
      throw new Error(
        `Purchase batch #${purchase.batchNumber} has already been verified by ${
          purchase.verifiedBy
        } on ${purchase.verificationDate.toLocaleDateString()}`
      );
    }

    // Update purchase verification
    const updatedPurchase = await prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        verifiedBy: user.fullname,
        verificationDate: new Date(),
        updatedBy: { connect: { id: userId } },
      },
      select: {
        id: true,
        batchNumber: true,
        verifiedBy: true,
        verificationDate: true,
        supplier: {
          select: {
            name: true,
          },
        },
        items: {
          select: {
            product: {
              select: {
                generic: { select: { name: true } },
                brand: { select: { name: true } },
              },
            },
            initialQuantity: true,
          },
        },
      },
    });

    // Create activity log for verification
    await prisma.activityLog.create({
      data: {
        userId: userId,
        model: "Purchase",
        recordId: purchaseId,
        action: ActionType.UPDATE,
        description: `Verified purchase batch #${updatedPurchase.batchNumber} from ${updatedPurchase.supplier.name} containing ${updatedPurchase.items.length} product(s)`,
        ipAddress: ipAddress,
        userAgent: userAgent,
      },
    });

    // Transform response data
    const response: VerifyPurchaseResponse = {
      id: updatedPurchase.id,
      batchNumber: updatedPurchase.batchNumber,
      verification: {
        verifiedBy: updatedPurchase.verifiedBy!,
        verificationDate: updatedPurchase.verificationDate!,
      },
      supplier: updatedPurchase.supplier.name,
      totalProducts: updatedPurchase.items.length,
      totalQuantity: updatedPurchase.items.reduce(
        (sum, item) => sum + item.initialQuantity,
        0
      ),
      verificationTimestamp: new Date().toISOString(),
    };

    return response;
  } catch (error: any) {
    console.error("Purchase verification error:", error);

    // Handle specific error cases
    if (error.message === "Purchase not found") {
      throw new Error("Purchase not found");
    }
    if (error.message === "User not found") {
      throw new Error("User not found");
    }
    if (error.message.includes("already been verified")) {
      throw new Error(error.message);
    }

    // Handle Prisma errors
    if ((error as Prisma.PrismaClientKnownRequestError).code === "P2025") {
      throw new Error("Purchase not found");
    }

    // Fallback
    throw new Error(error.message || "Failed to verify purchase");
  }
};
