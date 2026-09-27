"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Mic, MicOff, Loader2 } from "lucide-react";

interface WidgetInputBarProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  contextPlaceholder?: string;
}

export function WidgetInputBar({
  onSendMessage,
  isLoading,
  contextPlaceholder,
}: WidgetInputBarProps) {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API safely
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleSpeech = () => {
    if (!speechSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Speech start error", e);
        setIsListening(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isLoading) return;
    onSendMessage(text.trim());
    setText("");
  };

  const placeholder =
    contextPlaceholder ||
    (isListening
      ? "Listening... Speak your question"
      : isLoading
      ? "Operator AI is thinking..."
      : "Ask about appointments, services, pricing...");

  return (
    <form
      onSubmit={handleSubmit}
      className="p-2.5 bg-background/80 backdrop-blur-md border-t border-border/30 flex items-center gap-2 select-none shrink-0"
    >
      <div className="relative flex-1 flex items-center">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading || isListening}
          className="w-full h-9 pl-3 pr-9 text-xs rounded-xl border border-border/50 bg-muted/30 focus:outline-none focus:border-primary focus:bg-background transition-all text-foreground placeholder:text-muted-foreground"
        />

        {/* Real Speech-to-text mic toggle */}
        {speechSupported && (
          <button
            type="button"
            onClick={toggleSpeech}
            title={isListening ? "Stop listening" : "Speak your message"}
            className={`absolute right-2 p-1 rounded-md text-xs transition-colors cursor-pointer ${
              isListening
                ? "text-rose-500 bg-rose-500/10 animate-pulse"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      <button
        type="submit"
        disabled={!text.trim() || isLoading}
        className="h-9 w-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs hover:scale-102 active:scale-98 transition-all"
        aria-label="Send message"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-3.5 w-3.5" />
        )}
      </button>
    </form>
  );
}
