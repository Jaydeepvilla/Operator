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
        setStatusMessage({ type: "error", text: res.error || "Provisioning failed." });
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
        alert("Failed to update status: " + res.error);
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
        alert("Failed to archive client: " + res.error);
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
        alert("Impersonate trigger failed: " + res.error);
        setActiveImpersonationId(null);
      }
    } catch (e) {
      console.error(e);
      alert("Impersonation error occurred.");
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
            className="pl-space-8"
          />
        </div>

        <div className="flex items-center gap-space-4">
          <NativeSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 radius-md border border-input bg-transparent px-space-3 text-body-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Workspaces</option>
            <option value="suspended">Suspended Workspaces</option>
            <option value="archived">Archived Workspaces</option>
          </NativeSelect>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="text-primary-foreground px-space-4 py-space-2">
                <Plus className="h-4 w-4" />
                Add Client Workspace
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-card border-border/80">
              <DialogHeader>
                <DialogTitle className="text-title-lg ">Deploy New Client Workspace</DialogTitle>
                <DialogDescription>
                  Provision an isolated multi-tenant tenant environment and assign default billing limits.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-space-4 py-space-3">
                <div className="space-y-space-2">
                  <Label className="text-body-sm ">Business Name</Label>
                  <Input 
                    placeholder="e.g. Apex Dental Center" 
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-space-4">
                  <div className="space-y-space-2">
                    <Label className="text-body-sm ">Contact Email</Label>
                    <Input 
                      placeholder="owner@client.com" 
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-space-2">
                    <Label className="text-body-sm ">Contact Phone</Label>
                    <Input 
                      placeholder="+15551234567" 
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-space-4">
                  <div className="space-y-space-2">
                    <Label className="text-body-sm ">Industry Verticals</Label>
                    <NativeSelect
                      value={clientIndustry}
                      onChange={(e) => setClientIndustry(e.target.value)}
                      className="w-full h-9 radius-md border border-input bg-transparent px-space-3 text-body-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                    >
                      <option value="Dental Clinic">Dental Clinic</option>
                      <option value="Medical Clinic">Medical Clinic</option>
                      <option value="Salon">Beauty Salon</option>
                      <option value="Spa">Wellness Spa</option>
                      <option value="Law Firm">Law Firm</option>
                      <option value="Consultant">Consultant Desk</option>
                      <option value="Real Estate">Real Estate Agency</option>
                      <option value="Gym">Gym & Fitness Center</option>
                    </NativeSelect>
                  </div>

                  <div className="space-y-space-2">
                    <Label className="text-body-sm ">Timezone</Label>
                    <NativeSelect
                      value={clientTimezone}
                      onChange={(e) => setClientTimezone(e.target.value)}
                      className="w-full h-9 radius-md border border-input bg-transparent px-space-3 text-body-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                    >
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="UTC">Coordinated Universal Time (UTC)</option>
                    </NativeSelect>
                  </div>
                </div>

                {statusMessage && (
                  <div className={`p-space-3 radius-lg flex items-start gap-space-2 text-caption ${
                    statusMessage.type === "success" 
                      ? "bg-success-500/10 text-success border border-success-500/20" 
                      : "bg-destructive/10 text-destructive border border-error-500/20"
                  }`}>
                    {statusMessage.type === "error" ? <AlertCircle className="h-4 w-4 shrink-0 mt-space-1" /> : <Check className="h-4 w-4 shrink-0 mt-space-1" />}
                    <span>{statusMessage.text}</span>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => { setIsOpen(false); setStatusMessage(null); }}>Cancel</Button>
                <Button onClick={handleCreateClient} disabled={isPending} className="text-primary-foreground">
                  {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-space-2" /> : null}
                  Provision Tenant
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Clients Display Grid */}
      {filteredClients.length === 0 ? (
        <Card className="border border-dashed border-border/60 bg-card/10 py-space-16 text-center flex flex-col items-center justify-center">
          <div className="h-12 w-12 radius-md bg-primary/10 flex items-center justify-center mb-space-4 text-primary">
            <Building className="h-6 w-6" />
          </div>
          <CardTitle className="text-title-lg ">No Client Workspaces Mapped</CardTitle>
          <CardDescription className="text-body-sm mt-space-1 max-w-sm">
            Deploy your first client workspace to start reselling Operator AI under your white-labeled agency brand.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-space-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => {
            const workspace = client.workspaces[0];
            const org = workspace?.organization;

            return (
              <Card key={client.id} className={`bg-card/45 backdrop-blur-md border hover:border-border/80 transition-all flex flex-col justify-between ${
                client.status === "suspended" ? "border-error-500/20 bg-destructive/5" : "border-border/50"
              }`}>
                <CardHeader className="pb-space-3">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center radius-lg bg-primary/10 text-primary">
                      <Building className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-space-2">
                      <span className={`inline-flex items-center px-space-2 py-space-1 radius-md text-caption  uppercase tracking-wider ${
                        client.status === "active"
                          ? "bg-success-500/10 text-success-500 border border-success-500/25"
                          : client.status === "suspended"
                          ? "bg-destructive/10 text-error-500 border border-error-500/25"
                          : "bg-muted text-muted-foreground border border-border/20"
                      }`}>
                        {client.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-space-3">
                    <CardTitle className="text-body-md  truncate">{client.name}</CardTitle>
                    <CardDescription className="text-caption truncate">{client.email || "No contact email"}</CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="py-space-2 text-caption text-muted-foreground space-y-space-2 border-t border-border/10 pt-space-3">
                  <div className="flex justify-between">
                    <span>Vertical Sector:</span>
                    <span className=" text-foreground">{org?.industry || "Dental Clinic"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Timezone Mapping:</span>
                    <span className="font-mono text-caption text-foreground">{org?.timezone || "America/New_York"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Workspace Slug:</span>
                    <span className="font-mono text-caption text-primary truncate max-w-32">{org?.slug || "—"}</span>
                  </div>
                </CardContent>

                <CardFooter className="pt-space-3 pb-space-4 border-t border-border/10 flex items-center justify-between gap-space-2">
                  {/* Access button */}
                  <Button size="sm" onClick={() => handleImpersonate(client.id)}
                    disabled={client.status !== "active" || activeImpersonationId === client.id}
                    className="flex-1 gap-space-2 cursor-pointer bg-primary text-primary-foreground text-caption"
                  >
                    {activeImpersonationId === client.id ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserCheck className="h-3.5 w-3.5" />
                    )}
                    Impersonate
                  </Button>

                  {/* Actions dropdown simulated */}
                  <div className="flex gap-space-1">
                    <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(client.id, client.status)}
                      className={`h-8 w-8 p-space-0 cursor-pointer ${
                        client.status === "active" ? "text-destructive hover:bg-destructive/10" : "text-success hover:bg-success-500/10"
                      }`}
                      title={client.status === "active" ? "Suspend Workspace" : "Activate Workspace"}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    
                    <Button size="sm" variant="ghost" onClick={() => handleArchive(client.id)}
                      disabled={client.status === "archived"}
                      className="h-8 w-8 p-space-0 text-muted-foreground hover:text-foreground hover:bg-accent/40 cursor-pointer"
                      title="Archive Workspace"
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDialogId}
        onOpenChange={(open) => !open && setConfirmDialogId(null)}
        title="Archive Client"
        description="Are you sure you want to archive this client? The tenant will be marked archived."
        onConfirm={handleConfirmArchive}
        confirmText="Archive"
      />
    </div>
  );
}
