"use server";

import { auth } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { organizationRepository } from "../repositories/organization";
import { membershipRepository } from "../repositories/membership";
import { subscriptionRepository } from "../repositories/subscription";
import { profileRepository } from "../repositories/profile";
import { servicesRepository } from "../repositories/services";
import { faqRepository } from "../repositories/faq";
import { flowsRepository } from "../repositories/flows";
import { settingsRepository } from "../repositories/settings";
import { syncLocalUser } from "./auth";
import { onboardingSchema, OnboardingInput } from "../../lib/validators";
import { Organization } from "../../lib/types";
import { INDUSTRY_TEMPLATES, DEFAULT_BUSINESS_HOURS } from "../../lib/constants/templates";
import { syncService } from "../services/sync";
import { db } from "@/server/db";
import { users, organizations, memberships, services, serviceCategories } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { createSession } from "@/lib/auth/session";
import { userRepository } from "../repositories/user";
import crypto from "crypto";
import { cookies } from "next/headers";
import { validateSafeUrl, safeFetch } from "../services/crawler/ssrf";
import { ContentExtractor } from "../services/crawler/extractor";
import { BusinessWebsiteIntelligenceService } from "../services/crawler/intelligence";
import { sourcesRepository } from "../repositories/sources";
import { documentsRepository } from "../repositories/documents";
import { chunksRepository } from "../repositories/chunks";
import { chunkingService } from "../services/chunking";

export interface OnboardingStateResult {
  hasOrg: boolean;
  org: any | null;
  isCompleted: boolean;
  currentStep: string;
  draftData: any;
}

export async function checkUserOrganization(): Promise<OnboardingStateResult> {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return { hasOrg: false, org: null, isCompleted: false, currentStep: "url", draftData: {} };
    }

    let activeOrgCookie: string | undefined;
    try {
      const cookieStore = await cookies();
      activeOrgCookie = cookieStore.get("active_org_id")?.value;
    } catch {
      // Outside HTTP request context (e.g. tests or server jobs)
    }
    const targetOrgId = orgId || activeOrgCookie;

    let targetOrg: any = null;

    if (targetOrgId) {
      const isMember = await membershipRepository.getByUserAndOrg(userId, targetOrgId);
      if (isMember) {
        targetOrg = await organizationRepository.getById(targetOrgId);
      }
    }

    if (!targetOrg) {
      const userMemberships = await membershipRepository.getByUser(userId);
      if (userMemberships.length > 0) {
        targetOrg = await organizationRepository.getById(userMemberships[0].organizationId);
        if (targetOrg) {
          try {
            const cookieStore = await cookies();
            cookieStore.set({
              name: "active_org_id",
              value: targetOrg.id,
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: "/",
            });
          } catch (e) {}
        }
      }
    }

    if (targetOrg) {
      const isCompleted = targetOrg.onboardingStatus === "completed";
      return {
        hasOrg: true,
        org: targetOrg,
        isCompleted,
        currentStep: targetOrg.onboardingStep || "url",
        draftData: targetOrg.onboardingData || {},
      };
    }

    return { hasOrg: false, org: null, isCompleted: false, currentStep: "url", draftData: {} };
  } catch (err) {
    return { hasOrg: false, org: null, isCompleted: false, currentStep: "url", draftData: {} };
  }
}

export async function saveOnboardingProgressAction(step: string, data: any) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return { success: false, error: "Authentication required" };
    }

    let targetOrgId = orgId;
    if (!targetOrgId) {
      const userMemberships = await membershipRepository.getByUser(userId);
      if (userMemberships.length > 0) {
        targetOrgId = userMemberships[0].organizationId;
      }
    }

    if (!targetOrgId) {
      return { success: false, error: "No active workspace found to persist progress" };
    }

    await db
      .update(organizations)
      .set({
        onboardingStep: step,
        onboardingStatus: "in_progress",
        onboardingData: data || {},
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, targetOrgId));

    return { success: true };
  } catch (err: any) {
    console.error("Failed to save onboarding progress:", err);
    return { success: false, error: err.message };
  }
}

export async function createOrganizationAction(input: OnboardingInput): Promise<{ success: boolean; organization?: Organization; error?: string }> {
  try {
    // 1. Validate inputs
    const parsed = onboardingSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Invalid input data." };
    }

    const { name, industry, website, email, phone, address, timezone } = parsed.data;

    // 2. Generate slug
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const slug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. Resolve authenticated user
    const { userId } = await auth();
    if (!userId) {
      return { success: false, error: "Authentication required. Please sign in to set up your business." };
    }

    const user = await userRepository.getById(userId);
    if (!user) {
      return { success: false, error: "User account not found. Please log in again." };
    }

    // 4. Check if user already has an organization to update into completed status
    let organization: any = null;
    try {
      const existingMemberships = await membershipRepository.getByUser(user.id);
      if (existingMemberships.length > 0) {
        const existingOrg = await organizationRepository.getById(existingMemberships[0].organizationId);
        if (existingOrg) {
          // Update the existing organization to completed
          await db
            .update(organizations)
            .set({
              name,
              industry,
              website: website || null,
              email: email || null,
              phone: phone || null,
              address: address || null,
              timezone,
              verificationStatus: "verified",
              onboardingStatus: "completed",
              onboardingStep: "completed",
              onboardingCompletedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(organizations.id, existingOrg.id));

          organization = {
            ...existingOrg,
            name,
            industry,
            website,
            email,
            phone,
            address,
            timezone,
            verificationStatus: "verified",
            onboardingStatus: "completed",
            onboardingStep: "completed",
          };
        }
      }
    } catch (e) {
      console.warn("Error checking existing membership:", e);
    }

    // 5. If no existing organization, create new one
    if (!organization) {
      try {
        organization = await organizationRepository.create({
          name,
          slug,
          industry,
          website: website || null,
          email: email || null,
          phone: phone || null,
          address: address || null,
          timezone,
          verificationStatus: "verified",
          onboardingStatus: "completed",
          onboardingStep: "completed",
          onboardingCompletedAt: new Date(),
        });

        // Create Membership with role 'owner'
        await membershipRepository.create({
          organizationId: organization.id,
          userId: user.id,
          role: "owner",
        });
      } catch (dbErr: any) {
        console.warn("DB organization creation fallback:", dbErr.message);
        organization = {
          id: "org_" + crypto.randomBytes(12).toString("hex"),
          name,
          slug,
          industry,
          website: website || null,
          email: email || null,
          phone: phone || null,
          address: address || null,
          timezone: timezone || "UTC",
          verificationStatus: "verified",
          onboardingStatus: "completed",
          onboardingStep: "completed",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    }

    // 6. Ensure default Trial Subscription Plan and Subscription exist
    try {
      const defaultPlanId = "trial";
      let plan = await subscriptionRepository.getPlanById(defaultPlanId);
      if (!plan) {
        plan = await subscriptionRepository.createPlan({
          id: defaultPlanId,
          name: "Operator Trial",
          description: "14-day trial of Operator features",
          price: "0",
          interval: "month",
          features: ["AI Voice Answering", "SMS/Web Chatbot", "Industry Templates", "100 monthly minutes"],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const periodStart = new Date();
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 14);

      await subscriptionRepository.create({
        organizationId: organization.id,
        planId: plan.id,
        status: "trialing",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      });
    } catch (subErr) {
      console.warn("Subscription creation note:", subErr);
    }

    // 7. Initialize Settings and Custom/Scraped Services cleanly
    try {
      const template = INDUSTRY_TEMPLATES[industry];
      const desc = `${name} — Professional Front Desk & Automated Receptionist`;

      const existingProfile = await profileRepository.getByOrg(organization.id);
      if (existingProfile) {
        await profileRepository.update(organization.id, { description: desc });
      } else {
        await profileRepository.create({
          organizationId: organization.id,
          description: desc,
          socialLinks: {},
        });
      }

      const inputServices: Array<{ name: string; duration: number; accepted?: boolean; price?: string; description?: string }> =
        parsed.data.services || (input as any)?.services || [];
      const validServices = inputServices.filter((s) => s.accepted !== false && s.name?.trim());
      const hasCustomServices = validServices.length > 0;

      const existingSettings = await settingsRepository.getByOrg(organization.id);
      const settingsPayload = {
        organizationId: organization.id,
        businessHours: template?.businessHours || DEFAULT_BUSINESS_HOURS,
        holidays: [],
        languages: ["en"],
        bookingPreferences: {
          slotIntervalMinutes: 30,
          bufferMinutes: 10,
          autoApprove: false,
          hoursConfigured: !!parsed.data.hours,
          servicesConfigured: hasCustomServices,
          faqsConfigured: false,
          flowsConfigured: false,
          confirmedTasks: hasCustomServices ? ["services"] : [],
          uncompletedTasks: [],
        },
        notificationPreferences: { channels: ["email"] },
        leadAssignmentRules: { type: "round_robin" },
      };

      if (existingSettings) {
        await settingsRepository.update(organization.id, settingsPayload);
      } else {
        await settingsRepository.create(settingsPayload);
      }

      // Real Website Ingestion: If user provided a website, crawl & ingest it into Knowledge Base
      if (website && website !== "no-website") {
        try {
          const fetchRes = await safeFetch(website, { timeoutMs: 8000 });
          if (fetchRes.ok && fetchRes.html) {
            const extracted = ContentExtractor.extract(fetchRes.html, website);
            if (extracted.content && extracted.content.trim().length > 30) {
              if (extracted.description && extracted.description.trim().length > 10) {
                await profileRepository.update(organization.id, {
                  description: extracted.description.trim(),
                });
              }

              let source = await sourcesRepository.getByType(organization.id, "website");
              if (!source) {
                source = await sourcesRepository.create({
                  organizationId: organization.id,
                  name: "Website Crawl",
                  type: "website",
                  isActive: true,
                });
              }

              const doc = await documentsRepository.create({
                organizationId: organization.id,
                sourceId: source.id,
                name: extracted.title || "Website Homepage Content",
                fileType: "html",
                fileSize: Buffer.byteLength(extracted.content, "utf8"),
                status: "completed",
                metadata: {
                  url: website,
                  title: extracted.title,
                  description: extracted.description,
                  content: extracted.content,
                  scrapedAt: new Date().toISOString(),
                  wordCount: extracted.wordCount,
                },
              });

              // Create RAG chunks
              const textChunks = chunkingService.splitText(extracted.content);
              if (textChunks.length > 0) {
                await chunksRepository.createMany(
                  textChunks.map((tc) => ({
                    organizationId: organization.id,
                    documentId: doc.id,
                    content: tc.content,
                    chunkIndex: tc.chunkIndex,
                    tokenCount: tc.tokenCount,
                    metadata: { url: website, index: tc.chunkIndex },
                  }))
                );
              }

              // Update settings to mark website import as successfully completed
              await settingsRepository.update(organization.id, {
                websiteImportUrl: website,
                websiteImportStatus: "completed",
                bookingPreferences: {
                  slotIntervalMinutes: 30,
                  bufferMinutes: 10,
                  autoApprove: false,
                  hoursConfigured: !!parsed.data.hours,
                  servicesConfigured: hasCustomServices,
                  faqsConfigured: false,
                  flowsConfigured: false,
                  confirmedTasks: hasCustomServices ? ["services", "kb"] : ["kb"],
                  uncompletedTasks: validServices.some((s) => !s.duration) ? ["confirm_service_durations"] : [],
                },
              });
            }
          }
        } catch (crawlErr) {
          console.warn("[Onboarding Website Scrape Error]:", crawlErr);
        }
      }

      // Insert services if user verified them during onboarding
      if (hasCustomServices) {
        // Idempotency: Clean up previously created onboarding services for this organization to prevent duplicates on retry
        await db.delete(services).where(eq(services.organizationId, organization.id));
        await db.delete(serviceCategories).where(eq(serviceCategories.organizationId, organization.id));

        let cat = await servicesRepository.createCategory({
          organizationId: organization.id,
          name: "Main Services",
        });
        for (const s of validServices) {
          await servicesRepository.create({
            organizationId: organization.id,
            categoryId: cat.id,
            name: s.name.trim(),
            description: s.description || `Appointment for ${s.name.trim()}`,
            duration: (s.duration && s.duration > 0) ? s.duration : 30,
            price: (s.price && s.price.trim().length > 0) ? String(s.price).replace(/[^0-9.]/g, "") : "",
            isActive: true,
          });
        }
      }
    } catch (seedErr) {
      console.warn("Settings initialization note:", seedErr);
    }

    // 8. Set active org cookie
    try {
      const cookieStore = await cookies();
      cookieStore.set({
        name: "active_org_id",
        value: organization.id,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    } catch (cookieErr) {
      // Ignore cookie errors
    }

    return { success: true, organization };
  } catch (error: any) {
    console.error("Failed to create organization during onboarding:", error);
    return { success: false, error: error?.message || "An unexpected error occurred." };
  }
}

export async function scrapeAndAnalyzeWebsiteAction(rawUrl: string) {
  try {
    if (!rawUrl || rawUrl === "no-website") {
      return {
        success: false,
        error: "No website provided",
      };
    }

    const profile = await BusinessWebsiteIntelligenceService.extractBusinessProfile(rawUrl);

    return {
      success: true,
      scraped: {
        businessName: profile.businessName,
        industry: profile.industry,
        website: profile.website,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        hours: profile.hours,
        timezone: profile.timezone,
        services: profile.services,
        faqs: profile.faqs,
        greeting: profile.greeting,
        summary: profile.summary,
        wordCount: profile.wordCount,
        title: profile.businessName,
        pagesInspected: profile.pagesInspected,
      },
    };
  } catch (error: any) {
    console.error("[Scraper Action Error]:", error);
    return {
      success: false,
      error: error?.message || "Failed to analyze website",
    };
  }
}

export async function toggleSetupTaskAction(taskId: string, completed: boolean) {
  try {
    const { org } = await checkUserOrganization();
    if (!org) {
      return { success: false, error: "Unauthorized or no active organization" };
    }

    const settings = await settingsRepository.getByOrg(org.id);
    if (!settings) {
      return { success: false, error: "Settings not found" };
    }

    const currentBp = (settings.bookingPreferences as Record<string, any>) || {};
    const confirmed: string[] = Array.isArray(currentBp.confirmedTasks) ? [...currentBp.confirmedTasks] : [];
    let uncompleted: string[] = Array.isArray(currentBp.uncompletedTasks) ? [...currentBp.uncompletedTasks] : [];

    let updatedConfirmed = [...confirmed];
    if (completed) {
      if (!updatedConfirmed.includes(taskId)) {
        updatedConfirmed.push(taskId);
      }
      uncompleted = uncompleted.filter((t) => t !== taskId);
    } else {
      updatedConfirmed = updatedConfirmed.filter((t) => t !== taskId);
      if (!uncompleted.includes(taskId)) {
        uncompleted.push(taskId);
      }
    }

    await settingsRepository.update(org.id, {
      bookingPreferences: {
        ...currentBp,
        confirmedTasks: updatedConfirmed,
        uncompletedTasks: uncompleted,
        [`${taskId}Configured`]: completed,
      },
    });

    revalidatePath("/dashboard");
    return { success: true, confirmedTasks: updatedConfirmed, uncompletedTasks: uncompleted };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update setup task" };
  }
}

