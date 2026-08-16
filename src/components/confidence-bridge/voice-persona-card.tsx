"use client";

import * as React from "react";
import { Volume2, Play, Pause, Sparkles, AudioLines, Heart, Check, User } from "lucide-react";
import { cn } from "@/components/shared/utils";

interface VoicePersonaCardProps {
  businessName: string;
}

interface PersonaOption {
  id: string;
  name: string;
  trait: string;
  badge: string;
  description: string;
  sampleIntro: string;
  greetingText: (biz: string) => string;
  pitch: number;
  rate: number;
}

const PERSONAS: PersonaOption[] = [
  {
    id: "emma",
    name: "Emma",
    trait: "Warm & Friendly",
    badge: "Hospitality & Salons",
    description: "Inviting, cheerful tone that builds immediate trust.",
    sampleIntro: "Hi there! I'm Emma. I will answer your calls with a warm and welcoming voice.",
    greetingText: (biz) => `Hi there! Thanks for calling ${biz}. My name is Emma, your AI operator. How can I take care of your appointment or questions today?`,
    pitch: 1.15, // Bright cheerful female
    rate: 1.05,
  },
  {
    id: "michael",
    name: "Michael",
    trait: "Crisp & Professional",
    badge: "Dental & Corporate",
    description: "Clear, authoritative cadence with corporate polish.",
    sampleIntro: "Good day, I'm Michael. I will represent your business with crisp and confident professionalism.",
    greetingText: (biz) => `Good day and thank you for calling ${biz}. This is Michael with Operator. How may I assist you with pricing or scheduling today?`,
    pitch: 0.70, // Deep resonant male
    rate: 0.95,
  },
  {
    id: "sophia",
    name: "Sophia",
    trait: "Calm & Empathetic",
    badge: "Health & Wellness",
    description: "Patient, gentle cadence that puts clients at ease.",
    sampleIntro: "Hello, I'm Sophia. I provide calm, patient, and attentive care for your callers.",
    greetingText: (biz) => `Hello and welcome to ${biz}. My name is Sophia. How can I help make your visit or booking seamless today?`,
    pitch: 1.35, // Soft, soothing higher female timbre
    rate: 0.88,
  },
];

export function VoicePersonaCard({ businessName }: VoicePersonaCardProps) {
  const [selectedPersona, setSelectedPersona] = React.useState<PersonaOption>(PERSONAS[0]);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [waveformActive, setWaveformActive] = React.useState(false);
  const [availableVoices, setAvailableVoices] = React.useState<SpeechSynthesisVoice[]>([]);

  // Initialize SpeechSynthesis voices reliably
  React.useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakText = (text: string, persona: PersonaOption) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.pitch = persona.pitch;
      utterance.rate = persona.rate;

      const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();

      if (persona.id === "michael") {
        const maleVoice = voices.find((v) => {
          const name = v.name.toLowerCase();
          return name.includes("david") || name.includes("mark") || name.includes("george") || name.includes("guy") || name.includes("male") || name.includes("daniel") || name.includes("james");
        });
        if (maleVoice) utterance.voice = maleVoice;
      } else if (persona.id === "sophia") {
        const softVoice = voices.find((v) => {
          const name = v.name.toLowerCase();
          return name.includes("hazel") || name.includes("susan") || name.includes("catherine") || name.includes("fiona") || name.includes("moira") || name.includes("natural");
        });
        if (softVoice) utterance.voice = softVoice;
      } else {
        const warmVoice = voices.find((v) => {
          const name = v.name.toLowerCase();
          return name.includes("zira") || name.includes("jenny") || name.includes("samantha") || name.includes("karen") || name.includes("google us english") || name.includes("female");
        });
        if (warmVoice) utterance.voice = warmVoice;
      }

      utterance.onstart = () => {
        setIsPlaying(true);
        setWaveformActive(true);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setWaveformActive(false);
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        setWaveformActive(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error:", e);
      setIsPlaying(false);
      setWaveformActive(false);
    }
  };

  const currentGreeting = selectedPersona.greetingText(businessName);

  const handleTogglePlay = () => {
    if (isPlaying) {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      setWaveformActive(false);
    } else {
      speakText(currentGreeting, selectedPersona);
    }
  };

  const handleSelectPersona = (persona: PersonaOption) => {
    setSelectedPersona(persona);
    speakText(persona.sampleIntro, persona);
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card/70 backdrop-blur-md p-4 sm:p-5 shadow-sm space-y-4 transition-all">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            {waveformActive ? (
              <AudioLines className="h-4 w-4 animate-pulse text-primary" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground tracking-tight">Voice Persona</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-500 border border-emerald-500/20 whitespace-nowrap">
                <Heart className="h-2.5 w-2.5 fill-current" />
                Natural Cadence
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a voice below to preview character and tone.
            </p>
          </div>
        </div>

        {/* Compact Audition Button */}
        <button
          onClick={handleTogglePlay}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shadow-sm active:scale-95 shrink-0",
            isPlaying
              ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/25"
              : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
          )}
          aria-label={isPlaying ? "Pause voice preview" : "Audition voice"}
        >
          {isPlaying ? (
            <>
              <Pause className="h-3.5 w-3.5 fill-current" />
              <span>Pause Greeting</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Audition Greeting</span>
            </>
          )}
        </button>
      </div>

      {/* Voice Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {PERSONAS.map((p) => {
          const isSelected = selectedPersona.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handleSelectPersona(p)}
              className={cn(
                "relative flex flex-col items-start p-3 rounded-lg border text-left transition-all duration-150 group",
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                  : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40"
              )}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {p.name[0]}
                  </div>
                  <span className="text-xs font-bold text-foreground">{p.name}</span>
                </div>
                {isSelected && (
                  <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-2 w-2 stroke-[3]" />
                  </div>
                )}
              </div>
              <p className="text-[11px] font-medium text-primary">{p.trait}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                {p.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Live Greeting & Equalizer Wave */}
      <div className="rounded-lg border border-border/70 bg-background/90 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Spoken Greeting
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
              {selectedPersona.name} ({selectedPersona.trait})
            </span>
          </div>

          {/* Equalizer Bars */}
          <div className="flex items-center gap-0.5 h-3.5">
            {[12, 20, 15, 24, 14, 18, 26, 13, 22, 16, 10, 21].map((h, i) => (
              <span
                key={i}
                className={cn(
                  "w-0.5 rounded-full transition-all duration-200",
                  waveformActive ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                )}
                style={{
                  height: waveformActive ? `${(h / 26) * 14}px` : "3px",
                  animationDelay: `${i * 60}ms`,
                }}
              />
            ))}
          </div>
        </div>

        <p className="text-xs text-foreground/90 font-medium leading-relaxed italic border-l-2 border-primary/50 pl-2.5">
          "{currentGreeting}"
        </p>
      </div>
    </div>
  );
}
