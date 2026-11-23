"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { addDaysDateOnly, parseDateOnly, toDateOnlyString, todayDateOnly } from "@/shared/lib/date";
import { formatCurrency, formatDateIndo, formatTimeSlot } from "@/shared/lib/format";
import { groupContiguousSlots } from "@/features/booking/lib/slots";
import { addLocalTicket } from "@/features/booking/lib/ticket-store";
import type { OperatingHours, TimeSlot } from "@/features/booking/types";
import {
  InteractiveFloorplan,
  type FloorplanCourt,
} from "@/features/booking/components/interactive-floorplan";
import { ScheduleMatrix, type CourtFilter } from "@/features/booking/components/schedule-matrix";
import {
  ReservationReceipt,
  type ReservationGroup,
} from "@/features/booking/components/reservation-receipt";
import { ETicketModal, type ETicketData } from "@/features/booking/components/e-ticket-modal";

interface DateOption {
  value: string;
  short: string;
  full: string;
  isToday: boolean;
}

interface BookingWorkspaceProps {
  initialDate?: string;
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function buildDateOptions(initialDate?: string): DateOption[] {
  const today = todayDateOnly();
  const todayValue = toDateOnlyString(today);
  const requested =
    initialDate && DATE_ONLY_RE.test(initialDate) ? initialDate.trim() : null;
  const base =
    requested && requested >= todayValue ? parseDateOnly(requested) ?? today : today;

  return buildDateWindow(base, todayValue);
}

function buildDateWindow(base: Date, todayValue: string): DateOption[] {
  const shortFormatter = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });

  return Array.from({ length: 7 }, (_, index) => {
    const optionDate = addDaysDateOnly(base, index);
    const value = toDateOnlyString(optionDate);
    return {
      value,
      short: shortFormatter.format(optionDate).replace(/\./g, "").toUpperCase(),
      full: formatDateIndo(optionDate),
      isToday: value === todayValue,
    };
  });
}

const MAX_ADVANCE_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

export default function BookingWorkspace({ initialDate }: BookingWorkspaceProps) {
  const [courts, setCourts] = useState<FloorplanCourt[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(true);
  const [windowStart, setWindowStart] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [filter, setFilter] = useState<CourtFilter>("all");
  const [availability, setAvailability] = useState<Record<number, TimeSlot[]>>({});
  const [operatingHours, setOperatingHours] = useState<OperatingHours>({ open: 8, close: 21 });
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [availabilityError, setAvailabilityError] = useState("");
  const [selectedHours, setSelectedHours] = useState<Record<number, number[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<ETicketData[]>([]);
  const [ticketNotice, setTicketNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const receiptRef = useRef<HTMLDivElement>(null);

  const activeCourtId = filter === "all" ? courts[0]?.id ?? null : filter;

  const dateOptions = useMemo<DateOption[]>(() => {
    const base = windowStart ? parseDateOnly(windowStart) : null;
    if (!base) return [];
    return buildDateWindow(base, toDateOnlyString(todayDateOnly()));
  }, [windowStart]);

  const windowStartMs = windowStart ? (parseDateOnly(windowStart)?.getTime() ?? 0) : 0;
  const todayMs = todayDateOnly().getTime();
  const canGoPrevWeek = windowStartMs > todayMs;
  const canGoNextWeek =
    windowStartMs > 0 && windowStartMs + 7 * DAY_MS <= todayMs + MAX_ADVANCE_DAYS * DAY_MS;

  const shiftWeek = (deltaWeeks: number) => {
    const base = (windowStart ? parseDateOnly(windowStart) : null) ?? todayDateOnly();
    const next = addDaysDateOnly(base, deltaWeeks * 7);
    const nextValue = toDateOnlyString(next);

    if (nextValue < toDateOnlyString(todayDateOnly())) return;
    if (next.getTime() > todayMs + MAX_ADVANCE_DAYS * DAY_MS) return;

    setWindowStart(nextValue);
    setDate(nextValue);
    setSelectedHours({});
  };

  // --- Data: courts -------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadCourts() {
      try {
        const response = await fetch("/api/courts", { cache: "no-store" });
        const payload = await response.json();
        const list = (payload.data ?? []) as FloorplanCourt[];
        if (cancelled) return;
        setCourts(list);
      } catch {
        if (!cancelled) toast.error("Gagal memuat daftar lapangan");
      } finally {
        if (!cancelled) setLoadingCourts(false);
      }
    }

    void loadCourts();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Data: 7-day strip --------------------------------------------------
  useEffect(() => {
    async function initDateStrip() {
      const options = buildDateOptions(initialDate);
      setWindowStart(options[0]?.value ?? "");
      setDate(options[0]?.value ?? "");
    }

    void initDateStrip();
  }, [initialDate]);

  // --- Data: availability per court --------------------------------------
  useEffect(() => {
    if (!date || courts.length === 0) return;
    let cancelled = false;

    async function loadAvailability() {
      setLoadingAvailability(true);
      setAvailabilityError("");
      try {
        let failedCourts = 0;
        const entries = await Promise.all(
          courts.map(async (court) => {
            try {
              const response = await fetch(
                `/api/availability?courtId=${court.id}&date=${date}`,
                { cache: "no-store" }
              );
              const payload = await response.json();
              if (!response.ok || !payload?.success) throw new Error("bad response");
              return [
                court.id,
                (payload.data?.slots ?? []) as TimeSlot[],
                payload.data?.operatingHours as OperatingHours | undefined,
              ] as const;
            } catch {
              failedCourts += 1;
              return [court.id, [] as TimeSlot[], undefined] as const;
            }
          })
        );

        if (cancelled) return;

        const nextAvailability: Record<number, TimeSlot[]> = {};
        for (const [courtId, slots] of entries) nextAvailability[courtId] = slots;
        setAvailability(nextAvailability);

        if (failedCourts > 0) {
          setAvailabilityError(
            `${failedCourts} dari ${courts.length} jadwal lapangan gagal dimuat. Angka di bawah bisa belum lengkap.`
          );
        }

        const hours = entries.find((entry) => entry[2])?.[2];
        if (hours) setOperatingHours(hours);
      } catch {
        if (!cancelled) setAvailabilityError("Jadwal lapangan gagal dimuat dari server.");
      } finally {
        if (!cancelled) setLoadingAvailability(false);
      }
    }

    void loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [courts, date, refreshKey]);

  // --- Interaction -------------------------------------------------------
  const handleSelectCourt = (courtId: number) => {
    setFilter(courtId);
  };

  const handleChangeFilter = (next: CourtFilter) => {
    setFilter(next);
  };

  const handleChangeDate = (value: string) => {
    setDate(value);
    setSelectedHours({});
  };

  const handleToggleSlot = (courtId: number, startTime: number) => {
    setSelectedHours((previous) => {
      const current = previous[courtId] ?? [];
      const next = current.includes(startTime)
        ? current.filter((hour) => hour !== startTime)
        : [...current, startTime];
      return { ...previous, [courtId]: next };
    });
  };

  const handleRemoveHour = (courtId: number, hour: number) => {
    setSelectedHours((previous) => ({
      ...previous,
      [courtId]: (previous[courtId] ?? []).filter((value) => value !== hour),
    }));
  };

  const handleClear = () => setSelectedHours({});

  // --- Derived: reservation groups ---------------------------------------
  const groups = useMemo<ReservationGroup[]>(() => {
    if (!date || courts.length === 0) return [];
    const courtMap = new Map(courts.map((court) => [court.id, court]));
    const result: ReservationGroup[] = [];

    for (const [rawCourtId, hours] of Object.entries(selectedHours)) {
      const courtId = Number(rawCourtId);
      const court = courtMap.get(courtId);
      if (!court || hours.length === 0) continue;

      for (const range of groupContiguousSlots(hours)) {
        const count = range.endTime - range.startTime;
        result.push({
          courtId,
          courtName: court.name,
          date,
          startTime: range.startTime,
          endTime: range.endTime,
          hours: Array.from({ length: count }, (_, index) => range.startTime + index),
          subtotal: count * court.pricePerHour,
        });
      }
    }

    return result.sort((a, b) => {
      if (a.courtId !== b.courtId) return a.courtId - b.courtId;
      return a.startTime - b.startTime;
    });
  }, [courts, date, selectedHours]);

  const totalHours = groups.reduce((sum, group) => sum + group.hours.length, 0);
  const totalPrice = groups.reduce((sum, group) => sum + group.subtotal, 0);

  // --- Submit ------------------------------------------------------------
  const handleSubmit = useCallback(
    async (values: { userName: string; userPhone: string }) => {
      if (groups.length === 0) {
        toast.error("Pilih minimal satu slot waktu terlebih dahulu");
        return;
      }
      if (values.userName.length < 3) {
        toast.error("Nama pemesan minimal 3 karakter");
        return;
      }
      if (values.userPhone.length < 8) {
        toast.error("Nomor WhatsApp tidak valid");
        return;
      }

      setSubmitting(true);
      const created: ETicketData[] = [];
      const failures: string[] = [];

      try {
        for (const group of groups) {
          const label = `${group.courtName} · ${formatTimeSlot({
            startTime: group.startTime,
            endTime: group.endTime,
          })}`;

          try {
            const response = await fetch("/api/bookings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                courtId: group.courtId,
                date: group.date,
                startTime: group.startTime,
                endTime: group.endTime,
                userName: values.userName,
                userPhone: values.userPhone,
              }),
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.success) {
              failures.push(`${label} — ${payload?.message ?? "gagal dibuat"}`);
              continue;
            }

            const booking = payload.data as {
              id: string;
              status: string;
              userName: string;
              userPhone: string;
              totalPrice: number | string;
              court?: { name: string } | null;
            };

            addLocalTicket(booking.id);
            created.push({
              code: booking.id,
              courtName: booking.court?.name ?? group.courtName,
              date: group.date,
              startTime: group.startTime,
              endTime: group.endTime,
              totalPrice: Number(booking.totalPrice),
              userName: booking.userName ?? values.userName,
              userPhone: values.userPhone,
              status: booking.status ?? "PENDING_PAYMENT",
            });
          } catch {
            failures.push(`${label} — koneksi terputus`);
            break;
          }
        }

        if (created.length === 0) {
          toast.error(
            failures[0]
              ? `Reservasi gagal: ${failures[0]}`
              : "Gagal membuat reservasi"
          );
          return;
        }

        setTickets(created);
        setTicketNotice(
          failures.length > 0
            ? `${created.length} dari ${groups.length} reservasi berhasil. Gagal: ${failures.join("; ")}. Tiket yang berhasil tetap dapat dibayar seperti biasa.`
            : null
        );
        setSelectedHours({});
        toast.success(
          failures.length > 0
            ? `${created.length} dari ${groups.length} reservasi dibuat. Periksa rincian pada e-tiket.`
            : created.length > 1
              ? `${created.length} reservasi dibuat. Segera selesaikan pembayaran.`
              : "Reservasi dibuat. Segera selesaikan pembayaran."
        );
      } finally {
        setSubmitting(false);
        if (created.length > 0) setSelectedHours({});
        setRefreshKey((key) => key + 1);
      }
    },
    [groups]
  );

  const activeDate = dateOptions.find((option) => option.value === date);
  const courtFilterLabel =
    filter === "all"
      ? "Semua lapangan"
      : courts.find((court) => court.id === filter)?.name ?? "Lapangan";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:pb-16 lg:px-8">
      {/* Page header */}
      <div className="border-b border-navy pb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-terracotta">
              Reservasi lapangan
            </span>
            <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-navy sm:text-3xl">
              Pilih Lapangan &amp; Jam Main
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-muted sm:text-sm">
              Ketersediaan diperbarui langsung dari basis data arena. Setiap blok mewakili 60 menit
              dan harga akhir dihitung ulang oleh server saat reservasi dikirim.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-navy">
              <span className="inline-block h-3.5 w-3.5 rounded-[1px] border border-navy/30 bg-paper" />
              Tersedia
            </span>
            <span className="flex items-center gap-1.5 text-navy">
              <span className="inline-block h-3.5 w-3.5 rounded-[1px] border border-navy bg-terracotta" />
              Dipilih
            </span>
            <span className="flex items-center gap-1.5 text-slate-muted">
              <span className="slot-occupied inline-block h-3.5 w-3.5 rounded-[1px] border border-navy/25" />
              Terisi
            </span>
          </div>
        </div>
      </div>

      {/* Floorplan */}
      <div className="mt-6">
        <InteractiveFloorplan
          courts={courts}
          activeCourtId={activeCourtId}
          onSelectCourt={handleSelectCourt}
        />
      </div>

      {/* Date strip */}
      <section className="mt-6" aria-label="Pilih tanggal bermain">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy/25 pb-2">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-navy">
            01 / Pilih tanggal
          </h2>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-cobalt">
              {activeDate?.full ?? "Memuat tanggal…"}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftWeek(-1)}
                disabled={!canGoPrevWeek}
                aria-label="Minggu sebelumnya"
                className="flex h-9 w-9 items-center justify-center rounded-[2px] border border-navy/30 bg-paper text-navy transition-colors hover:border-navy disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => shiftWeek(1)}
                disabled={!canGoNextWeek}
                aria-label="Minggu berikutnya"
                className="flex h-9 w-9 items-center justify-center rounded-[2px] border border-navy/30 bg-paper text-navy transition-colors hover:border-navy disabled:cursor-not-allowed disabled:opacity-35"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-2 flex gap-px overflow-x-auto border border-navy bg-navy/30 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(dateOptions.length > 0
            ? dateOptions
            : Array.from({ length: 7 }, (_, index) => ({
              value: `skeleton-${index}`,
              short: "— — —",
              full: "",
              isToday: false,
            }))
          ).map((option) => {
            const isActive = option.value === date && date !== "";
            const isPlaceholder = option.value.startsWith("skeleton-");
            return (
              <button
                key={option.value}
                type="button"
                disabled={isPlaceholder}
                aria-pressed={isActive}
                onClick={() => handleChangeDate(option.value)}
                className={cn(
                  "flex h-16 min-w-[86px] flex-1 flex-col justify-between px-3 py-2 text-left transition-colors",
                  isActive
                    ? "bg-navy text-paper"
                    : "bg-paper text-navy hover:bg-birch",
                  isPlaceholder && "animate-pulse"
                )}
              >
                <span className="font-mono text-[11px] font-bold tracking-wider">{option.short}</span>
                <span
                  className={cn(
                    "font-mono text-[11px] uppercase tracking-wider",
                    isActive ? "text-birch" : "text-slate-muted"
                  )}
                >
                  {option.isToday ? "Hari ini" : isActive ? "Terpilih" : "Pilih"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Matrix + receipt */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="space-y-4 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy/25 pb-2">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-wider text-navy">
              02 / Pilih lapangan &amp; jam
            </h2>
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-muted">
              {loadingCourts
                ? "Memuat lapangan…"
                : `${courtFilterLabel} · ${operatingHours.open
                  .toString()
                  .padStart(2, "0")}:00–${operatingHours.close
                    .toString()
                    .padStart(2, "0")}:00 WIB`}
            </span>
          </div>

          {availabilityError ? (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-2 rounded-[2px] border border-terracotta bg-terracotta/10 px-3 py-2"
            >
              <p className="font-mono text-[11px] uppercase leading-relaxed tracking-wide text-terracotta">
                {availabilityError}
              </p>
              <button
                type="button"
                onClick={() => setRefreshKey((key) => key + 1)}
                className="min-h-9 shrink-0 rounded-[2px] border border-terracotta bg-paper px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-terracotta transition-colors hover:bg-terracotta hover:text-paper"
              >
                Muat ulang jadwal
              </button>
            </div>
          ) : null}

          <ScheduleMatrix
            courts={courts}
            filter={filter}
            onChangeFilter={handleChangeFilter}
            availability={availability}
            selectedHours={selectedHours}
            onToggleSlot={handleToggleSlot}
            loading={loadingCourts || loadingAvailability}
          />

          <div className="rounded-[2px] border border-navy/25 bg-birch px-4 py-3">
            <p className="font-mono text-[11px] leading-relaxed tracking-wide text-slate-muted">
              Label <span className="font-bold text-terracotta">PRIME</span> menandai jam ramai
              (mulai 17:00). Itu informasi kepadatan, bukan tambahan tarif — tarif per jam mengikuti
              pengaturan resmi pengelola.
            </p>
          </div>
        </div>

        <div className="lg:col-span-4" ref={receiptRef}>
          <ReservationReceipt
            groups={groups}
            totalHours={totalHours}
            totalPrice={totalPrice}
            onRemoveHour={handleRemoveHour}
            onClear={handleClear}
            onSubmit={handleSubmit}
            submitting={submitting}
            expiredNotice={
              totalHours > 0
                ? "Batas waktu pembayaran 60 menit. Slot otomatis dilepas setelah kedaluwarsa."
                : null
            }
          />
        </div>
      </div>

      {/* Steps footer */}
      <section className="mt-10 grid gap-px border border-navy bg-navy/30 sm:grid-cols-3">
        {[
          {
            step: "01",
            title: "Pilih slot",
            body: "Klik blok jam yang masih tersedia. Slot berurutan pada lapangan yang sama digabung menjadi satu reservasi.",
          },
          {
            step: "02",
            title: "Isi identitas",
            body: "Nama dan nomor WhatsApp wajib diisi. Nomor dipakai untuk membuka tiket dan memverifikasi pembayaran.",
          },
          {
            step: "03",
            title: "Selesaikan pembayaran",
            body: "Buka halaman detail tiket untuk membayar via Midtrans atau mengunggah bukti transfer.",
          },
        ].map((item) => (
          <div key={item.step} className="bg-paper p-4">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-terracotta">
              Langkah {item.step}
            </span>
            <h3 className="mt-1 font-display text-sm font-bold text-navy">{item.title}</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-muted">{item.body}</p>
          </div>
        ))}
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-navy/20 pt-4">
        <p className="font-mono text-[11px] uppercase tracking-wider text-slate-muted">
          Butuh melihat tiket yang sudah dibuat? Buka menu Tiket Saya.
        </p>
        <Link
          href="/bookings"
          className="inline-flex items-center gap-2 rounded-[2px] border border-navy bg-paper px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-navy transition-colors hover:bg-navy hover:text-paper"
        >
          Buka Tiket Saya
          <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
        </Link>
      </div>

      {/* Sticky total + CTA for mobile viewports (UI-20) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-navy bg-paper/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="min-w-0 leading-tight">
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-navy">
              {totalHours > 0 ? `${totalHours} jam dipilih` : "Belum ada slot"}
            </p>
            <p className="font-mono text-[11px] tabular-nums text-terracotta">
              {formatCurrency(totalPrice)}
            </p>
          </div>
          <button
            type="button"
            disabled={totalHours === 0}
            onClick={() => {
              receiptRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              receiptRef.current?.querySelector<HTMLInputElement>("#booking-name")?.focus({
                preventScroll: true,
              });
            }}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[2px] border border-navy bg-terracotta px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-paper transition-colors hover:bg-navy disabled:cursor-not-allowed disabled:opacity-45"
          >
            Isi data
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Loading overlay for first paint */}
      {loadingCourts ? (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-[2px] border border-navy bg-navy px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-paper">
          <Loader2 className="mr-1.5 inline h-3 w-3 animate-spin" strokeWidth={1.5} />
          Menghubungkan ke arena…
        </div>
      ) : null}

      <ETicketModal
        tickets={tickets}
        notice={ticketNotice}
        onClose={() => {
          setTickets([]);
          setTicketNotice(null);
        }}
      />

      {/* Hidden helper for screen readers describing currently selected range */}
      <p className="sr-only" aria-live="polite">
        {totalHours > 0
          ? `${totalHours} jam dipilih, total ${totalPrice} rupiah. ${groups
            .map(
              (group) =>
                `${group.courtName} ${formatTimeSlot({
                  startTime: group.startTime,
                  endTime: group.endTime,
                })}`
            )
            .join(", ")}.`
          : "Belum ada slot dipilih."}
      </p>
    </div>
  );
}
