"use client";

import {
  Bot,
  Calendar,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoIcon } from "@/components/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavUser } from "./nav-user";

const overviewItems = [
  { icon: LayoutDashboard, title: "Dashboard", url: "/dashboard" },
  { icon: Bot, title: "AI Chat", url: "/dashboard/chat" },
];

const eventItems = [
  { icon: Calendar, title: "My Events", url: "/dashboard/events" },
  { icon: Plus, title: "Create Event", url: "/dashboard/events/new" },
  { icon: Search, title: "Discover", url: "/events" },
];

const settingsItems = [
  { icon: User, title: "Profile", url: "/dashboard/profile" },
  { icon: Settings, title: "Settings", url: "/dashboard/settings" },
];

export function AppSidebar({ isHost }: { isHost: boolean }) {
  const pathname = usePathname();
  // Guests only book; creating events and the AI assistant are organizer-only.
  const hostOnly = new Set(["/dashboard/chat", "/dashboard/events/new"]);
  const visibleOverview = overviewItems.filter(
    (item) => isHost || !hostOnly.has(item.url)
  );
  const visibleEvents = eventItems.filter(
    (item) => isHost || !hostOnly.has(item.url)
  );

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/dashboard">
                <LogoIcon className="size-8" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">BookGrait</span>
                  <span className="truncate text-muted-foreground text-xs">
                    Workshops by grAIt
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {visibleOverview.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Events</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {visibleEvents.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname.startsWith(item.url) &&
                      !eventItems.some(
                        (other) =>
                          other.url !== item.url &&
                          other.url.startsWith(item.url) &&
                          pathname.startsWith(other.url)
                      )
                    }
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.url)}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
