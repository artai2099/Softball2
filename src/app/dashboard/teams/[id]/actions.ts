"use server";

import { revalidatePath } from "next/cache";
import { requireMembership } from "@/lib/auth";

export async function addPlayer(
  teamId: string,
  formData: FormData
) {
  const { supabase, membership } = await requireMembership();

  const { data: canEdit, error: permissionError } =
    await supabase.rpc("can_manage_team", {
      p_team_id: teamId,
    });

  if (permissionError || !canEdit) {
    throw new Error("You do not have permission to edit this roster.");
  }

  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .eq("organization_id", membership.organization_id)
    .single();

  if (!team) {
    throw new Error("Team not found.");
  }

  const firstName = String(
    formData.get("firstName") || ""
  ).trim();

  const lastName = String(
    formData.get("lastName") || ""
  ).trim();

  const jerseyNumber = Number(
    formData.get("jerseyNumber")
  );

  const position = String(
    formData.get("position") || ""
  ).trim();

  if (!firstName || !lastName || !Number.isInteger(jerseyNumber)) {
    throw new Error("Valid player information is required.");
  }

  const { error } = await supabase
    .from("players")
    .insert({
      team_id: teamId,
      first_name: firstName,
      last_name: lastName,
      jersey_number: jerseyNumber,
      position,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/teams/${teamId}`);
}
