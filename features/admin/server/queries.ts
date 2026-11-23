import { BookingStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { DEFAULT_OPERATING_HOURS, normalizeOperatingHours } from "@/features/booking/lib/slots";
import { DEFAULT_PRICE_PER_HOUR, normalizePricePerHour } from "@/features/booking/lib/pricing";
import { startOfMonthDateOnly, startOfYearDateOnly, todayDateOnly } from "@/shared/lib/date";

export async function getDashboardStats() {
  const today = todayDateOnly();

  const [
    bookingsToday,
    totalBookings,
    pending,
    confirmed,
    completed,
    revenue,
    recentBookings,
  ] = await Promise.all([
    prisma.booking.count({ where: { date: today } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: BookingStatus.WAITING_VERIFICATION } }),
    prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
    prisma.booking.count({ where: { status: BookingStatus.COMPLETED } }),
    prisma.booking.aggregate({
      where: { status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] } },
      _sum: { totalPrice: true },
    }),
    prisma.booking.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { court: true, payment: true },
    }),
  ]);

  return {
    bookingsToday,
    totalBookings,
    pending,
    confirmed,
    completed,
    revenue: Number(revenue._sum.totalPrice ?? 0),
    recentBookings,
  };
}

export async function getQuickStats() {
  const today = todayDateOnly();

  const [bookingsToday, pending, revenue] = await Promise.all([
    prisma.booking.count({ where: { date: today } }),
    prisma.booking.count({ where: { status: BookingStatus.WAITING_VERIFICATION } }),
    prisma.booking.aggregate({
      where: { status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] } },
      _sum: { totalPrice: true },
    }),
  ]);

  return { bookingsToday, pending, revenue: Number(revenue._sum.totalPrice ?? 0) };
}

export async function getReportData() {
  const today = todayDateOnly();
  const startOfMonth = startOfMonthDateOnly(today);
  const startOfYear = startOfYearDateOnly(today);
  const paidStatuses = [BookingStatus.CONFIRMED, BookingStatus.COMPLETED];

  const [
    totalBookings,
    totalRevenue,
    monthlyRevenue,
    yearlyRevenue,
    bookingsByCourt,
    bookingsByStatus,
    busiestHours,
    courts,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.aggregate({ _sum: { totalPrice: true }, where: { status: { in: paidStatuses } } }),
    prisma.booking.aggregate({
      _sum: { totalPrice: true },
      where: { status: { in: paidStatuses }, date: { gte: startOfMonth } },
    }),
    prisma.booking.aggregate({
      _sum: { totalPrice: true },
      where: { status: { in: paidStatuses }, date: { gte: startOfYear } },
    }),
    prisma.booking.groupBy({
      by: ["courtId"],
      where: { status: { in: paidStatuses } },
      _count: { id: true },
      _sum: { totalPrice: true },
    }),
    prisma.booking.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.booking.groupBy({
      by: ["startTime"],
      where: { status: { in: paidStatuses } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    prisma.court.findMany(),
  ]);

  const courtMap = new Map(courts.map((court) => [court.id, court.name]));

  return {
    totalBookings,
    totalRevenue: Number(totalRevenue._sum.totalPrice ?? 0),
    monthlyRevenue: Number(monthlyRevenue._sum.totalPrice ?? 0),
    yearlyRevenue: Number(yearlyRevenue._sum.totalPrice ?? 0),
    bookingsByCourt: bookingsByCourt.map((row) => ({
      court: courtMap.get(row.courtId) ?? "Unknown",
      count: row._count.id,
      revenue: Number(row._sum.totalPrice ?? 0),
    })),
    bookingsByStatus: bookingsByStatus.map((row) => ({
      status: row.status,
      count: row._count.id,
    })),
    busiestHours: busiestHours.map((row) => ({
      hour: `${String(row.startTime).padStart(2, "0")}:00 - ${String(row.startTime + 1).padStart(2, "0")}:00`,
      count: row._count.id,
    })),
  };
}

export async function getAdminSettings() {
  const [admin, hoursConfig, priceConfig] = await Promise.all([
    prisma.admin.findFirst(),
    prisma.config.findUnique({ where: { key: "operational_hours" } }),
    prisma.config.findUnique({ where: { key: "PRICE_PER_HOUR" } }),
  ]);

  let hours = DEFAULT_OPERATING_HOURS;
  if (hoursConfig) {
    try {
      hours = normalizeOperatingHours(JSON.parse(hoursConfig.value));
    } catch {
      hours = DEFAULT_OPERATING_HOURS;
    }
  }

  return {
    admin: admin ? { email: admin.email, name: admin.name } : null,
    hours,
    pricePerHour: priceConfig ? normalizePricePerHour(priceConfig.value) : DEFAULT_PRICE_PER_HOUR,
  };
}

export interface ListBookingsInput {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function listBookings({ search, status, page = 1, pageSize = 20 }: ListBookingsInput) {
  const where: Prisma.BookingWhereInput = {};

  if (status && status !== "all") {
    where.status = status as BookingStatus;
  }

  if (search) {
    where.OR = [
      { userName: { contains: search } },
      { userPhone: { contains: search } },
      { id: { contains: search } },
    ];
  }

  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));

  const [bookings, total] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        totalPrice: true,
        userName: true,
        userPhone: true,
        date: true,
        startTime: true,
        endTime: true,
        createdAt: true,
        court: { select: { name: true } },
      },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    }),
    prisma.booking.count({ where }),
  ]);

  return { bookings, meta: { total, page: safePage, pageSize: safePageSize } };
}

export interface ListPaymentsInput {
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function listPayments({ status, page = 1, pageSize = 20 }: ListPaymentsInput) {  const where: Prisma.PaymentWhereInput = {};
  if (status && status !== "all") {
    where.status = status as PaymentStatus;
  }

  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));

  const [payments, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        bookingId: true,
        amount: true,
        status: true,
        method: true,
        proofUrl: true,
        rejectionReason: true,
        createdAt: true,
        booking: {
          select: { id: true, userName: true, userPhone: true, status: true },
        },
      },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    }),
    prisma.payment.count({ where }),
  ]);

  return { payments, meta: { total, page: safePage, pageSize: safePageSize } };
}

/** Totals by payment status, independent of pagination (so the queue badge is honest). */
export async function getPaymentStatusCounts(): Promise<Record<string, number>> {
  const grouped = await prisma.payment.groupBy({ by: ["status"], _count: { id: true } });
  return grouped.reduce<Record<string, number>>((accumulator, row) => {
    accumulator[row.status] = row._count.id;
    return accumulator;
  }, {});
}
