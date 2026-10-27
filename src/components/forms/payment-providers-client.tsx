"use client";;
import * as React from "react";
import { 
  CreditCard, Shield, Check, Globe, RefreshCw, AlertCircle,
  HelpCircle, Settings, Key, Lock, ToggleLeft, ToggleRight, Sparkles, CheckCircle2
} from "lucide-react";
import { updateProviderSettingsAction } from "@/server/actions/billing";
import { Button } from "@/components/shared/button";
import { cn } from "@/components/shared/utils";

import { getButtonClasses } from '@/design-system/button-tokens';
import { Input } from "@/components/shared/input";

interface ProviderCompat {
  providerId: string;
  name: string;
  description: string;
  isRecommended: boolean;
  recommendationReason: string | null;
  supportedCurrencies: string[];
  supportedLanguages: string[];
  capabilities: {
    oneTime: boolean;
    subscriptions: boolean;
    refunds: boolean;
    applePay: boolean;
    googlePay: boolean;
    upi: boolean;
    netbanking: boolean;
    bnpl: boolean;
  };
}

interface PaymentProvidersClientProps {
  country: string;
  currency: string;
  language: string;
  recommended: ProviderCompat[];
  supported: ProviderCompat[];
  initialConnections: any[];
}

export function PaymentProvidersClient({
  country,
  currency,
  language,
  recommended,
  supported,
  initialConnections
}: PaymentProvidersClientProps) {
  const [connections, setConnections] = React.useState(initialConnections);
  const [selectedProvider, setSelectedProvider] = React.useState<ProviderCompat | null>(null);
  const [isSandbox, setIsSandbox] = React.useState(true);
  const [apiKey, setApiKey] = React.useState("");
  const [webhookSecret, setWebhookSecret] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const allProviders = [...recommended, ...supported];

  const getConnection = (providerId: string) => {
    return connections.find((c) => c.providerId === providerId);
  };

  const handleOpenConfig = (provider: ProviderCompat) => {
    const conn = getConnection(provider.providerId);
    setSelectedProvider(provider);
    setIsSandbox(conn ? conn.isSandbox : true);
    setApiKey(conn ? conn.credentials?.apiKey || "" : "");
    setWebhookSecret(conn ? conn.credentials?.webhookSecret || "" : "");
    setMessage(null);
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    setIsSubmitting(true);
    setMessage(null);

    const res = await updateProviderSettingsAction({
      providerId: selectedProvider.providerId,
      connectionStatus: "connected",
      isSandbox,
      credentials: {
        apiKey,
        webhookSecret,
      },
    });

    setIsSubmitting(false);

    if (res.success) {
      setMessage({ type: "success", text: `${selectedProvider.name} successfully connected!` });
      // Update local state
      const updatedConn = {
        providerId: selectedProvider.providerId,
        connectionStatus: "connected",
        isSandbox,
        credentials: { apiKey, webhookSecret }
      };
      setConnections((prev) => {
        const filtered = prev.filter((c) => c.providerId !== selectedProvider.providerId);
        return [...filtered, updatedConn];
      });
      setTimeout(() => setSelectedProvider(null), 1000);
    } else {
      setMessage({ type: "error", text: res.error || "Failed to update connection settings" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Smart Auto-Detection Panel */}
      <div className="p-5 rounded-2xl border"
        style={{ background: "rgba(139,92,246,0.04)", borderColor: "rgba(139,92,246,0.15)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-3 mb-2">
          <Globe className="h-5 w-5" style={{ color: "hsl(258,100%,75%)" }} />
          <h4 className="text-sm font-bold text-white">Dynamic Location & Tax Detection</h4>
        </div>
        <p className="text-xs text-white/50 leading-relaxed">
          Based on your business address and hours timezone, we detected your region as{" "}
          <span className="text-white font-bold">{country}</span>, processing in{" "}
          <span className="text-white font-bold">{currency}</span>, with primary locale set to{" "}
          <span className="text-white font-bold">{language.toUpperCase()}</span>.
          We have automatically filtered out incompatible billing networks.
        </p>
      </div>
      {/* Recommended Providers */}
      {recommended.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">Intelligent Recommendation</h4>
          <div className="grid grid-cols-1 gap-4">
            {recommended.map((provider) => {
              const conn = getConnection(provider.providerId);
              const isConnected = conn?.connectionStatus === "connected";

              return (
                <div key={provider.providerId} className="p-6 rounded-2xl border relative overflow-hidden transition-all duration-300"
                  style={{ 
                    background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)", 
                    borderColor: isConnected ? "rgba(52,211,153,0.3)" : "rgba(139,92,246,0.3)",
                    boxShadow: isConnected ? "0 0 20px rgba(52,211,153,0.05)" : "0 0 30px rgba(139,92,246,0.08)"
                  }}>
                  {/* Recommended badge */}
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-medium uppercase tracking-wider"
                    style={{ background: "linear-gradient(135deg, hsl(258,80%,55%), hsl(278,80%,50%))", color: "white" }}>
                    <Sparkles className="h-3 w-3 fill-white" /> Recommended
                  </div>
                  <div className="flex items-start gap-4 pr-24">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-lg"
                      style={{ background: "linear-gradient(135deg, hsl(258,80%,55%), hsl(278,80%,50%))" }}>
                      {provider.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{provider.name}</h3>
                      <p className="text-xs text-white/45 mt-1 leading-relaxed">{provider.description}</p>
                      
                      {/* Reason text */}
                      {provider.recommendationReason && (
                        <div className="flex items-center gap-2 mt-3 text-caption text-violet-300 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{provider.recommendationReason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Capabilities List */}
                  <div className="flex flex-wrap gap-1.5 mt-5">
                    {provider.capabilities.subscriptions && <span className="text-caption font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/60">Subscriptions</span>}
                    {provider.capabilities.upi && <span className="text-caption font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">UPI</span>}
                    {provider.capabilities.netbanking && <span className="text-caption font-bold px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400">Net Banking</span>}
                    {provider.capabilities.applePay && <span className="text-caption font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/60">Apple Pay</span>}
                    {provider.capabilities.googlePay && <span className="text-caption font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/60">Google Pay</span>}
                    {provider.capabilities.bnpl && <span className="text-caption font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">BNPL</span>}
                  </div>
                  {/* Connect Buttons */}
                  <div className="flex items-center gap-4 mt-6 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <Button type="button" onClick={() => handleOpenConfig(provider)}
                      className={getButtonClasses(
                        'primary',
                        'filled',
                        'medium',
                        'text-xs font-bold transition-all duration-200'
                      )}
                      style={{ background: isConnected ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.06)", border: isConnected ? "1px solid rgba(52,211,153,0.3)" : "1px solid rgba(255,255,255,0.1)" }}>
                      {isConnected ? "✓ Connected (Configure)" : "Configure API Keys"}
                    </Button>
                    {isConnected && (
                      <span className="text-caption font-semibold text-emerald-400 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} /> Sandbox Active
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Supported / Alternative Providers */}
      {supported.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">Alternative Networks</h4>
          <div className="grid grid-cols-2 gap-4">
            {supported.map((provider) => {
              const conn = getConnection(provider.providerId);
              const isConnected = conn?.connectionStatus === "connected";

              return (
                <div key={provider.providerId} className="p-5 rounded-2xl border transition-all duration-300"
                  style={{ 
                    background: "rgba(255,255,255,0.02)", 
                    borderColor: isConnected ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.07)"
                  }}>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      {provider.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{provider.name}</h4>
                      <span className="text-caption text-white/30">{provider.supportedCurrencies.join(", ")}</span>
                    </div>
                  </div>
                  <p className="text-xs text-white/40 mt-3 leading-relaxed">{provider.description}</p>
                  <div className="flex flex-wrap gap-1 mt-4">
                    {provider.capabilities.subscriptions && <span className="text-caption font-bold px-1.5 py-0.5 rounded bg-white/5 text-white/50">Recurring</span>}
                    {provider.capabilities.applePay && <span className="text-caption font-bold px-1.5 py-0.5 rounded bg-white/5 text-white/50">Apple Pay</span>}
                  </div>
                  <Button type="button" onClick={() => handleOpenConfig(provider)}
                    className={getButtonClasses(
                      'primary',
                      'filled',
                      'medium',
                      'w-full text-xs font-bold/80 mt-5 transition-all duration-200'
                    )}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {isConnected ? "✓ Connected" : "Connect Provider"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Modal Dialog Configuration Sheet */}
      {selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <Button type="button" aria-label="Close dialog" className="absolute inset-0 bg-black/60 backdrop-blur-md cursor-default border-none p-0" onClick={() => setSelectedProvider(null)} />
          <div className="relative w-full max-w-md p-6 rounded-3xl border text-left overflow-hidden shadow-2xl animate-fade-in"
            style={{ 
              background: "linear-gradient(180deg, hsl(240,22%,10%) 0%, hsl(240,22%,5%) 100%)",
              borderColor: "rgba(255,255,255,0.10)"
            }}>
            
            <h3 className="text-lg font-bold text-white mb-1">Configure {selectedProvider.name}</h3>
            <p className="text-xs text-white/40 mb-6">Enter API configuration values below to save connection profiles.</p>

            <form onSubmit={handleConnect} className="space-y-4">
              {/* Sandbox toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div>
                  <div className="text-xs font-bold text-white">Sandbox Mode</div>
                  <div className="text-caption text-white/35 mt-0.5">Use test/sandbox environment keys</div>
                </div>
                <Button type="button" onClick={() => setIsSandbox(!isSandbox)} className={getButtonClasses(
                  'primary',
                  'filled',
                  'medium',
                  'hover:scale-105 transition-transform duration-200'
                )}>
                  {isSandbox ? <ToggleRight className="h-8 w-8 text-violet-400" /> : <ToggleLeft className="h-8 w-8 text-white/20" />}
                </Button>
              </div>

              {/* Secrets Input */}
              <div className="space-y-2">
                <label className="text-caption font-bold uppercase tracking-wider text-white/40">API Private Key</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/25 pointer-events-none" />
                  <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`${selectedProvider.name} Private Secret Key`}
                    className="w-full h-11 pl-10 pr-4 rounded-xl text-sm text-white font-medium bg-white/5 border border-white/10 placeholder:text-white/20 focus:border-violet-500/50 focus:outline-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-caption font-bold uppercase tracking-wider text-white/40">Webhook Secret</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/25 pointer-events-none" />
                  <Input type="password" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)}
                    placeholder="whsec_..."
                    className="w-full h-11 pl-10 pr-4 rounded-xl text-sm text-white font-medium bg-white/5 border border-white/10 placeholder:text-white/20 focus:border-violet-500/50 focus:outline-none" />
                </div>
              </div>

              {message && (
                <div className={cn("p-3 rounded-xl text-xs font-semibold flex items-center gap-2",
                  message.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20")}>
                  <AlertCircle className="h-4 w-4" />
                  <span>{message.text}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setSelectedProvider(null)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} style={{ background: "linear-gradient(135deg, hsl(258,80%,55%), hsl(278,80%,50%))", color: "white" }}>
                  {isSubmitting ? "Saving..." : "Save Configuration"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
