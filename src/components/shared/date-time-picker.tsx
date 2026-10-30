"use client";

import * as React from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  X,
} from "lucide-react";
import { cn } from "./utils";
import { Button } from "./button";

interface DateTimePickerProps {
  value: string; // ISO string or YYYY-MM-DDTHH:mm
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const QUICK_TIMES = [
  { label: "9:00 AM", h: 9, m: 0 },
  { label: "10:30 AM", h: 10, m: 30 },
  { label: "1:00 PM", h: 13, m: 0 },
  { label: "2:30 PM", h: 14, m: 30 },
  { label: "4:00 PM", h: 16, m: 0 },
  { label: "5:30 PM", h: 17, m: 30 },
];

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date & time...",
  className,
  disabled = false,
  required = false,
  id,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Parse current value
  const parsedDate = React.useMemo(() => {
    if (!value) return new Date();
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [value]);

  const [currentMonth, setCurrentMonth] = React.useState<number>(parsedDate.getMonth());
  const [currentYear, setCurrentYear] = React.useState<number>(parsedDate.getFullYear());
  const [selectedDay, setSelectedDay] = React.useState<number>(parsedDate.getDate());
  
  // Time state
  const hours24 = parsedDate.getHours();
  const [selectedHour12, setSelectedHour12] = React.useState<number>(
    hours24 % 12 === 0 ? 12 : hours24 % 12
  );
  const [selectedMinute, setSelectedMinute] = React.useState<number>(
    Math.round(parsedDate.getMinutes() / 5) * 5 % 60
  );
  const [selectedPeriod, setSelectedPeriod] = React.useState<"AM" | "PM">(
    hours24 >= 12 ? "PM" : "AM"
  );

  // Sync internal state when value prop changes
  React.useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setCurrentMonth(d.getMonth());
        setCurrentYear(d.getFullYear());
        setSelectedDay(d.getDate());
        const h = d.getHours();
        setSelectedHour12(h % 12 === 0 ? 12 : h % 12);
        setSelectedMinute(d.getMinutes());
        setSelectedPeriod(h >= 12 ? "PM" : "AM");
      }
    }
  }, [value]);

  // Click outside to close
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Calendar math
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  // Helper to commit date & time change
  const commitChange = (
    year: number,
    month: number,
    day: number,
    hour12: number,
    minute: number,
    period: "AM" | "PM"
  ) => {
    let hour24 = hour12 % 12;
    if (period === "PM") hour24 += 12;

    const d = new Date(year, month, day, hour24, minute, 0, 0);
    const pad = (n: number) => n.toString().padStart(2, "0");
    const formattedLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    onChange(formattedLocal);
  };

  const handleDaySelect = (day: number) => {
    setSelectedDay(day);
    commitChange(currentYear, currentMonth, day, selectedHour12, selectedMinute, selectedPeriod);
  };

  const handleTimePreset = (h24: number, m: number) => {
    const period = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    setSelectedHour12(h12);
    setSelectedMinute(m);
    setSelectedPeriod(period);
    commitChange(currentYear, currentMonth, selectedDay, h12, m, period);
  };

  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const setToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDay(today.getDate());
    commitChange(today.getFullYear(), today.getMonth(), today.getDate(), selectedHour12, selectedMinute, selectedPeriod);
  };

  // Formatted display text
  const displayText = React.useMemo(() => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
    return d.toLocaleString("en-US", options);
  }, [value]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Input with Calendar Icon at the End */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={cn(
          "w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-left text-body-sm transition-all duration-150 select-none cursor-pointer",
          "bg-background/80 hover:bg-background border-border/70 hover:border-primary/50",
          isOpen ? "ring-2 ring-primary/20 border-primary" : "shadow-2xs",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <span className={displayText ? "text-foreground font-medium" : "text-muted-foreground/80"}>
          {displayText || placeholder}
        </span>
        <CalendarIcon className="h-4 w-4 text-muted-foreground/70 shrink-0 ml-2" />
      </button>

      {/* Popover Calendar dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 sm:left-auto sm:right-0 mt-2 w-[340px] rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-xl p-3.5 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Header Month / Year & Arrows */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-body-sm text-foreground">
                {MONTHS[currentMonth]} {currentYear}
              </span>
              <button
                type="button"
                onClick={setToday}
                className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors ml-1 cursor-pointer"
              >
                Today
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Weekday Row */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {WEEKDAYS.map((wd) => (
              <span key={wd} className="text-caption font-semibold text-muted-foreground/80 uppercase">
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {/* Blank offset cells for first day */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`blank-${i}`} className="h-8 w-8" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected = selectedDay === day;
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === currentMonth &&
                new Date().getFullYear() === currentYear;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDaySelect(day)}
                  className={cn(
                    "h-8 w-8 rounded-lg text-body-sm flex items-center justify-center transition-all cursor-pointer select-none font-medium",
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-xs scale-105"
                      : isToday
                      ? "border border-primary/40 text-primary hover:bg-accent"
                      : "text-foreground hover:bg-accent/80 hover:text-foreground"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Time Picker Section */}
          <div className="border-t border-border/40 pt-2.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-primary" /> Select Time
              </span>
              <div className="flex items-center gap-1 bg-accent/60 p-0.5 rounded-lg border border-border/40">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPeriod("AM");
                    commitChange(currentYear, currentMonth, selectedDay, selectedHour12, selectedMinute, "AM");
                  }}
                  className={cn(
                    "px-2 py-0.5 text-caption font-bold rounded-md transition-colors cursor-pointer",
                    selectedPeriod === "AM" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPeriod("PM");
                    commitChange(currentYear, currentMonth, selectedDay, selectedHour12, selectedMinute, "PM");
                  }}
                  className={cn(
                    "px-2 py-0.5 text-caption font-bold rounded-md transition-colors cursor-pointer",
                    selectedPeriod === "PM" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  PM
                </button>
              </div>
            </div>

            {/* Hour & Minute Selectors */}
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              <div>
                <label className="text-xs text-muted-foreground/80 block mb-1">Hour</label>
                <select
                  value={selectedHour12}
                  onChange={(e) => {
                    const h = parseInt(e.target.value, 10);
                    setSelectedHour12(h);
                    commitChange(currentYear, currentMonth, selectedDay, h, selectedMinute, selectedPeriod);
                  }}
                  className="w-full h-8 px-2 rounded-lg bg-background border border-border/60 text-caption font-semibold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {(i + 1).toString().padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground/80 block mb-1">Minute</label>
                <select
                  value={selectedMinute}
                  onChange={(e) => {
                    const m = parseInt(e.target.value, 10);
                    setSelectedMinute(m);
                    commitChange(currentYear, currentMonth, selectedDay, selectedHour12, m, selectedPeriod);
                  }}
                  className="w-full h-8 px-2 rounded-lg bg-background border border-border/60 text-caption font-semibold text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                    <option key={m} value={m}>
                      {m.toString().padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Time Chips */}
            <div className="flex flex-wrap gap-1 mb-2.5">
              {QUICK_TIMES.map((qt) => (
                <button
                  key={qt.label}
                  type="button"
                  onClick={() => handleTimePreset(qt.h, qt.m)}
                  className="text-xs font-medium px-2 py-0.5 rounded-md border border-border/50 bg-background/60 hover:bg-accent text-foreground/80 hover:text-foreground transition-colors cursor-pointer"
                >
                  {qt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="border-t border-border/40 pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className="text-caption text-muted-foreground hover:text-rose-500 font-medium transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-caption font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

