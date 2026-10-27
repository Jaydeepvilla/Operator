"use client";

import * as React from "react";
import { 
  Globe, Calendar, DollarSign, Clock, ShieldCheck, Sparkles,
  Layers, MessageSquareCode, Languages, Check, ArrowRight
} from "lucide-react";
import { updateBusinessLocalizationAction } from "@/server/actions/settings";
import { Button } from "@/components/shared/button";
import { NativeSelect } from "@/components/shared/native";
import { cn } from "@/components/shared/utils";

interface CountryConfig {
  code: string;
  name: string;
  primaryCurrency: string;
  primaryLanguage: string;
  phoneCode: string;
  taxType: string;
  dateFormat: string;
  timeFormat: string;
  weekStart: number;
  measurementUnit: string;
}

interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  isRtl: boolean;
}

interface CurrencyConfig {
  code: string;
  symbol: string;
}

interface LocalizationSettingsClientProps {
  countries: CountryConfig[];
  languages: LanguageConfig[];
  currencies: CurrencyConfig[];
  initialSettings: {
    countryCode: string;
    primaryLanguage: string;
    currencyCode: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    weekStart: number;
    measurementUnit: string;
  };
}

export function LocalizationSettingsClient({
  countries,
  languages,
  currencies,
  initialSettings
}: LocalizationSettingsClientProps) {
  const [countryCode, setCountryCode] = React.useState(initialSettings.countryCode);
  const [primaryLanguage, setPrimaryLanguage] = React.useState(initialSettings.primaryLanguage);
  const [currencyCode, setCurrencyCode] = React.useState(initialSettings.currencyCode);
  const [timezone, setTimezone] = React.useState(initialSettings.timezone);
  const [dateFormat, setDateFormat] = React.useState(initialSettings.dateFormat);
  const [timeFormat, setTimeFormat] = React.useState(initialSettings.timeFormat);
  const [weekStart, setWeekStart] = React.useState(initialSettings.weekStart);
  const [measurementUnit, setMeasurementUnit] = React.useState(initialSettings.measurementUnit);

  const [isPending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Recommendations Handler when Country changes
  const handleCountryChange = (code: string) => {
    setCountryCode(code);
    const config = countries.find((c) => c.code === code);
    if (config) {
      setPrimaryLanguage(config.primaryLanguage);
      setCurrencyCode(config.primaryCurrency);
      setDateFormat(config.dateFormat);
      setTimeFormat(config.timeFormat);
      setWeekStart(config.weekStart);
      setMeasurementUnit(config.measurementUnit);

      // Auto resolve timezone categories
      if (code === "IN") setTimezone("Asia/Kolkata");
      else if (code === "DE") setTimezone("Europe/Berlin");
      else if (code === "GB") setTimezone("Europe/London");
      else setTimezone("America/New_York");
    }
  };

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await updateBusinessLocalizationAction({
        countryCode,
        primaryLanguage,
        currencyCode,
        timezone,
        dateFormat,
        timeFormat,
        weekStart,
        measurementUnit,
      });

      if (res.success) {
        setMessage({ type: "success", text: "Global localization profile updated successfully!" });
      } else {
        setMessage({ type: "error", text: res.error || "Failed to update localization profile." });
      }
    });
  };

  const currentCountry = countries.find((c) => c.code === countryCode);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Dynamic Recommendation Callout */}
      {currentCountry && (
        <div className="p-5 rounded-2xl border"
          style={{ background: "rgba(139,92,246,0.04)", borderColor: "rgba(139,92,246,0.15)", backdropFilter: "blur(20px)" }}>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-5 w-5 text-violet-400" />
            <h4 className="text-sm font-bold text-white">Smart Regional Presets Activated</h4>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">
            By choosing <span className="text-white font-bold">{currentCountry.name}</span>, the engine preset week start to{" "}
            <span className="text-white font-bold">{currentCountry.weekStart === 1 ? "Monday" : "Sunday"}</span>, measurements to{" "}
            <span className="text-white font-bold">{currentCountry.measurementUnit.toUpperCase()}</span>, dates to{" "}
            <span className="text-white font-bold">{currentCountry.dateFormat}</span>, and tax structures to{" "}
            <span className="text-white font-bold">{currentCountry.taxType}</span> automatically.
          </p>
        </div>
      )}

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Country Selector */}
        {/* Operating Country */}
        <div className="space-y-2 p-5 rounded-2xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-violet-400" />
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70">Operating Country</label>
          </div>
          <NativeSelect value={countryCode} onChange={(e) => handleCountryChange(e.target.value)}
            className="w-full h-11 px-4 rounded-xl text-sm text-white font-medium bg-white/5 border border-white/10 focus:border-violet-500/50 focus:outline-none">
            {countries.map((c) => (
              <option key={c.code} value={c.code} className="bg-neutral-900">{c.name} ({c.code})</option>
            ))}
          </NativeSelect>
        </div>

        {/* Primary Language */}
        <div className="space-y-2 p-5 rounded-2xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Languages className="h-4 w-4 text-violet-400" />
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70">Primary Language</label>
          </div>
          <NativeSelect value={primaryLanguage} onChange={(e) => setPrimaryLanguage(e.target.value)}
            className="w-full h-11 px-4 rounded-xl text-sm text-white font-medium bg-white/5 border border-white/10 focus:border-violet-500/50 focus:outline-none">
            {languages.map((l) => (
              <option key={l.code} value={l.code} className="bg-neutral-900">{l.nativeName} ({l.name})</option>
            ))}
          </NativeSelect>
        </div>

        {/* Display Currency */}
        <div className="space-y-2 p-5 rounded-2xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4 text-violet-400" />
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70">Preferred Settlement Currency</label>
          </div>
          <NativeSelect value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)}
            className="w-full h-11 px-4 rounded-xl text-sm text-white font-medium bg-white/5 border border-white/10 focus:border-violet-500/50 focus:outline-none">
            {currencies.map((c) => (
              <option key={c.code} value={c.code} className="bg-neutral-900">{c.code} ({c.symbol})</option>
            ))}
          </NativeSelect>
        </div>

        {/* Timezone */}
        <div className="space-y-2 p-5 rounded-2xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-violet-400" />
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70">Timezone Context</label>
          </div>
          <NativeSelect value={timezone} onChange={(e) => setTimezone(e.target.value)}
            className="w-full h-11 px-4 rounded-xl text-sm text-white font-medium bg-white/5 border border-white/10 focus:border-violet-500/50 focus:outline-none">
            <option value="UTC" className="bg-neutral-900">Coordinated Universal Time (UTC)</option>
            <option value="America/New_York" className="bg-neutral-900">Eastern Time (America/New_York)</option>
            <option value="Europe/Berlin" className="bg-neutral-900">Central European Time (Europe/Berlin)</option>
            <option value="Europe/London" className="bg-neutral-900">GMT / British Time (Europe/London)</option>
            <option value="Asia/Kolkata" className="bg-neutral-900">Indian Standard Time (Asia/Kolkata)</option>
          </NativeSelect>
        </div>

        {/* Date Format */}
        <div className="space-y-2 p-5 rounded-2xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-violet-400" />
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70">Date Presentation</label>
          </div>
          <NativeSelect value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}
            className="w-full h-11 px-4 rounded-xl text-sm text-white font-medium bg-white/5 border border-white/10 focus:border-violet-500/50 focus:outline-none">
            <option value="YYYY-MM-DD" className="bg-neutral-900">YYYY-MM-DD (ISO standard)</option>
            <option value="DD/MM/YYYY" className="bg-neutral-900">DD/MM/YYYY (Europe/India)</option>
            <option value="MM/DD/YYYY" className="bg-neutral-900">MM/DD/YYYY (US standard)</option>
          </NativeSelect>
        </div>

        {/* Time presentation */}
        <div className="space-y-2 p-5 rounded-2xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-violet-400" />
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70">Time Clock Dial</label>
          </div>
          <NativeSelect value={timeFormat} onChange={(e) => setTimeFormat(e.target.value)}
            className="w-full h-11 px-4 rounded-xl text-sm text-white font-medium bg-white/5 border border-white/10 focus:border-violet-500/50 focus:outline-none">
            <option value="24h" className="bg-neutral-900">24-Hour System (military/standard)</option>
            <option value="12h" className="bg-neutral-900">12-Hour System (AM/PM standard)</option>
          </NativeSelect>
        </div>

        {/* Week Start Day */}
        <div className="space-y-2 p-5 rounded-2xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-violet-400" />
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70">Week Start Day</label>
          </div>
          <NativeSelect value={weekStart} onChange={(e) => setWeekStart(Number(e.target.value))}
            className="w-full h-11 px-4 rounded-xl text-sm text-white font-medium bg-white/5 border border-white/10 focus:border-violet-500/50 focus:outline-none">
            <option value={1} className="bg-neutral-900">Monday</option>
            <option value={0} className="bg-neutral-900">Sunday</option>
          </NativeSelect>
        </div>

        {/* Measurement system */}
        <div className="space-y-2 p-5 rounded-2xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-4 w-4 text-violet-400" />
            <label className="text-xs font-semibold uppercase tracking-wider text-white/70">Measurement Standard</label>
          </div>
          <NativeSelect value={measurementUnit} onChange={(e) => setMeasurementUnit(e.target.value)}
            className="w-full h-11 px-4 rounded-xl text-sm text-white font-medium bg-white/5 border border-white/10 focus:border-violet-500/50 focus:outline-none">
            <option value="metric" className="bg-neutral-900">Metric System (km, Celsius, kg)</option>
            <option value="imperial" className="bg-neutral-900">Imperial System (miles, Fahrenheit, lbs)</option>
          </NativeSelect>
        </div>
      </div>

      {message && (
        <div className={cn("p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 max-w-xl",
          message.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20")}>
          <Check className="h-4 w-4" />
          <span>{message.text}</span>
        </div>
      )}

      {/* Save Button */}
      <div className="pt-4 flex items-center justify-end">
        <Button onClick={handleSave} disabled={isPending}
          style={{ background: "linear-gradient(135deg, hsl(258,80%,55%), hsl(278,80%,50%))", color: "white" }}
          className="h-11 px-6 rounded-xl text-sm font-bold shadow-lg hover:scale-105 active:scale-95 transition-all duration-200">
          {isPending ? "Applying Presets..." : "Apply Regional Changes"}
        </Button>
      </div>
    </div>
  );
}
