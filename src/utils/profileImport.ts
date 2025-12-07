import { supabase } from "@/lib/supabase";

export interface ScannedProfileData {
  name: string;
  role: "frame" | "sash" | "mullion" | "transom";
  material: "aluminum" | "upvc" | "wood";
  specifications: any;
}

const PROFILE_BUCKET = "profile-thumbnails";

export async function saveScannedProfile(
  profileData: ScannedProfileData,
  userId: string,
): Promise<string> {
  // Create profile record
  const { data: profile, error: profileError } = await supabase
    .from("fabricator_profiles")
    .insert({
      user_id: userId,
      name: profileData.name,
      role: profileData.role,
      material: profileData.material,
      specifications: profileData.specifications,
      source: "smartscan",
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (profileError || !profile) {
    throw profileError || new Error("Failed to create profile record");
  }

  // Upload thumbnail if geometry is present
  const geom = profileData.specifications?.geometry_config;
  if (geom?.svg_path && geom?.view_box) {
    const svgContent = generateProfileSVG(geom.svg_path, geom.view_box);
    const thumbnailUrl = await uploadProfileThumbnail(svgContent, profile.id, userId);

    await supabase
      .from("fabricator_profiles")
      .update({ thumbnail_url: thumbnailUrl })
      .eq("id", profile.id)
      .eq("user_id", userId);
  }

  return profile.id as string;
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
  const blob = new Blob([svgContent], { type: "image/svg+xml" });
  const file = new File([blob], `${profileId}.svg`, { type: "image/svg+xml" });

  const { error } = await supabase.storage
    .from(PROFILE_BUCKET)
    .upload(`${userId}/${profileId}.svg`, file, { cacheControl: "3600", upsert: true });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from(PROFILE_BUCKET)
    .getPublicUrl(`${userId}/${profileId}.svg`);

  return urlData.publicUrl;
}

