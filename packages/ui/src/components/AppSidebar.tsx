// "use client";
// import { useNavigation } from "../hooks/useNavigation";
// import {
//   Avatar,
//   AvatarFallback,
//   AvatarImage,
//   Collapsible,
//   CollapsibleContent,
//   CollapsibleTrigger,
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuGroup,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
//   Sidebar,
//   SidebarContent,
//   SidebarFooter,
//   SidebarGroup,
//   SidebarGroupLabel,
//   SidebarHeader,
//   SidebarMenu,
//   SidebarMenuAction,
//   SidebarMenuButton,
//   SidebarMenuItem,
//   SidebarMenuSub,
//   SidebarMenuSubButton,
//   SidebarMenuSubItem,
//   useSidebar,
//   Tabs,
//   TabsContent,
//   TabsList,
//   TabsTrigger,
// } from "../index";
// import {
//   BadgeCheck,
//   Bell,
//   Bot,
//   ChevronRight,
//   ChevronsUpDown,
//   HomeIcon,
//   Key,
//   LogIn,
//   LogOut,
//   Settings,
// } from "lucide-react";
// import { signIn, signOut, useSession } from "next-auth/react";
// import Link from "next/link";
// import React, { useState } from "react";
// import { NavbarConfig } from "../types/navbar";
// import { usePathname } from "next/navigation";

// const apps = [
//   {
//     name: "Astral",
//     logo: <HomeIcon className="size-4" />,
//     description: "Main dashboard",
//     href: "/astral",
//   },
//   {
//     name: "Lynx",
//     logo: <Bot className="size-4" />,
//     description: "Discord bot management",
//     href: "/lynx",
//     Card: () => (
//       <div className="bg-linear-to-br from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 hover:shadow-indigo-500/20 hover:border-indigo-500/50 group h-full transform rounded-2xl border border-white/10 p-6 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-xl">
//         <div className="flex flex-col items-center gap-4 text-center">
//           <div className="bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/30 group-hover:scale-110 rounded-full p-4 transition-all duration-300">
//             <Bot className="size-8" />
//           </div>
//           <div>
//             <h2 className="text-foreground mb-1 text-2xl font-bold tracking-tight">
//               Lynx
//             </h2>
//             <p className="text-muted-foreground text-sm">
//               Advanced Discord bot dashboard for Lynx.
//             </p>
//           </div>
//         </div>
//       </div>
//     ),
//   },
// ];
// export function AppSidebar({
//   navConfig,
//   ...props
// }: {
//   navConfig: NavbarConfig;
//   props?: React.ComponentProps<typeof Sidebar>;
// }) {
//   const { data: session } = useSession();
//   const { navbarConfig } = useNavigation(navConfig);

//   const { isMobile } = useSidebar();
//   const pathname = usePathname();

//   const [activeApp, setActiveApp] = useState(
//     apps.find((app) => pathname.startsWith(app.href)) || apps[0],
//   );
//   const [settingsOpen, setSettingsOpen] = useState(false);
//   const [activeTab, setActiveTab] = useState("appearance");

//   // Handle settings redirect from OAuth
//   React.useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     const settings = params.get("settings");
//     if (settings === "connections") {
//       setSettingsOpen(true);
//       setActiveTab("connections");

//       // Clean up URL without reload
//       const newUrl = window.location.pathname;
//       window.history.replaceState({}, "", newUrl);
//     }
//   }, []);

//   if (!activeApp) return null;

//   return (
//     <Sidebar variant="floating" {...props}>
//       <SidebarHeader>
//         <SidebarMenu>
//           <SidebarMenuItem>
//             <DropdownMenu>
//               <DropdownMenuTrigger asChild>
//                 <SidebarMenuButton
//                   size="lg"
//                   className="bg-transparent! hover:bg-primary/10! hover:text-primary! text-primary!"
//                 >
//                   <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
//                     {activeApp.logo}
//                   </div>
//                   <div className="grid flex-1 text-left text-sm leading-tight">
//                     <span className="truncate font-medium">
//                       {activeApp.name}
//                     </span>
//                     <span className="truncate text-xs text-muted-foreground">
//                       {activeApp.description}
//                     </span>
//                   </div>
//                   <ChevronsUpDown className="ml-auto" />
//                 </SidebarMenuButton>
//               </DropdownMenuTrigger>
//               <DropdownMenuContent
//                 className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
//                 align="start"
//                 side={isMobile ? "bottom" : "right"}
//                 sideOffset={4}
//               >
//                 <DropdownMenuLabel className="text-muted-foreground text-xs">
//                   Apps
//                 </DropdownMenuLabel>
//                 {apps.map((app, appIdx) => (
//                   <Link href={app.href} key={appIdx}>
//                     <DropdownMenuItem
//                       key={app.name}
//                       onClick={() => setActiveApp(app)}
//                       className="gap-2 p-2 hover:bg-primary/10! hover:text-primary! text-primary/80!"
//                     >
//                       <div className="flex size-6 items-center justify-center rounded-md border">
//                         <span className="size-3.5 shrink-0 hover:text-primary!">
//                           {app.logo}
//                         </span>
//                       </div>
//                       {app.name}
//                     </DropdownMenuItem>
//                   </Link>
//                 ))}
//               </DropdownMenuContent>
//             </DropdownMenu>
//           </SidebarMenuItem>
//         </SidebarMenu>
//       </SidebarHeader>
//       <SidebarContent className="no-scrollbar">
//         {navbarConfig
//           .filter((c) =>
//             !c.role || session?.user.role === "ADMIN"
//               ? true
//               : c.role === session?.user.role,
//           )
//           .map((section, sectionIdx) => (
//             <SidebarGroup key={sectionIdx}>
//               <SidebarGroupLabel>{section.section}</SidebarGroupLabel>
//               <SidebarMenu>
//                 {section.items
//                   .filter((item) =>
//                     !item.role || session?.user.role === "ADMIN"
//                       ? true
//                       : item.role === session?.user.role,
//                   )
//                   .map((item, itemIdx) => {
//                     const hasChildren =
//                       item.children && item.children.length > 0;
//                     const hasHref = !!item.href;

//                     const MenuItem = (
//                       <SidebarMenuItem key={itemIdx}>
//                         {hasHref ? (
//                           <SidebarMenuButton
//                             asChild
//                             tooltip={item.label}
//                             className="bg-transparent! hover:bg-primary/10! hover:text-primary! text-primary! [&_svg]:text-primary!"
//                           >
//                             <Link href={item.href}>
//                               {item.icon}
//                               {item.label.length > 18
//                                 ? item.label.slice(0, 18) + "..."
//                                 : item.label}
//                             </Link>
//                           </SidebarMenuButton>
//                         ) : (
//                           <CollapsibleTrigger asChild>
//                             <SidebarMenuButton
//                               tooltip={item.label}
//                               className="bg-transparent! hover:bg-primary/10! hover:text-primary! text-primary! [&_svg]:text-primary!"
//                             >
//                               {item.icon}
//                               {item.label.length > 18
//                                 ? item.label.slice(0, 18) + "..."
//                                 : item.label}
//                               <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
//                             </SidebarMenuButton>
//                           </CollapsibleTrigger>
//                         )}

//                         {hasChildren && (
//                           <>
//                             {hasHref && (
//                               <CollapsibleTrigger asChild>
//                                 <SidebarMenuAction className="bg-transparent! hover:bg-primary/10! text-primary! [&_svg]:text-primary! data-[state=open]:rotate-90">
//                                   <ChevronRight />
//                                   <span className="sr-only">Toggle</span>
//                                 </SidebarMenuAction>
//                               </CollapsibleTrigger>
//                             )}
//                             <CollapsibleContent>
//                               <SidebarMenuSub>
//                                 {item.children?.map((child, childIdx) => (
//                                   <SidebarMenuSubItem key={childIdx}>
//                                     <SidebarMenuSubButton
//                                       asChild
//                                       className="bg-transparent! hover:bg-primary/10! hover:text-primary! text-primary/80!"
//                                     >
//                                       <Link href={child.href}>
//                                         {child.icon}
//                                         {child.label.length > 16
//                                           ? child.label.slice(0, 16) + "..."
//                                           : child.label}
//                                       </Link>
//                                     </SidebarMenuSubButton>
//                                   </SidebarMenuSubItem>
//                                 ))}
//                               </SidebarMenuSub>
//                             </CollapsibleContent>
//                           </>
//                         )}
//                       </SidebarMenuItem>
//                     );

//                     if (hasChildren) {
//                       return (
//                         <Collapsible
//                           key={itemIdx}
//                           asChild
//                           defaultOpen={false}
//                           className="group/collapsible mt-1 "
//                         >
//                           {MenuItem}
//                         </Collapsible>
//                       );
//                     }

//                     return MenuItem;
//                   })}
//               </SidebarMenu>
//             </SidebarGroup>
//           ))}
//       </SidebarContent>
//       <SidebarFooter>
//         <SidebarMenu>
//           {session && (
//             <SidebarMenuItem>
//               <DropdownMenu>
//                 <DropdownMenuTrigger asChild>
//                   <SidebarMenuButton
//                     size="lg"
//                     variant="outline"
//                     className="bg-transparent! hover:bg-primary/10! hover:text-primary! text-primary! border-2 border-primary/20!"
//                   >
//                     <Avatar className="h-8 w-8 rounded-lg">
//                       <AvatarImage src={session?.user?.avatarUrl ?? ""} />
//                       <AvatarFallback className="rounded-lg">
//                         {session?.user?.username?.charAt(0).toUpperCase()}
//                       </AvatarFallback>
//                     </Avatar>
//                     <div className="grid flex-1 text-left text-sm leading-tight">
//                       <span className="truncate font-medium">
//                         {session?.user?.username}
//                       </span>
//                       <span className="truncate text-xs">
//                         {session?.user?.email}
//                       </span>
//                     </div>
//                     <ChevronsUpDown className="ml-auto size-4" />
//                   </SidebarMenuButton>
//                 </DropdownMenuTrigger>
//                 <DropdownMenuContent
//                   className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg "
//                   side={isMobile ? "bottom" : "right"}
//                   align="end"
//                   sideOffset={4}
//                 >
//                   <Link href={`/astral/users/${session.user.username}`}>
//                     <DropdownMenuLabel className="p-0 font-normal">
//                       <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
//                         <Avatar className="h-8 w-8 rounded-lg">
//                           <AvatarImage
//                             src={session?.user?.avatarUrl ?? ""}
//                             alt={session?.user?.username}
//                           />
//                           <AvatarFallback className="rounded-lg">
//                             {session?.user?.username?.charAt(0).toUpperCase()}
//                           </AvatarFallback>
//                         </Avatar>
//                         <div className="grid flex-1 text-left text-sm leading-tight">
//                           <span className="truncate font-medium">
//                             {session?.user?.username}
//                           </span>
//                           <span className="truncate text-xs">
//                             {session?.user?.email}
//                           </span>
//                         </div>
//                       </div>
//                     </DropdownMenuLabel>
//                   </Link>
//                   <DropdownMenuSeparator />
//                   <DropdownMenuGroup>
//                     <DropdownMenuItem
//                       className="cursor-pointer hover:bg-primary/10! hover:text-primary!"
//                       onSelect={() => {
//                         setActiveTab("appearance");
//                         setSettingsOpen(true);
//                       }}
//                     >
//                       <Settings />
//                       Settings
//                     </DropdownMenuItem>
//                   </DropdownMenuGroup>
//                   <DropdownMenuSeparator />
//                   <DropdownMenuGroup>
//                     <Link href="/astral/settings/account">
//                       <DropdownMenuItem className="hover:bg-primary/10! hover:text-primary!">
//                         <BadgeCheck />
//                         Account
//                       </DropdownMenuItem>
//                     </Link>
//                     <DropdownMenuItem
//                       className="cursor-pointer hover:bg-primary/10! hover:text-primary!"
//                       onSelect={() => {
//                         setActiveTab("api-keys");
//                         setSettingsOpen(true);
//                       }}
//                     >
//                       <Key />
//                       Api keys
//                     </DropdownMenuItem>
//                     <DropdownMenuItem
//                       className="cursor-pointer hover:bg-primary/10! hover:text-primary!"
//                       onSelect={() => {
//                         setActiveTab("notifications");
//                         setSettingsOpen(true);
//                       }}
//                     >
//                       <Bell />
//                       Notifications
//                     </DropdownMenuItem>
//                   </DropdownMenuGroup>
//                   <DropdownMenuSeparator />
//                   <DropdownMenuItem
//                     className="hover:bg-primary/10! hover:text-primary!"
//                     onClick={() => signOut()}
//                   >
//                     <LogOut />
//                     Log out
//                   </DropdownMenuItem>
//                 </DropdownMenuContent>
//               </DropdownMenu>
//             </SidebarMenuItem>
//           )}
//           {!session && (
//             <SidebarMenuItem>
//               <SidebarMenuButton
//                 size="lg"
//                 variant="outline"
//                 className="bg-transparent! hover:bg-primary/10! hover:text-primary! text-primary! border-2 border-primary/20!"
//                 onClick={() => signIn()}
//               >
//                 <LogIn />
//                 Log in
//               </SidebarMenuButton>
//             </SidebarMenuItem>
//           )}
//         </SidebarMenu>
//       </SidebarFooter>
//       <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
//         <DialogTitle hidden>Settings</DialogTitle>
//         <DialogContent className="sm:max-w-4xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden border-2 border-primary/20 shadow-lg shadow-primary/10">
//           <Tabs
//             value={activeTab}
//             onValueChange={setActiveTab}
//             className="h-full flex flex-col max-h-[90vh]"
//           >
//             <div className="border-b flex items-center shrink-0">
//               <TabsList className="bg-transparent h-auto p-0 flex gap-4 w-full justify-start overflow-x-auto no-scrollbar px-6 py-3">
//                 <TabsTrigger
//                   value="appearance"
//                   className="data-active:bg-primary/10 data-active:text-primary px-3 py-2 rounded-md transition-colors"
//                 >
//                   Appearance
//                 </TabsTrigger>
//                 <TabsTrigger
//                   value="connections"
//                   className="data-active:bg-primary/10 data-active:text-primary px-3 py-2 rounded-md transition-colors"
//                 >
//                   Connections
//                 </TabsTrigger>
//                 <TabsTrigger
//                   value="api-keys"
//                   className="data-active:bg-primary/10 data-active:text-primary px-3 py-2 rounded-md transition-colors"
//                 >
//                   API Keys
//                 </TabsTrigger>
//                 <TabsTrigger
//                   value="notifications"
//                   className="data-active:bg-primary/10 data-active:text-primary px-3 py-2 rounded-md transition-colors"
//                 >
//                   Notifications
//                 </TabsTrigger>
//               </TabsList>
//             </div>

//             <div className="flex-1 overflow-y-auto no-scrollbar">
//               <TabsContent value="connections" className="m-0 h-full px-6 py-4">
//                 <ConnectionSettings />
//               </TabsContent>
//               <TabsContent
//                 value="api-keys"
//                 className="m-0 h-full px-6 py-4 flex items-center justify-center"
//               >
//                 <ApiKeySettings />
//               </TabsContent>
//               <TabsContent
//                 value="notifications"
//                 className="m-0 h-full px-6 py-4 flex items-center justify-center"
//               >
//                 <p className="text-muted-foreground">
//                   Notification settings blank for now.
//                 </p>
//               </TabsContent>
//             </div>
//           </Tabs>
//         </DialogContent>
//       </Dialog>
//     </Sidebar>
//   );
// }
