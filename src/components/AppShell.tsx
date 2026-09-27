import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { switchOrganization } from "@/app/dashboard/actions";

type OrganizationOption = {
  id: string;
  name: string;
};

export function AppShell({
  children,
  userName,
  organizations,
  activeOrganization,
}: {
  children: React.ReactNode;
  userName: string;
  organizations: OrganizationOption[];
  activeOrganization: string;
}) {
  return (
    <div className="gdpShell">
      <style>{`
        .gdpShell {
          min-height: 100vh;
          background: #f3f5f8;
          color: #fff;
        }

        .gdpShell .topbar {
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          background: #061f45;
          border-bottom: 3px solid #e50046;
          box-sizing: border-box;
        }

        .gdpShell .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #fff;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: .05em;
          text-transform: uppercase;
        }

        .gdpShell .brand span {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #fff;
          color: #e50046;
          border: 3px solid #e50046;
          font-size: 17px;
          font-weight: 900;
        }

        .gdpShell .topActions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .gdpShell .topActions form {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 0;
        }

        .gdpShell .topActions select {
          height: 34px;
          min-width: 165px;
          border-radius: 4px;
          border: 1px solid #9ea6b3;
          background: #f5f5f5;
          color: #171717;
          padding: 0 7px;
        }

        .gdpShell .topActions small {
          color: #dce2eb;
          font-size: 12px;
        }

        .gdpShell .topActions .button {
          min-height: 34px;
          border-radius: 7px;
          padding: 0 14px;
          font-weight: 800;
        }

        .gdpShell .topActions .secondary {
          background: #edf2f8;
          color: #09234a;
          border: 1px solid #d6dce5;
        }

        .gdpShell .layout {
          display: grid;
          grid-template-columns: 210px minmax(0, 1fr);
          min-height: calc(100vh - 68px);
        }

        .gdpShell .sidebar {
          background: #f4f6f9;
          border-right: 1px solid #d7dce4;
          padding: 22px 0;
          display: flex;
          flex-direction: column;
        }

        .gdpShell .sidebar a {
          min-height: 46px;
          display: flex;
          align-items: center;
          padding: 0 24px;
          box-sizing: border-box;
          color: #50617d;
          text-decoration: none;
          font-size: 15px;
          font-weight: 750;
          border-left: 3px solid transparent;
        }

        .gdpShell .sidebar a:hover {
          background: #e9edf3;
          color: #172641;
        }

        .gdpShell .main {
          min-width: 0;
          background: #f3f5f8;
          padding: 28px;
          box-sizing: border-box;
        }

        .gdpShell .gdpContent {
          width: min(100%, 960px);
          min-height: calc(100vh - 124px);
          background: #050505;
          color: #f5f5f5;
          padding: 28px;
          box-sizing: border-box;
        }

        .gdpShell .gdpContent h1,
        .gdpShell .gdpContent h2,
        .gdpShell .gdpContent h3 {
          color: #fff;
        }

        .gdpShell .gdpContent .pageHead {
          color: #fff;
          margin-bottom: 22px;
        }

        .gdpShell .gdpContent .eyebrow,
        .gdpShell .gdpContent .liveLabel {
          color: #9b9ba3;
        }

        .gdpShell .gdpContent .muted,
        .gdpShell .gdpContent .notice {
          color: #aeb5c0;
        }

        .gdpShell .gdpContent .card,
        .gdpShell .gdpContent .panel,
        .gdpShell .gdpContent .empty {
          background: #0d0d0f;
          color: #f5f5f5;
          border: 1px solid #25272c;
          border-radius: 10px;
          box-shadow: none;
        }

        .gdpShell .gdpContent .card {
          padding: 20px;
        }

        .gdpShell .gdpContent .grid {
          gap: 16px;
        }

        .gdpShell .gdpContent .grid > .card {
          text-decoration: none;
        }

        .gdpShell .gdpContent .grid > .card:hover {
          border-color: #454851;
        }

        .gdpShell .gdpContent input,
        .gdpShell .gdpContent select,
        .gdpShell .gdpContent textarea {
          background: #151619;
          color: #fff;
          border: 1px solid #363941;
          border-radius: 7px;
        }

        .gdpShell .gdpContent label {
          color: #d7dbe2;
        }

        .gdpShell .gdpContent .button.primary,
        .gdpShell .gdpContent .button.red {
          background: #7c2cff;
          border-color: #7c2cff;
          color: #fff;
          border-radius: 7px;
          font-weight: 800;
        }

        .gdpShell .gdpContent .button.secondary {
          background: #121316;
          border-color: #373940;
          color: #f5f5f5;
          border-radius: 7px;
          font-weight: 750;
        }

        .gdpShell .gdpContent .teamCode {
          border-radius: 9px;
        }

        @media (max-width: 800px) {
          .gdpShell .layout {
            grid-template-columns: 1fr;
          }

          .gdpShell .sidebar {
            order: 2;
            flex-direction: row;
            overflow-x: auto;
            padding: 0;
            border-right: 0;
            border-top: 1px solid #d7dce4;
          }

          .gdpShell .sidebar a {
            min-width: max-content;
            padding: 0 16px;
            border-left: 0;
          }

          .gdpShell .main {
            padding: 14px;
          }

          .gdpShell .gdpContent {
            min-height: calc(100vh - 96px);
            padding: 20px;
          }

          .gdpShell .topActions small,
          .gdpShell .topActions form:last-child {
            display: none;
          }
        }
      `}</style>

      <header className="topbar">
        <Link href="/dashboard" className="brand">
          <span>G</span>
          GameDay Softball
        </Link>

        <div className="topActions">
          {organizations.length > 1 && (
            <form action={switchOrganization}>
              <select
                name="organizationId"
                defaultValue={activeOrganization}
                aria-label="Active organization"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>

              <button className="button secondary">Switch</button>
            </form>
          )}

          <small>{userName}</small>

          <form action={signOut}>
            <button className="button secondary">Sign out</button>
          </form>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <Link href="/dashboard">Home</Link>
          <Link href="/dashboard/teams">Teams</Link>
          <Link href="/dashboard/games">Games</Link>
          <Link href="/dashboard/games/new">New game</Link>
          <Link href="/dashboard/members">Members</Link>
        </aside>

        <main className="main">
          <div className="gdpContent">{children}</div>
        </main>
      </div>
    </div>
  );
}
