import { AuthRequest } from "@middlewares/authMiddleware";
import { PrismaClient } from "@prisma/client";
import { withConnection } from "@utils/Database/HRMS/connection";
import { successHandler } from "@utils/SuccessHandler/SuccessHandler";
import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import crypto from "crypto";

const prisma = new PrismaClient();

export const read_PSR_from_HRMS = expressAsyncHandler(
  async (req: Request, res: Response) => {
    try {
      const [rows] = await withConnection(async (connection) => {
        return connection.query(`
          SELECT 
            u.id, 
            u.name, 
            u.usercode, 
            u.district_id,
            d.name AS district_name  
          FROM 
            users u
          LEFT JOIN 
            districts d ON u.district_id = d.id  
          WHERE 
            u.position = 'PSR';
        `);
      });

      const formattedUsers = (rows as any[]).map((user) => ({
        id: user.id,
        name: user.name,
        userCode: user.usercode,
        district: user.district_name,
      }));

      successHandler(formattedUsers, res, "GET", "Success");
    } catch (error: any) {
      // Log the error properly
      console.error("Database error:", error);
      throw new Error("Error fetching PSR from MySQL: " + error.message);
    }
  }
);

// READ PSR
export const read = expressAsyncHandler(async (req: Request, res: Response) => {
  const { search, areaCode } = req.query;

  let whereClause: any = {};

  if (search) {
    whereClause = {
      OR: [
        { fullName: { contains: search as string } },
        { areaCode: { contains: search as string } },
        { psrCode: { contains: search as string } },
      ],
    };
  }

  if (areaCode) {
    // If whereClause is already an OR, wrap with AND
    if (whereClause.OR) {
      whereClause = {
        AND: [whereClause, { areaCode: { equals: areaCode } }],
      };
    } else {
      whereClause.areaCode = { equals: areaCode };
    }
  }

  const response = await prisma.pSR.findMany({
    where: whereClause,
    orderBy: {
      fullName: "asc",
    },
  });

  successHandler(
    response,
    res,
    "GET",
    `Getting ${search || areaCode ? "filtered" : "all"} PSR values`
  );
});

export const syncAndReadPSR = expressAsyncHandler(
  async (req: AuthRequest, res: Response) => {
    // 1. Fetch from legacy HRMS
    const [rows] = await withConnection((connection) =>
      connection.query(`
        SELECT 
          u.usercode, 
          u.name, 
          d.name AS district_name  
        FROM users u
        LEFT JOIN districts d ON u.district_id = d.id  
        WHERE u.position = 'PSR';
      `)
    );

    // 2. Compute hash for each row
    const hrmsPSRs = (rows as any[]).map((u) => {
      const payload = `${u.usercode}|${u.name}|${u.district_name || ""}`;
      const hash = crypto.createHash("sha256").update(payload).digest("hex");
      return {
        psrCode: u.usercode,
        fullName: u.name,
        areaCode: u.district_name,
        sourceHash: hash,
        createdById: req.user!.id,
        updatedById: req.user!.id,
      };
    });

    // 3. Bulk upsert only when hash differs
    await prisma.$transaction(
      hrmsPSRs
        .map((psr) =>
          prisma.pSR.upsert({
            where: { psrCode: psr.psrCode },
            create: psr,
            update: {
              // only update if the incoming hash is different
              fullName: psr.fullName,
              areaCode: psr.areaCode,
              sourceHash: psr.sourceHash,
              updatedById: psr.updatedById,
            },
            // add a conditional so Prisma only issues the UPDATE when needed
            // (unfortunately Prisma doesn’t support WHERE in UPDATE directly,
            //  so we filter in JavaScript)
          })
        )
        .filter(async (upsertOp, idx) => {
          // fetch existing hash for comparison
          const existing = await prisma.pSR.findUnique({
            where: { psrCode: hrmsPSRs[idx].psrCode },
            select: { sourceHash: true },
          });
          // only keep the upsert if it’s a new record or hash changed
          return !existing || existing.sourceHash !== hrmsPSRs[idx].sourceHash;
        })
    );

    // 4. Return the full list
    const allPSRs = await prisma.pSR.findMany({ orderBy: { fullName: "asc" } });

    successHandler(
      allPSRs,
      res,
      "GET",
      "PSRs synced (only new or changed ones updated)"
    );
  }
);
