import { PrismaClient } from "@prisma/client";
import { successHandler } from "@utils/SuccessHandler/SuccessHandler";
import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";

const prisma = new PrismaClient();

export const read = expressAsyncHandler(async (req: Request, res: Response) => {
  // ───────────────────────────────────────────────────────────────────────────
  // 1) Parse query params (with defaults)
  // ───────────────────────────────────────────────────────────────────────────
  // page & limit for pagination
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100); // cap at 100 per page
  const skip = (page - 1) * limit;

  // sortBy & sortOrder
  //   - default to sorting by createdAt DESC
  const sortBy = String(req.query.sortBy || "createdAt");
  const sortOrder =
    String(req.query.sortOrder || "desc").toLowerCase() === "asc"
      ? "asc"
      : "desc";

  // optional filters: model, action, userId, date range (from/to)
  const filters: Record<string, any> = {};
  if (req.query.model) {
    filters.model = String(req.query.model);
  }
  if (req.query.action) {
    filters.action = String(req.query.action).toUpperCase();
  }
  if (req.query.userId) {
    const u = Number(req.query.userId);
    if (!Number.isNaN(u)) {
      filters.userId = u;
    }
  }
  // filter by createdAt between fromDate and toDate if provided
  if (req.query.fromDate || req.query.toDate) {
    const fromDate = req.query.fromDate
      ? new Date(String(req.query.fromDate))
      : null;
    const toDate = req.query.toDate ? new Date(String(req.query.toDate)) : null;
    filters.createdAt = {};
    if (fromDate && !Number.isNaN(fromDate.getTime())) {
      filters.createdAt.gte = fromDate;
    }
    if (toDate && !Number.isNaN(toDate.getTime())) {
      // toDate set to end of the day if only date provided
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      filters.createdAt.lte = end;
    }
    // if both fromDate and toDate were invalid, remove
    if (Object.keys(filters.createdAt).length === 0) {
      delete filters.createdAt;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2) Build prisma queries
  // ───────────────────────────────────────────────────────────────────────────
  // a) Count total matching records (for pagination meta)
  const total = await prisma.activityLog.count({
    where: filters,
  });

  // b) Fetch the paginated chunk with includes
  const activity_logs = await prisma.activityLog.findMany({
    where: filters,
    include: {
      user: { select: { fullname: true } },
    },
    orderBy: { [sortBy]: sortOrder },
    skip,
    take: limit,
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3) Build metadata
  // ───────────────────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(total / limit);

  // ───────────────────────────────────────────────────────────────────────────
  // 4) Send response via successHandler
  // ───────────────────────────────────────────────────────────────────────────
  successHandler(
    {
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
      logs: activity_logs,
    },
    res,
    "GET",
    "Activity Log fetched successfully"
  );
});
