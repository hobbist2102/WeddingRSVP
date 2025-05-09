import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Reply,
  Calendar,
  Plane,
  Bed,
  Utensils,
  FileSpreadsheet,
  Settings,
  LogOut,
  Cog,
  Hotel
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const [location] = useLocation();
  const { logout } = useAuth();
  
  const menuItems = [
    {
      name: "Dashboard",
      icon: <LayoutDashboard className="mr-3 h-5 w-5" />,
      path: "/dashboard"
    },
    {
      name: "Guest List",
      icon: <Users className="mr-3 h-5 w-5" />,
      path: "/guests"
    },
    {
      name: "RSVP Management",
      icon: <Reply className="mr-3 h-5 w-5" />,
      path: "/rsvp"
    },
    {
      name: "Events & Ceremonies",
      icon: <Calendar className="mr-3 h-5 w-5" />,
      path: "/events"
    },
    {
      name: "Travel Management",
      icon: <Plane className="mr-3 h-5 w-5" />,
      path: "/travel"
    },
    {
      name: "Accommodations",
      icon: <Bed className="mr-3 h-5 w-5" />,
      path: "/accommodations"
    },
    {
      name: "Hotels",
      icon: <Hotel className="mr-3 h-5 w-5" />,
      path: "/hotels"
    },
    {
      name: "Meal Planning",
      icon: <Utensils className="mr-3 h-5 w-5" />,
      path: "/meals"
    },
    {
      name: "Reports",
      icon: <FileSpreadsheet className="mr-3 h-5 w-5" />,
      path: "/reports"
    },
    {
      name: "Settings",
      icon: <Settings className="mr-3 h-5 w-5" />,
      path: "/settings"
    },
    {
      name: "Event Settings",
      icon: <Cog className="mr-3 h-5 w-5" />,
      path: "/event-settings"
    }
  ];

  const sidebarClasses = cn(
    "bg-neutral text-white w-64 flex-shrink-0 fixed h-full z-10 transition-all duration-300 lg:static",
    isOpen ? "left-0" : "-left-64 lg:left-0"
  );

  return (
    <aside className={sidebarClasses}>
      <nav className="mt-5 px-2 space-y-1">
        {menuItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <div
              className={cn(
                "group flex items-center px-4 py-2 text-sm font-medium rounded-md cursor-pointer",
                location === item.path
                  ? "bg-gray-700 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              )}
            >
              {item.icon}
              {item.name}
            </div>
          </Link>
        ))}
      </nav>
      
      <div className="px-4 mt-6">
        <div className="pt-4 border-t border-gray-600">
          <button
            className="w-full flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white"
            onClick={logout}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
