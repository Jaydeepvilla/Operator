"use client";import { Badge } from "@/components/shared/badge";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Loader2, Check } from "lucide-react";
import { Button } from "@/components/shared/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shared/card";
import { Input } from "@/components/shared/input";
import { Label } from "@/components/shared/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shared/select";
import { TIMEZONES } from "@/lib/constants";
import { onboardingStep2Schema, onboardingStep3Schema } from "@/lib/validators";
import { updateOrganizationSettingsAction } from "@/server/actions/settings";
import { useToast } from "@/components/shared/toast";
import { z } from "zod";

const settingsSchema = onboardingStep2Schema.merge(onboardingStep3Schema);
type SettingsInput = z.infer<typeof settingsSchema>;

interface SettingsFormProps {
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
}

export function SettingsForm({ organization }: SettingsFormProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const toast = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: organization.name || "",
      website: organization.website || "",
      email: organization.email || "",
      phone: organization.phone || "",
      address: organization.address || "",
      timezone: organization.timezone || "UTC"
    }
  });

  const onSubmit = async (data: SettingsInput) => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    const res = await updateOrganizationSettingsAction({
      name: data.name,
      website: data.website,
      email: data.email,
      phone: data.phone,
      address: data.address,
      timezone: data.timezone,
    });

    setIsSaving(false);

    if (res.success) {
      setSaveSuccess(true);
      toast.success("Settings saved", "Business details have been updated.");
      setTimeout(() => setSaveSuccess(false), 4000);
    } else {
      setSaveError(res.error || "Failed to update business settings");
      toast.error("Failed to save", res.error || "Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-space-6">
      <Card className="border-border/60 bg-card/30 backdrop-blur-xs">
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>
            Update your business details, phone number, and support email coordinates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-space-4">
          {saveSuccess &&
          <Badge variant="success">
              <Check className="h-4 w-4" /> Workspace configurations updated successfully.
            </Badge>
          }

          <div className="grid gap-space-4 sm:grid-cols-2">
            <div className="space-y-space-2">
              <Label htmlFor="name">Business Name</Label>
              <Input id="name" {...register("name")} />
              {errors.name &&
              <p className="text-caption text-destructive ">{errors.name.message}</p>
              }
            </div>

            <div className="space-y-space-2">
              <Label htmlFor="industry">Industry (Non-Editable)</Label>
              <Input id="industry" value={organization.industry} disabled className="bg-muted/50 cursor-not-allowed opacity-80" />
            </div>

            <div className="space-y-space-2">
              <Label htmlFor="website">Website URL</Label>
              <Input id="website" {...register("website")} />
              {errors.website &&
              <p className="text-caption text-destructive ">{errors.website.message}</p>
              }
            </div>

            <div className="space-y-space-2">
              <Label htmlFor="email">Business Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email &&
              <p className="text-caption text-destructive ">{errors.email.message}</p>
              }
            </div>

            <div className="space-y-space-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" {...register("phone")} />
              {errors.phone &&
              <p className="text-caption text-destructive ">{errors.phone.message}</p>
              }
            </div>

            <div className="space-y-space-2">
              <Label htmlFor="slug">Workspace URL Identifier (Slug)</Label>
              <Input id="slug" value={organization.slug} disabled className="bg-muted/50 cursor-not-allowed opacity-80" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/30 backdrop-blur-xs">
        <CardHeader>
          <CardTitle>Location & Timezone</CardTitle>
          <CardDescription>
            Configures where your storefront resides and adjusts call appointment hour schedules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-space-4">
          <div className="space-y-space-2">
            <Label htmlFor="address">Business Address</Label>
            <Input id="address" {...register("address")} />
            {errors.address &&
            <p className="text-caption text-destructive ">{errors.address.message}</p>
            }
          </div>

          <div className="space-y-space-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              defaultValue={organization.timezone}
              onValueChange={(val) => setValue("timezone", val, { shouldValidate: true })}>
              
              <SelectTrigger>
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
            {errors.timezone &&
            <p className="text-caption text-destructive ">{errors.timezone.message}</p>
            }
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t border-border/20 pt-space-6">
          <Button type="submit" disabled={isSaving}>
            {isSaving ?
            <>
                <Loader2 className="mr-space-2 h-4 w-4 animate-spin" /> Saving...
              </> :

            <>
                <Save className="mr-space-2 h-4 w-4" /> Save Changes
              </>
            }
          </Button>
        </CardFooter>
      </Card>
    </form>);

}