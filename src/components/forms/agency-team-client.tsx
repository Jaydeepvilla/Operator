"use client";import { Badge } from "@/components/shared/badge";

import { useState, useTransition } from "react";
import {
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  Mail,
  RefreshCw,
  AlertCircle,
  UserCheck,
  ShieldCheck } from
"lucide-react";
import { Button } from "@/components/shared/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shared/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/shared/dialog";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import { useToast } from "@/components/shared/toast";
import { formatUserErrorMessage } from "@/lib/errors";
import { inviteTeamMemberAction, removeTeamMemberAction } from "@/server/actions/agency";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { NativeSelect, NativeTable } from "@/components/shared/native";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TeamMember {
  id: string;
  role: string;
  createdAt: Date;
  user: {
    name: string | null;
    email: string;
    avatar: string | null;
  };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
}

export function AgencyTeamClient({
  initialMembers,
  initialInvitations



}: {initialMembers: any[];initialInvitations: any[];}) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers as TeamMember[]);
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations as Invitation[]);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [confirmDialogId, setConfirmDialogId] = useState<string | null>(null);
  const toast = useToast();

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [dialogError, setDialogError] = useState<string | null>(null);

  const handleSendInvite = () => {
    if (!inviteEmail.trim()) {
      setDialogError("Email address is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      setDialogError("Please enter a valid email address.");
      return;
    }

    setDialogError(null);
    startTransition(async () => {
      const res = await inviteTeamMemberAction(inviteEmail.trim(), inviteRole);
      if (res.success && res.invitation) {
        setInvitations((prev) => [res.invitation as unknown as Invitation, ...prev]);
        setInviteEmail("");
        setIsOpen(false);
        toast.success("Invitation Sent", `An invite has been dispatched to ${inviteEmail.trim()}.`);
      } else {
        const errorMsg = formatUserErrorMessage(res.error, "Failed to submit invitation.");
        setDialogError(errorMsg);
        toast.error("Failed to invite member", errorMsg);
      }
    });
  };

  const handleRemoveMember = (memberId: string) => {
    setConfirmDialogId(memberId);
  };

  const handleConfirmRemove = async () => {
    if (!confirmDialogId) return;
    const memberId = confirmDialogId;
    setConfirmDialogId(null);

    const originalMembers = [...members];
    setMembers((prev) => prev.filter((m) => m.id !== memberId));

    const res = await removeTeamMemberAction(memberId);
    if (!res.success) {
      setMembers(originalMembers);
      toast.error("Failed to remove member", formatUserErrorMessage(res.error));
    } else {
      toast.success("Member Removed", "The user has been removed from your team.");
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return (
          <Badge variant="destructive">
            <ShieldCheck className="h-3 w-3" />
            Owner
          </Badge>);

      case "admin":
        return (
          <Badge>
            <UserCheck className="h-3 w-3" />
            Admin
          </Badge>);

      case "manager":
        return (
          <Badge variant="success">
            Manager
          </Badge>);

      case "staff":
      default:
        return (
          <Badge variant="soft">
            Staff
          </Badge>);

    }
  };

  return (
    <div className="grid gap-space-8 lg:grid-cols-12">
      {/* Active Team members list */}
      <div className="lg:col-span-8 space-y-space-6">
        <Card className="bg-card/30 border border-border/50 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-space-4 border-b border-border/20">
            <div>
              <CardTitle className="text-body-md  flex items-center gap-space-2">
                <Users className="h-5 w-5 text-primary" />
                Active Staff ({members.length})
              </CardTitle>
              <CardDescription className="text-caption">
                Manage accounts and roles for users with portal administration credentials.
              </CardDescription>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="gap-space-1 text-primary-foreground px-space-4 py-space-2">
                  <Plus className="h-4 w-4" />
                  Invite Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-card border-border/80">
                <DialogHeader>
                  <DialogTitle className="text-title-lg ">Invite Agency Staff</DialogTitle>
                  <DialogDescription>
                    Send an email invitation to join your white-label portal management team.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-space-4 py-space-3">
                  <div className="space-y-space-2">
                    <Label className="text-body-sm ">Email Address</Label>
                    <Input
                      placeholder="staff@myagency.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)} />
                    
                  </div>

                  <div className="space-y-space-2">
                    <Label className="text-body-sm ">Role Permissions</Label>
                    <NativeSelect
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full h-9 radius-md border border-input bg-transparent px-space-3 text-body-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground">
                      
                      <option value="staff">Staff (View client workspaces)</option>
                      <option value="manager">Manager (Create workspaces, view invoices)</option>
                      <option value="admin">Administrator (Modify domains & branding)</option>
                    </NativeSelect>
                  </div>

                  {dialogError &&
                  <div className="p-space-3 bg-destructive/10 text-destructive border border-error-500/20 text-caption radius-lg flex items-center gap-space-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>{dialogError}</span>
                    </div>
                  }
                </div>

                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                  <Button onClick={handleSendInvite} disabled={isPending} className="text-primary-foreground">
                    {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-space-2" /> : null}
                    Dispatch Invitation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-space-0">
            <ScrollArea className="" vertical={false}>
                                    <NativeTable className="w-full text-left border-collapse text-body-sm">
                                      <thead>
                                        <tr className="border-b border-border/30 bg-muted/20 text-caption  uppercase tracking-wider text-muted-foreground">
                                          <th className="px-space-6 py-space-4">Name</th>
                                          <th className="px-space-6 py-space-4">Email</th>
                                          <th className="px-space-6 py-space-4">Assigned Role</th>
                                          <th className="px-space-6 py-space-4">Joined Date</th>
                                          <th className="px-space-6 py-space-4 text-right">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border/10 text-foreground">
                                        {members.map((member) =>
                                        <tr key={member.id} className="hover:bg-accent/5 transition-colors">
                                            <td className="px-space-6 py-space-4  text-foreground">
                                              {member.user?.name || "Active Staff"}
                                            </td>
                                            <td className="px-space-6 py-space-4 font-mono text-caption text-muted-foreground">
                                              {member.user?.email}
                                            </td>
                                            <td className="px-space-6 py-space-4">{getRoleBadge(member.role)}</td>
                                            <td className="px-space-6 py-space-4 text-muted-foreground text-caption">
                                              {new Date(member.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-space-6 py-space-4 text-right">
                                              <Button variant="ghost" size="icon" disabled={member.role === "owner"} onClick={() => handleRemoveMember(member.id)}
                                            className="text-destructive hover:text-error-500 hover:bg-destructive/10 cursor-pointer h-8 w-8 p-space-0"
                                            title="Revoke Credentials">
                                              
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </NativeTable>
                                  </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Pending invitations column */}
      <div className="lg:col-span-4 space-y-space-6">
        <Card className="bg-card/30 border border-border/50 overflow-hidden h-full">
          <CardHeader className="pb-space-4 border-b border-border/20">
            <CardTitle className="text-body-md  flex items-center gap-space-2">
              <Mail className="h-5 w-5 text-primary" />
              Pending Invitations ({invitations.length})
            </CardTitle>
            <CardDescription className="text-caption">
              Outbox of pending staff portal registration invitations.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-space-4 space-y-space-3">
            {invitations.length === 0 ?
            <p className="text-center text-caption text-muted-foreground py-space-8">
                No active pending invitations in outbox.
              </p> :

            invitations.map((invite) =>
            <div key={invite.id} className="p-space-3 bg-background/50 radius-lg border border-border/40 space-y-space-2 text-caption">
                  <div className="flex justify-between items-start">
                    <span className=" text-foreground truncate max-w-40">{invite.email}</span>
                    <Badge variant="warning">
                      {invite.role}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center text-caption text-muted-foreground pt-space-1 border-t border-border/10">
                    <span>Sent: {new Date(invite.createdAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-space-1 text-caption text-warning-500">
                      <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                      Pending Claim
                    </span>
                  </div>
                </div>
            )
            }
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={!!confirmDialogId}
        onOpenChange={(open) => !open && setConfirmDialogId(null)}
        title="Remove Staff Member"
        description="Are you sure you want to remove this staff member? They will lose access to the agency portal."
        onConfirm={handleConfirmRemove}
        confirmText="Remove" />
      
    </div>);

}