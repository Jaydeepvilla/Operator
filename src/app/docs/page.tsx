"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { DOC_CONTENT, SIDEBAR } from "@/lib/docs-data";
import { DocsToc } from "@/components/docs/toc";
import { Callout } from "@/components/docs/mdx/callout";
import { CodeBlock } from "@/components/docs/mdx/code-block";
import { NativeTable } from "@/components/shared/native";
import { ScrollArea } from "@/components/ui/scroll-area";

function renderInlineText(text: string) {
  // Regex to match **bold**, `code`, and [link](url)
  const regex = /(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="bg-[hsl(var(--foreground)/0.06)] text-foreground border border-[hsl(var(--foreground)/0.06)] rounded px-1.5 py-0.5 text-xs font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      const isInternal = href.startsWith("/") || href.startsWith("#");
      if (isInternal) {
        return (
          <Link
            key={index}
            href={href}
            className="text-primary underline underline-offset-4 hover:text-primary-light transition-colors font-medium"
          >
            {label}
          </Link>
        );
      }
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-4 hover:text-primary-light transition-colors font-medium"
        >
          {label}
        </a>
      );
    }
    return part;
  });
}

function DocsContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "introduction";

  const allItems = useMemo(
    () =>
      SIDEBAR.flatMap((section) =>
        section.items.map((item) => ({ ...item, sectionName: section.section }))
      ),
    []
  );

  const activeMeta = allItems.find((i) => i.id === id);
  const currentDoc = DOC_CONTENT[id] ?? {
    title: activeMeta?.label ?? "Documentation",
    description: "Documentation is being refreshed for this topic.",
    content: "## Overview\n\nPlease select a topic from the sidebar.",
    toc: [],
  };

  // Section title for breadcrumbs
  const sectionTitle = activeMeta?.sectionName || "Docs";

  return (
    <>
      <div className="mx-auto w-full min-w-0">
        {/* Breadcrumbs & Header */}
        <div className="mb-space-8 border-b border-[hsl(var(--foreground)/0.08)] pb-space-6">
          <div className="flex items-center gap-space-2 text-xs text-muted-foreground mb-space-3">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/docs" className="hover:text-foreground transition-colors">
              Docs
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-muted-foreground">{sectionTitle}</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{currentDoc.title}</span>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-space-3">
            {currentDoc.title}
          </h1>

          {currentDoc.description && (
            <p className="text-base text-muted-foreground leading-relaxed max-w-3xl">
              {currentDoc.description}
            </p>
          )}
        </div>

        {/* Content Body */}
        <div className="max-w-4xl pb-space-8 text-body-md leading-relaxed">
          {currentDoc.content &&
            currentDoc.content.split("\n\n").map((para, i) => {
              const trimmed = para.trim();

              // Heading 2
              if (trimmed.startsWith("## ")) {
                const text = trimmed.slice(3);
                const headingId = text
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/(^-|-$)/g, "");
                return (
                  <h2
                    key={i}
                    id={headingId}
                    className="text-xl font-semibold text-foreground mt-space-10 mb-space-4 scroll-m-20 border-b border-[hsl(var(--foreground)/0.08)] pb-space-2"
                  >
                    {text}
                  </h2>
                );
              }

              // Heading 3
              if (trimmed.startsWith("### ")) {
                const text = trimmed.slice(4);
                const headingId = text
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/(^-|-$)/g, "");
                return (
                  <h3
                    key={i}
                    id={headingId}
                    className="text-lg font-semibold text-foreground mt-space-8 mb-space-3 scroll-m-20"
                  >
                    {text}
                  </h3>
                );
              }

              // Heading 4
              if (trimmed.startsWith("#### ")) {
                const text = trimmed.slice(5);
                return (
                  <h4
                    key={i}
                    className="text-base font-semibold text-foreground mt-space-6 mb-space-2"
                  >
                    {text}
                  </h4>
                );
              }

              // Fenced Code Block
              if (trimmed.startsWith("```")) {
                const lines = trimmed.split("\n");
                const firstLine = lines[0];
                const lang = firstLine.slice(3).trim() || "text";
                const codeBody = lines.slice(1, lines[lines.length - 1].startsWith("```") ? -1 : undefined).join("\n");
                return (
                  <CodeBlock
                    key={i}
                    code={codeBody}
                    language={lang}
                    filename={lang === "html" ? "index.html" : lang === "json" ? "config.json" : undefined}
                  />
                );
              }

              // Callout
              if (trimmed.startsWith("<Callout")) {
                const typeMatch = trimmed.match(/type="([^"]+)"/);
                const titleMatch = trimmed.match(/title="([^"]+)"/);
                const type = (typeMatch ? typeMatch[1] : "info") as any;
                const title = titleMatch ? titleMatch[1] : "";
                const innerContent = trimmed
                  .replace(/<Callout[^>]*>\n?/, "")
                  .replace(/\n?<\/Callout>/, "");
                return (
                  <Callout key={i} type={type} title={title}>
                    <p className="my-0 leading-relaxed">{renderInlineText(innerContent)}</p>
                  </Callout>
                );
              }

              // Blockquote
              if (trimmed.startsWith("> ")) {
                const lines = trimmed.split("\n").map((l) => l.replace(/^>\s?/, ""));
                return (
                  <blockquote
                    key={i}
                    className="my-space-4 border-l-4 border-primary/40 bg-primary/5 px-space-4 py-space-3 italic rounded-r-lg text-foreground/90 text-sm leading-relaxed"
                  >
                    {lines.map((l, j) => (
                      <p key={j} className="my-1">
                        {renderInlineText(l)}
                      </p>
                    ))}
                  </blockquote>
                );
              }

              // Markdown Table
              if (trimmed.startsWith("|")) {
                const lines = trimmed.split("\n").filter((line) => line.trim().startsWith("|"));
                if (lines.length >= 2) {
                  const headers = lines[0]
                    .split("|")
                    .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
                    .map((h) => h.trim());
                  // Skip separator line at index 1
                  const rows = lines.slice(2).map((line) =>
                    line
                      .split("|")
                      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
                      .map((c) => c.trim())
                  );

                  return (
                    <div
                      key={i}
                      className="my-space-6 w-full overflow-hidden rounded-xl border border-[hsl(var(--foreground)/0.08)] bg-card"
                    >
                      <div className="overflow-x-auto">
                        <NativeTable className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--foreground)/0.02)]">
                              {headers.map((h, j) => (
                                <th
                                  key={j}
                                  className="h-10 px-space-4 text-left font-medium text-muted-foreground whitespace-nowrap"
                                >
                                  {renderInlineText(h)}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, j) => (
                              <tr
                                key={j}
                                className="border-b border-[hsl(var(--foreground)/0.08)] transition-colors hover:bg-[hsl(var(--foreground)/0.02)] last:border-0"
                              >
                                {row.map((cell, k) => (
                                  <td key={k} className="p-space-4 text-foreground/90">
                                    {renderInlineText(cell)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </NativeTable>
                      </div>
                    </div>
                  );
                }
              }

              // Unordered List
              if (trimmed.startsWith("- ")) {
                return (
                  <ul
                    key={i}
                    className="list-disc pl-space-5 mb-space-5 space-y-space-2 text-muted-foreground leading-relaxed"
                  >
                    {trimmed.split("\n").map((item, j) => {
                      const cleanItem = item.replace(/^-\s+/, "");
                      return (
                        <li key={j} className="text-foreground/80">
                          {renderInlineText(cleanItem)}
                        </li>
                      );
                    })}
                  </ul>
                );
              }

              // Ordered List
              if (/^\d+\.\s/.test(trimmed)) {
                return (
                  <ol
                    key={i}
                    className="list-decimal pl-space-5 mb-space-5 space-y-space-2 text-muted-foreground leading-relaxed"
                  >
                    {trimmed.split("\n").map((item, j) => {
                      const cleanItem = item.replace(/^\d+\.\s+/, "");
                      return (
                        <li key={j} className="text-foreground/80">
                          {renderInlineText(cleanItem)}
                        </li>
                      );
                    })}
                  </ol>
                );
              }

              // Standard Paragraph
              return (
                <p
                  key={i}
                  className="text-body-md text-foreground/80 leading-relaxed mb-space-5"
                >
                  {renderInlineText(trimmed)}
                </p>
              );
            })}
        </div>

        {/* Optional standalone code snippet */}
        {currentDoc.code && (
          <CodeBlock
            code={currentDoc.code}
            language="javascript"
            filename="example.js"
          />
        )}

        {/* Previous / Next Article Navigation */}
        {(() => {
          const currentIndex = allItems.findIndex((item) => item.id === id);
          const prevItem = currentIndex > 0 ? allItems[currentIndex - 1] : null;
          const nextItem =
            currentIndex >= 0 && currentIndex < allItems.length - 1
              ? allItems[currentIndex + 1]
              : null;

          return (
            <div className="mt-space-12 flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-space-8 border-t border-[hsl(var(--foreground)/0.08)] gap-space-4">
              {prevItem ? (
                <Link href={`/docs?id=${prevItem.id}`} className="group flex-1">
                  <div className="rounded-xl border border-[hsl(var(--foreground)/0.08)] p-space-4 hover:border-primary/40 hover:bg-primary/5 transition-all text-left">
                    <span className="text-caption text-muted-foreground flex items-center gap-space-1 mb-space-1">
                      <ChevronRight className="h-3 w-3 rotate-180" /> Previous
                    </span>
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {prevItem.label}
                    </span>
                  </div>
                </Link>
              ) : (
                <div className="flex-1" />
              )}

              {nextItem ? (
                <Link href={`/docs?id=${nextItem.id}`} className="group flex-1">
                  <div className="rounded-xl border border-[hsl(var(--foreground)/0.08)] p-space-4 hover:border-primary/40 hover:bg-primary/5 transition-all text-right">
                    <span className="text-caption text-muted-foreground flex items-center justify-end gap-space-1 mb-space-1">
                      Next <ChevronRight className="h-3 w-3" />
                    </span>
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {nextItem.label}
                    </span>
                  </div>
                </Link>
              ) : (
                <div className="flex-1" />
              )}
            </div>
          );
        })()}
      </div>

      {/* Table of Contents Sticky Sidebar */}
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
    <Suspense
      fallback={
        <div className="p-space-8 text-muted-foreground text-sm flex items-center gap-space-2">
          <span className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          Loading documentation...
        </div>
      }
    >
      <div className="xl:grid xl:grid-cols-[1fr_250px] xl:gap-space-10 w-full min-w-0">
        <DocsContent />
      </div>
    </Suspense>
  );
}
