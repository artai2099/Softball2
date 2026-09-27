import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { addPlayer, requestTeamAccess } from "./actions";

type TeamMember = {
  id: string;
  user_id: string;
  role: string;
  display_name: string;
};

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, membership } = await requireMembership();

  const [
    { data: team },
    { data: players },
    { data: canManageTeam, error: permissionError },
    { data: members, error: membersError },
    { data: currentMembership, error: currentMembershipError },
    { data: pendingRequest, error: pendingRequestError },
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("*")
      .eq("id", id)
      .eq("organization_id", membership.organization_id)
      .single(),

    supabase
      .from("players")
      .select("*")
      .eq("team_id", id)
      .eq("active", true)
      .order("jersey_number"),

    supabase.rpc("can_manage_team", {
      p_team_id: id,
    }),

    supabase.rpc("get_team_members", {
      p_team_id: id,
    }),

    supabase
      .from("team_memberships")
      .select("id, role")
      .eq("team_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),

    supabase
      .from("team_access_requests")
      .select("id, status")
      .eq("team_id", id)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle(),
  ]);

  if (!team) {
    notFound();
  }

  if (permissionError) {
    console.error("Permission check failed:", permissionError);
  }

  if (membersError) {
    console.error("Team members load failed:", membersError);
  }

  if (currentMembershipError) {
    console.error(
      "Team membership check failed:",
      currentMembershipError
    );
  }

  if (pendingRequestError) {
    console.error(
      "Access request check failed:",
      pendingRequestError
    );
  }

  const canEdit = Boolean(canManageTeam);
  const hasTeamAccess = Boolean(currentMembership);
  const hasPendingRequest = Boolean(pendingRequest);

  const action = addPlayer.bind(null, id);
  const requestAccessAction = requestTeamAccess.bind(null, id);

  return (
    <>
      {/* TEAM HEADER */}
      <div className="pageHead">
        <div>
          <p className="eyebrow">{team.city || "Team roster"}</p>
          <h1>{team.name}</h1>
        </div>
      </div>

      {/* ADD PLAYER */}
      {canEdit && (
        <section className="card">
          <h2>Add player</h2>

          <form action={action} className="form">
            <label>
              First name
              <input name="firstName" required />
            </label>

            <label>
              Last name
              <input name="lastName" required />
            </label>

            <label>
              Jersey number
              <input
                name="jerseyNumber"
                type="number"
                min="0"
                max="999"
                required
              />
            </label>

            <label>
              Position
              <select name="position">
                {[
                  "P",
                  "C",
                  "1B",
                  "2B",
                  "3B",
                  "SS",
                  "LF",
                  "CF",
                  "RF",
                  "DP",
                  "UTIL",
                ].map((position) => (
                  <option key={position}>{position}</option>
                ))}
              </select>
            </label>

            <button className="button primary">Add player</button>
          </form>
        </section>
      )}

      {/* TEAM ACCESS STATUS */}
      {!canEdit && hasTeamAccess && (
        <section className="card">
          <p className="notice">
            You have {currentMembership?.role} access to this team.
          </p>
        </section>
      )}

      {!canEdit && !hasTeamAccess && hasPendingRequest && (
        <section className="card">
          <h2>Team Access</h2>
          <p className="notice">
            Your request for access to this team is pending.
          </p>
        </section>
      )}

      {!canEdit && !hasTeamAccess && !hasPendingRequest && (
        <section className="card">
          <h2>Team Access</h2>

          <p className="muted" style={{ marginBottom: 12 }}>
            You are a member of this organization but do not have
            access to this team yet.
          </p>

          <form action={requestAccessAction}>
            <button className="button primary">
              Request Access
            </button>
          </form>
        </section>
      )}

      {/* BOTTOM: TEAM MEMBERS + PLAYERS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 18,
          marginTop: 18,
          alignItems: "start",
        }}
      >
        {/* TEAM MEMBERS */}
        <section className="card">
          <div className="pageHead">
            <div>
              <p className="eyebrow">Access</p>
              <h2>Team Members</h2>
            </div>
          </div>

          {members?.length ? (
            <div
              style={{
                display: "grid",
                gap: 10,
                marginTop: 12,
              }}
            >
              {members.map((member: TeamMember) => (
                <article className="card" key={member.id}>
                  <strong>{member.display_name}</strong>

                  <p className="muted" style={{ marginTop: 6 }}>
                    Role: {member.role}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="notice">
              No members have been assigned to this team.
            </p>
          )}
        </section>

        {/* PLAYERS */}
        <section className="card">
          <div className="pageHead">
            <div>
              <p className="eyebrow">Roster</p>
              <h2>Players</h2>
            </div>
          </div>

          {players?.length ? (
            <div
              style={{
                display: "grid",
                gap: 10,
                marginTop: 12,
              }}
            >
              {players.map((player) => (
                <article className="card" key={player.id}>
                  <div className="teamRow">
                    <span className="teamCode">
                      #{player.jersey_number}
                    </span>

                    <strong>
                      {player.first_name} {player.last_name}
                    </strong>

                    <b>{player.position}</b>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">No players on this roster.</div>
          )}
        </section>
      </div>
    </>
  );
}
