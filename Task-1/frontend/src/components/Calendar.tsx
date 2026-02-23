import { useState, useEffect } from 'react';
import type { WorkLocationType, SpecialDayCheck } from '../types';

interface CalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onDateClick?: (date: Date) => void;
  locationData?: Record<string, WorkLocationType>;
  wfhPeriods?: Array<{ start_date: string; end_date: string }>;
  specialDays?: Record<string, SpecialDayCheck>;
  disabledDates?: Set<string>;
  selectionMode?: 'single' | 'range';
  selectedRange?: { start: Date | null; end: Date | null };
  onRangeSelect?: (start: Date | null, end: Date | null) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function Calendar({
  currentDate,
  onDateChange,
  onDateClick,
  locationData = {},
  wfhPeriods = [],
  specialDays = {},
  disabledDates = new Set(),
  selectionMode = 'single',
  selectedRange = { start: null, end: null },
  onRangeSelect,
}: CalendarProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [rangeAnchor, setRangeAnchor] = useState<Date | null>(null);
  const [rangeStart, setRangeStart] = useState<Date | null>(selectedRange.start);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(selectedRange.end);

  useEffect(() => {
    setRangeStart(selectedRange.start);
    setRangeEnd(selectedRange.end);
  }, [selectedRange]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateKey(today);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const isDateInWFHPeriod = (date: Date): boolean => {
    const key = formatDateKey(date);
    return wfhPeriods.some(p => key >= p.start_date && key <= p.end_date);
  };

  const isDateSelected = (date: Date): boolean => {
    if (selectionMode !== 'range' || !rangeStart || !rangeEnd) return false;
    const key = formatDateKey(date);
    return key >= formatDateKey(rangeStart) && key <= formatDateKey(rangeEnd);
  };

  const isDateInRangeStart = (date: Date): boolean =>
    !!rangeStart && formatDateKey(date) === formatDateKey(rangeStart);

  const isDateInRangeEnd = (date: Date): boolean =>
    !!rangeEnd && formatDateKey(date) === formatDateKey(rangeEnd);

  const handleDateClick = (date: Date) => {
    if (disabledDates.has(formatDateKey(date))) return;

    if (selectionMode === 'range' && onRangeSelect) {
      if (!isSelecting || !rangeAnchor) {
        setRangeAnchor(date);
        setRangeStart(date);
        setRangeEnd(date);
        setIsSelecting(true);
        onRangeSelect(date, date);
      } else {
        const [start, end] = date < rangeAnchor ? [date, rangeAnchor] : [rangeAnchor, date];
        setRangeStart(start);
        setRangeEnd(end);
        setIsSelecting(false);
        setRangeAnchor(null);
        onRangeSelect(start, end);
      }
    } else if (onDateClick) {
      onDateClick(date);
    }
  };

  const handleDateMouseEnter = (date: Date) => {
    if (selectionMode === 'range' && isSelecting && rangeAnchor) {
      const [start, end] = date < rangeAnchor ? [date, rangeAnchor] : [rangeAnchor, date];
      setRangeStart(start);
      setRangeEnd(end);
    }
  };

  const navigateMonth = (dir: 'prev' | 'next') => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + (dir === 'prev' ? -1 : 1));
    onDateChange(d);
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const cells: React.ReactNode[] = [];

  // Leading empty cells
  for (let i = 0; i < firstDay; i++) {
    cells.push(
      <div
        key={`empty-${i}`}
        className="min-h-[6rem] border-b border-r border-gray-100 bg-gray-50/40"
      />
    );
  }

  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateKey = formatDateKey(date);
    const location = locationData[dateKey];
    const specialDay = specialDays[dateKey];
    const inWFHPeriod = isDateInWFHPeriod(date);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isClosed = specialDay?.is_closed || isWeekend;
    const isDisabled = disabledDates.has(dateKey);
    const isToday = dateKey === todayStr;
    const isSelected = isDateSelected(date);
    const isRangeStart = isDateInRangeStart(date);
    const isRangeEnd = isDateInRangeEnd(date);
    const isPast = date < today;

    // Determine cell background
    let cellBg = 'bg-white';
    if (isClosed) cellBg = 'bg-gray-50';
    else if (specialDay && !isClosed) cellBg = 'bg-amber-50/50';
    else if (isSelected) cellBg = 'bg-blue-50/60';

    cells.push(
      <div
        key={dateKey}
        onClick={() => handleDateClick(date)}
        onMouseEnter={() => handleDateMouseEnter(date)}
        className={[
          'min-h-[6rem] border-b border-r border-gray-100 p-1.5 flex flex-col gap-1 transition-colors',
          cellBg,
          isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-blue-50/30',
          (isRangeStart || isRangeEnd) ? 'ring-2 ring-inset ring-blue-400' : '',
        ].join(' ')}
      >
        {/* Day number */}
        <div className="flex items-center justify-between">
          <span
            className={[
              'w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium',
              isToday
                ? 'bg-blue-600 text-white'
                : isPast
                ? 'text-gray-400'
                : isWeekend
                ? 'text-gray-500'
                : 'text-gray-800',
            ].join(' ')}
          >
            {day}
          </span>

          {/* Special day badge */}
          {specialDay?.type && (
            <span
              className={[
                'text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none',
                specialDay.type === 'Closed' || isClosed
                  ? 'bg-red-100 text-red-700'
                  : specialDay.type === 'Holiday'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-amber-100 text-amber-700',
              ].join(' ')}
            >
              {specialDay.type}
            </span>
          )}
          {isWeekend && !specialDay && (
            <span className="text-[10px] font-medium text-gray-400">
              {date.getDay() === 0 ? 'Sun' : 'Sat'}
            </span>
          )}
        </div>

        {/* Location / note indicators */}
        <div className="flex flex-col gap-0.5 mt-auto">
          {specialDay?.note && (
            <span className="text-[10px] text-amber-700 truncate leading-tight">
              {specialDay.note}
            </span>
          )}
          {!isClosed && (location === 'Office' || (!location && !inWFHPeriod && !isPast && !isWeekend)) && location === 'Office' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-100 rounded px-1.5 py-0.5 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              Office
            </span>
          )}
          {!isClosed && (location === 'WFH' || inWFHPeriod) && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 bg-violet-100 rounded px-1.5 py-0.5 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
              {location === 'WFH' ? 'WFH' : 'WFH Period'}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden select-none">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-900">
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={goToToday}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
            aria-label="Previous month"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
            aria-label="Next month"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Day-of-week headers ── */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAY_NAMES.map((d, i) => (
          <div
            key={d}
            className={[
              'py-2 text-center text-xs font-medium',
              i === 0 || i === 6 ? 'text-gray-400' : 'text-gray-500',
            ].join(' ')}
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Day grid ── */}
      <div className="grid grid-cols-7 border-l border-t border-gray-100">
        {cells}
      </div>

      {/* ── Legend ── */}
      <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap gap-x-5 gap-y-2">
        {[
          { dot: 'bg-blue-500', label: 'Office' },
          { dot: 'bg-violet-500', label: 'WFH' },
          { dot: 'bg-red-400', label: 'Closed' },
          { dot: 'bg-amber-400', label: 'Holiday / Special' },
          // holidays placeholder: { dot: 'bg-rose-500', label: 'National Holiday' },
        ].map(({ dot, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`w-2 h-2 rounded-full ${dot}`} />
            {label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[9px] text-white font-bold">T</span>
          Today
        </div>
      </div>
    </div>
  );
}
