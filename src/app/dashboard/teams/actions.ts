"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMembership } from "@/lib/auth";

export async function createTeam(formData: FormData) {
  const { supabase, membership } = await requireMembership();

  if (!["owner", "admin", "scorekeeper"].includes(membership.role)) {
    throw new Error("You do not have permission to create teams.");
  }

  const name = String(formData.get("name") || "").trim();

  if (!name) {
    throw new Error("Team name is required.");
  }

  const { error } = await supabase.rpc("create_team", {
    p_organization_id: membership.organization_id,
    p_name: name,
    p_short_name: String(formData.get("shortName") || "")
      .trim()
      .slice(0, 8),
    p_city: String(formData.get("city") || "").trim(),
    p_color: String(formData.get("color") || "#0066b2"),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/teams");
  revalidatePath("/dashboard");
}

export async function joinTeam(formData: FormData) {
  const { supabase } = await requireMembership();

  const teamId = String(formData.get("teamId") || "").trim();

  if (!teamId) {
    throw new Error("Team is required.");
  }

  const { error } = await supabase.rpc("join_team", {
    p_team_id: teamId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/teams");
  revalidatePath("/dashboard/teams/find");
  revalidatePath("/dashboard");

  redirect("/dashboard/teams");
}
