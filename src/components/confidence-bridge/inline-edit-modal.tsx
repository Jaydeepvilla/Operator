"use client";

import * as React from "react";
import { X, Check, Loader2, AlertCircle } from "lucide-react";
import { updateInlineServiceAction } from "@/server/actions/verification";

interface InlineEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId?: string;
  initialName?: string;
  initialPrice?: string;
  onSaveSuccess: (updatedPrice: string, updatedName: string) => void;
}

export function InlineEditModal({
  isOpen,
  onClose,
  serviceId,
  initialName = "",
  initialPrice = "",
  onSaveSuccess,
}: InlineEditModalProps) {
  const [name, setName] = React.useState(initialName);
  const [price, setPrice] = React.useState(initialPrice);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setName(initialName);
    setPrice(initialPrice);
    setError(null);
  }, [initialName, initialPrice, isOpen]);

  if (!isOpen || !serviceId) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Service name cannot be empty.");
      return;
    }
    const cleanPrice = price.replace(/[^0-9.]/g, "");
    if (!cleanPrice || isNaN(parseFloat(cleanPrice))) {
      setError("Please enter a valid price (e.g. 75.00).");
      return;
    }

    setIsSaving(true);
    setError(null);

    const res = await updateInlineServiceAction(serviceId, {
      name: name.trim(),
      price: cleanPrice,
    });

    setIsSaving(false);

    if (res.success) {
      onSaveSuccess(cleanPrice, name.trim());
      onClose();
    } else {
      setError(res.error || "Failed to update service.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-space-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-space-6 shadow-2xl space-y-space-5 animate-scale-in">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-title-md font-bold text-foreground">Edit Service & Pricing</h3>
            <p className="text-body-sm text-muted-foreground">Updates your knowledge base & re-runs pricing verification.</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-space-2 rounded-xl border border-destructive/20 bg-destructive/10 p-space-3 text-destructive text-body-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-space-4">
          <div className="space-y-space-1.5">
            <label className="text-[12px] font-semibold text-foreground">Service Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-space-3 py-space-2 text-body-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div className="space-y-space-1.5">
            <label className="text-[12px] font-semibold text-foreground">Price ($ USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground font-semibold text-body-sm">$</span>
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="75.00"
                className="w-full rounded-xl border border-border bg-background pl-7 pr-space-3 py-space-2 text-body-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-space-2 pt-space-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-space-4 py-space-2 text-body-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-space-2 rounded-xl bg-primary px-space-5 py-space-2 text-body-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Save & Re-verify</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
