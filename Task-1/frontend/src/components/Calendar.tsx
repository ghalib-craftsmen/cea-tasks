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
  const [rangeStart, setRangeStart] = useState<Date | null>(selectedRange.start);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(selectedRange.end);

  useEffect(() => {
    setRangeStart(selectedRange.start);
    setRangeEnd(selectedRange.end);
  }, [selectedRange]);

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const isDateInWFHPeriod = (date: Date): boolean => {
    const dateKey = formatDateKey(date);
    return wfhPeriods.some(
      (period) => dateKey >= period.start_date && dateKey <= period.end_date
    );
  };

  const isDateSelected = (date: Date): boolean => {
    if (selectionMode === 'single') {
      return false;
    }
    if (!rangeStart || !rangeEnd) return false;
    const dateKey = formatDateKey(date);
    const startKey = formatDateKey(rangeStart);
    const endKey = formatDateKey(rangeEnd);
    return dateKey >= startKey && dateKey <= endKey;
  };

  const isDateInRangeStart = (date: Date): boolean => {
    if (!rangeStart) return false;
    return formatDateKey(date) === formatDateKey(rangeStart);
  };

  const isDateInRangeEnd = (date: Date): boolean => {
    if (!rangeEnd) return false;
    return formatDateKey(date) === formatDateKey(rangeEnd);
  };

  const handleDateClick = (date: Date) => {
    if (disabledDates.has(formatDateKey(date))) return;

    if (selectionMode === 'range' && onRangeSelect) {
      if (!isSelecting || !rangeStart) {
        setRangeStart(date);
        setRangeEnd(date);
        setIsSelecting(true);
        onRangeSelect(date, date);
      } else {
        const newEnd = date < rangeStart ? date : date;
        const newStart = date < rangeStart ? date : rangeStart;
        setRangeStart(newStart);
        setRangeEnd(newEnd);
        setIsSelecting(false);
        onRangeSelect(newStart, newEnd);
      }
    } else if (onDateClick) {
      onDateClick(date);
    }
  };

  const handleDateMouseEnter = (date: Date) => {
    if (selectionMode === 'range' && isSelecting && rangeStart && onRangeSelect) {
      const newEnd = date < rangeStart ? date : date;
      const newStart = date < rangeStart ? date : rangeStart;
      setRangeEnd(newEnd);
      onRangeSelect(newStart, newEnd);
    }
  };

  const handleDateMouseUp = () => {
    if (selectionMode === 'range') {
      setIsSelecting(false);
    }
  };

  const handleDateMouseDown = (date: Date) => {
    if (disabledDates.has(formatDateKey(date))) return;
    if (selectionMode === 'range' && onRangeSelect) {
      setRangeStart(date);
      setRangeEnd(date);
      setIsSelecting(true);
      onRangeSelect(date, date);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    onDateChange(newDate);
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const renderDays = () => {
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-20 border border-gray-100 bg-gray-50" />
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateKey = formatDateKey(date);
      const location = locationData[dateKey];
      const specialDay = specialDays[dateKey];
      const isWFH = isDateInWFHPeriod(date);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6; // Sunday (0) or Saturday (6)
      const isClosed = specialDay?.is_closed || isWeekend;
      const isSelected = isDateSelected(date);
      const isRangeStart = isDateInRangeStart(date);
      const isRangeEnd = isDateInRangeEnd(date);

      let bgColor = 'bg-white';
      let textColor = 'text-gray-900';
      let borderColor = 'border-gray-200';

      if (isClosed) {
        bgColor = 'bg-red-50';
        textColor = 'text-red-900';
        borderColor = 'border-red-200';
      } else if (isSelected) {
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-900';
        borderColor = 'border-blue-300';
      } else if (location === 'WFH' || isWFH) {
        bgColor = 'bg-green-50';
        textColor = 'text-green-900';
        borderColor = 'border-green-200';
      } else if (location === 'Office') {
        bgColor = 'bg-blue-50';
        textColor = 'text-blue-900';
        borderColor = 'border-blue-200';
      }

      if (isRangeStart || isRangeEnd) {
        borderColor = 'border-blue-500 border-2';
      }

      days.push(
        <div
          key={day}
          className={`h-20 p-2 border ${borderColor} ${bgColor} ${textColor} cursor-pointer hover:opacity-80 transition-opacity flex flex-col justify-between ${
            disabledDates.has(dateKey) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={() => handleDateClick(date)}
          onMouseDown={() => handleDateMouseDown(date)}
          onMouseEnter={() => handleDateMouseEnter(date)}
          onMouseUp={handleDateMouseUp}
        >
          <div className="flex justify-between items-start">
            <span className="font-semibold">{day}</span>
            {isClosed && (
              <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded">Closed</span>
            )}
            {specialDay && !isClosed && (
              <span className="text-xs bg-yellow-600 text-white px-1.5 py-0.5 rounded">
                {specialDay.type}
              </span>
            )}
          </div>
          <div className="text-xs">
            {location && !isClosed && (
              <span className="font-medium">{location}</span>
            )}
            {!location && isWFH && !isClosed && (
              <span className="font-medium text-green-700">WFH Period</span>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          <span className="text-xl">‹</span>
        </button>
        <h2 className="text-xl font-semibold text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Next month"
        >
          <span className="text-xl">›</span>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0">
        {renderDays()}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded" />
          <span className="text-gray-600">Office</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-50 border border-green-200 rounded" />
          <span className="text-gray-600">WFH</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-50 border border-red-200 rounded" />
          <span className="text-gray-600">Closed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded" />
          <span className="text-gray-600">Selected Range</span>
        </div>
      </div>
    </div>
  );
}
