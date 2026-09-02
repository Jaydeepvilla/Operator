"use client";

import * as React from"react";
import { useRouter } from"next/navigation";
import { 
 BookOpen, 
 FileText, 
 Globe, 
 FolderPlus, 
 FolderOpen,
 ListFilter, 
 Search, 
 Settings, 
 Plus, 
 Loader2, 
 Check, 
 AlertTriangle,
 FileCode,
 HardDrive,
 Activity,
 Trash2,
 Archive,
 RotateCcw,
 Edit3,
 ExternalLink,
 ChevronRight,
 Sparkles,
 CheckCircle2,
 AlertCircle,
 Database,
 Trash,
 PlayCircle,
 Save,
 UploadCloud
} from"lucide-react";
import { Button } from"@/components/shared/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from"@/components/shared/card";
import { Input } from"@/components/shared/input";
import { Label } from"@/components/shared/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from"@/components/shared/dialog";
import { EmptyState } from"@/components/shared/empty-state";
import { cn } from"@/components/shared/utils";
import { 
 Select, 
 SelectContent, 
 SelectItem, 
 SelectTrigger, 
 SelectValue 
} from"@/components/shared/select";

import { 
 createKnowledgeCategoryAction, 
 updateKnowledgeCategoryAction, 
 deleteKnowledgeCategoryAction,
 uploadKnowledgeDocumentAction,
 renameKnowledgeDocumentAction,
 archiveKnowledgeDocumentAction,
 deleteKnowledgeDocumentAction,
 discoverWebsitePagesAction,
 executeWebsiteIngestionAction,
 getImportStatusAction,
 getImportHistoryAction,
 searchKnowledgeAction,
 analyzeKnowledgeContentAction
} from"@/server/actions/knowledge";
import { useToast } from "@/components/shared/toast";
import { formatUserErrorMessage } from "@/lib/errors";
import { NativeTable, NativeInput, NativeButton, NativeTextarea } from "@/components/shared/native";
import { ScrollArea } from "@/components/ui/scroll-area";

interface KnowledgeCenterClientProps {
 initialCategories: any[];
 initialDocuments: any[];
 initialImports: any[];
 initialJobs: any[];
 stats: {
 totalDocuments: number;
 totalChunks: number;
 healthScore: number;
 healthLabel: string;
 storageUsedBytes: number;
 recentUploads: any[];
 };
}

export function KnowledgeCenterClient({
 initialCategories,
 initialDocuments,
 initialImports,
 initialJobs,
 stats,
}: KnowledgeCenterClientProps) {
 const router = useRouter();
 const [activeTab, setActiveTab] = React.useState<string>("overview");
 const toast = useToast();
 
 // States
 const [categories, setCategories] = React.useState(initialCategories);
 const [documents, setDocuments] = React.useState(initialDocuments);
 const [imports, setImports] = React.useState(initialImports);
 const [jobs, setJobs] = React.useState(initialJobs);
 const [showArchived, setShowArchived] = React.useState(false);

 // Category Dialogs
 const [isCategoryOpen, setIsCategoryOpen] = React.useState(false);
 const [editingCategory, setEditingCategory] = React.useState<any | null>(null);
 const [categoryName, setCategoryName] = React.useState("");
 const [categoryDesc, setCategoryDesc] = React.useState("");
 const [isCategorySubmitting, setIsCategorySubmitting] = React.useState(false);

 // Document Upload Dialog
 const [isDocOpen, setIsDocOpen] = React.useState(false);
 const [docName, setDocName] = React.useState("");
 const [docContent, setDocContent] = React.useState("");
 const [docCategory, setDocCategory] = React.useState("");
 const [isDocSubmitting, setIsDocSubmitting] = React.useState(false);

 // File upload drag-and-drop
 const fileInputRef = React.useRef<HTMLInputElement>(null);
 const [dragActive, setDragActive] = React.useState(false);
 const [uploadError, setUploadError] = React.useState<string | null>(null);
 const [uploadedFileExt, setUploadedFileExt] = React.useState<string>("txt");
 const [uploadedFileSize, setUploadedFileSize] = React.useState<number>(0);

 const openDocDialog = () => {
 setDocName("");
 setDocContent("");
 setDocCategory("");
 setUploadError(null);
 setUploadedFileExt("txt");
 setUploadedFileSize(0);
 setIsDocOpen(true);
 };

 // Document Rename Dialog
 const [isRenameOpen, setIsRenameOpen] = React.useState(false);
 const [renamingDoc, setRenamingDoc] = React.useState<any | null>(null);
 const [newDocName, setNewDocName] = React.useState("");
 const [isRenameSubmitting, setIsRenameSubmitting] = React.useState(false);

 // Website Scraper Input
 const [scraperUrl, setScraperUrl] = React.useState("");
 const [isScraperSubmitting, setIsScraperSubmitting] = React.useState(false);

 // Website Scraper Input Redesign States
 const [isAdvancedOptionsOpen, setIsAdvancedOptionsOpen] = React.useState(false);
 const [maxDepth, setMaxDepth] = React.useState<"homepage" | "linked" | "entire">("linked");
 const [maxPages, setMaxPages] = React.useState<number>(20);
 const [includeSubdomains, setIncludeSubdomains] = React.useState(false);
 const [followExternalLinks, setFollowExternalLinks] = React.useState(false);
 const [ignoreQueryParams, setIgnoreQueryParams] = React.useState(true);
 
 // Include/Exclude Paths
 const [includePaths, setIncludePaths] = React.useState<string[]>(["/services", "/pricing", "/faq", "/contact", "/about"]);
 const [excludePaths, setExcludePaths] = React.useState<string[]>(["/blog", "/gallery", "/privacy", "/terms", "/careers", "/admin", "/login", "/search"]);
 const [newIncludeInput, setNewIncludeInput] = React.useState("");
 const [newExcludeInput, setNewExcludeInput] = React.useState("");

 // AI Import Options
 const [aiExtract, setAiExtract] = React.useState(true);
 const [autoCategory, setAutoCategory] = React.useState(true);
 const [generateTags, setGenerateTags] = React.useState(true);
 const [generateSummary, setGenerateSummary] = React.useState(true);
 const [detectLanguage, setDetectLanguage] = React.useState(true);
 const [estimateChunks, setEstimateChunks] = React.useState(true);

 // Duplicate Handling
 const [duplicateHandling, setDuplicateHandling] = React.useState<string>("skip");

 // Ingestion Preview & Progress
 const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
 const [discoveredPages, setDiscoveredPages] = React.useState<any[]>([]);
 const [selectedPagesToImport, setSelectedPagesToImport] = React.useState<string[]>([]);
 const [currentImportId, setCurrentImportId] = React.useState("");
 
 const [isProgressOpen, setIsProgressOpen] = React.useState(false);
 const [progressStage, setProgressStage] = React.useState("");
 const [progressValue, setProgressValue] = React.useState(0);
 const [importHistoryOpen, setImportHistoryOpen] = React.useState(false);
 const [historyList, setHistoryList] = React.useState<any[]>(initialImports);
 const [selectedHistoryItem, setSelectedHistoryItem] = React.useState<any | null>(null);

 // Log View Dialog
 const [viewingJobLogs, setViewingJobLogs] = React.useState<string | null>(null);

 // Search States
 const [searchQuery, setSearchQuery] = React.useState("");
 const [isSearching, setIsSearching] = React.useState(false);
 const [searchResults, setSearchResults] = React.useState<any>({
 documents: [],
 faqs: [],
 services: [],
 });

 // Storage preference
 const [storageProvider, setStorageProvider] = React.useState("vercel_blob");
 const [isSettingsSaving, setIsSettingsSaving] = React.useState(false);
 const [settingsSuccess, setSettingsSuccess] = React.useState(false);

 // Sync state effects
 React.useEffect(() => {
 setCategories(initialCategories);
 setDocuments(initialDocuments);
 setImports(initialImports);
 setJobs(initialJobs);
 }, [initialCategories, initialDocuments, initialImports, initialJobs]);

 // Actions
 const handleSaveCategory = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!categoryName.trim()) return;
 setIsCategorySubmitting(true);

 try {
 let res;
 if (editingCategory) {
 res = await updateKnowledgeCategoryAction(editingCategory.id, {
 name: categoryName,
 description: categoryDesc,
 });
 } else {
 res = await createKnowledgeCategoryAction({
 name: categoryName,
 description: categoryDesc,
 });
 }

      if (res.success) {
        setIsCategoryOpen(false);
        setCategoryName("");
        setCategoryDesc("");
        setEditingCategory(null);
        toast.success(editingCategory ? "Category Updated" : "Category Created", "Knowledge category saved.");
        router.refresh();
      } else {
        toast.error("Failed to save category", formatUserErrorMessage(res.error));
      }
    } catch (err: any) {
      toast.error("Error", formatUserErrorMessage(err, "An error occurred while saving category."));
    } finally {
      setIsCategorySubmitting(false);
    }
  };

  const handleEditCategory = (cat: any) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryDesc(cat.description || "");
    setIsCategoryOpen(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      const res = await deleteKnowledgeCategoryAction(id);
      if (res.success) {
        toast.success("Category Deleted", "Category removed from knowledge base.");
        router.refresh();
      } else {
        toast.error("Failed to delete category", formatUserErrorMessage(res.error));
      }
    }
  };

 const handleFile = (file: File) => {
 setUploadError(null);

 // Validate size (10MB limit)
 const MAX_SIZE = 10 * 1024 * 1024;
 if (file.size > MAX_SIZE) {
 setUploadError(`File size exceeds the 10 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB uploaded)`);
 return;
 }

 // Validate type
 const allowedExtensions = ["txt","md","csv","pdf","docx"];
 const fileExt = file.name.split(".").pop()?.toLowerCase() ||"";
 if (!allowedExtensions.includes(fileExt)) {
 setUploadError(`File type"${fileExt}"is not allowed. Supported: PDF, DOCX, TXT, MD, CSV`);
 return;
 }

 setDocName(file.name);
 setUploadedFileExt(fileExt);
 setUploadedFileSize(file.size);

 const reader = new FileReader();
 reader.onload = (e) => {
 const text = e.target?.result as string;
 if (fileExt ==="pdf"|| fileExt ==="docx") {
 setDocContent(`[SIMULATED EXTRACTION: ${file.name}]\n\nThis is a simulated textual extraction of the uploaded ${fileExt.toUpperCase()} file (${(file.size / 1024).toFixed(1)} KB) for training Operator AI. The server-side background job will parse the complete raw text, index it, and chunk it into vector databases.`);
 } else {
 setDocContent(text ||"");
 }
 };

 if (fileExt ==="pdf"|| fileExt ==="docx") {
 reader.readAsArrayBuffer(file);
 } else {
 reader.readAsText(file);
 }
 };

 const handleDrag = (e: React.DragEvent) => {
 e.preventDefault();
 e.stopPropagation();
 if (e.type ==="dragenter"|| e.type ==="dragover") {
 setDragActive(true);
 } else if (e.type ==="dragleave") {
 setDragActive(false);
 }
 };

 const handleDrop = (e: React.DragEvent) => {
 e.preventDefault();
 e.stopPropagation();
 setDragActive(false);
 if (e.dataTransfer.files && e.dataTransfer.files[0]) {
 handleFile(e.dataTransfer.files[0]);
 }
 };

 const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 e.preventDefault();
 if (e.target.files && e.target.files[0]) {
 handleFile(e.target.files[0]);
 }
 };

 const handleUploadDocument = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!docName.trim() || !docContent.trim()) return;

 // Double check size
 const computedSize = uploadedFileSize || new Blob([docContent]).size;
 const MAX_SIZE = 10 * 1024 * 1024;
 if (computedSize > MAX_SIZE) {
 setUploadError(`File size exceeds the 10 MB limit`);
 return;
 }

 setIsDocSubmitting(true);
 try {
 const res = await uploadKnowledgeDocumentAction({
 name: docName,
 fileType: uploadedFileExt ||"txt",
 fileSize: computedSize,
 content: docContent,
 categoryId: docCategory || undefined,
 });

 if (res.success) {
 setIsDocOpen(false);
 setDocName("");
 setDocContent("");
 setDocCategory("");
 setUploadError(null);
 setUploadedFileSize(0);
 setUploadedFileExt("txt");
 router.refresh();
 } else {
 setUploadError(res.error ||"Failed to upload document");
 }
 } catch (err: any) {
 setUploadError(err?.message ||"An error occurred");
 } finally {
 setIsDocSubmitting(false);
 }
 };

  const handleRenameDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim() || !renamingDoc) return;
    setIsRenameSubmitting(true);

    try {
      const res = await renameKnowledgeDocumentAction(renamingDoc.id, newDocName);
      if (res.success) {
        setIsRenameOpen(false);
        setNewDocName("");
        setRenamingDoc(null);
        toast.success("Document Renamed", `Document renamed to "${newDocName}".`);
        router.refresh();
      } else {
        toast.error("Failed to rename document", formatUserErrorMessage(res.error));
      }
    } catch (err: any) {
      toast.error("Error", formatUserErrorMessage(err, "An error occurred while renaming document."));
    } finally {
      setIsRenameSubmitting(false);
    }
  };

  const handleArchiveToggle = async (doc: any) => {
    const res = await archiveKnowledgeDocumentAction(doc.id, !doc.isArchived);
    if (res.success) {
      toast.success(doc.isArchived ? "Document Restored" : "Document Archived", doc.isArchived ? "Document restored from archive." : "Document moved to archive.");
      router.refresh();
    } else {
      toast.error("Failed to update archive status", formatUserErrorMessage(res.error));
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (confirm("Are you sure you want to permanently delete this document and all associated chunks?")) {
      const res = await deleteKnowledgeDocumentAction(id);
      if (res.success) {
        toast.success("Document Deleted", "Document and associated vectors deleted.");
        router.refresh();
      } else {
        toast.error("Failed to delete document", formatUserErrorMessage(res.error));
      }
    }
  };

 const loadHistory = async () => {
 try {
 const res = await getImportHistoryAction();
 if (res.success && res.history) {
 setHistoryList(res.history);
 }
 } catch (e) {
 console.error("Failed to load crawling history:", e);
 }
 };

 React.useEffect(() => {
 loadHistory();
 }, []);

 const handleTriggerScraper = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!scraperUrl.trim()) return;
 setIsScraperSubmitting(true);

 try {
 const res = await discoverWebsitePagesAction({
 url: scraperUrl,
 config: {
 maxDepth,
 maxPages,
 includeSubdomains,
 followExternalLinks,
 ignoreQueryParams,
 includePaths,
 excludePaths,
 aiOptions: {
 aiExtract,
 autoCategory,
 generateTags,
 generateSummary,
 detectLanguage,
 estimateChunks,
 },
 duplicateHandling,
 }
 });

    if (res.success && res.discoveredPages && res.importId) {
      setDiscoveredPages(res.discoveredPages);
      setCurrentImportId(res.importId);
      // Pre-select pages that are not excluded
      const preselected = res.discoveredPages
        .filter(p => p.status === "pending")
        .map(p => p.url);
      setSelectedPagesToImport(preselected);
      setIsPreviewOpen(true);
      toast.success("Crawler Finished", `Discovered ${res.discoveredPages.length} pages.`);
    } else {
      toast.error("Failed to trigger crawler", formatUserErrorMessage(res.error));
    }
  } catch (err: any) {
    toast.error("Error", formatUserErrorMessage(err, "An error occurred starting website crawler."));
  } finally {
    setIsScraperSubmitting(false);
  }
};

const handleExecuteIngestion = async () => {
  if (!currentImportId) return;

  const selectedData = discoveredPages.filter(p => selectedPagesToImport.includes(p.url));
  if (selectedData.length === 0) {
    toast.error("Selection Required", "Please select at least one page to import.");
    return;
  }

  setIsPreviewOpen(false);
  setIsProgressOpen(true);
  setProgressStage("Discovering pages");
  setProgressValue(10);

  try {
    const res = await executeWebsiteIngestionAction({
      importId: currentImportId,
      selectedPages: selectedData,
      duplicateHandling,
    });

    if (res.success) {
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const statusRes = await getImportStatusAction(currentImportId);
        if (statusRes.success && statusRes.import) {
          const record = statusRes.import;
          const meta = (record.metadata || {}) as Record<string, any>;

          setProgressStage(meta.stage || record.status);
          setProgressValue(meta.progress || 0);

          if (record.status === "completed" || record.status === "failed") {
            clearInterval(interval);
            if (record.status === "completed") {
              toast.success("Ingestion Completed", "Website pages successfully imported to knowledge base.");
            } else {
              toast.error("Ingestion Incomplete", "Some pages could not be processed. Check import history.");
            }
            setTimeout(() => {
              setIsProgressOpen(false);
              router.refresh();
              loadHistory();
            }, 1500);
          }
        }

        if (attempts > 60) {
          clearInterval(interval);
          setIsProgressOpen(false);
          toast.error("Ingestion Timed Out", "Server background ingestion timed out. Please check import history.");
        }
      }, 1000);
    } else {
      setIsProgressOpen(false);
      toast.error("Failed to start ingestion", formatUserErrorMessage(res.error));
    }
  } catch (err: any) {
    setIsProgressOpen(false);
    toast.error("Ingestion Error", formatUserErrorMessage(err, "An error occurred starting website ingestion."));
  }
};

 const handleSearch = async (query: string) => {
 setSearchQuery(query);
 if (!query.trim()) {
 setSearchResults({ documents: [], faqs: [], services: [] });
 return;
 }
 setIsSearching(true);
 try {
 const res = await searchKnowledgeAction(query);
 if (res.success && res.results) {
 setSearchResults(res.results);
 }
 } catch (err) {
 console.error(err);
 } finally {
 setIsSearching(false);
 }
 };

 const handleSaveSettings = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsSettingsSaving(true);
 setSettingsSuccess(false);

 // Simulate saving settings
 await new Promise((resolve) => setTimeout(resolve, 800));
 setIsSettingsSaving(false);
 setSettingsSuccess(true);
 setTimeout(() => setSettingsSuccess(false), 3000);
 };

 const formatBytes = (bytes: number) => {
 if (bytes === 0) return"0 Bytes";
 const k = 1024;
 const sizes = ["Bytes","KB","MB"];
 const i = Math.floor(Math.log(bytes) / Math.log(k));
 return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) +""+ sizes[i];
 };

 // Helper to color code tags
 const getFileTypeStyle = (type: string) => {
 const t = type.toLowerCase();
 if (t ==="pdf") return"bg-rose-500/8 border-rose-500/15 text-rose-500";
 if (t ==="docx") return"bg-blue-500/8 border-blue-500/15 text-blue-500";
 if (t ==="faq") return"bg-emerald-500/8 border-emerald-500/15 text-emerald-500";
 if (t ==="manual") return"bg-purple-500/8 border-purple-500/15 text-purple-500";
 if (t ==="service") return"bg-violet-500/8 border-violet-500/15 text-violet-500";
 return"bg-sky-500/8 border-sky-500/15 text-sky-500";
 };

 return (
 <div className="space-y-space-6 animate-fade-in w-full flex flex-col">
 {/* Page Header */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-3 pb-space-4 border-b border-[hsl(var(--foreground)/0.06)] shrink-0">
 <div>
 <h1 className="text-title-lg font-semibold tracking-tight-md text-foreground">Knowledge</h1>
 <p className="text-body-sm text-muted-foreground mt-space-0.5">
 Everything your AI knows about your business. Add documents, FAQs, and website content.
 </p>
 </div>
 </div>

 <div className="flex flex-col lg:flex-row gap-space-6 items-start w-full">
 {/* Sidebar Sub-Navigation */}
 <aside className="w-full lg:w-60 shrink-0 flex flex-row lg:flex-col lg:overflow-x-visible pb-space-2 lg:pb-space-0 border-b lg:border-b-0 lg:border-r border-[hsl(var(--foreground)/0.06)] lg:pr-space-6 gap-space-1.5 whitespace-nowrap lg:whitespace-normal"><ScrollArea className="h-full w-full" vertical={false}>
 {[
 { id:"overview", label:"Knowledge Overview", icon: BookOpen },
 { id:"documents", label:"Documents", icon: FileText },
 { id:"imports", label:"Website Imports", icon: Globe },
 { id:"categories", label:"Categories Catalog", icon: FolderPlus },
 { id:"queue", label:"Processing Queue", icon: ListFilter },
 { id:"search", label:"Search Console", icon: Search },
 { id:"settings", label:"Settings", icon: Settings },
 ].map((tab) => {
 const Icon = tab.icon;
 const isActive = activeTab === tab.id;
 return (
 <Button
 key={tab.id}
 variant="ghost"
 onClick={() => setActiveTab(tab.id)}
 className={cn(
 "flex items-center justify-start gap-space-3 px-space-4 py-space-3 text-body-sm font-medium transition-all duration-200 cursor-pointer w-auto lg:w-full text-left radius-lg relative select-none",
 isActive
 ?"bg-[hsl(var(--primary)/0.08)] text-primary font-semibold hover:bg-[hsl(var(--primary)/0.12)] hover:text-primary inset_0_1px_0_rgba(255,255,255,0.05)]"
 :"text-muted-foreground/70 hover:text-foreground hover:bg-[hsl(var(--foreground)/0.035)]"
 )}
 >
 {isActive && (
 <span className="absolute left-space-0 top-space-2 bottom-space-2 w-1 bg-primary radius-r-md hidden lg:block 0_0_8px_rgba(var(--primary-rgb),0.5)]"/>
 )}
 <Icon className={cn("h-4.5 w-4.5 shrink-0", isActive ?"text-primary":"text-muted-foreground/60")} />
 <span className="leading-none">{tab.label}</span>
 </Button>
 );
 })}
 </ScrollArea></aside>

 {/* Main Content viewport */}
 <div className="flex-1 w-full space-y-space-6 min-w-0">
 
 {/* ========================================== */}
 {/* TABS 1: KNOWLEDGE OVERVIEW */}
 {/* ========================================== */}
 {activeTab ==="overview"&& (
 <div className="space-y-space-6 animate-fade-in w-full">
 {/* Overview Stats Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-4 shrink-0">
 <Card className="hover:translate-y-[-2px] hover:border-primary/20 transition-all duration-300 h-full overflow-hidden relative">
 <CardHeader className="flex flex-row items-center justify-between space-y-space-0 pb-space-2 p-space-5 relative z-10">
 <span className="text-caption font-bold text-muted-foreground/70 uppercase tracking-widest leading-none">Documents</span>
 <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
 <FileText className="h-3.5 w-3.5 text-primary"/>
 </div>
 </CardHeader>
 <CardContent className="p-space-5 pt-space-0 relative z-10">
 <div className="text-display-sm font-bold text-foreground leading-none tracking-tight">{stats.totalDocuments}</div>
 <p className="text-caption font-medium text-muted-foreground/60 mt-space-3 line-clamp-1">Manuals, FAQs, website pages.</p>
 </CardContent>
 </Card>

 <Card className="hover:translate-y-[-2px] hover:border-primary/20 transition-all duration-300 h-full overflow-hidden relative">
 <CardHeader className="flex flex-row items-center justify-between space-y-space-0 pb-space-2 p-space-5 relative z-10">
 <span className="text-caption font-bold text-muted-foreground/70 uppercase tracking-widest leading-none">Chunks</span>
 <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
 <Database className="h-3.5 w-3.5 text-primary"/>
 </div>
 </CardHeader>
 <CardContent className="p-space-5 pt-space-0 relative z-10">
 <div className="text-display-sm font-bold text-foreground leading-none tracking-tight">{stats.totalChunks}</div>
 <p className="text-caption font-medium text-muted-foreground/60 mt-space-3 line-clamp-1">Segmented for RAG retrieval.</p>
 </CardContent>
 </Card>

 <Card className="hover:translate-y-[-2px] hover:border-primary/20 transition-all duration-300 h-full overflow-hidden relative">
 <CardHeader className="flex flex-row items-center justify-between space-y-space-0 pb-space-2 p-space-5 relative z-10">
 <span className="text-caption font-bold text-muted-foreground/70 uppercase tracking-widest leading-none">Storage</span>
 <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
 <HardDrive className="h-3.5 w-3.5 text-primary"/>
 </div>
 </CardHeader>
 <CardContent className="p-space-5 pt-space-0 relative z-10">
 <div className="text-display-sm font-bold text-foreground leading-none tracking-tight">{formatBytes(stats.storageUsedBytes)}</div>
 <div className="h-1.5 w-full bg-[hsl(var(--foreground)/0.06)] radius-full overflow-hidden mt-space-4">
 <div className="h-full bg-gradient-to-r from-primary/40 to-primary w-1/4"/>
 </div>
 </CardContent>
 </Card>

 <Card className="hover:translate-y-[-2px] transition-all duration-300 h-full overflow-hidden relative">
 <CardHeader className="flex flex-row items-center justify-between space-y-space-0 pb-space-2 p-space-5 relative z-10">
 <span className={cn(
 "text-caption font-bold uppercase tracking-widest leading-none",
 stats.healthLabel ==="Excellent"&&"text-emerald-500",
 stats.healthLabel ==="Good"&&"text-primary",
 stats.healthLabel ==="Average"&&"text-amber-500",
 stats.healthLabel ==="Poor"&&"text-rose-500"
 )}>Knowledge Health</span>
 
 <div className={cn(
 "h-7 w-7 rounded-md flex items-center justify-center shrink-0",
 stats.healthLabel ==="Excellent"&&"bg-emerald-500/10 text-emerald-500",
 stats.healthLabel ==="Good"&&"bg-primary/10 text-primary",
 stats.healthLabel ==="Average"&&"bg-amber-500/10 text-amber-500",
 stats.healthLabel ==="Poor"&&"bg-rose-500/10 text-rose-500"
 )}>
 <Activity className="h-3.5 w-3.5"/>
 </div>
 </CardHeader>
 <CardContent className="p-space-5 pt-space-0 relative z-10">
 <div className="flex items-end gap-space-2">
 <div className="text-display-sm font-bold text-foreground leading-none tracking-tight">
 {stats.healthScore}%
 </div>
 <div className={cn(
 "text-caption font-bold uppercase tracking-wider pb-space-0.5",
 stats.healthLabel ==="Excellent"&&"text-emerald-500",
 stats.healthLabel ==="Good"&&"text-primary",
 stats.healthLabel ==="Average"&&"text-amber-500",
 stats.healthLabel ==="Poor"&&"text-rose-500"
 )}>
 {stats.healthLabel}
 </div>
 </div>
 <div className="h-1.5 w-full bg-[hsl(var(--foreground)/0.06)] radius-full overflow-hidden mt-space-4">
 <div className={cn(
 "h-full",
 stats.healthLabel ==="Excellent"&&"bg-gradient-to-r from-emerald-400 to-emerald-500",
 stats.healthLabel ==="Good"&&"bg-gradient-to-r from-primary-light to-primary",
 stats.healthLabel ==="Average"&&"bg-gradient-to-r from-amber-400 to-amber-500",
 stats.healthLabel ==="Poor"&&"bg-gradient-to-r from-rose-400 to-rose-500"
 )} style={{ width:`${stats.healthScore}%`}} />
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Health parameters breakdown */}
 <Card>
 <CardHeader className="flex flex-row items-center gap-space-4 border-b border-[hsl(var(--foreground)/0.06)] py-space-4 px-space-6 bg-[hsl(var(--foreground)/0.005)] shrink-0">
 <div className="h-9 w-9 radius-lg bg-primary/10 flex items-center justify-center shrink-0">
 <Activity className="h-5 w-5 text-primary"/>
 </div>
 <div>
 <CardTitle className="text-body-sm font-semibold text-foreground">Knowledge Health Breakdown</CardTitle>
 <CardDescription className="text-caption text-muted-foreground/70">
 Review parameters required to ensure Operator AI operates with accurate details.
 </CardDescription>
 </div>
 </CardHeader>
 <div className="px-space-6 pb-space-6 pt-space-5 space-y-space-3 bg-[hsl(var(--foreground)/0.002)]">
 {[
 { label:"Document Resources Uploaded", state: stats.totalDocuments > 0 },
 { label:"Detailed FAQs Configured (Min 3)", state: stats.healthScore >= 50 },
 { label:"Structured Services Catalog (Min 2)", state: stats.healthScore >= 75 },
 { label:"Organized Custom Categories (Min 2)", state: stats.healthScore === 100 },
 ].map((param, idx) => (
 <div key={idx} className="flex justify-between items-center p-space-4 px-space-5 radius-xl border border-[hsl(var(--foreground)/0.06)] bg-background hover:border-primary/20 transition-all duration-300 group">
 <span className="text-body-sm font-semibold text-foreground group-hover:text-primary transition-colors">{param.label}</span>
 <span className={cn(
 "inline-flex items-center gap-space-1.5 text-caption font-normal border px-space-2.5 py-space-1 radius-full uppercase tracking-wider",
 param.state
 ?"bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
 :"bg-amber-500/10 border-amber-500/20 text-amber-500"
 )}>
 {param.state ? (
 <>
 <CheckCircle2 className="h-3.5 w-3.5 shrink-0"/>
 <span className="leading-none pt-[1px]">Configured</span>
 </>
 ) : (
 <>
 <AlertCircle className="h-3.5 w-3.5 shrink-0"/>
 <span className="leading-none pt-[1px]">Incomplete</span>
 </>
 )}
 </span>
 </div>
 ))}
 </div>
 </Card>

 {/* Recent Uploads */}
 <Card>
 <CardHeader className="flex flex-row items-center gap-space-4 border-b border-[hsl(var(--foreground)/0.06)] py-space-4 px-space-6 bg-[hsl(var(--foreground)/0.005)] shrink-0">
 <div className="h-9 w-9 radius-lg bg-primary/10 flex items-center justify-center shrink-0">
 <Database className="h-5 w-5 text-primary"/>
 </div>
 <div>
 <CardTitle className="text-body-sm font-semibold text-foreground">Recent Uploaded Resources</CardTitle>
 <CardDescription className="text-caption text-muted-foreground/70">
 Recently processed document coordinates in the knowledge library.
 </CardDescription>
 </div>
 </CardHeader>
 <CardContent className="p-space-0 bg-[hsl(var(--foreground)/0.002)]">
 {stats.recentUploads.length === 0 ? (
 <div className="p-space-10 text-center text-caption text-muted-foreground/60 italic">
 No documents uploaded yet.
 </div>
 ) : (
 <div className="divide-y divide-[hsl(var(--foreground)/0.05)] text-caption">
 {stats.recentUploads.map((doc: any) => (
 <div key={doc.id} className="flex justify-between items-center p-space-4 px-space-6 bg-background hover:bg-[hsl(var(--primary)/0.02)] transition-colors duration-200 group">
 <div className="flex items-center gap-space-3 min-w-0">
 <div className="h-8 w-8 rounded-md bg-[hsl(var(--foreground)/0.04)] flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
 <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0"/>
 </div>
 <span className="text-body-sm font-semibold text-foreground truncate max-w-md">{doc.name}</span>
 </div>
 <span className={cn("text-caption font-normal border px-space-2.5 py-space-1 radius-full uppercase tracking-wider shrink-0", getFileTypeStyle(doc.fileType))}>
 {doc.fileType}
 </span>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 )}

 {/* ========================================== */}
 {/* TABS 2: DOCUMENT MANAGEMENT */}
 {/* ========================================== */}
 {activeTab ==="documents"&& (
 <div className="space-y-space-4 animate-fade-in w-full">
 {/* Header controls */}
 <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-space-4">
 <div className="flex items-center gap-space-2">
 <Button 
 onClick={() => setShowArchived(!showArchived)}
 variant="outline"
 className="text-caption font-semibold h-9 radius-lg border-[hsl(var(--foreground)/0.08)] bg-background text-muted-foreground hover:text-foreground cursor-pointer"
 >
 {showArchived ?"View Active Documents":"View Archived Documents"}
 </Button>
 </div>
 <Button onClick={() => openDocDialog()} className="h-9 text-caption font-semibold px-space-4 radius-lg bg-primary text-white cursor-pointer gap-space-1.5 flex items-center">
 <Plus className="h-3.5 w-3.5 shrink-0"/>
 <span className="leading-none">Add Document</span>
 </Button>
 </div>

 {/* Documents List */}
 {documents.filter((d) => d.isArchived === showArchived).length === 0 ? (
 <EmptyState
 title={showArchived ?"No archived documents":"No documents uploaded"}
 description="Upload custom company manuals, text descriptions, or guidelines to train your agent."
 icon={FileText}
 actionText={showArchived ? undefined :"Add Document"}
 onAction={showArchived ? undefined : () => openDocDialog()}
 />
 ) : (
 <Card className="overflow-hidden">
 <CardContent className="p-space-0">
 <ScrollArea className="" vertical={false}>
 <NativeTable className="w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-[hsl(var(--foreground)/0.06)] text-caption font-semibold text-muted-foreground/75 uppercase tracking-wider bg-[hsl(var(--foreground)/0.005)] select-none">
 <th className="p-space-4 px-space-6">Name</th>
 <th className="p-space-4 w-28">Type</th>
 <th className="p-space-4 w-28">Size</th>
 <th className="p-space-4 w-28 text-center">Status</th>
 <th className="p-space-4 w-32 text-center">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[hsl(var(--foreground)/0.05)] text-caption bg-[hsl(var(--foreground)/0.002)]">
 {documents
 .filter((d) => d.isArchived === showArchived)
 .map((doc: any) => (
 <tr key={doc.id} className="hover:bg-[hsl(var(--foreground)/0.015)] transition-all duration-150">
 <td className="p-space-4 px-space-6">
 <span className="text-foreground font-semibold block leading-snug truncate max-w-xs sm:max-w-xs">{doc.name}</span>
 <span className="text-caption text-muted-foreground/60 block mt-space-0.5 font-medium">
 Category: {categories.find((c) => c.id === doc.categoryId)?.name ||"General"}
 </span>
 </td>
 <td className="p-space-4 font-semibold uppercase tracking-wider text-caption">
 <span className={cn("text-caption font-normal border px-space-2 py-space-0.5 radius-md uppercase tracking-wider", getFileTypeStyle(doc.fileType))}>
 {doc.fileType}
 </span>
 </td>
 <td className="p-space-4 text-foreground font-mono text-caption">{doc.fileSize ? formatBytes(doc.fileSize) :"N/A"}</td>
 <td className="p-space-4 text-center">
 <span className={cn(
 "inline-flex text-caption font-normal border px-space-2.5 py-space-0.5 radius-full uppercase tracking-wider",
 doc.status ==="completed"&&"bg-emerald-500/8 border-emerald-500/15 text-emerald-500",
 doc.status ==="failed"&&"bg-rose-500/8 border-rose-500/15 text-rose-500",
 !["completed","failed"].includes(doc.status) &&"bg-secondary text-muted-foreground border-border"
 )}>
 {doc.status}
 </span>
 </td>
 <td className="p-space-4 text-center">
 <div className="flex items-center justify-center gap-space-2">
 <Button
 variant="ghost"
 onClick={() => {
 setRenamingDoc(doc);
 setNewDocName(doc.name);
 setIsRenameOpen(true);
 }}
 className="h-7 w-8 p-space-0 radius-lg border border-[hsl(var(--foreground)/0.07)] bg-[hsl(var(--foreground)/0.015)] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--foreground)/0.04)] hover:border-[hsl(var(--foreground)/0.12)] cursor-pointer transition-all"
 title="Rename"
 >
 <Edit3 className="h-3.5 w-3.5"/>
 </Button>
 <Button
 variant="ghost"
 onClick={() => handleArchiveToggle(doc)}
 className="h-7 w-8 p-space-0 radius-lg border border-[hsl(var(--foreground)/0.07)] bg-[hsl(var(--foreground)/0.015)] flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-[hsl(var(--foreground)/0.04)] hover:border-primary/20 hover:text-primary cursor-pointer transition-all"
 title={doc.isArchived ?"Restore":"Archive"}
 >
 {doc.isArchived ? <RotateCcw className="h-3.5 w-3.5"/> : <Archive className="h-3.5 w-3.5"/>}
 </Button>
 <Button
 variant="ghost"
 onClick={() => handleDeleteDocument(doc.id)}
 className="h-7 w-8 p-space-0 radius-lg border border-rose-500/15 bg-rose-500/5 flex items-center justify-center text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 hover:border-rose-500/30 cursor-pointer transition-all"
 title="Delete"
 >
 <Trash2 className="h-3.5 w-3.5"/>
 </Button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </NativeTable>
 </ScrollArea>
 </CardContent>
 </Card>
 )}
 </div>
 )}

 {/* ========================================== */}
 {/* TABS 3: WEBSITE IMPORT MODULE */}
 {/* ========================================== */}
 {activeTab === "imports" && (
 <div className="space-y-space-4 animate-fade-in w-full">
 {/* Input URL */}
 <Card className="border border-[hsl(var(--foreground)/0.06)] bg-card overflow-hidden">
 <CardHeader className="flex flex-row items-center justify-between border-b border-[hsl(var(--foreground)/0.06)] py-space-4 px-space-6 bg-[hsl(var(--foreground)/0.005)] shrink-0">
 <div className="flex items-center gap-space-4">
 <div className="h-9 w-9 radius-lg bg-primary/10 flex items-center justify-center shrink-0">
 <Globe className="h-5 w-5 text-primary" />
 </div>
 <div>
 <CardTitle className="text-body-sm font-semibold text-foreground">Website Ingestion Pipeline</CardTitle>
 <CardDescription className="text-caption text-muted-foreground/70">
 Configure limits, path rules, and duplicate handling to preview and import web pages.
 </CardDescription>
 </div>
 </div>
 <Button 
 type="button"
 variant="outline" 
 onClick={() => setImportHistoryOpen(true)}
 className="h-8.5 px-space-3.5 text-caption font-semibold cursor-pointer border-[hsl(var(--foreground)/0.08)] bg-background hover:bg-[hsl(var(--foreground)/0.02)] gap-space-1.5 radius-lg shrink-0 flex items-center"
 >
 <Database className="h-3.5 w-3.5" />
 View Crawl History
 </Button>
 </CardHeader>
 
 <form onSubmit={handleTriggerScraper}>
 <div className="p-space-6 bg-[hsl(var(--foreground)/0.002)] space-y-space-5">
 {/* Top Row: URL and Action Buttons */}
 <div className="flex flex-col sm:flex-row gap-space-3 items-end w-full max-w-4xl">
 <div className="flex-1 space-y-space-1.5 min-w-0 w-full">
 <Label htmlFor="crawling_url" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Target URL Address</Label>
 <div className="relative">
 <Globe className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10 pointer-events-none" />
 <Input
 id="crawling_url"
 placeholder="https://glowandgracesalon.com"
 className="pl-space-9 h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 focus:border-primary/30"
 value={scraperUrl}
 onChange={(e) => setScraperUrl(e.target.value)}
 disabled={isScraperSubmitting}
 />
 </div>
 </div>
 <div className="flex gap-space-2 shrink-0 w-full sm:w-auto">
 <Button 
 type="button"
 variant="outline"
 onClick={() => setIsAdvancedOptionsOpen(!isAdvancedOptionsOpen)}
 className="flex-1 sm:flex-none h-9.5 text-caption font-semibold cursor-pointer border-[hsl(var(--foreground)/0.08)] bg-background hover:bg-[hsl(var(--foreground)/0.02)] gap-space-1.5 radius-lg px-space-4 flex items-center justify-center"
 >
 <Settings className={cn("h-3.5 w-3.5 transition-transform duration-200", isAdvancedOptionsOpen && "rotate-45")} />
 Configure
 </Button>
 <Button 
 type="submit"
 disabled={isScraperSubmitting || !scraperUrl.trim()} 
 className="flex-1 sm:flex-none h-9.5 text-caption font-semibold text-white cursor-pointer gap-space-1.5 radius-lg px-space-5 bg-primary hover:bg-primary/90 hover:translate-y-[-1px] active:translate-y-[0px] transition-all duration-200 flex items-center justify-center"
 >
 {isScraperSubmitting ? (
 <>
 <Loader2 className="h-3.5 w-3.5 animate-spin" />
 Discovering...
 </>
 ) : (
 <>
 <PlayCircle className="h-3.5 w-3.5" />
 Crawl & Discover
 </>
 )}
 </Button>
 </div>
 </div>

 {/* Collapsible Configurations Panel */}
 {isAdvancedOptionsOpen && (
 <div className="border border-[hsl(var(--foreground)/0.06)] radius-lg bg-[hsl(var(--foreground)/0.005)] p-space-5 space-y-space-6 animate-fade-in w-full max-w-4xl">
 
 {/* Advanced Row 1: Depth and Limits */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-space-5">
 <div className="space-y-space-2">
 <Label className="text-caption font-semibold text-muted-foreground/80">Maximum Crawl Depth</Label>
 <div className="flex flex-col gap-space-1.5 mt-space-1">
 <label className="flex items-center gap-space-2 text-caption text-foreground cursor-pointer select-none">
 <NativeInput 
 type="radio" 
 name="maxDepth" 
 checked={maxDepth === "homepage"}
 onChange={() => setMaxDepth("homepage")}
 className="text-primary accent-primary h-3.5 w-3.5 cursor-pointer"
 />
 Homepage Only
 </label>
 <label className="flex items-center gap-space-2 text-caption text-foreground cursor-pointer select-none">
 <NativeInput 
 type="radio" 
 name="maxDepth" 
 checked={maxDepth === "linked"}
 onChange={() => setMaxDepth("linked")}
 className="text-primary accent-primary h-3.5 w-3.5 cursor-pointer"
 />
 Homepage + Linked Pages
 </label>
 <label className="flex items-center gap-space-2 text-caption text-foreground cursor-pointer select-none">
 <NativeInput 
 type="radio" 
 name="maxDepth" 
 checked={maxDepth === "entire"}
 onChange={() => setMaxDepth("entire")}
 className="text-primary accent-primary h-3.5 w-3.5 cursor-pointer"
 />
 Entire Website
 </label>
 </div>
 </div>

 <div className="space-y-space-2">
 <Label className="text-caption font-semibold text-muted-foreground/80">Maximum Pages Limit</Label>
 <div className="grid grid-cols-4 gap-space-1.5 mt-space-1">
 {[5, 20, 50, 100].map((num) => (
 <NativeButton
 key={num}
 type="button"
 onClick={() => setMaxPages(num)}
 className={cn(
 "h-8 border text-caption font-semibold radius-md cursor-pointer transition-all",
 maxPages === num 
 ? "bg-primary border-primary text-white" 
 : "bg-background border-[hsl(var(--foreground)/0.08)] hover:bg-[hsl(var(--foreground)/0.02)] text-muted-foreground"
 )}
 >
 {num}
 </NativeButton>
 ))}
 </div>
 </div>

 <div className="space-y-space-2 flex flex-col justify-end">
 <div className="space-y-space-2">
 <label className="flex items-center justify-between text-caption font-semibold text-foreground cursor-pointer select-none">
 <span>Include Subdomains</span>
 <NativeInput 
 type="checkbox" 
 checked={includeSubdomains}
 onChange={(e) => setIncludeSubdomains(e.target.checked)}
 className="accent-primary h-4 w-4 cursor-pointer"
 />
 </label>
 <label className="flex items-center justify-between text-caption font-semibold text-foreground cursor-pointer select-none">
 <span>Follow External Links</span>
 <NativeInput 
 type="checkbox" 
 checked={followExternalLinks}
 onChange={(e) => setFollowExternalLinks(e.target.checked)}
 className="accent-primary h-4 w-4 cursor-pointer"
 />
 </label>
 <label className="flex items-center justify-between text-caption font-semibold text-foreground cursor-pointer select-none">
 <span>Ignore Query Parameters</span>
 <NativeInput 
 type="checkbox" 
 checked={ignoreQueryParams}
 onChange={(e) => setIgnoreQueryParams(e.target.checked)}
 className="accent-primary h-4 w-4 cursor-pointer"
 />
 </label>
 </div>
 </div>
 </div>

 <hr className="border-[hsl(var(--foreground)/0.06)]" />

 {/* Advanced Row 2: Include & Exclude Paths */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-space-5">
 {/* Include Paths */}
 <div className="space-y-space-2">
 <Label className="text-caption font-semibold text-muted-foreground/80">Include Only Paths</Label>
 <div className="flex gap-space-1.5">
 <Input
 placeholder="/services"
 value={newIncludeInput}
 onChange={(e) => setNewIncludeInput(e.target.value)}
 className="h-8 text-caption"
 onKeyDown={(e) => {
 if (e.key === "Enter") {
 e.preventDefault();
 if (newIncludeInput.trim()) {
 setIncludePaths([...includePaths, newIncludeInput.trim()]);
 setNewIncludeInput("");
 }
 }
 }}
 />
 <Button
 type="button"
 onClick={() => {
 if (newIncludeInput.trim()) {
 setIncludePaths([...includePaths, newIncludeInput.trim()]);
 setNewIncludeInput("");
 }
 }}
 className="h-8 px-space-2.5 text-caption font-semibold cursor-pointer text-white"
 >
 Add
 </Button>
 </div>
 <div className="flex flex-wrap gap-space-1 mt-space-1.5">
 {includePaths.map((path, idx) => (
 <span key={idx} className="inline-flex items-center gap-space-1 px-space-2 py-space-0.5 radius-md border border-emerald-500/15 bg-emerald-500/5 text-emerald-600 text-caption">
 {path}
 <NativeButton 
 type="button" 
 onClick={() => setIncludePaths(includePaths.filter((_, i) => i !== idx))}
 className="hover:text-emerald-800 font-bold ml-space-0.5"
 >
 ×
 </NativeButton>
 </span>
 ))}
 {includePaths.length === 0 && (
 <span className="text-caption text-muted-foreground/60 italic">Crawl all paths by default</span>
 )}
 </div>
 </div>

 {/* Exclude Paths */}
 <div className="space-y-space-2">
 <Label className="text-caption font-semibold text-muted-foreground/80">Exclude / Ignore Paths</Label>
 <div className="flex gap-space-1.5">
 <Input
 placeholder="/blog"
 value={newExcludeInput}
 onChange={(e) => setNewExcludeInput(e.target.value)}
 className="h-8 text-caption"
 onKeyDown={(e) => {
 if (e.key === "Enter") {
 e.preventDefault();
 if (newExcludeInput.trim()) {
 setExcludePaths([...excludePaths, newExcludeInput.trim()]);
 setNewExcludeInput("");
 }
 }
 }}
 />
 <Button
 type="button"
 onClick={() => {
 if (newExcludeInput.trim()) {
 setExcludePaths([...excludePaths, newExcludeInput.trim()]);
 setNewExcludeInput("");
 }
 }}
 className="h-8 px-space-2.5 text-caption font-semibold cursor-pointer text-white"
 >
 Add
 </Button>
 </div>
 <div className="flex flex-wrap gap-space-1 mt-space-1.5">
 {excludePaths.map((path, idx) => (
 <span key={idx} className="inline-flex items-center gap-space-1 px-space-2 py-space-0.5 radius-md border border-rose-500/15 bg-rose-500/5 text-rose-600 text-caption">
 {path}
 <NativeButton 
 type="button" 
 onClick={() => setExcludePaths(excludePaths.filter((_, i) => i !== idx))}
 className="hover:text-rose-800 font-bold ml-space-0.5"
 >
 ×
 </NativeButton>
 </span>
 ))}
 </div>
 </div>
 </div>

 <hr className="border-[hsl(var(--foreground)/0.06)]" />

 {/* Advanced Row 3: AI & Duplicate Options */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-space-5">
 <div className="space-y-space-2.5">
 <Label className="text-caption font-semibold text-muted-foreground/80">AI Processing Pipeline</Label>
 <div className="grid grid-cols-2 gap-y-space-2 gap-x-space-4">
 <label className="flex items-center justify-between text-caption text-foreground cursor-pointer select-none">
 <span>Extract AI Metadata</span>
 <NativeInput 
 type="checkbox" 
 checked={aiExtract}
 onChange={(e) => setAiExtract(e.target.checked)}
 className="accent-primary h-3.5 w-3.5 cursor-pointer"
 />
 </label>
 <label className="flex items-center justify-between text-caption text-foreground cursor-pointer select-none">
 <span>Suggest Category</span>
 <NativeInput 
 type="checkbox" 
 checked={autoCategory}
 onChange={(e) => setAutoCategory(e.target.checked)}
 className="accent-primary h-3.5 w-3.5 cursor-pointer"
 />
 </label>
 <label className="flex items-center justify-between text-caption text-foreground cursor-pointer select-none">
 <span>Generate Tags</span>
 <NativeInput 
 type="checkbox" 
 checked={generateTags}
 onChange={(e) => setGenerateTags(e.target.checked)}
 className="accent-primary h-3.5 w-3.5 cursor-pointer"
 />
 </label>
 <label className="flex items-center justify-between text-caption text-foreground cursor-pointer select-none">
 <span>Generate Summary</span>
 <NativeInput 
 type="checkbox" 
 checked={generateSummary}
 onChange={(e) => setGenerateSummary(e.target.checked)}
 className="accent-primary h-3.5 w-3.5 cursor-pointer"
 />
 </label>
 <label className="flex items-center justify-between text-caption text-foreground cursor-pointer select-none">
 <span>Detect Language</span>
 <NativeInput 
 type="checkbox" 
 checked={detectLanguage}
 onChange={(e) => setDetectLanguage(e.target.checked)}
 className="accent-primary h-3.5 w-3.5 cursor-pointer"
 />
 </label>
 <label className="flex items-center justify-between text-caption text-foreground cursor-pointer select-none">
 <span>Estimate Chunks</span>
 <NativeInput 
 type="checkbox" 
 checked={estimateChunks}
 onChange={(e) => setEstimateChunks(e.target.checked)}
 className="accent-primary h-3.5 w-3.5 cursor-pointer"
 />
 </label>
 </div>
 </div>

 <div className="space-y-space-2.5">
 <Label className="text-caption font-semibold text-muted-foreground/80">Duplicate Handling Strategy</Label>
 <div className="grid grid-cols-2 gap-space-2 mt-space-1">
 {[
 { id: "skip", label: "Skip Existing" },
 { id: "update", label: "Update Existing" },
 { id: "new_version", label: "Create Version" },
 { id: "ask", label: "Ask Every Time" },
 ].map((strategy) => (
 <NativeButton
 key={strategy.id}
 type="button"
 onClick={() => setDuplicateHandling(strategy.id)}
 className={cn(
 "h-9 border text-caption font-medium radius-md cursor-pointer transition-all px-space-2 text-left flex items-center justify-between",
 duplicateHandling === strategy.id 
 ? "bg-primary/5 border-primary/40 text-primary font-semibold" 
 : "bg-background border-[hsl(var(--foreground)/0.08)] hover:bg-[hsl(var(--foreground)/0.02)] text-muted-foreground"
 )}
 >
 {strategy.label}
 <span className={cn(
 "h-3 w-3 radius-full border border-muted-foreground/40 flex items-center justify-center shrink-0 ml-space-1.5",
 duplicateHandling === strategy.id && "border-primary bg-primary"
 )}>
 {duplicateHandling === strategy.id && <span className="h-1.5 w-1.5 radius-full bg-white" />}
 </span>
 </NativeButton>
 ))}
 </div>
 </div>
 </div>

 </div>
 )}
 </div>
 </form>
 </Card>

 {/* Quick History Log preview card */}
 <Card className="border border-[hsl(var(--foreground)/0.06)] bg-card overflow-hidden">
 <CardHeader className="flex flex-row items-center justify-between border-b border-[hsl(var(--foreground)/0.06)] py-space-4 px-space-6 bg-[hsl(var(--foreground)/0.005)] shrink-0">
 <div className="flex items-center gap-space-4">
 <div className="h-9 w-9 radius-lg bg-primary/10 flex items-center justify-center shrink-0">
 <Activity className="h-5 w-5 text-primary" />
 </div>
 <div>
 <CardTitle className="text-body-sm font-semibold text-foreground">Import Logs Overview</CardTitle>
 <CardDescription className="text-caption text-muted-foreground/70">
 Latest import run reports and synchronization states.
 </CardDescription>
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-space-0 bg-[hsl(var(--foreground)/0.002)]">
 {historyList.length === 0 ? (
 <div className="flex flex-col items-center justify-center p-space-12 text-center select-none">
 <div className="h-10 w-10 radius-full bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.06)] flex items-center justify-center text-muted-foreground/40 mb-space-3.5">
 <Globe className="h-5 w-5" />
 </div>
 <h4 className="text-body-sm font-semibold text-foreground leading-none">No active crawl imports</h4>
 <p className="text-caption text-muted-foreground/60 max-w-xs mt-space-1.5 leading-normal">
 Enter your target URL above and click Crawl & Discover to view preview pages and run ingestion.
 </p>
 </div>
 ) : (
 <ScrollArea className="" vertical={false}>
 <NativeTable className="w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-[hsl(var(--foreground)/0.06)] text-caption font-semibold text-muted-foreground/75 uppercase tracking-wider bg-[hsl(var(--foreground)/0.005)] select-none">
 <th className="p-space-4 px-space-6">URL Target</th>
 <th className="p-space-4 w-32">Status</th>
 <th className="p-space-4 w-32 text-center">Pages Scraped</th>
 <th className="p-space-4 w-36 text-right pr-space-6">Date</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[hsl(var(--foreground)/0.05)] text-caption">
 {historyList.slice().reverse().map((item: any) => {
 const stats = item.metadata?.stats;
 const duration = item.metadata?.durationMs;
 return (
 <tr key={item.id} className="hover:bg-[hsl(var(--foreground)/0.015)] transition-all duration-150">
 <td className="p-space-4 px-space-6">
 <span className="text-foreground font-semibold block truncate max-w-sm sm:max-w-md">{item.url}</span>
 {item.errorMessage && (
 <span className="text-caption text-rose-500 font-medium block mt-space-1">
 Error: {item.errorMessage}
 </span>
 )}
 {stats && (
 <span className="text-caption text-muted-foreground/60 block mt-space-0.5">
 Imported: {stats.imported || 0} | Skipped: {stats.skipped || 0} | Duration: {duration ? `${(duration / 1000).toFixed(1)}s` : "N/A"}
 </span>
 )}
 </td>
 <td className="p-space-4">
 <span className={cn(
 "inline-flex text-caption font-normal border px-space-2 py-space-0.5 radius-full uppercase tracking-wider",
 item.status === "completed" && "bg-emerald-500/8 border-emerald-500/15 text-emerald-500",
 item.status === "failed" && "bg-rose-500/8 border-rose-500/15 text-rose-500",
 !["completed", "failed"].includes(item.status) && "bg-secondary text-muted-foreground border-border"
 )}>
 {item.status}
 </span>
 </td>
 <td className="p-space-4 text-center text-foreground font-mono text-caption">{item.pagesScraped} / {item.pagesFound}</td>
 <td className="p-space-4 text-right pr-space-6 text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</td>
 </tr>
 );
 })}
 </tbody>
 </NativeTable>
 </ScrollArea>
 )}
 </CardContent>
 </Card>
 </div>
 )}

 {/* ========================================== */}
 {/* TABS 4: KNOWLEDGE CATEGORIES */}
 {/* ========================================== */}
 {activeTab ==="categories"&& (
 <div className="space-y-space-4 animate-fade-in w-full">
 {/* Header */}
 <div className="flex justify-between items-center gap-space-4">
 <div>
 <h3 className="text-body-sm font-semibold text-foreground">Categories Catalog</h3>
 <p className="text-caption text-muted-foreground/70">Organize your document resources by business departments.</p>
 </div>
 <Button onClick={() => {
 setEditingCategory(null);
 setCategoryName("");
 setCategoryDesc("");
 setIsCategoryOpen(true);
 }} className="h-9 text-caption font-semibold px-space-4 radius-lg bg-primary text-white cursor-pointer gap-space-1.5 flex items-center">
 <Plus className="h-3.5 w-3.5 shrink-0"/>
 <span className="leading-none">Add Category</span>
 </Button>
 </div>

 {/* Categories list */}
 {categories.length === 0 ? (
 <EmptyState
 title="No custom categories"
 description="Create taxonomy categories to organize company data inputs."
 icon={FolderPlus}
 actionText="Add Category"
 onAction={() => setIsCategoryOpen(true)}
 />
 ) : (
 <div className="grid gap-space-4 sm:grid-cols-2 lg:grid-cols-3">
 {categories.map((cat: any) => (
 <Card key={cat.id} className="group relative flex flex-col justify-between hover:translate-y-[-2px] hover:border-primary/20 transition-all duration-300 bg-card overflow-hidden">
 <div className="p-space-5 pb-space-3">
 <div className="flex items-start justify-between gap-space-3">
 <div className="min-w-0">
 <h4 className="text-body-md font-semibold text-foreground group-hover:text-primary transition-colors truncate">{cat.name}</h4>
 <span className="inline-flex text-caption font-mono font-semibold bg-[hsl(var(--foreground)/0.03)] border border-[hsl(var(--foreground)/0.05)] text-muted-foreground/80 px-space-2 py-space-0.5 radius-md mt-space-1 w-fit">
 slug: {cat.slug}
 </span>
 </div>
 <div className="h-8 w-8 radius-lg bg-primary/5 text-primary flex items-center justify-center shrink-0 border border-primary/10">
 <FolderOpen className="h-4 w-4"/>
 </div>
 </div>
 <p className="text-caption text-muted-foreground/75 mt-space-3 line-clamp-2 leading-relaxed min-h-8">
 {cat.description ||"No description provided."}
 </p>
 </div>
 <div className="p-space-3 px-space-5 border-t border-[hsl(var(--foreground)/0.05)] bg-[hsl(var(--foreground)/0.005)] flex justify-end gap-space-1.5 items-center">
 <div className="inline-flex radius-lg border border-[hsl(var(--foreground)/0.07)] bg-[hsl(var(--foreground)/0.015)] overflow-hidden">
 <NativeButton
 onClick={() => handleEditCategory(cat)}
 className="h-7 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--foreground)/0.04)] border-r border-[hsl(var(--foreground)/0.07)] cursor-pointer transition-colors"
 title="Edit"
 >
 <Edit3 className="h-3.5 w-3.5"/>
 </NativeButton>
 <NativeButton
 onClick={() => handleDeleteCategory(cat.id)}
 className="h-7 w-8 flex items-center justify-center text-rose-500 hover:bg-rose-500/5 cursor-pointer transition-colors"
 title="Delete"
 >
 <Trash2 className="h-3.5 w-3.5"/>
 </NativeButton>
 </div>
 </div>
 </Card>
 ))}
 </div>
 )}
 </div>
 )}

 {/* ========================================== */}
 {/* TABS 5: PROCESSING QUEUE */}
 {/* ========================================== */}
 {activeTab ==="queue"&& (
 <div className="space-y-space-4 animate-fade-in w-full">
 {/* Header info */}
 <div>
 <h3 className="text-body-sm font-semibold text-foreground">Background Processing Jobs</h3>
 <p className="text-caption text-muted-foreground/70">Monitor extraction, token chunking, and embedding runs inside the processing pipeline.</p>
 </div>

 {/* Jobs list */}
 {jobs.length === 0 ? (
 <div className="border border-dashed border-[hsl(var(--foreground)/0.08)] bg-card/20 radius-xl p-space-10 text-center text-caption text-muted-foreground/60 italic">
 No processing jobs executed yet.
 </div>
 ) : (
 <Card className="overflow-hidden">
 <CardContent className="p-space-0">
 <ScrollArea className="" vertical={false}>
 <NativeTable className="w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-[hsl(var(--foreground)/0.06)] text-caption font-semibold text-muted-foreground/75 uppercase tracking-wider bg-[hsl(var(--foreground)/0.005)] select-none">
 <th className="p-space-4 px-space-6">Document Source</th>
 <th className="p-space-4 w-28 text-center">Status</th>
 <th className="p-space-4 w-28 text-center">Duration</th>
 <th className="p-space-4 w-28 text-center">Logs</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[hsl(var(--foreground)/0.05)] text-caption bg-[hsl(var(--foreground)/0.002)]">
 {jobs.map((job: any) => (
 <tr key={job.id} className="hover:bg-[hsl(var(--foreground)/0.015)] transition-all duration-150">
 <td className="p-space-4 px-space-6">
 <span className="text-foreground font-semibold block leading-snug">{job.documentName}</span>
 <span className="text-caption text-muted-foreground/50 block mt-space-0.5 font-mono">ID: {job.id.substring(0, 8)}...</span>
 </td>
 <td className="p-space-4 text-center">
 <span className={cn(
 "inline-flex text-caption font-normal border px-space-2.5 py-space-0.5 radius-full uppercase tracking-wider",
 job.status ==="completed"&&"bg-emerald-500/8 border-emerald-500/15 text-emerald-500",
 job.status ==="failed"&&"bg-rose-500/8 border-rose-500/15 text-rose-500",
 !["completed","failed"].includes(job.status) &&"bg-secondary text-muted-foreground border-border"
 )}>
 {job.status}
 </span>
 </td>
 <td className="p-space-4 text-center text-foreground font-mono text-caption">{job.duration ?`${(job.duration / 1000).toFixed(2)}s`:"N/A"}</td>
 <td className="p-space-4 text-center">
 {job.logs ? (
 <Button 
 onClick={() => setViewingJobLogs(job.logs)}
 variant="outline"
 className="h-7 text-caption font-semibold border-[hsl(var(--foreground)/0.08)] bg-background text-muted-foreground hover:text-foreground cursor-pointer radius-md"
 >
 View Logs
 </Button>
 ) : (
 <span className="text-caption text-muted-foreground/60 italic">No logs</span>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </NativeTable>
 </ScrollArea>
 </CardContent>
 </Card>
 )}
 </div>
 )}

 {/* ========================================== */}
 {/* TABS 6: KNOWLEDGE SEARCH CONSOLE */}
 {/* ========================================== */}
 {activeTab ==="search"&& (
 <div className="space-y-space-4 animate-fade-in w-full">
 {/* Input query */}
 <Card>
 <CardHeader className="flex flex-row items-center gap-space-4 border-b border-[hsl(var(--foreground)/0.06)] py-space-4 px-space-6 bg-[hsl(var(--foreground)/0.005)] shrink-0">
 <div className="h-9 w-9 radius-lg bg-primary/10 flex items-center justify-center shrink-0">
 <Search className="h-5 w-5 text-primary"/>
 </div>
 <div>
 <CardTitle className="text-body-sm font-semibold text-foreground">Internal Search Engine</CardTitle>
 <CardDescription className="text-caption text-muted-foreground/70">
 Query business documents, FAQs, categories, and services catalogs using full-text database filters.
 </CardDescription>
 </div>
 </CardHeader>
 <div className="p-space-6 pt-space-5 bg-[hsl(var(--foreground)/0.002)]">
 <div className="relative max-w-xl">
 <Search className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10 pointer-events-none"/>
 <Input
 placeholder="Enter keywords..."
 className="pl-space-9 h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20"
 value={searchQuery}
 onChange={(e) => handleSearch(e.target.value)}
 />
 {isSearching && (
 <Loader2 className="absolute right-space-3 top-space-3 h-3.5 w-3.5 text-primary animate-spin"/>
 )}
 </div>
 </div>
 </Card>

 {/* Results */}
 {searchQuery.trim().length > 0 && (
 <div className="space-y-space-4">
 
 {/* 1. Documents */}
 <Card>
 <CardHeader className="py-space-4 px-space-6 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)]">
 <CardTitle className="text-caption uppercase font-semibold tracking-wider text-muted-foreground/70">Matched Knowledge Documents</CardTitle>
 </CardHeader>
 <CardContent className="p-space-0 bg-[hsl(var(--foreground)/0.002)]">
 {searchResults.documents.length === 0 ? (
 <div className="p-space-5 text-caption text-muted-foreground/60 italic">No document matches found.</div>
 ) : (
 <div className="divide-y divide-[hsl(var(--foreground)/0.05)] text-caption">
 {searchResults.documents.map((doc: any) => (
 <div key={doc.id} className="flex justify-between items-center p-space-3.5 px-space-6">
 <div className="flex items-center gap-space-3">
 <FileText className="h-4 w-4 text-primary/70 shrink-0"/>
 <span className="text-foreground font-semibold">{doc.name}</span>
 </div>
 <span className={cn("text-caption font-normal border px-space-2 py-space-0.5 radius-full uppercase tracking-wider", getFileTypeStyle(doc.fileType))}>
 {doc.fileType}
 </span>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>

 {/* 2. FAQs */}
 <Card>
 <CardHeader className="py-space-4 px-space-6 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)]">
 <CardTitle className="text-caption uppercase font-semibold tracking-wider text-muted-foreground/70">Matched FAQ Q&As</CardTitle>
 </CardHeader>
 <CardContent className="p-space-0 bg-[hsl(var(--foreground)/0.002)]">
 {searchResults.faqs.length === 0 ? (
 <div className="p-space-5 text-caption text-muted-foreground/60 italic">No FAQ matches found.</div>
 ) : (
 <div className="divide-y divide-[hsl(var(--foreground)/0.05)] text-caption">
 {searchResults.faqs.map((faq: any) => (
 <div key={faq.id} className="p-space-4 px-space-6 space-y-space-2">
 <span className="text-foreground font-semibold block">Q: {faq.question}</span>
 <p className="text-muted-foreground leading-relaxed pl-space-3 border-l-2 border-primary/20">{faq.answer}</p>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>

 {/* 3. Services */}
 <Card>
 <CardHeader className="py-space-4 px-space-6 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)]">
 <CardTitle className="text-caption uppercase font-semibold tracking-wider text-muted-foreground/70">Matched Services Catalog</CardTitle>
 </CardHeader>
 <CardContent className="p-space-0 bg-[hsl(var(--foreground)/0.002)]">
 {searchResults.services.length === 0 ? (
 <div className="p-space-5 text-caption text-muted-foreground/60 italic">No service matches found.</div>
 ) : (
 <div className="divide-y divide-[hsl(var(--foreground)/0.05)] text-caption">
 {searchResults.services.map((svc: any) => (
 <div key={svc.id} className="p-space-4 px-space-6 flex justify-between items-start gap-space-4">
 <div className="space-y-space-1">
 <span className="text-foreground font-semibold block">{svc.name}</span>
 <p className="text-muted-foreground text-caption leading-relaxed">{svc.description ||"No description provided."}</p>
 </div>
 <div className="shrink-0 text-right text-foreground font-semibold space-y-space-1 text-caption">
 <div className="text-primary">${svc.price}</div>
 <div className="text-muted-foreground/60 font-mono">{svc.duration} mins</div>
 </div>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>

 </div>
 )}
 </div>
 )}

 {/* ========================================== */}
 {/* TABS 7: STORAGE SETTINGS */}
 {/* ========================================== */}
 {activeTab ==="settings"&& (
 <form onSubmit={handleSaveSettings} className="space-y-space-4 animate-fade-in w-full">
 {settingsSuccess && (
 <div className="flex items-center gap-space-2 p-space-3 radius-xl bg-emerald-500/8 border border-emerald-500/15 text-caption text-emerald-600 font-medium animate-fade-in">
 <Check className="h-4 w-4 shrink-0 text-emerald-500"/>
 <span className="leading-none">Storage configurations saved successfully.</span>
 </div>
 )}

 <Card>
 <CardHeader className="flex flex-row items-center gap-space-4 border-b border-[hsl(var(--foreground)/0.06)] py-space-4 px-space-6 bg-[hsl(var(--foreground)/0.005)] shrink-0">
 <div className="h-9 w-9 radius-lg bg-primary/10 flex items-center justify-center shrink-0">
 <HardDrive className="h-5 w-5 text-primary"/>
 </div>
 <div>
 <CardTitle className="text-body-sm font-semibold text-foreground">Storage Provider Settings</CardTitle>
 <CardDescription className="text-caption text-muted-foreground/70">
 Configure where manual document assets (PDF, DOCX, TXT) are securely saved.
 </CardDescription>
 </div>
 </CardHeader>
 <div className="p-space-6 pt-space-5 bg-[hsl(var(--foreground)/0.002)]">
 <div className="grid gap-space-4 sm:grid-cols-3">
 {[
 { id:"vercel_blob", label:"Vercel Blob", desc:"Native high-speed hosting storage.", active: true },
 { id:"s3", label:"AWS S3 Bucket", desc:"Enterprise object storage.", active: false },
 { id:"r2", label:"Cloudflare R2", desc:"Zero egress fees bucket.", active: false },
 ].map((prov) => (
 <NativeButton
 key={prov.id}
 type="button"
 onClick={() => prov.active && setStorageProvider(prov.id)}
 className={cn(
 "group relative flex flex-col items-start p-space-5 border text-left transition-all select-none radius-2xl cursor-pointer duration-300",
 storageProvider === prov.id
 ?"border-primary bg-gradient-to-br from-primary/[0.04] to-primary/[0.01] text-foreground scale-[1.01]"
 :"border-[hsl(var(--foreground)/0.06)] bg-background/40 text-muted-foreground hover:bg-[hsl(var(--foreground)/0.015)] hover:border-[hsl(var(--foreground)/0.1)]",
 !prov.active &&"opacity-60 cursor-not-allowed hover:bg-transparent hover:border-[hsl(var(--foreground)/0.06)]"
 )}
 disabled={!prov.active}
 >
 {/* Selection radio/check indicator */}
 <div className="absolute top-space-4 right-space-4 flex items-center justify-center">
 <div className={cn(
 "h-5 w-5 radius-full border flex items-center justify-center transition-all duration-300",
 storageProvider === prov.id 
 ?"border-primary bg-primary text-white scale-110"
 :"border-[hsl(var(--foreground)/0.15)] bg-background group-hover:border-[hsl(var(--foreground)/0.3)]"
 )}>
 {storageProvider === prov.id && <Check className="h-3 w-3 stroke-[3]"/>}
 </div>
 </div>

 <span className="text-body-sm font-semibold text-foreground flex items-center gap-space-1.5 leading-none pr-space-6 mt-space-0">
 {prov.label}
 </span>
 
 <p className="text-caption text-muted-foreground/85 mt-space-2.5 leading-relaxed pr-space-2">
 {prov.desc}
 </p>
 
 {!prov.active && (
 <span className="inline-flex items-center text-caption border bg-[hsl(var(--foreground)/0.03)] border-[hsl(var(--foreground)/0.05)] text-muted-foreground/60 px-space-2.5 py-space-1 radius-md uppercase font-normal mt-space-4 tracking-wider leading-none">
 Enterprise
 </span>
 )}
 </NativeButton>
 ))}
 </div>
 </div>
 <div className="px-space-6 py-space-4 border-t border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] flex justify-end">
 <Button type="submit"disabled={isSettingsSaving} className="h-9 text-caption font-semibold text-white cursor-pointer gap-space-1.5 radius-lg px-space-5 flex items-center">
 {isSettingsSaving ? (
 <>
 <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0"/>
 <span className="leading-none">Saving...</span>
 </>
 ) : (
 <>
 <Save className="h-3.5 w-3.5 shrink-0"/>
 <span className="leading-none">Save Configuration</span>
 </>
 )}
 </Button>
 </div>
 </Card>
 </form>
 )}

 </div>
 </div>

 {/* ========================================== */}
 {/* DIALOG 1: ADD/EDIT CATEGORY */}
 {/* ========================================== */}
 <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
 <DialogContent className="max-w-md bg-card border border-[hsl(var(--foreground)/0.08)] p-space-0 overflow-hidden">
 <form onSubmit={handleSaveCategory}>
 <div className="px-space-5 pt-space-5 pb-space-4 border-b border-[hsl(var(--foreground)/0.05)]">
 <div className="flex items-center gap-space-2.5">
 <div className="h-8 w-8 radius-lg bg-primary/10 flex items-center justify-center shrink-0">
 <FolderPlus className="h-4 w-4 text-primary"/>
 </div>
 <div>
 <DialogTitle className="text-body-sm font-semibold text-foreground">{editingCategory ?"Edit Category":"Add Custom Category"}</DialogTitle>
 <DialogDescription className="text-caption text-muted-foreground/55 mt-space-0.5">
 Create departments to organize company manual uploads.
 </DialogDescription>
 </div>
 </div>
 </div>

 <div className="px-space-5 py-space-4 space-y-space-4">
 <div className="space-y-space-1.5">
 <Label htmlFor="cat_name"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Category Name</Label>
 <Input
 id="cat_name"
 placeholder="e.g. Booking Policies"
 value={categoryName}
 onChange={(e) => setCategoryName(e.target.value)}
 className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20"
 required
 />
 </div>
 <div className="space-y-space-1.5">
 <Label htmlFor="cat_desc"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Description</Label>
 <NativeTextarea
 id="cat_desc"
 rows={3}
 placeholder="Brief description of the context rules..."
 className="flex w-full radius-lg border border-[hsl(var(--foreground)/0.08)] bg-background px-space-3 py-space-2 text-caption transition-colors placeholder:text-muted-foreground/50 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground"
 value={categoryDesc}
 onChange={(e) => setCategoryDesc(e.target.value)}
 />
 </div>
 </div>

 <DialogFooter className="px-space-5 pb-space-5 pt-space-2 border-t border-[hsl(var(--foreground)/0.05)]">
 <Button type="button"variant="outline"onClick={() => setIsCategoryOpen(false)} disabled={isCategorySubmitting} className="h-9 text-caption font-semibold px-space-4 cursor-pointer radius-lg">
 Cancel
 </Button>
 <Button type="submit"disabled={isCategorySubmitting || !categoryName.trim()} className="h-9 text-caption font-semibold px-space-5 text-white cursor-pointer radius-lg">
 {isCategorySubmitting ? (
 <>
 <Loader2 className="mr-space-1.5 h-3.5 w-3.5 animate-spin"/> Saving...
 </>
 ) : (
 "Save Category"
 )}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>

 {/* ========================================== */}
 {/* DIALOG 2: ADD DOCUMENT (Using custom Radix Select dropdown) */}
 {/* ========================================== */}
 <Dialog open={isDocOpen} onOpenChange={(open) => { if (!open) { setUploadError(null); } setIsDocOpen(open); }}>
 <DialogContent className="max-w-lg bg-card border border-[hsl(var(--foreground)/0.08)] p-space-0 overflow-hidden">
 <form onSubmit={handleUploadDocument}>
 <div className="px-space-5 pt-space-5 pb-space-4 border-b border-[hsl(var(--foreground)/0.05)]">
 <div className="flex items-center gap-space-2.5">
 <div className="h-8 w-8 radius-lg bg-primary/10 flex items-center justify-center shrink-0">
 <FileCode className="h-4 w-4 text-primary"/>
 </div>
 <div>
 <DialogTitle className="text-body-sm font-semibold text-foreground">Add Company Manual</DialogTitle>
 <DialogDescription className="text-caption text-muted-foreground/55 mt-space-0.5">
 Provide text rules or manuals to extract and chunk into the knowledge library.
 </DialogDescription>
 </div>
 </div>
 </div>

 <ScrollArea className="px-space-5 py-space-4 space-y-space-4 max-h-96 pr-space-1 bg-[hsl(var(--foreground)/0.002)]" horizontal={false}>
 
 {/* File Drag and Drop Zone */}
 <div className="space-y-space-1.5">
 <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Attachment / File Upload</Label>
 <div
 onDragEnter={handleDrag}
 onDragOver={handleDrag}
 onDragLeave={handleDrag}
 onDrop={handleDrop}
 onClick={() => fileInputRef.current?.click()}
 className={cn(
 "relative flex flex-col items-center justify-center border border-dashed radius-xl p-space-6 text-center cursor-pointer transition-all duration-200 select-none min-h-32",
 dragActive 
 ?"border-primary bg-primary/5 scale-[1.01] "
 :"border-[hsl(var(--foreground)/0.08)] hover:border-primary/40 hover:bg-[hsl(var(--foreground)/0.015)]"
 )} tabIndex={0} onKeyDown={() => {}}
 >
 <Input
 ref={fileInputRef}
 type="file"
 className="hidden"
 accept=".txt,.md,.csv,.pdf,.docx"
 onChange={handleChange}
 />
 
 <div className="flex h-10 w-10 items-center justify-center radius-full bg-[hsl(var(--primary)/0.08)] text-primary mb-space-2.5 shrink-0 transition-transform duration-200 hover:scale-105">
 <UploadCloud className="h-5 w-5 text-primary"/>
 </div>
 <p className="text-caption text-foreground">
 {docName ? (
 <span>Selected: <strong className="text-primary">{docName}</strong></span>
 ) : (
 <span><strong>Drag & drop file</strong> or <span className="text-primary hover:underline font-semibold">browse</span></span>
 )}
 </p>
 <p className="text-caption text-muted-foreground/60 mt-space-1 leading-normal">
 Supports TXT, MD, CSV, PDF, DOCX (Max 10 MB limit)
 </p>
 </div>
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="doc_name"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Document Name / Title</Label>
 <Input
 id="doc_name"
 placeholder="e.g. Return Policy Manual.txt"
 value={docName}
 onChange={(e) => setDocName(e.target.value)}
 className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20"
 required
 />
 </div>
 
 <div className="space-y-space-1.5">
 <Label htmlFor="doc_cat"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Taxonomy Category</Label>
 <Select value={docCategory} onValueChange={(val) => setDocCategory(val)}>
 <SelectTrigger className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20">
 <SelectValue placeholder="Select Category"/>
 </SelectTrigger>
 <SelectContent>
 {categories.map((c: any) => (
 <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="doc_content"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Manual Text Content</Label>
 <NativeTextarea
 id="doc_content"
 rows={5}
 placeholder="Paste company instructions or manual text here..."
 className="flex w-full radius-lg border border-[hsl(var(--foreground)/0.08)] bg-background px-space-3 py-space-2 text-caption transition-colors placeholder:text-muted-foreground/50 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground"
 value={docContent}
 onChange={(e) => setDocContent(e.target.value)}
 required
 />
 </div>

 {uploadError && (
 <div className="flex items-center gap-space-2 radius-lg bg-rose-500/8 border border-rose-500/15 p-space-3 text-caption text-rose-600 font-semibold animate-fade-in">
 <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500"/>
 <span className="flex-1">{uploadError}</span>
 <Button 
 type="button"
 className="hover:opacity-75 transition-opacity font-semibold px-space-1"
 onClick={() => setUploadError(null)}
 >
 &times;
 </Button>
 </div>
 )}
 </ScrollArea>

 <DialogFooter className="px-space-5 pb-space-5 pt-space-2 border-t border-[hsl(var(--foreground)/0.05)]">
 <Button type="button"variant="outline"onClick={() => { setIsDocOpen(false); setUploadError(null); }} disabled={isDocSubmitting} className="h-9 text-caption font-semibold px-space-4 cursor-pointer radius-lg">
 Cancel
 </Button>
 <Button type="submit"disabled={isDocSubmitting || !docName.trim() || !docContent.trim() || !!uploadError} className="h-9 text-caption font-semibold px-space-5 text-white cursor-pointer radius-lg">
 {isDocSubmitting ? (
 <>
 <Loader2 className="mr-space-1.5 h-3.5 w-3.5 animate-spin"/> Uploading...
 </>
 ) : (
 "Process & Upload"
 )}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>

 {/* ========================================== */}
 {/* DIALOG 3: RENAME DOCUMENT */}
 {/* ========================================== */}
 <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
 <DialogContent className="max-w-md bg-card border border-[hsl(var(--foreground)/0.08)] p-space-0 overflow-hidden">
 <form onSubmit={handleRenameDocument}>
 <div className="px-space-5 pt-space-5 pb-space-4 border-b border-[hsl(var(--foreground)/0.05)]">
 <div className="flex items-center gap-space-2.5">
 <div className="h-8 w-8 radius-lg bg-primary/10 flex items-center justify-center shrink-0">
 <Edit3 className="h-4 w-4 text-primary"/>
 </div>
 <div>
 <DialogTitle className="text-body-sm font-semibold text-foreground">Rename Document</DialogTitle>
 </div>
 </div>
 </div>

 <div className="px-space-5 py-space-4">
 <div className="space-y-space-1.5">
 <Label htmlFor="new_doc_name"className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">New File Name</Label>
 <Input
 id="new_doc_name"
 value={newDocName}
 onChange={(e) => setNewDocName(e.target.value)}
 className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20"
 required
 />
 </div>
 </div>

 <DialogFooter className="px-space-5 pb-space-5 pt-space-2 border-t border-[hsl(var(--foreground)/0.05)]">
 <Button type="button"variant="outline"onClick={() => setIsRenameOpen(false)} disabled={isRenameSubmitting} className="h-9 text-caption font-semibold px-space-4 cursor-pointer radius-lg">
 Cancel
 </Button>
 <Button type="submit"disabled={isRenameSubmitting || !newDocName.trim()} className="h-9 text-caption font-semibold px-space-5 text-white cursor-pointer radius-lg">
 {isRenameSubmitting ? (
 <>
 <Loader2 className="mr-space-1.5 h-3.5 w-3.5 animate-spin"/> Saving...
 </>
 ) : (
 "Rename File"
 )}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>

 {/* ========================================== */}
 {/* DIALOG 4: VIEW JOB LOGS */}
 {/* ========================================== */}
 <Dialog open={viewingJobLogs !== null} onOpenChange={(open) => !open && setViewingJobLogs(null)}>
 <DialogContent className="max-w-lg bg-card border border-[hsl(var(--foreground)/0.08)] p-space-0 overflow-hidden">
 <div className="px-space-5 pt-space-5 pb-space-4 border-b border-[hsl(var(--foreground)/0.05)]">
 <div className="flex items-center gap-space-2.5">
 <div className="h-8 w-8 radius-lg bg-primary/10 flex items-center justify-center shrink-0">
 <FileText className="h-4 w-4 text-primary"/>
 </div>
 <div>
 <DialogTitle className="text-body-sm font-semibold text-foreground">Job Execution Logs</DialogTitle>
 </div>
 </div>
 </div>

 <div className="px-space-5 py-space-4">
 <pre className="bg-background border border-[hsl(var(--foreground)/0.06)] p-space-4 radius-xl font-mono text-caption text-muted-foreground/80 leading-relaxed whitespace-pre-wrap max-h-60"><ScrollArea className="h-full w-full" horizontal={false}>
 {viewingJobLogs}
 </ScrollArea></pre>
 </div>

 <div className="px-space-5 pb-space-5 pt-space-2 border-t border-[hsl(var(--foreground)/0.05)] flex justify-end">
 <Button onClick={() => setViewingJobLogs(null)} className="h-9 text-caption font-semibold px-space-4 cursor-pointer radius-lg">
 Close
 </Button>
 </div>
 </DialogContent>
 </Dialog>

 {/* ========================================== */}
 {/* DIALOG 5: WEBSITE IMPORT PREVIEW */}
 {/* ========================================== */}
 <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
 <DialogContent className="max-w-4xl h-144 bg-card border border-[hsl(var(--foreground)/0.08)] p-space-0 overflow-hidden flex flex-col">
 <div className="px-space-5 pt-space-5 pb-space-4 border-b border-[hsl(var(--foreground)/0.05)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex items-center justify-between">
 <div className="flex items-center gap-space-2.5">
 <div className="h-8 w-8 radius-lg bg-primary/10 flex items-center justify-center shrink-0">
 <Globe className="h-4 w-4 text-primary" />
 </div>
 <div>
 <DialogTitle className="text-body-sm font-semibold text-foreground">Import Preview &amp; Selection</DialogTitle>
 <DialogDescription className="text-caption text-muted-foreground/60 mt-space-0.5">
 Select which discovered web pages you want to ingest into the Knowledge Base.
 </DialogDescription>
 </div>
 </div>
 </div>

 <ScrollArea className="flex-1 min-h-0 p-space-5 space-y-space-4" horizontal={false}>
 {discoveredPages.some(p => p.status === "excluded") && (
 <div className="p-space-3 bg-amber-500/5 border border-amber-500/15 radius-lg flex gap-space-3 items-start text-caption text-amber-500">
 <AlertTriangle className="h-4 w-4 shrink-0 mt-space-0.5" />
 <div>
 <span className="font-semibold block">Paths Ignored by Crawl Rules</span>
 Some pages matched your exclude path lists or failed depth limits and are excluded from initial import.
 </div>
 </div>
 )}

 <div className="border border-[hsl(var(--foreground)/0.08)] radius-lg overflow-hidden bg-background">
 <NativeTable className="w-full text-left border-collapse text-caption">
 <thead>
 <tr className="border-b border-[hsl(var(--foreground)/0.08)] text-caption font-semibold text-muted-foreground bg-[hsl(var(--foreground)/0.005)] uppercase tracking-wider select-none">
 <th className="p-space-3 text-center w-12">
 <NativeInput
 type="checkbox"
 checked={
 selectedPagesToImport.length > 0 &&
 selectedPagesToImport.length === discoveredPages.filter(p => p.status !== "excluded").length
 }
 onChange={(e) => {
 if (e.target.checked) {
 setSelectedPagesToImport(discoveredPages.filter(p => p.status !== "excluded").map(p => p.url));
 } else {
 setSelectedPagesToImport([]);
 }
 }}
 className="accent-primary cursor-pointer h-3.5 w-3.5"
 />
 </th>
 <th className="p-space-3">Page Title / URL</th>
 <th className="p-space-3 w-28 text-center">Words</th>
 <th className="p-space-3 w-24 text-center">Chunks</th>
 <th className="p-space-3 w-40">Category</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[hsl(var(--foreground)/0.05)]">
 {discoveredPages.map((page, idx) => {
 const isExcluded = page.status === "excluded";
 const isChecked = selectedPagesToImport.includes(page.url);
 return (
 <tr
 key={idx}
 className={cn(
 "hover:bg-[hsl(var(--foreground)/0.01)] transition-colors",
 isExcluded && "bg-[hsl(var(--foreground)/0.005)] opacity-50"
 )}
 >
 <td className="p-space-3 text-center">
 <NativeInput
 type="checkbox"
 disabled={isExcluded}
 checked={isChecked && !isExcluded}
 onChange={() => {
 if (isChecked) {
 setSelectedPagesToImport(selectedPagesToImport.filter(url => url !== page.url));
 } else {
 setSelectedPagesToImport([...selectedPagesToImport, page.url]);
 }
 }}
 className="accent-primary cursor-pointer disabled:cursor-not-allowed h-3.5 w-3.5"
 />
 </td>
 <td className="p-space-3 max-w-sm truncate">
 <span className="font-semibold text-foreground block truncate">{page.title}</span>
 <span className="text-caption text-muted-foreground/70 block truncate font-mono">{page.url}</span>
 </td>
 <td className="p-space-3 text-center text-muted-foreground font-mono text-caption">{page.wordCount}</td>
 <td className="p-space-3 text-center text-muted-foreground font-mono text-caption">{page.estimatedChunks}</td>
 <td className="p-space-3">
 {page.suggestedCategory ? (
 <span className="inline-flex text-caption font-semibold border border-primary/10 bg-primary/5 text-primary px-space-2 py-space-0.5 radius-full">
 {page.suggestedCategory}
 </span>
 ) : (
 <span className="text-caption italic text-muted-foreground/60">Unassigned</span>
 )}
 </td>
 </tr>
 );
 })}
 </tbody>
 </NativeTable>
 </div>
 </ScrollArea>

 <DialogFooter className="px-space-5 pb-space-5 pt-space-3 border-t border-[hsl(var(--foreground)/0.05)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex items-center justify-between">
 <span className="text-caption text-muted-foreground/70 font-medium">
 Selected: {selectedPagesToImport.length} of {discoveredPages.filter(p => p.status !== "excluded").length} available pages
 </span>
 <div className="flex gap-space-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => setIsPreviewOpen(false)}
 className="h-9 text-caption font-semibold px-space-4 cursor-pointer radius-lg"
 >
 Cancel
 </Button>
 <Button
 type="button"
 onClick={handleExecuteIngestion}
 disabled={selectedPagesToImport.length === 0}
 className="h-9 text-caption font-semibold px-space-5 text-white cursor-pointer radius-lg bg-primary hover:bg-primary/90"
 >
 Confirm Ingestion ({selectedPagesToImport.length})
 </Button>
 </div>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* ========================================== */}
 {/* DIALOG 6: LIVE INGESTION PROGRESS OVERLAY */}
 {/* ========================================== */}
 <Dialog open={isProgressOpen} onOpenChange={() => {}}>
 <DialogContent className="max-w-md bg-card border border-[hsl(var(--foreground)/0.08)] p-space-6 overflow-hidden flex flex-col items-center justify-center text-center select-none">
 <div className="h-12 w-12 radius-full bg-primary/10 flex items-center justify-center text-primary mb-space-4 animate-pulse">
 <Loader2 className="h-6 w-6 animate-spin" />
 </div>
 <h3 className="text-body-sm font-semibold text-foreground leading-none">Ingesting Website Pages...</h3>
 <p className="text-caption text-muted-foreground/75 mt-space-2 max-w-xs leading-normal">
 Your pages are being processed, boilerplate is stripped, and chunks are saved to vector index.
 </p>
 <div className="w-full mt-space-6 space-y-space-2">
 <div className="flex justify-between items-center text-caption font-semibold uppercase tracking-wider text-muted-foreground/75">
 <span>{progressStage}</span>
 <span className="font-mono text-foreground font-bold">{progressValue}%</span>
 </div>
 <div className="h-2 w-full bg-[hsl(var(--foreground)/0.06)] radius-full overflow-hidden">
 <div
 className="h-full bg-primary transition-all duration-300 radius-full"
 style={{ width: `${progressValue}%` }}
 />
 </div>
 </div>
 </DialogContent>
 </Dialog>

 {/* ========================================== */}
 {/* DIALOG 7: IMPORT HISTORY DETAILS */}
 {/* ========================================== */}
 <Dialog open={importHistoryOpen} onOpenChange={(open) => {
 if (!open) setSelectedHistoryItem(null);
 setImportHistoryOpen(open);
 }}>
 <DialogContent className="max-w-2xl bg-card border border-[hsl(var(--foreground)/0.08)] p-space-0 overflow-hidden flex flex-col h-128">
 {selectedHistoryItem ? (
 <div className="flex flex-col h-full overflow-hidden">
 <div className="px-space-5 pt-space-5 pb-space-4 border-b border-[hsl(var(--foreground)/0.05)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex items-center gap-space-2.5">
 <Button
 variant="outline"
 onClick={() => setSelectedHistoryItem(null)}
 className="h-8 w-8 p-space-0 radius-lg hover:bg-[hsl(var(--foreground)/0.02)] cursor-pointer flex items-center justify-center shrink-0 border border-[hsl(var(--foreground)/0.08)]"
 >
 <ChevronRight className="h-4 w-4 rotate-180 text-muted-foreground" />
 </Button>
 <div>
 <DialogTitle className="text-body-sm font-semibold text-foreground">Import Details: {selectedHistoryItem.url}</DialogTitle>
 <DialogDescription className="text-caption text-muted-foreground/60 mt-space-0.5">
 Inspect and manage individual pages scraped during this import run.
 </DialogDescription>
 </div>
 </div>

 <ScrollArea className="flex-1 min-h-0 p-space-5" horizontal={false}>
 <div className="border border-[hsl(var(--foreground)/0.08)] radius-lg overflow-hidden bg-background">
 <NativeTable className="w-full text-left border-collapse text-caption">
 <thead>
 <tr className="border-b border-[hsl(var(--foreground)/0.08)] text-caption font-semibold text-muted-foreground bg-[hsl(var(--foreground)/0.005)] uppercase tracking-wider select-none">
 <th className="p-space-3 px-space-4">Page Title / Path</th>
 <th className="p-space-3 w-32">Status</th>
 <th className="p-space-3 w-24 text-center">Words</th>
 <th className="p-space-3 w-28 text-right pr-space-4">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[hsl(var(--foreground)/0.05)]">
 {(selectedHistoryItem.metadata?.discoveredPages || []).map((page: any, idx: number) => {
 const matchingDoc = documents.find((d: any) => {
 const docUrl = (d.metadata as any)?.url;
 return docUrl === page.url || docUrl === `${selectedHistoryItem.url.replace(/\/$/, "")}${page.path}`;
 });
 const isIngested = !!matchingDoc;
 return (
 <tr key={idx} className="hover:bg-[hsl(var(--foreground)/0.01)] transition-colors">
 <td className="p-space-3 px-space-4 max-w-xs truncate">
 <span className="font-semibold text-foreground block truncate">{page.title}</span>
 <span className="text-caption text-muted-foreground/70 block truncate font-mono">{page.path || "/"}</span>
 </td>
 <td className="p-space-3">
 {isIngested ? (
 <span className="inline-flex text-caption font-semibold border border-emerald-500/15 bg-emerald-500/5 text-emerald-600 px-space-2 py-space-0.5 radius-full">
 Ingested
 </span>
 ) : page.status === "excluded" ? (
 <span className="inline-flex text-caption font-semibold border border-muted-foreground/15 bg-secondary text-muted-foreground/75 px-space-2 py-space-0.5 radius-full">
 Excluded
 </span>
 ) : (
 <span className="inline-flex text-caption font-semibold border border-amber-500/15 bg-amber-500/5 text-amber-600 px-space-2 py-space-0.5 radius-full">
 Not Ingested
 </span>
 )}
 </td>
 <td className="p-space-3 text-center text-muted-foreground font-mono text-caption">{page.wordCount}</td>
 <td className="p-space-3 text-right pr-space-4">
 {isIngested ? (
 <Button
 variant="ghost"
 onClick={async () => {
                        if (confirm(`Remove page "${page.title}" from the Knowledge Base?`)) {
                          const res = await deleteKnowledgeDocumentAction(matchingDoc.id);
                          if (res.success) {
                            toast.success("Page Removed", `"${page.title}" removed from knowledge base.`);
                            router.refresh();
                            setDocuments((prev: any[]) => prev.filter((d: any) => d.id !== matchingDoc.id));
                          } else {
                            toast.error("Failed to remove page", formatUserErrorMessage(res.error));
                          }
                        }
 }}
 className="h-7 w-7 p-space-0 radius-md border border-rose-500/15 bg-rose-500/5 flex items-center justify-center text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer ml-auto"
 title="Remove from Knowledge Base"
 >
 <Trash className="h-3.5 w-3.5" />
 </Button>
 ) : (
 <span className="text-caption text-muted-foreground/45 select-none font-medium">—</span>
 )}
 </td>
 </tr>
 );
 })}
 </tbody>
 </NativeTable>
 </div>
 </ScrollArea>

 <div className="px-space-5 pb-space-5 pt-space-3 border-t border-[hsl(var(--foreground)/0.05)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex justify-between items-center">
 <Button onClick={() => setSelectedHistoryItem(null)} variant="outline" className="h-9 text-caption font-semibold px-space-4 cursor-pointer radius-lg">
 Back to History
 </Button>
 <Button onClick={() => setImportHistoryOpen(false)} className="h-9 text-caption font-semibold px-space-4 cursor-pointer radius-lg text-white">
 Close Details
 </Button>
 </div>
 </div>
 ) : (
 <div className="flex flex-col h-full overflow-hidden">
 <div className="px-space-5 pt-space-5 pb-space-4 border-b border-[hsl(var(--foreground)/0.05)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex items-center justify-between">
 <div className="flex items-center gap-space-2.5">
 <div className="h-8 w-8 radius-lg bg-primary/10 flex items-center justify-center shrink-0">
 <Database className="h-4 w-4 text-primary" />
 </div>
 <div>
 <DialogTitle className="text-body-sm font-semibold text-foreground">Import Sync History</DialogTitle>
 <DialogDescription className="text-caption text-muted-foreground/60 mt-space-0.5">
 Historical logs of all website ingestion runs. Click a row to view pages.
 </DialogDescription>
 </div>
 </div>
 </div>

 <ScrollArea className="flex-1 min-h-0 p-space-5" horizontal={false}>
 {historyList.length === 0 ? (
 <div className="flex flex-col items-center justify-center p-space-12 text-center select-none h-full">
 <h4 className="text-body-sm font-semibold text-foreground leading-none">No crawling logs yet</h4>
 <p className="text-caption text-muted-foreground/60 mt-space-1.5 leading-normal">
 Any future website ingestions will show up here.
 </p>
 </div>
 ) : (
 <div className="border border-[hsl(var(--foreground)/0.08)] radius-lg overflow-hidden bg-background">
 <NativeTable className="w-full text-left border-collapse text-caption">
 <thead>
 <tr className="border-b border-[hsl(var(--foreground)/0.08)] text-caption font-semibold text-muted-foreground bg-[hsl(var(--foreground)/0.005)] uppercase tracking-wider select-none">
 <th className="p-space-3 px-space-4">Target Website</th>
 <th className="p-space-3 w-28">Status</th>
 <th className="p-space-3 w-28 text-center">Pages</th>
 <th className="p-space-3 w-32 text-right pr-space-4">Date</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[hsl(var(--foreground)/0.05)]">
 {historyList.slice().reverse().map((item: any) => {
 const duration = item.metadata?.durationMs;
 return (
 <tr
 key={item.id}
 onClick={() => setSelectedHistoryItem(item)}
 className="hover:bg-[hsl(var(--foreground)/0.015)] transition-all duration-150 cursor-pointer"
 >
 <td className="p-space-3 px-space-4">
 <span className="text-foreground font-semibold block truncate max-w-xs">{item.url}</span>
 {item.errorMessage && (
 <span className="text-caption text-rose-500 font-medium block mt-space-0.5 truncate max-w-xs">
 {item.errorMessage}
 </span>
 )}
 {duration && (
 <span className="text-caption text-muted-foreground/50 block">
 Duration: {(duration / 1000).toFixed(1)}s
 </span>
 )}
 </td>
 <td className="p-space-3">
 <span className={cn(
 "inline-flex text-caption font-medium border px-space-1.5 py-space-0.5 radius-full uppercase tracking-wider",
 item.status === "completed" && "bg-emerald-500/8 border-emerald-500/15 text-emerald-500",
 item.status === "failed" && "bg-rose-500/8 border-rose-500/15 text-rose-500",
 !["completed", "failed"].includes(item.status) && "bg-secondary text-muted-foreground border-border"
 )}>
 {item.status}
 </span>
 </td>
 <td className="p-space-3 text-center font-mono text-caption">{item.pagesScraped} / {item.pagesFound}</td>
 <td className="p-space-3 text-right pr-space-4 text-muted-foreground text-caption">
 {new Date(item.createdAt).toLocaleDateString()}
 </td>
 </tr>
 );
 })}
 </tbody>
 </NativeTable>
 </div>
 )}
 </ScrollArea>

 <div className="px-space-5 pb-space-5 pt-space-3 border-t border-[hsl(var(--foreground)/0.05)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex justify-end">
 <Button onClick={() => setImportHistoryOpen(false)} className="h-9 text-caption font-semibold px-space-4 cursor-pointer radius-lg">
 Close History
 </Button>
 </div>
 </div>
 )}
 </DialogContent>
 </Dialog>

 </div>
 );
}
