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
}export async function requestTeamAccess(teamId: string) {
  const { supabase, user, membership } = await requireMembership();

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, organization_id")
    .eq("id", teamId)
    .eq("organization_id", membership.organization_id)
    .single();

  if (teamError || !team) {
    throw new Error("Team not found.");
  }

  const { data: existingMembership, error: membershipError } =
    await supabase
      .from("team_memberships")
      .select("id, role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (existingMembership) {
    throw new Error(
      `You already have ${existingMembership.role} access to this team.`
    );
  }

  const { data: pendingRequest, error: requestCheckError } = await supabase
    .from("team_access_requests")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (requestCheckError) {
    throw new Error(requestCheckError.message);
  }

  if (pendingRequest) {
    throw new Error("Your access request is already pending.");
  }

  const { error } = await supabase
    .from("team_access_requests")
    .insert({
      team_id: teamId,
      user_id: user.id,
      status: "pending",
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/teams/${teamId}`);
  revalidatePath("/dashboard/teams");
}
