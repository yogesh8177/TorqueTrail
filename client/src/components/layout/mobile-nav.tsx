import { Link, useLocation } from "wouter";
import { Car, Home, Users, Route, User } from "lucide-react";

export default function MobileNav() {
  const [location] = useLocation();

  const navigation = [
    { name: "Feed", href: "/", icon: Home, current: location === "/" },
    { name: "Garage", href: "/garage", icon: Car, current: location === "/garage" },
    { name: "Convoys", href: "/convoys", icon: Users, current: location === "/convoys" },
    { name: "Routes", href: "/routes", icon: Route, current: location === "/routes" },
    { name: "Profile", href: "/profile", icon: User, current: location === "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-2 z-50">
      <div className="flex items-center justify-around">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors cursor-pointer ${
                  item.current
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
