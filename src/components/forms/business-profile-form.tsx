"use client";import { Badge } from "@/components/shared/badge";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Save,
  Loader2,
  Check,
  Globe,
  Mail,
  Phone,
  MapPin,
  Clock,
  Star,
  Building,
  Briefcase,
  Share2,
  FileText } from
"lucide-react";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/shared/select";
import { TIMEZONES } from "@/lib/constants";
import { onboardingStep2Schema, onboardingStep3Schema } from "@/lib/validators";
import { updateBusinessProfileAction } from "@/server/actions/profile";
import { z } from "zod";
import { NativeTextarea } from "@/components/shared/native";

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
 <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
 </svg>;


const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
 <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
 </svg>;


const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
 <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
 <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
 <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
 </svg>;


const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
 <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
 <rect x="2" y="9" width="4" height="12" />
 <circle cx="4" cy="4" r="2" />
 </svg>;


const profileSchema = onboardingStep2Schema.
merge(onboardingStep3Schema).
extend({
  description: z.string().min(10, "Please write a profile description (min 10 chars)"),
  googleBusinessUrl: z.string().url("Please enter a valid Google Business URL").or(z.string().length(0)),
  reviewUrl: z.string().url("Please enter a valid review URL").or(z.string().length(0)),
  facebook: z.string().or(z.string().length(0)),
  twitter: z.string().or(z.string().length(0)),
  instagram: z.string().or(z.string().length(0)),
  linkedin: z.string().or(z.string().length(0))
});

type ProfileInput = z.infer<typeof profileSchema>;

interface BusinessProfileFormProps {
  organization: {
    id: string;
    name: string;
    slug: string;
    industry: string;
    website: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    timezone: string;
  };
  profile: {
    description: string | null;
    googleBusinessUrl: string | null;
    reviewUrl: string | null;
    socialLinks: any;
  } | null;
}

export function BusinessProfileForm({ organization, profile }: BusinessProfileFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: organization.name || "",
      website: organization.website || "",
      email: organization.email || "",
      phone: organization.phone || "",
      address: organization.address || "",
      timezone: organization.timezone || "UTC",
      description: profile?.description || "",
      googleBusinessUrl: profile?.googleBusinessUrl || "",
      reviewUrl: profile?.reviewUrl || "",
      facebook: profile?.socialLinks?.facebook || "",
      twitter: profile?.socialLinks?.twitter || "",
      instagram: profile?.socialLinks?.instagram || "",
      linkedin: profile?.socialLinks?.linkedin || ""
    }
  });

  const onSubmit = async (data: ProfileInput) => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const response = await updateBusinessProfileAction({
        name: data.name,
        website: data.website,
        email: data.email,
        phone: data.phone,
        address: data.address,
        timezone: data.timezone,
        description: data.description,
        googleBusinessUrl: data.googleBusinessUrl,
        reviewUrl: data.reviewUrl,
        socialLinks: {
          facebook: data.facebook,
          twitter: data.twitter,
          instagram: data.instagram,
          linkedin: data.linkedin
        }
      });

      if (response.success) {
        setSaveSuccess(true);
        router.refresh();
        router.push("/dashboard");
      } else {
        setSaveError(response.error || "Failed to save configurations");
      }
    } catch (err: any) {
      setSaveError(err?.message || "An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-space-4 w-full">
 {saveSuccess &&
      <Badge variant="success" className="animate-fade-in">
 <Check className="h-4 w-4 shrink-0 text-emerald-500" /> Business profile updated successfully.
 </Badge>
      }

 {saveError &&
      <Badge variant="destructive" className="animate-fade-in">
 {saveError}
 </Badge>
      }

 {/* Panel 1: Business Profile Info */}
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
 <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex items-center gap-space-3">
 <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
 <Building className="h-4 w-4 text-primary" />
 </div>
 <div>
 <h4 className="text-caption font-semibold text-foreground">Business Profile Info</h4>
 <p className="text-caption text-muted-foreground/65 mt-space-0.5">
 Core brand details used by Operator to understand your business context.
 </p>
 </div>
 </div>

 <div className="p-space-5 space-y-space-4 bg-[hsl(var(--foreground)/0.002)]">
 <div className="space-y-space-1.5">
 <Label htmlFor="name" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Business Name</Label>
 <div className="relative">
 <Building className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10" />
 <Input
                id="name"
                {...register("name")}
                className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9" />
              
 </div>
 {errors.name &&
            <p className="text-caption text-rose-500 font-semibold">{errors.name.message}</p>
            }
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="description" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Business Bio / Description</Label>
 <div className="relative">
 <FileText className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10 pointer-events-none" />
 <NativeTextarea
                id="description"
                rows={4}
                placeholder="Provide a detailed description of your business, services, hours, policies..."
                className="w-full radius-md border border-[hsl(var(--foreground)/0.08)] bg-background p-space-3 pl-space-9 text-caption placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground resize-none leading-relaxed min-h-28"
                {...register("description")} />
              
 </div>
 {errors.description &&
            <p className="text-caption text-rose-500 font-semibold">{errors.description.message}</p>
            }
 </div>

 <div className="grid gap-space-4 sm:grid-cols-2 lg:grid-cols-3">
 <div className="space-y-space-1.5">
 <Label htmlFor="email" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Support/Contact Email</Label>
 <div className="relative">
 <Mail className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10" />
 <Input
                  id="email"
                  type="email"
                  className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9"
                  {...register("email")} />
                
 </div>
 {errors.email &&
              <p className="text-caption text-rose-500 font-semibold">{errors.email.message}</p>
              }
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="phone" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Contact Phone Number</Label>
 <div className="relative">
 <Phone className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10" />
 <Input
                  id="phone"
                  className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9"
                  {...register("phone")} />
                
 </div>
 {errors.phone &&
              <p className="text-caption text-rose-500 font-semibold">{errors.phone.message}</p>
              }
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="website" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Website Link</Label>
 <div className="relative">
 <Globe className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10" />
 <Input
                  id="website"
                  className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9"
                  {...register("website")} />
                
 </div>
 {errors.website &&
              <p className="text-caption text-rose-500 font-semibold">{errors.website.message}</p>
              }
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="address" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Physical Location Address</Label>
 <div className="relative">
 <MapPin className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10" />
 <Input
                  id="address"
                  className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9"
                  {...register("address")} />
                
 </div>
 {errors.address &&
              <p className="text-caption text-rose-500 font-semibold">{errors.address.message}</p>
              }
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="timezone" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Timezone</Label>
 <div className="relative">
 <Clock className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10 pointer-events-none" />
 <Select
                  defaultValue={watch("timezone")}
                  onValueChange={(val) => setValue("timezone", val, { shouldValidate: true })}>
                  
 <SelectTrigger className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] pl-space-9">
 <SelectValue placeholder="Select timezone" />
 </SelectTrigger>
 <SelectContent>
 {TIMEZONES.map((tz) =>
                    <SelectItem key={tz.value} value={tz.value}>
 {tz.label}
 </SelectItem>
                    )}
 </SelectContent>
 </Select>
 </div>
 {errors.timezone &&
              <p className="text-caption text-rose-500 font-semibold">{errors.timezone.message}</p>
              }
 </div>

 <div className="space-y-space-1.5">
 <Label className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Industry Sector</Label>
 <div className="relative">
 <Briefcase className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/40 z-10" />
 <Input
                  value={organization.industry}
                  disabled
                  className="h-9.5 text-caption bg-[hsl(var(--foreground)/0.02)] border-[hsl(var(--foreground)/0.06)] opacity-70 text-muted-foreground cursor-not-allowed pl-space-9 font-medium" />
                
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Panel 2: Google Maps & Review Settings */}
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
 <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex items-center gap-space-3">
 <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
 <Star className="h-4 w-4 text-primary" />
 </div>
 <div>
 <h4 className="text-caption font-semibold text-foreground">Google Maps & Review Settings</h4>
 <p className="text-caption text-muted-foreground/65 mt-space-0.5">
 Configure review links so Operator AI can send links to satisfied callers.
 </p>
 </div>
 </div>

 <div className="p-space-5 bg-[hsl(var(--foreground)/0.002)]">
 <div className="grid gap-space-4 sm:grid-cols-2 lg:grid-cols-3">
 <div className="space-y-space-1.5">
 <Label htmlFor="googleBusinessUrl" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Google Maps / Business Link</Label>
 <div className="relative">
 <MapPin className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10" />
 <Input
                  id="googleBusinessUrl"
                  className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9"
                  {...register("googleBusinessUrl")} />
                
 </div>
 {errors.googleBusinessUrl &&
              <p className="text-caption text-rose-500 font-semibold">{errors.googleBusinessUrl.message}</p>
              }
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="reviewUrl" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Google Review Submission Link</Label>
 <div className="relative">
 <Star className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10" />
 <Input
                  id="reviewUrl"
                  className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9"
                  {...register("reviewUrl")} />
                
 </div>
 {errors.reviewUrl &&
              <p className="text-caption text-rose-500 font-semibold">{errors.reviewUrl.message}</p>
              }
 </div>
 </div>
 </div>
 </div>

 {/* Panel 3: Social Links */}
 <div className="bg-card border border-[hsl(var(--foreground)/0.06)] radius-xl overflow-hidden soft-">
 <div className="p-space-4 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] shrink-0 flex items-center gap-space-3">
 <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
 <Share2 className="h-4 w-4 text-primary" />
 </div>
 <div>
 <h4 className="text-caption font-semibold text-foreground">Social Profile Coordinates</h4>
 <p className="text-caption text-muted-foreground/65 mt-space-0.5">
 Help Operator AI answer user questions about your official social handles.
 </p>
 </div>
 </div>

 <div className="p-space-5 grid gap-space-4 sm:grid-cols-2 lg:grid-cols-3 bg-[hsl(var(--foreground)/0.002)]">
 <div className="space-y-space-1.5">
 <Label htmlFor="facebook" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Facebook URL</Label>
 <div className="relative">
 <FacebookIcon className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10" />
 <Input
                id="facebook"
                placeholder="https://facebook.com/mybusiness"
                className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9"
                {...register("facebook")} />
              
 </div>
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="twitter" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Twitter / X URL</Label>
 <div className="relative">
 <TwitterIcon className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10" />
 <Input
                id="twitter"
                placeholder="https://x.com/mybusiness"
                className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9"
                {...register("twitter")} />
              
 </div>
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="instagram" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">Instagram URL</Label>
 <div className="relative">
 <InstagramIcon className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10" />
 <Input
                id="instagram"
                placeholder="https://instagram.com/mybusiness"
                className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9"
                {...register("instagram")} />
              
 </div>
 </div>

 <div className="space-y-space-1.5">
 <Label htmlFor="linkedin" className="text-caption uppercase tracking-wider font-semibold text-muted-foreground/75">LinkedIn Page URL</Label>
 <div className="relative">
 <LinkedinIcon className="absolute left-space-3 top-space-3 h-3.5 w-3.5 text-muted-foreground/50 z-10" />
 <Input
                id="linkedin"
                placeholder="https://linkedin.com/company/mybusiness"
                className="h-9.5 text-caption bg-background border-[hsl(var(--foreground)/0.08)] focus-visible:ring-primary/20 pl-space-9"
                {...register("linkedin")} />
              
 </div>
 </div>
 </div>

 <div className="px-space-5 py-space-4 border-t border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.005)] flex justify-end">
 <Button type="submit" disabled={isSaving} className="text-caption text-white gap-space-1.5 px-space-5">
 {isSaving ?
            <>
 <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving Profiles...
 </> :

            <>
 <Save className="h-3.5 w-3.5" /> Save Business Profile
 </>
            }
 </Button>
 </div>
 </div>
 </form>);

}