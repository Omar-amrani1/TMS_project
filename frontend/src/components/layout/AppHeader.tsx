import { useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import PillNav from "../ui/PillNav";
import { UserDropdown } from "./UserDropdown";

export const AppHeader = () => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Products", href: "/products" },
  ];

  return (
    <PillNav
      logo="/logo.svg"
      logoAlt="Smart TMS Logo"
      items={navItems}
      activeHref={location.pathname}
      rightContent={isAuthenticated ? <UserDropdown /> : undefined}
    />
  );
};
