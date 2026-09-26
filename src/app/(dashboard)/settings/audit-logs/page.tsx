import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { PageTitle } from "@/components/shared/page-title";

import { Card } from "@/components/shared/card";
import { auditService } from "@/server/services/audit";
import { db } from "@/server/db";
import { users, memberships, organizations } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { NativeTable } from "@/components/shared/native";
import { ScrollArea } from "@/components/ui/scroll-area";

export const metadata = {
  title: "Audit Logs",
  description: "View organization activity and audit logs.",
};

export default async function AuditLogsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/api/auth/logout?redirect=/sign-in");
  }

  // Get user's org
  const member = await db.query.memberships.findFirst({
    where: eq(memberships.userId, userId),
    with: {
      organization: true,
    }
  });

  if (!member || !member.organization) {
    redirect("/onboarding");
  }

  const logs = await auditService.getLogs(member.organizationId);

  return (
    <div className="space-y-space-6 w-full pb-space-8 animate-fade-in">
      <PageTitle 
        title="Audit Logs" 
        description="A record of significant activity within your organization."
      />

      <Card className="p-space-0 overflow-hidden mt-space-6">
        <ScrollArea className="" vertical={false}>
                        <NativeTable className="w-full text-sm text-left">
                          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                            <tr>
                              <th className="px-space-6 py-space-4 font-medium">Action</th>
                              <th className="px-space-6 py-space-4 font-medium">Resource</th>
                              <th className="px-space-6 py-space-4 font-medium">User</th>
                              <th className="px-space-6 py-space-4 font-medium">IP Address</th>
                              <th className="px-space-6 py-space-4 font-medium">Timestamp</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {logs.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-space-6 py-space-8 text-center text-muted-foreground">
                                  No audit logs found.
                                </td>
                              </tr>
                            ) : (
                              logs.map((log) => (
                                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-space-6 py-space-4 font-medium text-foreground">{log.action}</td>
                                  <td className="px-space-6 py-space-4">
                                    {log.resource}
                                    {log.resourceId && <span className="text-muted-foreground ml-space-2 text-xs">({log.resourceId})</span>}
                                  </td>
                                  <td className="px-space-6 py-space-4">
                                    {log.user ? (
                                      <div className="flex items-center gap-space-2">
                                        <span className="font-medium">{log.user.name || log.user.email}</span>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground italic">System</span>
                                    )}
                                  </td>
                                  <td className="px-space-6 py-space-4 text-muted-foreground">{log.ipAddress || "-"}</td>
                                  <td className="px-space-6 py-space-4 text-muted-foreground">
                                    {new Date(log.createdAt).toLocaleString()}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </NativeTable>
                      </ScrollArea>
      </Card>
    </div>
  );
}
