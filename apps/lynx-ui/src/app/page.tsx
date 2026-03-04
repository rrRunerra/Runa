// "use client";

// import { useEffect, useState } from "react";
// import { Activity, Server, Terminal, Zap } from "lucide-react";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
//   Badge,
//   Avatar,
//   AvatarFallback,
//   AvatarImage,
// } from "@runa/ui";
// import LynxSideBar from "@/components/lynxSideBar";
// import { lynxSidebarConfig } from "@/config/lynxSidebarConfig";

// interface BotStats {
//   status: string;
//   profile: {
//     name: string;
//     avatar?: string;
//     description: string;
//     discriminator?: string;
//   };
//   stats: {
//     servers: number;
//     commands: number;
//     events: number;
//     ping: number;
//   };
// }

// export default function LynxPage() {
//   const [data, setData] = useState<BotStats | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     let isMounted = true;

//     async function fetchStats() {
//       try {
//         const res = await fetch("/api/stats");
//         if (!res.ok) {
//           throw new Error("Failed to fetch bot data");
//         }
//         const json = await res.json();

//         if (isMounted) setData(json);
//       } catch (err: any) {
//         if (isMounted) setError(err.message);
//       } finally {
//         if (isMounted) setLoading(false);
//       }
//     }

//     fetchStats();

//     return () => {
//       isMounted = false;
//     };
//   }, []);

//   if (loading) {
//     return (
//       <div className="flex h-full w-full items-center justify-center p-8 bg-background text-foreground">
//         <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
//       </div>
//     );
//   }

//   if (error || !data) {
//     return (
//       <div className="flex h-full w-full flex-col items-center justify-center p-8 bg-background text-foreground">
//         <Card className="w-full max-w-md border-destructive">
//           <CardHeader>
//             <CardTitle className="text-destructive flex items-center gap-2">
//               <Activity className="h-5 w-5" /> Error Loading Status
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             <p className="text-muted-foreground">
//               {error || "Could not connect to bot backend."}
//             </p>
//           </CardContent>
//         </Card>
//       </div>
//     );
//   }

//   const { status, profile, stats } = data;
//   const isOnline = status === "online" || status === "idle" || status === "dnd";

//   // Choose correct variants or tailwind colors based on status
//   const badgeVariant = isOnline ? "default" : "destructive";
//   const statusColor =
//     status === "online"
//       ? "bg-green-500"
//       : status === "idle"
//         ? "bg-amber-500"
//         : status === "dnd"
//           ? "bg-red-500"
//           : "bg-gray-500";

//   return (
//     <div className="flex flex-col gap-6 p-6 h-full w-full overflow-y-auto bg-background text-foreground">
//       {/* Header and Status */}
//       <div className="flex items-center justify-between">
//         <h1 className="text-3xl font-bold tracking-tight">Lynx Overview</h1>
//         <div className="flex items-center gap-2">
//           <Badge
//             variant={badgeVariant}
//             className="flex gap-2 items-center px-3 py-1 text-sm shadow-sm transition-all hover:shadow-md"
//           >
//             <span className={`h-2 w-2 rounded-full ${statusColor}`} />
//             <span className="capitalize">{status}</span>
//           </Badge>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
//         {/* Discord Profile Card */}
//         <Card className="col-span-1 xl:col-span-1 border border-border shadow-sm hover:shadow-md transition-shadow bg-card text-card-foreground overflow-hidden flex flex-col relative">
//           <div className="h-24 bg-linear-to-r from-violet-600/30 via-indigo-600/30 to-blue-600/30 w-full" />
//           <CardHeader className="relative pb-2 pt-0 px-6">
//             <div className="absolute -top-12 left-6 rounded-full border-[6px] border-card bg-card p-0.5">
//               <Avatar className="h-20 w-20">
//                 <AvatarImage src={profile.avatar} alt={profile.name} />
//                 <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
//                   {profile.name?.charAt(0) || "L"}
//                 </AvatarFallback>
//               </Avatar>
//               <div
//                 className={`absolute bottom-0 right-0 h-[22px] w-[22px] rounded-full border-4 border-card ${statusColor}`}
//               />
//             </div>
//             <div className="mt-12">
//               <CardTitle className="text-2xl font-bold flex items-center gap-2">
//                 {profile.name}
//               </CardTitle>
//               <CardDescription className="text-sm text-muted-foreground">
//                 #{profile.discriminator || "0000"}
//               </CardDescription>
//             </div>
//           </CardHeader>
//           <CardContent className="grow pt-4">
//             <div className="bg-muted/50 rounded-lg p-3">
//               <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 tracking-wider">
//                 About Me
//               </p>
//               <p className="text-sm leading-relaxed">{profile.description}</p>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Stats Section */}
//         <div className="col-span-1 xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
//           <Card className="flex flex-col justify-center border border-border shadow-sm hover:border-primary/50 transition-colors bg-card hover:bg-card/90 cursor-default">
//             <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
//               <CardTitle className="text-sm font-medium text-muted-foreground whitespace-nowrap">
//                 Servers
//               </CardTitle>
//               <Server className="h-4 w-4 text-primary" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold text-foreground">
//                 {stats.servers}
//               </div>
//               <p className="text-xs text-muted-foreground mt-1">
//                 Active guilds the bot is watching
//               </p>
//             </CardContent>
//           </Card>

//           <Card className="flex flex-col justify-center border border-border shadow-sm hover:border-primary/50 transition-colors bg-card hover:bg-card/90 cursor-default">
//             <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
//               <CardTitle className="text-sm font-medium text-muted-foreground whitespace-nowrap">
//                 Commands Loaded
//               </CardTitle>
//               <Terminal className="h-4 w-4 text-primary" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold text-foreground">
//                 {stats.commands}
//               </div>
//               <p className="text-xs text-muted-foreground mt-1">
//                 Total application commands
//               </p>
//             </CardContent>
//           </Card>

//           <Card className="flex flex-col justify-center border border-border shadow-sm hover:border-primary/50 transition-colors bg-card hover:bg-card/90 cursor-default">
//             <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
//               <CardTitle className="text-sm font-medium text-muted-foreground whitespace-nowrap">
//                 Events Watched
//               </CardTitle>
//               <Zap className="h-4 w-4 text-primary" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold text-foreground">
//                 {stats.events}
//               </div>
//               <p className="text-xs text-muted-foreground mt-1">
//                 Gateway events handling
//               </p>
//             </CardContent>
//           </Card>

//           <Card className="flex flex-col justify-center border border-border shadow-sm hover:border-primary/50 transition-colors bg-card hover:bg-card/90 cursor-default">
//             <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
//               <CardTitle className="text-sm font-medium text-muted-foreground whitespace-nowrap">
//                 WebSocket Ping
//               </CardTitle>
//               <Activity className="h-4 w-4 text-primary" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-3xl font-bold text-foreground">
//                 {stats.ping}ms
//               </div>
//               <p className="text-xs text-muted-foreground mt-1">
//                 Gateway latency
//               </p>
//             </CardContent>
//           </Card>
//         </div>
//       </div>
//     </div>
//   );
// }

import { redirect } from "next/navigation";

export default function Home() {
  redirect("/commands");
}
