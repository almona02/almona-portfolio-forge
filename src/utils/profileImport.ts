import { supabase } from "@/lib/supabase";
import type { FabricatorProfileRow } from "@/types/fabricator";

export interface ScannedProfileData {
  name: string;
  role: "frame" | "sash" | "mullion" | "transom";
  material: "aluminum" | "upvc" | "wood";
  specifications: any;
}

interface ProfileInsertData {
  user_id: string;
  name: string;
  role: "frame" | "sash" | "mullion" | "transom";
  material: "aluminum" | "upvc" | "wood";
  specifications: Record<string, any>;
  source: string;
  created_at: string;
}

const PROFILE_BUCKET = "profile-thumbnails";

export async function saveScannedProfile(
  profileData: ScannedProfileData,
  userId: string,
): Promise<string> {
  // Validate input
  if (!userId || !userId.trim()) {
    throw new Error("User ID is required to save profile");
  }
  if (!profileData.name || !profileData.name.trim()) {
    throw new Error("Profile name is required");
  }
  if (!profileData.role) {
    throw new Error("Profile role is required");
  }
  if (!profileData.material) {
    throw new Error("Profile material is required");
  }

  try {
    // Create profile record
    const insertData: ProfileInsertData = {
      user_id: userId,
      name: profileData.name.trim(),
      role: profileData.role,
      material: profileData.material,
      specifications: profileData.specifications,
      source: "smartscan",
      created_at: new Date().toISOString(),
    };

    // Use type assertion for Supabase query (types not fully generated)
    const { data: profile, error: profileError } = await (supabase as any)
      .from("fabricator_profiles")
      .insert(insertData)
      .select()
      .single() as { data: FabricatorProfileRow | null; error: any };

    if (profileError) {
      console.error("Profile creation error:", profileError);
      throw new Error(
        profileError.message || "Failed to create profile record in database"
      );
    }

    if (!profile || !profile.id) {
      throw new Error("Profile created but no ID returned");
    }

    // Upload thumbnail if geometry is present
    const geom = profileData.specifications?.geometry_config;
    if (geom?.svg_path && geom?.view_box) {
      try {
        const svgContent = generateProfileSVG(geom.svg_path, geom.view_box);
        const thumbnailUrl = await uploadProfileThumbnail(svgContent, profile.id, userId);

        // Update profile with thumbnail URL (non-critical, don't fail if this fails)
        const { error: updateError } = await (supabase as any)
          .from("fabricator_profiles")
          .update({ thumbnail_url: thumbnailUrl })
          .eq("id", profile.id)
          .eq("user_id", userId);

        if (updateError) {
          console.warn("Failed to update thumbnail URL:", updateError);
          // Don't throw - profile is saved, thumbnail is optional
        }
      } catch (thumbnailError) {
        console.warn("Thumbnail upload failed:", thumbnailError);
        // Don't throw - profile is saved, thumbnail is optional
      }
    }

    return profile.id;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error saving profile";
    console.error("saveScannedProfile error:", error);
    throw new Error(`Failed to save scanned profile: ${errorMessage}`);
  }
}

function generateProfileSVG(svgPath: string, viewBox: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
  <path d="${svgPath}" fill="#333333" stroke="none"/>
</svg>`;
}

async function uploadProfileThumbnail(
  svgContent: string,
  profileId: string,
  userId: string,
): Promise<string> {
  // Validate inputs
  if (!svgContent || !svgContent.trim()) {
    throw new Error("SVG content is required for thumbnail");
  }
  if (!profileId || !profileId.trim()) {
    throw new Error("Profile ID is required for thumbnail");
  }
  if (!userId || !userId.trim()) {
    throw new Error("User ID is required for thumbnail");
  }

  try {
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const file = new File([blob], `${profileId}.svg`, { type: "image/svg+xml" });

    const { error: uploadError } = await supabase.storage
      .from(PROFILE_BUCKET)
      .upload(`${userId}/${profileId}.svg`, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Thumbnail upload error:", uploadError);
      throw new Error(
        uploadError.message || "Failed to upload profile thumbnail"
      );
    }

    const { data: urlData } = supabase.storage
      .from(PROFILE_BUCKET)
      .getPublicUrl(`${userId}/${profileId}.svg`);

    if (!urlData || !urlData.publicUrl) {
      throw new Error("Failed to get public URL for thumbnail");
    }

    return urlData.publicUrl;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown thumbnail upload error";
    console.error("uploadProfileThumbnail error:", error);
    throw new Error(`Thumbnail upload failed: ${errorMessage}`);
  }
}
