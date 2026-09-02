"use client";import { Badge } from "@/components/shared/badge";

import { useState, useTransition } from "react";
import {
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Check,
  HelpCircle,
  Network } from
"lucide-react";
import { Button } from "@/components/shared/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shared/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shared/dialog";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import { useToast } from "@/components/shared/toast";
import { formatUserErrorMessage } from "@/lib/errors";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { NativeSelect, NativeTable } from "@/components/shared/native";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  addAgencyDomainAction,
  deleteAgencyDomainAction,
  verifyDomainSslAction,
} from "@/server/actions/agency";

interface DomainRecord {
  id: string;
  domainName: string;
  type: string;
  sslStatus: string;
  createdAt: Date;
}

export function AgencyDomainsClient({ initialDomains }: {initialDomains: any[];}) {
  const [domains, setDomains] = useState<DomainRecord[]>(initialDomains as DomainRecord[]);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [confirmDialogId, setConfirmDialogId] = useState<string | null>(null);
  const toast = useToast();

  // New Domain form
  const [newDomainName, setNewDomainName] = useState("");
  const [newDomainType, setNewDomainType] = useState<"portal" | "client" | "widget" | "api">("portal");
  const [dialogError, setDialogError] = useState<string | null>(null);

  const handleAddDomain = () => {
    if (!newDomainName.trim()) {
      setDialogError("Domain name is required.");
      return;
    }
    // simple regex to check format
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(newDomainName.trim())) {
      setDialogError("Please enter a valid subdomain format (e.g. portal.mybrand.com).");
      return;
    }

    setDialogError(null);
    startTransition(async () => {
      const res = await addAgencyDomainAction(newDomainName.trim(), newDomainType);
      if (res.success && res.domain) {
        setDomains((prev) => [res.domain as unknown as DomainRecord, ...prev]);
        setNewDomainName("");
        setIsOpen(false);
        toast.success("Domain Added", "Custom domain connected successfully.");
      } else {
        const errorMsg = formatUserErrorMessage(res.error, "Failed to link domain.");
        setDialogError(errorMsg);
        toast.error("Failed to link domain", errorMsg);
      }
    });
  };

  const handleDeleteDomain = (domainId: string) => {
    setConfirmDialogId(domainId);
  };

  const handleConfirmDeleteDomain = async () => {
    if (!confirmDialogId) return;
    const domainId = confirmDialogId;
    setConfirmDialogId(null);

    const originalList = [...domains];
    setDomains((prev) => prev.filter((d) => d.id !== domainId));

    const res = await deleteAgencyDomainAction(domainId);
    if (!res.success) {
      setDomains(originalList);
      toast.error("Failed to delete domain", formatUserErrorMessage(res.error));
    } else {
      toast.success("Domain Removed", "Custom domain has been unlinked.");
    }
  };

  const handleVerifySsl = async (domainId: string) => {
    // optimistic verification toggle
    setDomains((prev) =>
      prev.map((d) => (d.id === domainId ? { ...d, sslStatus: "active" } : d))
    );

    const res = await verifyDomainSslAction(domainId);
    if (!res.success) {
      setDomains((prev) =>
        prev.map((d) => (d.id === domainId ? { ...d, sslStatus: "pending" } : d))
      );
      toast.error("DNS Verification Failed", formatUserErrorMessage(res.error, "Ensure the CNAME record is active and points to your cluster."));
    } else {
      toast.success("SSL Verified", "DNS record active and SSL certificate is valid.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3" />
            Verified SSL
          </Badge>);

      case "failed":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3" />
            DNS Failed
          </Badge>);

      case "pending":
      default:
        return (
          <Badge variant="warning" className="animate-pulse">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Resolving
          </Badge>);

    }
  };

  return (
    <div className="space-y-space-6">
      {/* Overview Block */}
      <div className="flex items-center justify-between">
        <h2 className="text-title-lg  text-foreground">Linked Subdomains ({domains.length})</h2>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="text-primary-foreground px-space-4 py-space-2">
              <Plus className="h-4 w-4" />
              Link Custom Domain
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-card border-border/80">
            <DialogHeader>
              <DialogTitle className="text-title-lg ">Link Custom Subdomain</DialogTitle>
              <DialogDescription>
                Point your domain to our servers to host white-labeled services on your URL.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-space-4 py-space-3">
              <div className="space-y-space-2">
                <Label className="text-body-sm ">Subdomain Name</Label>
                <Input
                  placeholder="e.g. portal.myagency.com"
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)} />
                
              </div>

              <div className="space-y-space-2">
                <Label className="text-body-sm ">Domain Mapping Type</Label>
                <NativeSelect
                  value={newDomainType}
                  onChange={(e) => setNewDomainType(e.target.value as any)}
                  className="w-full h-9 radius-md border border-input bg-transparent px-space-3 text-body-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground">
                  
                  <option value="portal">Agency Admin Portal</option>
                  <option value="client">Client Portal dashboard</option>
                  <option value="widget">Whitelabel Chat Widget API</option>
                  <option value="api">Whitelabel Custom Webhooks API</option>
                </NativeSelect>
              </div>

              {/* CNAME DNS instructions box */}
              <div className="p-space-4 bg-primary/5 radius-lg border border-primary/20 space-y-space-2 text-caption text-muted-foreground leading-relaxed">
                <span className=" text-primary flex items-center gap-space-2">
                  <Network className="h-4 w-4" />
                  DNS Record Configuration:
                </span>
                <p>
                  Login to your domain provider (e.g. GoDaddy, Cloudflare) and append the following record:
                </p>
                <Badge>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <strong>CNAME</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Host:</span>
                    <strong>{newDomainName.split(".")[0] || "portal"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Value:</span>
                    <strong>cname.operator.ai</strong>
                  </div>
                </Badge>
              </div>

              {dialogError && (
                <div className="p-space-3 bg-destructive/10 text-destructive border border-error-500/20 text-caption radius-lg flex items-center gap-space-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{dialogError}</span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={handleAddDomain} disabled={isPending} className="text-primary-foreground">
                {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-space-2" /> : null}
                Provision SSL
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Linked subdomains list */}
      <Card className="bg-card/30 border border-border/50 overflow-hidden">
        {domains.length === 0 ? (
          <div className="py-space-16 text-center text-muted-foreground text-body-sm">
            No custom domains linked yet. Point your CNAME record to set up platform white-labeling.
          </div>
        ) : (

        <ScrollArea className="" vertical={false}>
                              <NativeTable className="w-full text-left border-collapse text-body-sm">
                                <thead>
                                  <tr className="border-b border-border/30 bg-muted/20 text-caption  uppercase tracking-wider text-muted-foreground">
                                    <th className="px-space-6 py-space-4">Linked URL</th>
                                    <th className="px-space-6 py-space-4">Type</th>
                                    <th className="px-space-6 py-space-4">SSL Status</th>
                                    <th className="px-space-6 py-space-4">Added Date</th>
                                    <th className="px-space-6 py-space-4 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/10 text-foreground">
                                  {domains.map((record) =>
                                <tr key={record.id} className="hover:bg-accent/10 transition-colors">
                                      <td className="px-space-6 py-space-4 font-mono  text-foreground flex items-center gap-space-2">
                                        <Globe className="h-4 w-4 text-primary" />
                                        {record.domainName}
                                      </td>
                                      <td className="px-space-6 py-space-4 capitalize text-caption text-muted-foreground">
                                        {record.type.replace("-", " ")} Domain
                                      </td>
                                      <td className="px-space-6 py-space-4">{getStatusBadge(record.sslStatus)}</td>
                                      <td className="px-space-6 py-space-4 text-muted-foreground text-caption">
                                        {new Date(record.createdAt).toLocaleDateString()}
                                      </td>
                                      <td className="px-space-6 py-space-4 text-right space-x-space-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleVerifySsl(record.id)}
                                    disabled={record.sslStatus === "active"}
                                    className="text-primary hover:text-primary/95 text-caption  cursor-pointer">
                                      
                                          Verify DNS
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteDomain(record.id)}
                                    className="text-destructive hover:text-error-500 hover:bg-destructive/10 cursor-pointer h-8 w-8 p-space-0">
                                      
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </td>
                                    </tr>
                                )}
                                </tbody>
                              </NativeTable>
                            </ScrollArea>
        )}
      </Card>

      <ConfirmDialog
        open={!!confirmDialogId}
        onOpenChange={(open) => !open && setConfirmDialogId(null)}
        title="Remove Domain"
        description="Are you sure you want to remove this domain connection? Client workspaces mapped to this domain will disconnect."
        onConfirm={handleConfirmDeleteDomain}
        confirmText="Remove" />
      
    </div>);

}