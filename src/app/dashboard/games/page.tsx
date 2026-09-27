import Link from "next/link";
import { GameCard } from "@/components/GameCard";
import { requireMembership } from "@/lib/auth";
import type { Game } from "@/lib/types";

type Filter = "all" | "live" | "upcoming" | "completed";

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;

  const requestedFilter = params.filter;
  const filter: Filter =
    requestedFilter === "live" ||
    requestedFilter === "upcoming" ||
    requestedFilter === "completed"
      ? requestedFilter
      : "all";

  const { supabase, membership } = await requireMembership();

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("organization_id", membership.organization_id)
    .order("game_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const games = (data || []) as Game[];

  const live = games.filter((game) => game.status === "live");
  const upcoming = games
    .filter((game) => game.status === "scheduled")
    .sort(
      (a, b) =>
        new Date(a.game_date).getTime() - new Date(b.game_date).getTime()
    );
  const completed = games.filter((game) => game.status === "final");

  const showLive = filter === "all" || filter === "live";
  const showUpcoming = filter === "all" || filter === "upcoming";
  const showCompleted = filter === "all" || filter === "completed";

  return (
    <div className="gamesPage">
      <header className="gamesHero">
        <div>
          <p className="eyebrow">Game center</p>
          <h1>Games</h1>
          <p className="gamesHeroText">
            Follow live games, manage your schedule, and review completed
            scorebooks.
          </p>
        </div>

        <Link href="/dashboard/games/new" className="button red newGameButton">
          ＋ New Game
        </Link>
      </header>

      <section className="gamesSummary" aria-label="Game totals">
        <Link
          href="/dashboard/games?filter=live"
          className={`gamesStat live ${filter === "live" ? "selected" : ""}`}
        >
          <span className="gamesStatLabel">Live</span>
          <strong>{live.length}</strong>
        </Link>

        <Link
          href="/dashboard/games?filter=upcoming"
          className={`gamesStat upcoming ${
            filter === "upcoming" ? "selected" : ""
          }`}
        >
          <span className="gamesStatLabel">Upcoming</span>
          <strong>{upcoming.length}</strong>
        </Link>

        <Link
          href="/dashboard/games?filter=completed"
          className={`gamesStat completed ${
            filter === "completed" ? "selected" : ""
          }`}
        >
          <span className="gamesStatLabel">Completed</span>
          <strong>{completed.length}</strong>
        </Link>
      </section>

      <nav className="gamesTabs" aria-label="Game filters">
        <Link
          href="/dashboard/games?filter=all"
          className={`gamesTab ${filter === "all" ? "active" : ""}`}
        >
          All
        </Link>

        <Link
          href="/dashboard/games?filter=live"
          className={`gamesTab ${filter === "live" ? "active" : ""}`}
        >
          ● Live
        </Link>

        <Link
          href="/dashboard/games?filter=upcoming"
          className={`gamesTab ${filter === "upcoming" ? "active" : ""}`}
        >
          Upcoming
        </Link>

        <Link
          href="/dashboard/games?filter=completed"
          className={`gamesTab ${filter === "completed" ? "active" : ""}`}
        >
          Completed
        </Link>
      </nav>

      {showLive && (
        <GameSection
          title="Live Now"
          subtitle="Games currently being scored"
          games={live}
          empty="No games are live right now."
        />
      )}

      {showUpcoming && (
        <GameSection
          title="Upcoming"
          subtitle="Your next scheduled games"
          games={upcoming}
          empty="No upcoming games."
        />
      )}

      {showCompleted && (
        <GameSection
          title="Completed"
          subtitle="Recent final games and box scores"
          games={completed}
          empty="No completed games yet."
        />
      )}
    </div>
  );
}

function GameSection({
  title,
  subtitle,
  games,
  empty,
}: {
  title: string;
  subtitle: string;
  games: Game[];
  empty: string;
}) {
  return (
    <section className="gameSection">
      <div className="gameSectionHeader">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>

        <span className="gameSectionCount">{games.length}</span>
      </div>

      {games.length ? (
        <div className="gameGrid">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <div className="gameEmpty">{empty}</div>
      )}
    </section>
  );
}
