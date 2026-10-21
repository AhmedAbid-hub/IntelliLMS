import {
  Building2,
  ChevronRight,
  GraduationCap,
  LogOut,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../features/auth/Auth";
import { HeadWorkspace } from "../../features/auth/HeadWorkspace";
import { routeAllowed } from "../../lib/access";
import { useTerminology } from "../../lib/terminology";
import { RelationSelect } from "../RelationSelect";
import { navGroups, navItems, superAdminGroups } from "./navigation";
type SidebarProps = {
  mobile: boolean;
  setMobile: React.Dispatch<React.SetStateAction<boolean>>;
  navigationClose: React.RefObject<HTMLButtonElement | null>;
  platformName: string;
  user: ReturnType<typeof useAuth>["user"];
  role: string;
  changeInstitute: (id: string) => Promise<void>;
  signOut: () => Promise<void>;
  signingOut: boolean;
};
export function Sidebar({
  mobile,
  setMobile,
  navigationClose,
  platformName,
  user,
  role,
  changeInstitute,
  signOut,
  signingOut,
}: SidebarProps) {
  const isSuperAdmin = role === "superadmin";
  const homePath = isSuperAdmin ? "/platform" : "/";
  const instituteKind = user?.institute_profile?.kind;
  const groups = isSuperAdmin ? superAdminGroups : navGroups;
  const terms = useTerminology();
  const choices = user?.memberships.map((membership) => ({
    id: membership.institute_id,
    name: membership.institute__name,
  }));
  const getNavigationLabel = (
    path: string,

    label: string,
  ) => {
    if (path === "/offerings") {
      if (role === "head") {
        return "Department courses";
      }

      if (role === "teacher") {
        return "My teaching courses";
      }

      return terms.title("offerings", label);
    }

    if (path === "/departments-programs") {
      return instituteKind === "school"
        ? "Classes & Grades"
        : "Departments & Programs";
    }

    return label;
  };

  return (
    <aside
      id="app-navigation"

      className={mobile ? "sidebar sidebar-open" : "sidebar"}

      aria-label="Main navigation"
    >
      {/* Branding */}

      <div className="sidebar-brand-row">
        <NavLink
          to={homePath}

          className="brand"

          onClick={() => setMobile(false)}

          aria-label={`${platformName} home`}
        >
          <GraduationCap aria-hidden="true" />

          <span className="brand-name">{platformName}</span>
        </NavLink>

        <button
          type="button"

          className="sidebar-mobile-close"

          ref={navigationClose}

          aria-label="Close navigation"

          onClick={() => setMobile(false)}
        >
          <X size={20} />
        </button>
      </div>

      {/* Institute selector */}

      {isSuperAdmin ? (
        <div
          className="institute-select"

          style={{
            display: "flex",

            flexDirection: "column",

            gap: 9,
          }}
        >
          <div
            style={{
              display: "flex",

              alignItems: "center",

              gap: 10,

              padding: "13px 14px",

              border: "1px solid #dce8df",

              borderRadius: 11,

              background: "#f7faf7",

              color: "#176447",
            }}
          >
            <Building2
              size={18}

              aria-hidden="true"

              style={{ flexShrink: 0 }}
            />

            <div
              style={{
                display: "flex",

                flexDirection: "column",

                gap: 4,

                minWidth: 0,
              }}
            >
              <strong
                style={{
                  fontSize: 13,

                  color: "#173c2d",
                }}
              >
                All institutions
              </strong>

              <span
                style={{
                  fontSize: 11,

                  color: "#718378",

                  lineHeight: 1.5,
                }}
              >
                Platform-wide administration
              </span>
            </div>
          </div>

          {user?.is_superuser && (
            <RelationSelect
              source="institutes"

              label="Switch institute context"

              value={user.institute_id || ""}

              selectedLabel={user.institute_profile?.name}

              onChange={(value) => void changeInstitute(String(value))}

              emptyLabel="Select institute"

              compact
            />
          )}
        </div>
      ) : (
        <label className="institute-select">
          <Building2
            size={17}

            aria-hidden="true"
          />

          <select
            aria-label="Active institute"

            value={user?.institute_id || ""}

            onChange={(event) => void changeInstitute(event.target.value)}
          >
            <option value="" disabled>
              Select institute
            </option>

            {choices?.map((choice) => (
              <option
                key={choice.id}

                value={choice.id}
              >
                {choice.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Department Head workspace switch */}

      <HeadWorkspace />

      {/* Main navigation */}

      <nav aria-label={isSuperAdmin ? "Platform pages" : "Workspace pages"}>
        {groups.map((group) => {
          const links = group.paths

            .map((path) => navItems.find((item) => item.path === path))

            .filter((item): item is (typeof navItems)[number] =>
              Boolean(
                item &&
                item.roles.includes(role) &&
                routeAllowed(
                  item.path,

                  role,

                  instituteKind,
                ),
              ),
            );

          if (!links.length) {
            return null;
          }

          return (
            <div
              className="sidebar-nav-group"

              key={group.title}
            >
              <div className="sidebar-nav-heading">{group.title}</div>

              {links.map(
                ({
                  path,

                  label,

                  icon: Icon,
                }) => (
                  <NavLink
                    key={path}

                    to={path}

                    end={path === "/"}

                    className={({ isActive }) => (isActive ? "active" : "")}

                    onClick={() => setMobile(false)}
                  >
                    <Icon
                      size={18}

                      strokeWidth={1.9}

                      aria-hidden="true"
                    />

                    <span>
                      {getNavigationLabel(
                        path,

                        label,
                      )}
                    </span>

                    <ChevronRight
                      className="nav-chevron"

                      size={14}

                      aria-hidden="true"
                    />
                  </NavLink>
                ),
              )}
            </div>
          );
        })}
      </nav>

      {/* Sidebar footer */}

      <div className="sidebar-bottom">
        <div className="support-card">
          {isSuperAdmin ? (
            <>
              <ShieldCheck
                size={17}

                aria-hidden="true"
              />

              <strong>Platform administration</strong>

              <p>
                Manage institutions, administrator accounts, and platform
                settings.
              </p>
            </>
          ) : (
            <>
              <Sparkles
                size={17}

                aria-hidden="true"
              />

              <strong>A better way to learn.</strong>

              <p>One connected workspace for your academic journey.</p>
            </>
          )}
        </div>

        <NavLink
          to="/profile"

          onClick={() => setMobile(false)}
        >
          <UserRound size={17} />

          <span>Profile &amp; security</span>
        </NavLink>

        <button
          type="button"

          onClick={() => void signOut()}

          disabled={signingOut}
        >
          <LogOut size={17} />

          <span>{signingOut ? "Signing out…" : "Sign out"}</span>
        </button>
      </div>
    </aside>
  );
}
