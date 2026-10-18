

import { useEffect, useRef, useState } from "react";

import {

  NavLink,

  Outlet,

  useLocation,

  useNavigate,

} from "react-router-dom";

import { useQueryClient } from "@tanstack/react-query";

import {

  GraduationCap,

  LayoutDashboard,

  BookOpen,

  Users,

  Building2,

  ClipboardList,

  CalendarDays,

  ChartNoAxesCombined,

  Bell,

  LogOut,

  Menu,

  Settings,

  ShieldCheck,

  BrainCircuit,

  FileCheck2,

  X,

  UserRound,

  History,

  UserRoundCheck,

  School,

  ChevronRight,

  Sparkles,

} from "lucide-react";

import { Avatar } from "../Avatar";

import { Breadcrumbs } from "./Breadcrumbs";

import { WorkspaceRoute } from "./WorkspaceRoute";

import { usePlatformConfiguration } from "../../features/auth/PlatformSettings";

import { useTerminology } from "../../lib/terminology";

import { post } from "../../lib/api";

import { RelationSelect } from "../RelationSelect";

import { routeAllowed } from "../../lib/access";

import { useAuth } from "../../features/auth/Auth";

import { HeadWorkspace } from "../../features/auth/HeadWorkspace";

import { ErrorState } from "../shared";

// --------------------------------------------------

// Navigation items

// --------------------------------------------------

export const navItems = [

  {

    path: "/academic-history",

    label: "Academic history",

    icon: History,

    roles: ["student"],

  },

  {

    path: "/academic-reviews",

    label: "Academic reviews",

    icon: ShieldCheck,

    roles: ["admin", "head", "teacher"],

  },

  {

    path: "/platform-audit",

    label: "Platform audit",

    icon: History,

    roles: ["superadmin"],

  },

  {

    path: "/platform-settings",

    label: "Platform settings",

    icon: Settings,

    roles: ["superadmin"],

  },

  {

    path: "/platform",

    label: "Platform overview",

    icon: LayoutDashboard,

    roles: ["superadmin"],

  },

  {

    path: "/",

    label: "Overview",

    icon: LayoutDashboard,

    roles: ["admin", "head", "teacher", "student"],

  },

  {

    path: "/institutes",

    label: "Institutes",

    icon: Building2,

    roles: ["superadmin"],

  },

  {

    path: "/platform-users",

    label: "Institute administrators",

    icon: Users,

    roles: ["superadmin"],

  },

  // Academic management

  {

    path: "/academics",

    label: "Academic management",

    icon: School,

    roles: ["admin"],

  },

  // New Departments & Programs page

  {

    path: "/departments-programs",

    label: "Departments & Programs",

    icon: Building2,

    roles: ["admin"],

  },

  {

    path: "/memberships",

    label: "People",

    icon: Users,

    roles: ["admin", "head", "teacher"],

  },

  {

    path: "/teacher-appointments",

    label: "Teacher appointments",

    icon: UserRoundCheck,

    roles: ["admin", "head"],

  },

  {

    path: "/offerings",

    label: "My courses",

    icon: BookOpen,

    roles: ["admin", "head", "teacher", "student"],

  },

  {

    path: "/assignments",

    label: "Assignments",

    icon: ClipboardList,

    roles: ["admin", "head", "teacher", "student"],

  },

  {

    path: "/quizzes",

    label: "Quizzes",

    icon: FileCheck2,

    roles: ["admin", "head", "teacher", "student"],

  },

  {

    path: "/attendance-sessions",

    label: "Attendance",

    icon: ShieldCheck,

    roles: ["admin", "head", "teacher"],

  },

  {

    path: "/attendance",

    label: "My attendance",

    icon: ShieldCheck,

    roles: ["student"],

  },

  {

    path: "/grades",

    label: "Gradebook",

    icon: ChartNoAxesCombined,

    roles: ["admin", "head", "teacher", "student"],

  },

  {

    path: "/analytics",

    label: "Academic progress",

    icon: ChartNoAxesCombined,

    roles: ["admin", "head", "teacher", "student"],

  },

  {

    path: "/institute-settings",

    label: "Institute settings",

    icon: Settings,

    roles: ["admin"],

  },

  {

    path: "/timetable",

    label: "Timetable",

    icon: CalendarDays,

    roles: ["admin", "head", "teacher", "student"],

  },

  {

    path: "/predictions",

    label: "Learning insights",

    icon: BrainCircuit,

    roles: ["admin", "head", "teacher"],

  },

  {

    path: "/announcements",

    label: "Announcements",

    icon: Bell,

    roles: ["admin", "head", "teacher", "student"],

  },

  {

    path: "/audit",

    label: "Audit history",

    icon: History,

    roles: ["admin"],

  },

];

// --------------------------------------------------

// Navigation groups

// --------------------------------------------------

const navGroups = [

  {

    title: "Workspace",

    paths: [

      "/",

      "/platform",

      "/announcements",

      "/timetable",

    ],

  },

  {

    title: "Academic management",

    paths: [

      "/academics",

      "/departments-programs",

      "/memberships",

      "/teacher-appointments",

      "/offerings",

      "/assignments",

      "/quizzes",

      "/attendance-sessions",

      "/attendance",

      "/grades",

      "/academic-history",

    ],

  },

  {

    title: "Insights & reporting",

    paths: [

      "/analytics",

      "/predictions",

      "/academic-reviews",

    ],

  },

  {

    title: "Administration",

    paths: [

      "/institute-settings",

      "/audit",

    ],

  },

];

const superAdminGroups = [

  {

    title: "Platform overview",

    paths: ["/platform"],

  },

  {

    title: "Platform management",

    paths: [

      "/institutes",

      "/platform-users",

    ],

  },

  {

    title: "Administration & security",

    paths: [

      "/platform-settings",

      "/platform-audit",

    ],

  },

];

// --------------------------------------------------

// Role labels

// --------------------------------------------------

function getRoleLabel(role: string) {

  switch (role) {

    case "superadmin":

      return "Super Administrator";

    case "admin":

      return "Institute Administrator";

    case "head":

      return "Department Head";

    case "teacher":

      return "Faculty Member";

    case "student":

      return "Student";

    default:

      return "Workspace Member";

  }

}

// --------------------------------------------------

// Application shell

// --------------------------------------------------

export function Shell() {

  const platform = usePlatformConfiguration();

  const terms = useTerminology();

  const { user, role, select } = useAuth();

  const [mobile, setMobile] = useState(false);

  const navigationClose =

    useRef<HTMLButtonElement>(null);

  const navigationToggle =

    useRef<HTMLButtonElement>(null);

  const [signingOut, setSigningOut] = useState(false);

  const [error, setError] = useState<unknown>();

  const client = useQueryClient();

  const navigate = useNavigate();

  const location = useLocation();

  const isSuperAdmin = role === "superadmin";

  const homePath = isSuperAdmin

    ? "/platform"

    : "/";

  const instituteKind = user?.institute_profile?.kind;

  const displayName =

    [user?.first_name, user?.last_name]

      .filter(Boolean)

      .join(" ")

      .trim() ||

    user?.username ||

    "Workspace member";

  const roleLabel = getRoleLabel(role);

  const platformName =

    platform.data?.platform_name || "IntelliLMS";

  const groups = isSuperAdmin

    ? superAdminGroups

    : navGroups;

  // --------------------------------------------------

  // Navigation lifecycle

  // --------------------------------------------------

  useEffect(() => {

    setMobile(false);

    setError(undefined);

  }, [location.pathname]);

  useEffect(() => {

    if (!mobile) return;

    navigationClose.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {

      if (event.key === "Escape") {

        setMobile(false);

      }

    };

    const previousOverflow =

      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    document.addEventListener(

      "keydown",

      onKeyDown

    );

    return () => {

      document.body.style.overflow =

        previousOverflow;

      document.removeEventListener(

        "keydown",

        onKeyDown

      );

      navigationToggle.current?.focus();

    };

  }, [mobile]);

  // --------------------------------------------------

  // Institute selection

  // --------------------------------------------------

  const choices = user?.memberships.map(

    (membership) => ({

      id: membership.institute_id,

      name: membership.institute__name,

    })

  );

  const changeInstitute = async (id: string) => {

    if (!id || id === user?.institute_id) {

      return;

    }

    try {

      setError(undefined);

      await select(id);

      setMobile(false);

      navigate(

        isSuperAdmin ? "/platform" : "/"

      );

    } catch (err) {

      setError(err);

    }

  };

  // --------------------------------------------------

  // Sign out

  // --------------------------------------------------

  const signOut = async () => {

    if (signingOut) return;

    setSigningOut(true);

    setError(undefined);

    try {

      await post("auth/logout/");

      await client.cancelQueries();

      client.setQueryData(["auth"], null);

      client.removeQueries({

        predicate: (query) =>

          query.queryKey[0] !== "auth",

      });

      setMobile(false);

      navigate("/login");

    } catch (err) {

      setError(err);

      setSigningOut(false);

    }

  };

  // --------------------------------------------------

  // Dynamic navigation labels

  // --------------------------------------------------

  const getNavigationLabel = (

    path: string,

    label: string

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

  // --------------------------------------------------

  // Render

  // --------------------------------------------------

  return (

    <div className="app-shell">

      {/* Mobile navigation backdrop */}

      {mobile && (

        <button

          type="button"

          className="sidebar-backdrop"

          aria-label="Close navigation"

          onClick={() => setMobile(false)}

        />

      )}

      {/* Sidebar */}

      <aside

        id="app-navigation"

        className={

          mobile

            ? "sidebar sidebar-open"

            : "sidebar"

        }

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

            <span className="brand-name">

              {platformName}

            </span>

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

                selectedLabel={

                  user.institute_profile?.name

                }

                onChange={(value) =>

                  void changeInstitute(

                    String(value)

                  )

                }

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

              onChange={(event) =>

                void changeInstitute(

                  event.target.value

                )

              }

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

        <nav

          aria-label={

            isSuperAdmin

              ? "Platform pages"

              : "Workspace pages"

          }

        >

          {groups.map((group) => {

            const links = group.paths

              .map((path) =>

                navItems.find(

                  (item) =>

                    item.path === path

                )

              )

              .filter(

                (

                  item

                ): item is (typeof navItems)[number] =>

                  Boolean(

                    item &&

                    item.roles.includes(role) &&

                    routeAllowed(

                      item.path,

                      role,

                      instituteKind

                    )

                  )

              );

            if (!links.length) {

              return null;

            }

            return (

              <div

                className="sidebar-nav-group"

                key={group.title}

              >

                <div className="sidebar-nav-heading">

                  {group.title}

                </div>

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

                      className={({ isActive }) =>

                        isActive

                          ? "active"

                          : ""

                      }

                      onClick={() =>

                        setMobile(false)

                      }

                    >

                      <Icon

                        size={18}

                        strokeWidth={1.9}

                        aria-hidden="true"

                      />

                      <span>

                        {getNavigationLabel(

                          path,

                          label

                        )}

                      </span>

                      <ChevronRight

                        className="nav-chevron"

                        size={14}

                        aria-hidden="true"

                      />

                    </NavLink>

                  )

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

                <strong>

                  Platform administration

                </strong>

                <p>

                  Manage institutions,

                  administrator accounts,

                  and platform settings.

                </p>

              </>

            ) : (

              <>

                <Sparkles

                  size={17}

                  aria-hidden="true"

                />

                <strong>

                  A better way to learn.

                </strong>

                <p>

                  One connected workspace

                  for your academic journey.

                </p>

              </>

            )}

          </div>

          <NavLink

            to="/profile"

            onClick={() =>

              setMobile(false)

            }

          >

            <UserRound size={17} />

            <span>

              Profile &amp; security

            </span>

          </NavLink>

          <button

            type="button"

            onClick={() =>

              void signOut()

            }

            disabled={signingOut}

          >

            <LogOut size={17} />

            <span>

              {signingOut

                ? "Signing out…"

                : "Sign out"}

            </span>

          </button>

        </div>

      </aside>

      {/* Main application area */}

      <div className="main-shell">

        {/* Top navigation bar */}

        <header className="topbar">

          <button

            type="button"

            className="icon-button mobile-menu"

            ref={navigationToggle}

            onClick={() =>

              setMobile((value) => !value)

            }

            aria-label="Toggle navigation"

            aria-expanded={mobile}

            aria-controls="app-navigation"

          >

            <Menu size={21} />

          </button>

          <Breadcrumbs />

          <div className="topbar-right">

            <span className="secure-label">

              <span className="tiny-dot" />

              {isSuperAdmin

                ? "Platform administration"

                : "Connected workspace"}

            </span>

            {!isSuperAdmin && (

              <NavLink

                aria-label="Announcements"

                title="Announcements"

                className="icon-button"

                to="/announcements"

              >

                <Bell size={20} />

              </NavLink>

            )}

            <NavLink

              to="/profile"

              className="topbar-account"

              title="View profile"

            >

              <Avatar

                src={user?.avatar_url}

                name={displayName}

              />

              <div className="user-label">

                <b>{displayName}</b>

                <small>{roleLabel}</small>

              </div>

            </NavLink>

          </div>

        </header>

        {/* Page content */}

        <main>

          {!!error && (

            <ErrorState error={error} />

          )}

          <WorkspaceRoute>

            <Outlet />

          </WorkspaceRoute>

        </main>

        {/* Footer */}

        <footer className="app-footer">

          <strong>IntelliLMS</strong>

          <span>

            {isSuperAdmin

              ? "Platform administration"

              : "Learning, connected."}

          </span>

          <span>

            {isSuperAdmin

              ? "System management"

              : "Academic workspace"}

          </span>

        </footer>

      </div>

    </div>

  );

}
