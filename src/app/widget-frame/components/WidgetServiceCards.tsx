"use client";

import React, { useState } from "react";
import { Clock, Tag, ArrowRight, Search } from "lucide-react";
import { Services3DIcon } from "./WidgetIcons3D";

interface Service {
  id: string;
  name: string;
  description?: string | null;
  duration: number;
  price: string | number;
  categoryName?: string | null;
}

interface WidgetServiceCardsProps {
  services: Service[];
  onSelectService: (service: Service) => void;
  onClose?: () => void;
}

export function WidgetServiceCards({
  services,
  onSelectService,
}: WidgetServiceCardsProps) {
  const [search, setSearch] = useState("");

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-2.5 p-3 rounded-xl border border-primary/20 bg-background/50 backdrop-blur-xs my-2">
      <div className="flex items-center justify-between pb-1 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Services3DIcon size={18} />
          <span className="text-xs font-semibold text-foreground">Available Services</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "option" : "options"}
        </span>
      </div>

      {services.length > 3 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services..."
            className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-border/60 bg-muted/30 focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
          />
        </div>
      )}

      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4 italic">
            No services match your search.
          </div>
        ) : (
          filtered.map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card hover:border-primary/40 hover:bg-accent/30 transition-all duration-150 gap-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-foreground truncate">{service.name}</h4>
                  {service.categoryName && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                      {service.categoryName}
                    </span>
                  )}
                </div>
                {service.description && (
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                    {service.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    ${service.price}
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {service.duration} mins
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectService(service)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium shrink-0 cursor-pointer shadow-xs hover:scale-102 active:scale-98 transition-all"
              >
                Book <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
