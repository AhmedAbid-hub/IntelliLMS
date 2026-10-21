import { Bell, Menu } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../features/auth/Auth";
import { Avatar } from "../Avatar";
import { Breadcrumbs } from "./Breadcrumbs";
type HeaderProps = {
  isSuperAdmin: boolean;
  mobile: boolean;
  setMobile: React.Dispatch<React.SetStateAction<boolean>>;
  navigationToggle: React.RefObject<HTMLButtonElement | null>;
  user: ReturnType<typeof useAuth>["user"];
  displayName: string;
  roleLabel: string;
};
export function Header({
  isSuperAdmin,
  mobile,
  setMobile,
  navigationToggle,
  user,
  displayName,
  roleLabel,
}: HeaderProps) {
  return (
    <header className="topbar">
      <button
        type="button"

        className="icon-button mobile-menu"

        ref={navigationToggle}

        onClick={() => setMobile((value) => !value)}

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

          {isSuperAdmin ? "Platform administration" : "Connected workspace"}
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
  );
}
