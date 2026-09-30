import { notFound } from "next/navigation";
import { ScoringConsole } from "@/components/ScoringConsole";
import { createClient } from "@/lib/supabase/server";
import type { Game, GameEvent } from "@/lib/types";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: game }, { data: events }] = await Promise.all([
    supabase.from("games").select("*").eq("id", id).single(),
    supabase
      .from("game_events")
      .select("*")
      .eq("game_id", id)
      .order("sequence"),
  ]);

  if (!game) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", game.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const organizationCanScore = Boolean(
    membership &&
      ["owner", "admin", "scorekeeper"].includes(membership.role),
  );

  const teamIds = [game.home_team_id, game.away_team_id].filter(
    (teamId): teamId is string => Boolean(teamId),
  );

  let teamManagerCanScore = false;

  if (teamIds.length > 0) {
    const { data: teamMemberships } = await supabase
      .from("team_memberships")
      .select("team_id, role")
      .eq("user_id", user.id)
      .in("team_id", teamIds);

    teamManagerCanScore = Boolean(
      teamMemberships?.some((member) => member.role === "manager"),
    );
  }

  const canScore = organizationCanScore || teamManagerCanScore;

  return (
    <ScoringConsole
      initialGame={game as Game}
      initialEvents={(events || []) as GameEvent[]}
      canScore={canScore}
    />
  );
}
