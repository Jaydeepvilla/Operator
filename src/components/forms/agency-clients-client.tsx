"use client";

import { useState, useTransition } from "react";
import { 
  Building, 
  Plus, 
  Search, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  UserCheck, 
  Power, 
  Archive, 
  Lock,
  Globe,
  Settings,
  MoreVertical,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shared/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shared/dialog";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import { useToast } from "@/components/shared/toast";
import { formatUserErrorMessage } from "@/lib/errors";
import { createClientWorkspaceAction, updateClientStatusAction, triggerImpersonateAction } from "@/server/actions/agency";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { NativeSelect } from "@/components/shared/native";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: Date;
  workspaces: {
    id: string;
    organizationId: string;
    organization: {
      name: string;
      slug: string;
      industry: string;
      timezone: string;
    };
  }[];
}

export function AgencyClientsClient({ initialClients }: { initialClients: any[] }) {
  const [clients, setClients] = useState<Client[]>(initialClients as Client[]);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [confirmDialogId, setConfirmDialogId] = useState<string | null>(null);
  const toast = useToast();

  // Create Client Form state
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientIndustry, setClientIndustry] = useState("Dental Clinic");
  const [clientTimezone, setClientTimezone] = useState("America/New_York");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [activeImpersonationId, setActiveImpersonationId] = useState<string | null>(null);

  const handleCreateClient = () => {
    if (!clientName.trim()) {
      setStatusMessage({ type: "error", text: "Please enter a client business name." });
      return;
    }

    setStatusMessage(null);
    startTransition(async () => {
      const res = await createClientWorkspaceAction({
        name: clientName,
        email: clientEmail || undefined,
        phone: clientPhone || undefined,
        industry: clientIndustry,
        timezone: clientTimezone
      });

      if (res.success && res.result) {
        setStatusMessage({ type: "success", text: "Successfully provisioned client workspace!" });
        toast.success("Workspace Provisioned", `Client workspace "${clientName}" created successfully.`);
        
        // Fetch updated list mapping client structure
        const newClient: Client = {
          id: res.result.clientId,
          name: clientName,
          email: clientEmail || null,
          phone: clientPhone || null,
          status: "active",
          createdAt: new Date(),
          workspaces: [
            {
              id: "temp",
              organizationId: res.result.organizationId,
              organization: {
                name: clientName,
                slug: res.result.slug,
                industry: clientIndustry,
                timezone: clientTimezone
              }
            }
          ]
        };

        setClients(prev => [newClient, ...prev]);
        setClientName("");
        setClientEmail("");
        setClientPhone("");
        setTimeout(() => {
          setIsOpen(false);
          setStatusMessage(null);
        }, 1500);
      } else {
        const errorMsg = formatUserErrorMessage(res.error, "Provisioning failed.");
        setStatusMessage({ type: "error", text: errorMsg });
        toast.error("Provisioning Failed", errorMsg);
      }
    });
  };

  const handleToggleStatus = (clientId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    
    setClients(prev =>
      prev.map(c => c.id === clientId ? { ...c, status: nextStatus } : c)
    );

    startTransition(async () => {
      const res = await updateClientStatusAction(clientId, nextStatus);
      if (!res.success) {
        setClients(prev =>
          prev.map(c => c.id === clientId ? { ...c, status: currentStatus } : c)
        );
        toast.error("Failed to update status", formatUserErrorMessage(res.error));
      } else {
        toast.success("Status Updated", `Client workspace is now ${nextStatus}.`);
      }
    });
  };

  const handleArchive = (clientId: string) => {
    setConfirmDialogId(clientId);
  };

  const handleConfirmArchive = () => {
    if (!confirmDialogId) return;
    const clientId = confirmDialogId;
    setConfirmDialogId(null);

    setClients(prev =>
      prev.map(c => c.id === clientId ? { ...c, status: "archived" } : c)
    );

    startTransition(async () => {
      const res = await updateClientStatusAction(clientId, "archived");
      if (!res.success) {
        setClients(prev =>
          prev.map(c => c.id === clientId ? { ...c, status: "active" } : c)
        );
        toast.error("Failed to archive client", formatUserErrorMessage(res.error));
      } else {
        toast.success("Client Archived", "The client workspace has been archived.");
      }
    });
  };

  const handleImpersonate = async (clientId: string) => {
    setActiveImpersonationId(clientId);
    try {
      const res = await triggerImpersonateAction(clientId);
      if (res.success && res.redirectUrl) {
        window.location.href = res.redirectUrl;
      } else {
        toast.error("Impersonation Failed", formatUserErrorMessage(res.error, "Unable to switch into client workspace."));
        setActiveImpersonationId(null);
      }
    } catch (e) {
      toast.error("Impersonation Error", formatUserErrorMessage(e, "An unexpected error occurred while starting impersonation."));
      setActiveImpersonationId(null);
    }
  };

  // Search & Filter criteria
  const filteredClients = clients.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-space-6">
      {/* Controls Bar */}
      <div className="flex flex-col gap-space-4 sm:flex-row sm:items-center sm:justify-between bg-card/20 p-space-4 radius-lg border border-border/50 backdrop-blur-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-space-3 top-space-2.5 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Search business name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-space-9 text-body-sm"
          />
        </div>

        <div className="flex items-center gap-space-3">
          <NativeSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-36 text-caption"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended</option>
            <option value="archived">Archived</option>
          </NativeSelect>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-space-1.5 shadow-xs">
                <Plus className="h-4 w-4" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Provision Client Workspace</DialogTitle>
                <DialogDescription>
                  Create an isolated tenant workspace managed under your agency parent license.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-space-4 py-space-3">
                {statusMessage && (
                  <div className={`p-space-3 radius-md text-caption border ${
                    statusMessage.type === "success" 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                      : "bg-destructive/10 border-destructive/20 text-destructive"
                  }`}>
                    {statusMessage.text}
                  </div>
                )}

                <div className="space-y-space-1.5">
                  <Label htmlFor="clientName">Business / Brand Name *</Label>
                  <Input
                    id="clientName"
                    placeholder="e.g. Apex Health Clinic"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-space-3">
                  <div className="space-y-space-1.5">
                    <Label htmlFor="clientEmail">Contact Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      placeholder="admin@client.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-space-1.5">
                    <Label htmlFor="clientPhone">Phone Number</Label>
                    <Input
                      id="clientPhone"
                      placeholder="+1 (555) 000-0000"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-space-3">
                  <div className="space-y-space-1.5">
                    <Label htmlFor="clientIndustry">Industry Vertical</Label>
                    <NativeSelect
                      id="clientIndustry"
                      value={clientIndustry}
                      onChange={(e) => setClientIndustry(e.target.value)}
                      className="text-body-sm"
                    >
                      <option value="Dental Clinic">Dental Clinic</option>
                      <option value="Medical Practice">Medical Practice</option>
                      <option value="Legal Services">Legal Services</option>
                      <option value="Real Estate">Real Estate</option>
                      <option value="Hospitality">Hospitality</option>
                      <option value="Home Services">Home Services</option>
                      <option value="Automotive">Automotive</option>
                      <option value="Other">Other Vertical</option>
                    </NativeSelect>
                  </div>
                  <div className="space-y-space-1.5">
                    <Label htmlFor="clientTimezone">Timezone</Label>
                    <NativeSelect
                      id="clientTimezone"
                      value={clientTimezone}
                      onChange={(e) => setClientTimezone(e.target.value)}
                      className="text-body-sm"
                    >
                      <option value="America/New_York">Eastern Time (US)</option>
                      <option value="America/Chicago">Central Time (US)</option>
                      <option value="America/Denver">Mountain Time (US)</option>
                      <option value="America/Los_Angeles">Pacific Time (US)</option>
                      <option value="Europe/London">London (GMT/BST)</option>
                      <option value="Asia/Dubai">Dubai (GST)</option>
                    </NativeSelect>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateClient} disabled={isPending}>
                  {isPending ? "Provisioning..." : "Provision Client"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid gap-space-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredClients.map((client) => {
          const workspace = client.workspaces[0]?.organization;
          const isArchived = client.status === "archived";
          const isSuspended = client.status === "suspended";

          return (
            <Card key={client.id} className="relative flex flex-col justify-between overflow-hidden border-border/60 hover:border-border transition-all">
              <CardHeader className="pb-space-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-space-3">
                    <div className="flex h-10 w-10 items-center justify-center radius-lg bg-primary/10 text-primary border border-primary/20">
                      <Building className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-body-md font-semibold">{client.name}</CardTitle>
                      <CardDescription className="text-caption truncate max-w-[180px]">
                        {client.email || "No contact email"}
                      </CardDescription>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-space-1 radius-full px-space-2.5 py-0.5 text-caption font-medium border ${
                    client.status === "active"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : isSuspended
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      : "bg-muted text-muted-foreground border-border"
                  }`}>
                    <span className={`h-1.5 w-1.5 radius-full ${
                      client.status === "active" ? "bg-emerald-500" : isSuspended ? "bg-amber-500" : "bg-muted-foreground"
                    }`} />
                    {client.status.toUpperCase()}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-space-3 text-body-sm">
                <div className="bg-muted/40 p-space-3 radius-md space-y-space-1.5 text-caption">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tenant Slug:</span>
                    <span className="font-mono text-foreground">{workspace?.slug || "pending"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Industry:</span>
                    <span className="text-foreground">{workspace?.industry || "Custom"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Timezone:</span>
                    <span className="text-foreground truncate max-w-[140px]">{workspace?.timezone || "UTC"}</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-space-2 border-t border-border/40 flex items-center justify-between gap-space-2 bg-card/40">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-space-1.5 text-caption"
                  onClick={() => handleImpersonate(client.id)}
                  disabled={activeImpersonationId === client.id || isArchived || isSuspended}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {activeImpersonationId === client.id ? "Entering..." : "Access Tenant"}
                </Button>

                <div className="flex items-center gap-space-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    title={isSuspended ? "Unsuspend Client" : "Suspend Client"}
                    onClick={() => handleToggleStatus(client.id, client.status)}
                    disabled={isArchived || isPending}
                  >
                    <Power className={`h-4 w-4 ${isSuspended ? "text-emerald-500" : "text-amber-500"}`} />
                  </Button>

                  <Button
                    size="icon-sm"
                    variant="ghost"
                    title="Archive Client Workspace"
                    onClick={() => handleArchive(client.id)}
                    disabled={isArchived || isPending}
                  >
                    <Archive className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          );
        })}

        {filteredClients.length === 0 && (
          <div className="col-span-full py-space-12 text-center text-muted-foreground bg-card/20 radius-xl border border-dashed border-border/80">
            <Building className="mx-auto h-8 w-8 text-muted-foreground/40 mb-space-2" />
            <p className="font-medium text-body-sm">No client workspaces match the filter.</p>
            <p className="text-caption mt-0.5">Provision a new client tenant or adjust your search filter above.</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDialogId}
        onOpenChange={(open) => !open && setConfirmDialogId(null)}
        title="Archive Client Workspace"
        description="Are you sure you want to archive this client? The tenant will be locked and active AI receptionists stopped."
        confirmText="Archive Client"
        isDestructive={true}
        onConfirm={handleConfirmArchive}
      />
    </div>
  );
}
