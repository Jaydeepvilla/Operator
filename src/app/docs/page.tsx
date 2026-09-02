"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { DOC_CONTENT, SIDEBAR } from "@/lib/docs-data";
import { DocsToc } from "@/components/docs/toc";
import { Callout } from "@/components/docs/mdx/callout";
import { CodeBlock } from "@/components/docs/mdx/code-block";
import { NativeTable } from "@/components/shared/native";
import { ScrollArea } from "@/components/ui/scroll-area";

function DocsContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "quickstart";
  
  const currentDoc = DOC_CONTENT[id] ?? {
    title: SIDEBAR.flatMap((s) => s.items).find((i) => i.id === id)?.label ?? "Documentation",
    description: "This section is being written. Check back soon or contact our support team for help with this topic.",
    content: "",
    toc: [],
  };

  return (
    <>
      <div className="mx-auto w-full min-w-0">
        <div className="mb-space-8">
          <div className="flex items-center gap-space-2 text-sm text-muted-foreground mb-space-4">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{currentDoc.title}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-space-3">
            {currentDoc.title}
          </h1>
          {currentDoc.description && (
            <p className="text-base text-muted-foreground mb-space-6">
              {currentDoc.description}
            </p>
          )}
        </div>

        <div className="max-w-4xl pb-space-8 text-body-md leading-relaxed">
          {currentDoc.content && currentDoc.content.split("\n\n").map((para, i) => {
            if (para.startsWith("## ")) {
              const text = para.slice(3);
              const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
              return <h2 key={i} id={id} className="text-xl font-semibold text-foreground mt-space-8 mb-space-3 scroll-m-20 border-b border-[hsl(var(--foreground)/0.08)] pb-space-2">{text}</h2>;
            }
            if (para.startsWith("### ")) {
              const text = para.slice(4);
              const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
              return <h3 key={i} id={id} className="text-lg font-semibold text-foreground mt-space-6 mb-space-3 scroll-m-20">{text}</h3>;
            }
            if (para.startsWith("- ")) {
              return (
                <ul key={i} className="list-disc pl-space-5 mb-space-4 space-y-space-1.5 text-muted-foreground">
                  {para.split("\n").map((item, j) => (
                    <li key={j}>{item.slice(2)}</li>
                  ))}
                </ul>
              );
            }
            if (para.startsWith("<Callout")) {
              // Basic parsing for our hardcoded callouts
              const typeMatch = para.match(/type="([^"]+)"/);
              const titleMatch = para.match(/title="([^"]+)"/);
              const type = typeMatch ? typeMatch[1] : "info";
              const title = titleMatch ? titleMatch[1] : "";
              const content = para.replace(/<Callout[^>]*>\n?/, "").replace(/\n?<\/Callout>/, "");
              return (
                <Callout key={i} type={type as any} title={title}>
                  {content}
                </Callout>
              );
            }
            if (para.startsWith("|")) {
              // Very basic markdown table rendering for our demo
              const lines = para.split("\n");
              const headers = lines[0].split("|").filter(Boolean).map(h => h.trim());
              const rows = lines.slice(2).map(line => line.split("|").filter(Boolean).map(c => c.trim()));
              return (
                <ScrollArea key={i} className="my-space-6 w-full" horizontal={false}>
                  <NativeTable className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[hsl(var(--foreground)/0.08)]">
                        {headers.map((h, j) => (
                          <th key={j} className="h-10 px-space-4 text-left font-medium text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, j) => (
                        <tr key={j} className="border-b border-[hsl(var(--foreground)/0.08)] transition-colors hover:bg-[hsl(var(--foreground)/0.02)]">
                          {row.map((cell, k) => (
                            <td key={k} className="p-space-4">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </NativeTable>
                </ScrollArea>
              );
            }
            const renderText = (text: string) => {
              const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
              return parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('`') && part.endsWith('`')) {
                  return <code key={index} className="bg-[hsl(var(--foreground)/0.06)] rounded-sm px-space-1 py-space-0.5 text-body-sm font-mono">{part.slice(1, -1)}</code>;
                }
                return part;
              });
            };
            return <p key={i} className="text-body-md text-muted-foreground leading-relaxed mb-space-5">{renderText(para)}</p>;
          })}
        </div>

        {currentDoc.code && (
          <CodeBlock code={currentDoc.code} language="javascript" filename="example.js" />
        )}

        {(() => {
          const allItems = SIDEBAR.flatMap((s) => s.items);
          const currentIndex = allItems.findIndex((item) => item.id === id);
          const prevItem = currentIndex > 0 ? allItems[currentIndex - 1] : null;
          const nextItem = currentIndex >= 0 && currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null;
          return (
            <div className="mt-space-16 flex items-center justify-between pt-space-8 border-t border-[hsl(var(--foreground)/0.08)] gap-space-4">
              {prevItem ? (
                <Link href={`/docs?id=${prevItem.id}`}>
                  <Button variant="outline" className="border-[hsl(var(--foreground)/0.08)] text-muted-foreground hover:text-foreground flex items-center gap-space-2">
                    <ChevronRight className="h-4 w-4 rotate-180" /> {prevItem.label}
                  </Button>
                </Link>
              ) : <div />}
              {nextItem ? (
                <Link href={`/docs?id=${nextItem.id}`}>
                  <Button variant="outline" className="border-[hsl(var(--foreground)/0.08)] text-muted-foreground hover:text-foreground flex items-center gap-space-2">
                    {nextItem.label} <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : <div />}
            </div>
          );
        })()}
      </div>

      <div className="hidden xl:block">
        <div className="sticky top-space-24 -mt-space-10 h-[calc(100vh-3.5rem)] pt-space-10">
          <DocsToc toc={currentDoc.toc || []} />
        </div>
      </div>
    </>
  );
}

export default function DocsPage() {
  return (
    <Suspense fallback={<div className="p-space-8 text-muted-foreground text-sm">Loading documentation...</div>}>
      <div className="xl:grid xl:grid-cols-[1fr_250px] xl:gap-space-10 w-full min-w-0">
        <DocsContent />
      </div>
    </Suspense>
  );
}
