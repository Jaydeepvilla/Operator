"use client";

import React from "react";
import { cn } from "@/components/shared/utils";

/**
 * 2026 AI-Native Dimensional Icons
 * Soft lighting, subtle depth gradients, premium restrained 3D aesthetic.
 */

export function OperatorAvatarOrb({
  state = "idle",
  size = 40,
  className,
}: {
  state?: "idle" | "thinking" | "responding" | "speaking";
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("relative flex items-center justify-center select-none", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`AI Receptionist status: ${state}`}
    >
      {/* Outer ambient glow */}
      <div
        className={cn(
          "absolute inset-0 rounded-full blur-md transition-all duration-700 pointer-events-none",
          state === "thinking"
            ? "bg-primary/40 scale-125 animate-pulse"
            : state === "responding"
            ? "bg-primary/30 scale-110"
            : "bg-primary/20 scale-100 opacity-60"
        )}
      />

      {/* Main 3D Spherical Orb */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "relative z-10 transition-transform duration-500",
          state === "thinking" && "animate-spin-slow"
        )}
      >
        <defs>
          {/* Radial light source creating sphere highlight */}
          <radialGradient
            id="sphereGlow"
            cx="32%"
            cy="28%"
            r="70%"
            fx="30%"
            fy="25%"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="25%" stopColor="var(--primary-color, #7a5af8)" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#311075" stopOpacity="1" />
            <stop offset="100%" stopColor="#12052b" stopOpacity="1" />
          </radialGradient>

          {/* Core neural ring */}
          <linearGradient id="orbitalRing" x1="0" y1="0" x2="48" y2="48">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="50%" stopColor="var(--primary-color, #7a5af8)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.9" />
          </linearGradient>

          {/* Drop shadow filter */}
          <filter id="orbShadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Base sphere */}
        <circle cx="24" cy="24" r="20" fill="url(#sphereGlow)" filter="url(#orbShadow)" />

        {/* Illuminated inner crescent */}
        <ellipse cx="21" cy="18" rx="11" ry="8" fill="#ffffff" fillOpacity="0.18" />

        {/* Ambient horizon ring */}
        <ellipse
          cx="24"
          cy="24"
          rx="18"
          ry="6"
          stroke="url(#orbitalRing)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          strokeOpacity="0.6"
          transform="rotate(-25 24 24)"
        />

        {/* Central neural beacon */}
        <circle
          cx="24"
          cy="24"
          r="4.5"
          fill="#ffffff"
          className={cn(
            "transition-opacity duration-300",
            state === "thinking" ? "opacity-100 animate-ping" : "opacity-90"
          )}
        />
        <circle cx="24" cy="24" r="2" fill="var(--primary-color, #7a5af8)" />
      </svg>

      {/* Online presence badge */}
      <span className="absolute bottom-0 right-0 z-20 flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-background" />
      </span>
    </div>
  );
}

export function Calendar3DIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="calBody" x1="4" y1="6" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f8fafc" />
          <stop offset="1" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="calHeader" x1="4" y1="6" x2="28" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--primary-color, #7a5af8)" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
        <filter id="calShadow" x="0" y="2" width="32" height="30" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.18" />
        </filter>
      </defs>
      <g filter="url(#calShadow)">
        {/* Calendar Body */}
        <rect x="4" y="6" width="24" height="22" rx="4" fill="url(#calBody)" stroke="#94a3b8" strokeWidth="0.75" />
        {/* Header Ribbon */}
        <path d="M4 10C4 7.79086 5.79086 6 8 6H24C26.2091 6 28 7.79086 28 10V13H4V10Z" fill="url(#calHeader)" />
        {/* Binder Pins */}
        <rect x="9" y="3.5" width="2.5" height="5" rx="1.25" fill="#334155" />
        <rect x="20.5" y="3.5" width="2.5" height="5" rx="1.25" fill="#334155" />
        {/* Date Tiles */}
        <circle cx="10" cy="18" r="1.5" fill="#64748b" />
        <circle cx="16" cy="18" r="1.5" fill="#64748b" />
        <circle cx="22" cy="18" r="1.5" fill="#64748b" />
        <circle cx="10" cy="23" r="1.5" fill="#64748b" />
        <circle cx="16" cy="23" r="1.75" fill="var(--primary-color, #7a5af8)" />
        <circle cx="22" cy="23" r="1.5" fill="#64748b" />
      </g>
    </svg>
  );
}

export function Services3DIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="srvTop" x1="16" y1="4" x2="28" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a5b4fc" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
        <linearGradient id="srvLeft" x1="4" y1="11" x2="16" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--primary-color, #7a5af8)" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id="srvRight" x1="16" y1="11" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#312e81" />
        </linearGradient>
        <filter id="srvShadow" x="1" y="2" width="30" height="30" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.18" />
        </filter>
      </defs>
      <g filter="url(#srvShadow)">
        {/* Isometric Cube - Top */}
        <polygon points="16,5 27,11 16,17 5,11" fill="url(#srvTop)" />
        {/* Isometric Cube - Left */}
        <polygon points="5,11 16,17 16,27 5,21" fill="url(#srvLeft)" />
        {/* Isometric Cube - Right */}
        <polygon points="16,17 27,11 27,21 16,27" fill="url(#srvRight)" />
        {/* Center Ribbon / Core */}
        <line x1="16" y1="17" x2="16" y2="27" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1" />
      </g>
    </svg>
  );
}

export function Pricing3DIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <defs>
        <radialGradient id="coinGlow" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
        <filter id="coinShadow" x="1" y="1" width="30" height="30" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#78350f" floodOpacity="0.25" />
        </filter>
      </defs>
      <g filter="url(#coinShadow)">
        {/* Coin rim */}
        <circle cx="16" cy="16" r="12" fill="#d97706" />
        {/* Coin face */}
        <circle cx="16" cy="15" r="11" fill="url(#coinGlow)" />
        {/* Inner ring */}
        <circle cx="16" cy="15" r="9" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3 2" fill="none" opacity="0.7" />
        {/* Currency Glyph */}
        <text
          x="16"
          y="19"
          fontSize="11"
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
          textAnchor="middle"
          fill="#78350f"
        >
          $
        </text>
      </g>
    </svg>
  );
}

export function Clock3DIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <defs>
        <radialGradient id="clockFace" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#f1f5f9" />
          <stop offset="100%" stopColor="#94a3b8" />
        </radialGradient>
        <filter id="clockShadow" x="1" y="1" width="30" height="30" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.2" />
        </filter>
      </defs>
      <g filter="url(#clockShadow)">
        <circle cx="16" cy="16" r="12" fill="#475569" />
        <circle cx="16" cy="15.5" r="11" fill="url(#clockFace)" />
        <circle cx="16" cy="15.5" r="1.5" fill="#0f172a" />
        {/* Hour Hand */}
        <line x1="16" y1="15.5" x2="16" y2="10" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
        {/* Minute Hand */}
        <line x1="16" y1="15.5" x2="21" y2="15.5" stroke="var(--primary-color, #7a5af8)" strokeWidth="1.75" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function Location3DIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <defs>
        <radialGradient id="pinGlow" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#fda4af" />
          <stop offset="60%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#9f1239" />
        </radialGradient>
        <filter id="pinShadow" x="2" y="1" width="28" height="30">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#881337" floodOpacity="0.25" />
        </filter>
      </defs>
      <g filter="url(#pinShadow)">
        {/* Shadow oval on ground */}
        <ellipse cx="16" cy="27" rx="5" ry="2" fill="#0f172a" fillOpacity="0.25" />
        {/* Pin body */}
        <path
          d="M16 4C11.5817 4 8 7.58172 8 12C8 17.5 16 26 16 26C16 26 24 17.5 24 12C24 7.58172 20.4183 4 16 4Z"
          fill="url(#pinGlow)"
        />
        {/* Pin center reflection */}
        <circle cx="16" cy="12" r="3.5" fill="#ffffff" />
      </g>
    </svg>
  );
}
