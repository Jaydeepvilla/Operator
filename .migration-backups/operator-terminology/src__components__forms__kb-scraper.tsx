"use client";import { Badge } from "@/components/shared/badge";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Globe, RefreshCw, CheckCircle2, Loader2, AlertCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/shared/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shared/card";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import { triggerWebsiteImportAction } from "@/server/actions/settings";
import { z } from "zod";

const scraperSchema = z.object({
  url: z.string().url("Please enter a valid website URL")
});

type ScraperInput = z.infer<typeof scraperSchema>;

interface KbScraperProps {
  importUrl: string | null;
  importStatus: string;
}

export function KbScraper({ importUrl, importStatus }: KbScraperProps) {
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [syncError, setSyncError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ScraperInput>({
    resolver: zodResolver(scraperSchema),
    defaultValues: {
      url: importUrl || ""
    }
  });

  const onSubmit = async (data: ScraperInput) => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const res = await triggerWebsiteImportAction(data.url);
      if (!res.success) {
        setSyncError(res.error || "Failed to trigger website import");
      }
    } catch (err: any) {
      setSyncError(err?.message || "An unexpected error occurred");
    } finally {
      setIsSyncing(false);
    }
  };

  const mockPages = [
  { path: "/", status: "imported", words: 840 },
  { path: "/about", status: "imported", words: 1250 },
  { path: "/services", status: "imported", words: 2400 },
  { path: "/contact", status: "imported", words: 350 },
  { path: "/pricing", status: "imported", words: 980 }];


  return (
    <div className="space-y-space-6">
      {/* Configuration Input */}
      <Card className="border-border/60 bg-card/30 backdrop-blur-xs">
        <CardHeader>
          <CardTitle>Website Knowledge Scraper</CardTitle>
          <CardDescription>
            Input your website URL. Our crawler will index your public pages to train the receptionist.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-space-4">
            {syncError &&
            <Badge variant="destructive">
                {syncError}
              </Badge>
            }

            <div className="space-y-space-2 max-w-lg">
              <Label htmlFor="scraper_url">Business Website URL</Label>
              <div className="relative">
                <Globe className="absolute left-space-3 top-space-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="scraper_url"
                  placeholder="https://acmedental.com"
                  className="pl-space-10"
                  disabled={isSyncing}
                  {...register("url")} />
                
              </div>
              {errors.url && <p className="text-caption text-destructive">{errors.url.message}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t border-border/20 pt-space-6">
            <Button type="submit" disabled={isSyncing}>
              {isSyncing ?
              <>
                  <Loader2 className="mr-space-2 h-4 w-4 animate-spin" /> Indexing Pages...
                </> :

              <>
                  <RefreshCw className="mr-space-2 h-4 w-4" /> Crawl & Import Website
                </>
              }
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Scraper Status Panel */}
      {importUrl && importStatus === "imported" &&
      <Card className="border-border/60 bg-card/30 backdrop-blur-xs animate-fade-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-body-sm ">Import Status Overview</CardTitle>
                <CardDescription className="text-caption mt-space-1">
                  Logs from the crawler for website: {importUrl}
                </CardDescription>
              </div>
              <Badge variant="success">
                Sync Completed
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-space-4">
            <div className="grid gap-space-3 sm:grid-cols-3 text-center border border-border/10 radius-lg p-space-4 bg-background/20">
              <div className="space-y-space-1">
                <span className="text-caption text-muted-foreground  uppercase tracking-wider">Pages Scraped</span>
                <div className="text-title-lg  text-foreground">5</div>
              </div>
              <div className="space-y-space-1 border-t sm:border-t-space-0 sm:border-x border-border/10 py-space-3 sm:py-space-0">
                <span className="text-caption text-muted-foreground  uppercase tracking-wider">Word Count</span>
                <div className="text-title-lg  text-foreground">5,820</div>
              </div>
              <div className="space-y-space-1">
                <span className="text-caption text-muted-foreground  uppercase tracking-wider">Last Crawl Date</span>
                <div className="text-body-sm  text-foreground mt-space-1">2026-06-21 13:20</div>
              </div>
            </div>

            {/* Scraped URL Lists */}
            <div className="space-y-space-2">
              <Badge variant="soft">
                Scraped Page Resources
              </Badge>
              <div className="border border-border/10 radius-lg divide-y divide-border/10 bg-background/10">
                {mockPages.map((page, idx) =>
              <div key={idx} className="flex justify-between items-center p-space-3 text-caption">
                    <span className=" text-foreground flex items-center gap-space-2">
                      <CheckCircle2 className="h-4 w-4 text-success-500 shrink-0" />
                      {importUrl}{page.path}
                    </span>
                    <span className="text-muted-foreground ">
                      {page.words} words parsed
                    </span>
                  </div>
              )}
              </div>
            </div>
          </CardContent>
        </Card>
      }
    </div>);

}