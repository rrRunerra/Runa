"use client";

import * as React from "react";
import { useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  ChevronRight,
  Sparkles,
  Layers,
  Sliders,
  ToggleLeft,
  Menu,
  Eye,
  Bell,
  CheckCircle,
  Navigation,
  Info,
  AlertTriangle,
  RotateCw,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Play,
  Check,
  ExternalLink,
  Moon,
  Sun,
  ArrowRight,
  User,
} from "lucide-react";

// Import UI components
import { Button } from "@/components/ui/button";
import {
  ButtonGroup,
  ButtonGroupText,
  ButtonGroupSeparator,
} from "@/components/ui/button-group";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Kbd } from "@/components/ui/kbd";
import { Badge } from "@/components/ui/badge";

import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Slider } from "@/components/ui/slider";

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
} from "@/components/ui/menubar";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemGroup,
} from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

import RrAppMenu from "@/components/rrComponents/rrAppMenu";
import { useSession } from "next-auth/react";

// Interactive Showcase Card with Tabs (Preview / Code)
interface ShowcaseCardProps {
  title: string;
  description: string;
  code: string;
  children: React.ReactNode;
  className?: string;
}

function ShowcaseCard({
  title,
  description,
  code,
  children,
  className,
}: ShowcaseCardProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");

  return (
    <Card
      className={cn(
        "bg-neutral-900/30 border-neutral-800 flex flex-col overflow-hidden",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 border-b border-neutral-800/40 bg-neutral-900/10">
        <div className="space-y-1">
          <CardTitle className="text-xs font-semibold text-neutral-200">
            {title}
          </CardTitle>
          <CardDescription className="text-[11px] text-neutral-400">
            {description}
          </CardDescription>
        </div>
        <div className="flex bg-neutral-950 p-0.5 rounded-md border border-neutral-800">
          <button
            onClick={() => setActiveTab("preview")}
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer",
              activeTab === "preview"
                ? "bg-neutral-800 text-indigo-400"
                : "text-neutral-500 hover:text-neutral-300",
            )}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer",
              activeTab === "code"
                ? "bg-neutral-800 text-indigo-400"
                : "text-neutral-500 hover:text-neutral-300",
            )}
          >
            Code
          </button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center p-5 min-h-[140px]">
        {activeTab === "preview" ? (
          children
        ) : (
          <div className="relative w-full h-full flex flex-col">
            <pre className="text-[10px] font-mono p-3 bg-neutral-950/80 rounded-lg border border-neutral-850 text-indigo-300/90 overflow-x-auto max-h-48 w-full leading-normal">
              <code>{code}</code>
            </pre>
            <Button
              size="xs"
              variant="outline"
              className="absolute top-2 right-2 text-[9px] h-5 bg-neutral-900 border-neutral-800 hover:bg-neutral-800"
              onClick={() => {
                navigator.clipboard.writeText(code);
                toast.success("Code copied to clipboard!");
              }}
            >
              Copy
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ComponentShowcasePage() {
  const [activeCategory, setActiveCategory] = useState("actions");
  const [cropperOpen, setCropperOpen] = useState(false);
  const [sliderValue, setSliderValue] = useState([50]);
  const [progressValue, setProgressValue] = useState(65);
  const [otpValue, setOtpValue] = useState("");
  const { data: session } = useSession();

  const categories = [
    { id: "actions", name: "Actions & Buttons", icon: Sparkles },
    { id: "forms", name: "Forms & Inputs", icon: Sliders },
    { id: "navigation", name: "Navigation", icon: Navigation },
    { id: "overlays", name: "Overlays & Dialogs", icon: Layers },
    { id: "layout", name: "Layout & Structure", icon: Menu },
    { id: "feedback", name: "Feedback & Status", icon: Bell },
  ];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-neutral-100 flex flex-col md:flex-row">
        {/* Toast Container */}
        <Toaster />

        {/* Sidebar */}
        <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-neutral-800 bg-neutral-900/40 backdrop-blur-md p-6 flex flex-col shrink-0">
          <div className="flex items-center gap-2 mb-8">
            <div className="p-2 bg-linear-to-tr from-indigo-500 to-purple-500 rounded-lg text-white">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight">
                Runa Design System
              </h1>
              <p className="text-xs text-neutral-500">Component Gallery</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5 flex-1">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? "bg-neutral-800 text-indigo-400 border border-neutral-700/50 shadow-sm"
                      : "text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200"
                  }`}
                >
                  <Icon className="size-4" />
                  {cat.name}
                  {isActive && (
                    <ChevronRight className="size-3.5 ml-auto text-indigo-400" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-neutral-800/60 flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarImage
                src="https://github.com/nutlope.png"
                alt="User Avatar"
              />
              <AvatarFallback className="text-[10px] font-semibold bg-indigo-900/30 text-indigo-400">
                RU
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs font-semibold">Admin Workspace</p>
              <p className="text-[10px] text-neutral-500">runa-dev-env</p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full overflow-y-auto">
          {/* Header */}
          <header className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-indigo-500 uppercase">
                Documentation
              </span>
              <h2 className="text-2xl font-bold tracking-tight mt-1">
                Component Library
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Explore, inspect, and interact with the custom UI components
                built for the Polaris application.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("Syncing latest design tokens...")}
              >
                <RotateCw
                  className="size-3 mr-1.5 animate-spin"
                  style={{ animationDuration: "3s" }}
                />
                Sync Tokens
              </Button>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
              >
                <Sparkles className="size-3.5 mr-1.5" />
                Theme Customizer
              </Button>
            </div>
          </header>

          {/* Dynamic Content Sections */}
          <div className="space-y-12">
            {/* Category: Actions & Buttons */}
            {activeCategory === "actions" && (
              <section className="space-y-8 animate-in fade-in-50 duration-200">
                <div className="border-b border-neutral-800 pb-4">
                  <h3 className="text-base font-bold">Actions & Controls</h3>
                  <p className="text-xs text-neutral-400">
                    Buttons, toggles, badges, and keyboard shortcuts used to
                    trigger interactions.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Button Component */}
                  <ShowcaseCard
                    title="Buttons"
                    description="Multiple variants, sizes, and states for generic user actions."
                    code={`import { Button } from "@/components/ui/button"

// Variants
<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="xs">Extra Small</Button>
<Button size="sm">Small</Button>
<Button size="default">Default</Button>`}
                  >
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="default" size="sm">
                          Primary
                        </Button>
                        <Button variant="secondary" size="sm">
                          Secondary
                        </Button>
                        <Button variant="outline" size="sm">
                          Outline
                        </Button>
                        <Button variant="ghost" size="sm">
                          Ghost
                        </Button>
                        <Button variant="destructive" size="sm">
                          Destructive
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <Button size="xs">Extra Small</Button>
                        <Button size="sm">Small</Button>
                        <Button size="default">Default</Button>
                        <Button size="lg">Large</Button>
                      </div>
                    </div>
                  </ShowcaseCard>

                  {/* Button Group Component */}
                  <ShowcaseCard
                    title="Button Groups"
                    description="Combining buttons into a unified container segment."
                    code={`import { ButtonGroup, ButtonGroupText, ButtonGroupSeparator } from "@/components/ui/button-group"

<ButtonGroup>
  <Button variant="outline">Left</Button>
  <ButtonGroupSeparator />
  <Button variant="outline">Right</Button>
</ButtonGroup>`}
                  >
                    <div className="space-y-4">
                      <ButtonGroup>
                        <Button variant="outline" size="sm">
                          Left
                        </Button>
                        <ButtonGroupSeparator />
                        <Button variant="outline" size="sm">
                          Middle
                        </Button>
                        <ButtonGroupSeparator />
                        <Button variant="outline" size="sm">
                          Right
                        </Button>
                      </ButtonGroup>

                      <ButtonGroup>
                        <ButtonGroupText className="text-[10px] text-neutral-400">
                          Search
                        </ButtonGroupText>
                        <Input
                          className="h-7 w-32 rounded-none border-x-0 bg-transparent text-xs"
                          placeholder="Query..."
                        />
                        <Button variant="default" size="sm">
                          Go
                        </Button>
                      </ButtonGroup>
                    </div>
                  </ShowcaseCard>

                  {/* Toggle & Toggle Group Component */}
                  <ShowcaseCard
                    title="Toggles & Toggle Groups"
                    description="Two-state buttons and selection button sets."
                    code={`import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

<Toggle size="sm">Fav</Toggle>

<ToggleGroup type="multiple" variant="outline">
  <ToggleGroupItem value="bold">B</ToggleGroupItem>
  <ToggleGroupItem value="italic">I</ToggleGroupItem>
</ToggleGroup>`}
                  >
                    <div className="flex gap-4 items-center">
                      <Toggle aria-label="Toggle favorite" size="sm">
                        <Sparkles className="size-3.5 mr-1" /> Fav
                      </Toggle>

                      <ToggleGroup type="multiple" variant="outline" size="sm">
                        <ToggleGroupItem value="bold" aria-label="Toggle bold">
                          B
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="italic"
                          aria-label="Toggle italic"
                        >
                          I
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="underline"
                          aria-label="Toggle underline"
                        >
                          U
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </ShowcaseCard>

                  {/* Badges & Keyboard Shortcuts (Kbd) */}
                  <ShowcaseCard
                    title="Badges & Keyboard Keys (Kbd)"
                    description="Visual labels for status and keyboard shortcut key caps."
                    code={`import { Badge } from "@/components/ui/badge"
import { Kbd } from "@/components/ui/kbd"

<Badge variant="default">New</Badge>
<Badge variant="secondary">In Progress</Badge>

<Kbd>⌘</Kbd>
<Kbd>K</Kbd>`}
                  >
                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex gap-2">
                        <Badge variant="default">New</Badge>
                        <Badge variant="secondary">Active</Badge>
                        <Badge variant="outline">Pending</Badge>
                        <Badge variant="destructive">Failed</Badge>
                      </div>
                      <div className="flex gap-1.5 items-center">
                        <span className="text-xs text-neutral-400">Press</span>
                        <Kbd>⌘</Kbd>
                        <Kbd>K</Kbd>
                        <span className="text-xs text-neutral-400">
                          to search
                        </span>
                      </div>
                    </div>
                  </ShowcaseCard>
                  <RrAppMenu session={session}></RrAppMenu>
                </div>
              </section>
            )}

            {/* Category: Forms & Inputs */}
            {activeCategory === "forms" && (
              <section className="space-y-8 animate-in fade-in-50 duration-200">
                <div className="border-b border-neutral-800 pb-4">
                  <h3 className="text-base font-bold">Forms & Inputs</h3>
                  <p className="text-xs text-neutral-400">
                    Standard controls and wrapping containers for user input
                    fields.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Text Inputs & Input Groups */}
                  <ShowcaseCard
                    title="Text Inputs & Groups"
                    description="Input boxes with inline add-ons or action buttons."
                    code={`import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"

<Input placeholder="Text..." />

<InputGroup>
  <InputGroupAddon>https://</InputGroupAddon>
  <InputGroupInput placeholder="domain" />
</InputGroup>`}
                  >
                    <div className="space-y-3">
                      <Input placeholder="Standard text input" />

                      <InputGroup>
                        <InputGroupAddon className="bg-neutral-800 border-r border-neutral-700/50 text-[10px] text-neutral-400 px-2.5">
                          https://
                        </InputGroupAddon>
                        <InputGroupInput
                          className="bg-transparent"
                          placeholder="example.com"
                        />
                      </InputGroup>

                      <Textarea
                        placeholder="Multi-line comments area..."
                        className="min-h-16"
                      />
                    </div>
                  </ShowcaseCard>

                  {/* Input OTP */}
                  <ShowcaseCard
                    title="One-Time Password (OTP)"
                    description="Segmented digit slots for verification codes."
                    code={`import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"

<InputOTP maxLength={6}>
  <InputOTPGroup>
    <InputOTPSlot index={0} />
    <InputOTPSlot index={1} />
  </InputOTPGroup>
</InputOTP>`}
                  >
                    <div className="space-y-3">
                      <InputOTP
                        maxLength={6}
                        value={otpValue}
                        onChange={setOtpValue}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                      <p className="text-[10px] text-neutral-500">
                        Current code: {otpValue || "Empty"}
                      </p>
                    </div>
                  </ShowcaseCard>

                  {/* Selection Controls */}
                  <ShowcaseCard
                    title="Checkbox, Radio & Switch"
                    description="Boolean toggles and multi-choice selections."
                    code={`import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"

<Checkbox id="chk" />
<Switch id="sw" />`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Checkbox id="demo-check" />
                        <Label
                          htmlFor="demo-check"
                          className="text-xs cursor-pointer"
                        >
                          Accept terms and conditions
                        </Label>
                      </div>

                      <RadioGroup defaultValue="opt-1" className="space-y-1">
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="opt-1" id="r1" />
                          <Label
                            htmlFor="r1"
                            className="text-xs cursor-pointer"
                          >
                            Option A
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="opt-2" id="r2" />
                          <Label
                            htmlFor="r2"
                            className="text-xs cursor-pointer"
                          >
                            Option B
                          </Label>
                        </div>
                      </RadioGroup>

                      <div className="flex items-center justify-between p-2 rounded-lg border border-neutral-800 bg-neutral-950/40">
                        <Label
                          htmlFor="demo-switch"
                          className="text-xs cursor-pointer"
                        >
                          Enable notifications
                        </Label>
                        <Switch id="demo-switch" />
                      </div>
                    </div>
                  </ShowcaseCard>

                  {/* Select & Native Select */}
                  <ShowcaseCard
                    title="Dropdown Select & Native Select"
                    description="Drop-down list select menus."
                    code={`import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

<Select>
  <SelectTrigger><SelectValue /></SelectTrigger>
  <SelectContent><SelectItem value="a">A</SelectItem></SelectContent>
</Select>`}
                  >
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-neutral-400 font-medium">
                          Custom Overlay Select
                        </span>
                        <Select defaultValue="medium">
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">Small size</SelectItem>
                            <SelectItem value="medium">Medium size</SelectItem>
                            <SelectItem value="large">Large size</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] text-neutral-400 font-medium">
                          Native System Select
                        </span>
                        <NativeSelect className="w-full">
                          <NativeSelectOption value="1">
                            USD ($)
                          </NativeSelectOption>
                          <NativeSelectOption value="2">
                            EUR (€)
                          </NativeSelectOption>
                          <NativeSelectOption value="3">
                            GBP (£)
                          </NativeSelectOption>
                        </NativeSelect>
                      </div>
                    </div>
                  </ShowcaseCard>

                  {/* Sliders */}
                  <ShowcaseCard
                    title="Slider"
                    description="Interactive value range sliders."
                    code={`import { Slider } from "@/components/ui/slider"

<Slider value={[50]} max={100} step={1} />`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] text-neutral-400 font-medium">
                        <span>Volume Level</span>
                        <span>{sliderValue[0]}%</span>
                      </div>
                      <Slider
                        value={sliderValue}
                        onValueChange={setSliderValue}
                        max={100}
                        step={1}
                      />
                    </div>
                  </ShowcaseCard>

                  {/* Field wrappers & Fieldsets */}
                  <ShowcaseCard
                    title="Field Wrapper"
                    description="Standardized container showing Label, Description, and Errors."
                    code={`import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field"

<Field>
  <FieldLabel>API Token</FieldLabel>
  <FieldDescription>Details...</FieldDescription>
  <Input />
  <FieldError errors={[{ message: "Error msg" }]} />
</Field>`}
                  >
                    <Field>
                      <FieldLabel htmlFor="api-key">API Token Key</FieldLabel>
                      <FieldDescription>
                        You can find this key in your profile dashboard.
                      </FieldDescription>
                      <Input
                        id="api-key"
                        placeholder="rt_xxxxxx"
                        type="password"
                      />
                      <FieldError
                        errors={[
                          {
                            message: "API Token must be at least 16 characters",
                          },
                        ]}
                      />
                    </Field>
                  </ShowcaseCard>
                </div>
              </section>
            )}

            {/* Category: Navigation */}
            {activeCategory === "navigation" && (
              <section className="space-y-8 animate-in fade-in-50 duration-200">
                <div className="border-b border-neutral-800 pb-4">
                  <h3 className="text-base font-bold">Navigation & Menus</h3>
                  <p className="text-xs text-neutral-400">
                    Breadcrumbs, menus, paginations, and list link components.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Navigation Menu & Breadcrumb */}
                  <ShowcaseCard
                    title="Breadcrumbs & Navigation Menu"
                    description="Path trails and top bar layout navigations."
                    code={`import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem><BreadcrumbPage>Settings</BreadcrumbPage></BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>`}
                  >
                    <div className="space-y-6">
                      <Breadcrumb>
                        <BreadcrumbList>
                          <BreadcrumbItem>
                            <BreadcrumbLink href="#">Home</BreadcrumbLink>
                          </BreadcrumbItem>
                          <BreadcrumbSeparator />
                          <BreadcrumbItem>
                            <BreadcrumbLink href="#">Settings</BreadcrumbLink>
                          </BreadcrumbItem>
                          <BreadcrumbSeparator />
                          <BreadcrumbItem>
                            <BreadcrumbPage>Billing</BreadcrumbPage>
                          </BreadcrumbItem>
                        </BreadcrumbList>
                      </Breadcrumb>

                      <Separator className="bg-neutral-800" />

                      <div className="p-1.5 bg-neutral-950/60 rounded-xl border border-neutral-800">
                        <Menubar className="border-0 bg-transparent shadow-none">
                          <MenubarMenu>
                            <MenubarTrigger className="text-xs cursor-pointer">
                              File
                            </MenubarTrigger>
                            <MenubarContent>
                              <MenubarItem>
                                New File{" "}
                                <span className="ml-auto text-[9px] text-neutral-500">
                                  ⌘N
                                </span>
                              </MenubarItem>
                              <MenubarItem>
                                New Window{" "}
                                <span className="ml-auto text-[9px] text-neutral-500">
                                  ⌘⇧N
                                </span>
                              </MenubarItem>
                              <MenubarSeparator />
                              <MenubarItem>
                                Save{" "}
                                <span className="ml-auto text-[9px] text-neutral-500">
                                  ⌘S
                                </span>
                              </MenubarItem>
                            </MenubarContent>
                          </MenubarMenu>
                          <MenubarMenu>
                            <MenubarTrigger className="text-xs cursor-pointer">
                              Edit
                            </MenubarTrigger>
                            <MenubarContent>
                              <MenubarItem>
                                Undo{" "}
                                <span className="ml-auto text-[9px] text-neutral-500">
                                  ⌘Z
                                </span>
                              </MenubarItem>
                              <MenubarItem>
                                Redo{" "}
                                <span className="ml-auto text-[9px] text-neutral-500">
                                  ⌘⇧Z
                                </span>
                              </MenubarItem>
                            </MenubarContent>
                          </MenubarMenu>
                        </Menubar>
                      </div>
                    </div>
                  </ShowcaseCard>

                  {/* Context & Dropdown Menus */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ShowcaseCard
                      title="Context Menu"
                      description="Triggers custom actions upon right-click."
                      code={`import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from "@/components/ui/context-menu"

<ContextMenu>
  <ContextMenuTrigger>Right-click area</ContextMenuTrigger>
  <ContextMenuContent><ContextMenuItem>Action</ContextMenuItem></ContextMenuContent>
</ContextMenu>`}
                    >
                      <ContextMenu>
                        <ContextMenuTrigger className="flex h-24 w-full items-center justify-center rounded-lg border border-dashed border-neutral-800 bg-neutral-950/20 text-xs text-neutral-400 cursor-context-menu">
                          Right-click inside this zone
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem>Edit Entity</ContextMenuItem>
                          <ContextMenuItem>Duplicate</ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem className="text-red-500">
                            Delete
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    </ShowcaseCard>

                    <ShowcaseCard
                      title="Dropdown Menu"
                      description="Triggers lists of options via click buttons."
                      code={`import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"

<DropdownMenu>
  <DropdownMenuTrigger><Button>Open</Button></DropdownMenuTrigger>
  <DropdownMenuContent><DropdownMenuItem>Item</DropdownMenuItem></DropdownMenuContent>
</DropdownMenu>`}
                    >
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">
                              Options Menu
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              Profile Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem>Subscriptions</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-500">
                              Log out
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </ShowcaseCard>
                  </div>

                  {/* Pagination */}
                  <ShowcaseCard
                    title="Pagination"
                    description="Grid item pagination buttons."
                    code={`import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination"

<Pagination>
  <PaginationContent>
    <PaginationItem><PaginationLink href="#">1</PaginationLink></PaginationItem>
  </PaginationContent>
</Pagination>`}
                  >
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious href="#" />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#" isActive>
                            1
                          </PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationLink href="#">2</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext href="#" />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </ShowcaseCard>
                </div>
              </section>
            )}

            {/* Category: Overlays & Dialogs */}
            {activeCategory === "overlays" && (
              <section className="space-y-8 animate-in fade-in-50 duration-200">
                <div className="border-b border-neutral-800 pb-4">
                  <h3 className="text-base font-bold">Overlays & Dialogs</h3>
                  <p className="text-xs text-neutral-400">
                    Modal overlays, drawers, tooltips, and image editing
                    croppers.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Modals & Dialogs */}
                  <ShowcaseCard
                    title="Standard Dialog & Alert Dialog"
                    description="Overlay panels blocking or asking for actions."
                    code={`import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogTrigger, AlertDialogContent } from "@/components/ui/alert-dialog"

<Dialog>
  <DialogTrigger><Button>Open</Button></DialogTrigger>
  <DialogContent>Content...</DialogContent>
</Dialog>`}
                  >
                    <div className="flex flex-wrap gap-3 justify-center">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm">Open Modal</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>View Details</DialogTitle>
                            <DialogDescription>
                              This modal provides detailed metadata for the
                              selected entry.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4 text-xs text-neutral-400">
                            Custom content goes here. You can embed any form
                            input or card.
                          </div>
                          <DialogFooter>
                            <Button size="sm">Acknowledge</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            Alert Dialog
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Are you absolutely sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will
                              permanently delete your account data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600 hover:bg-red-500 text-white font-semibold">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </ShowcaseCard>

                  {/* Drawers & Sheets */}
                  <ShowcaseCard
                    title="Drawer & Sheet (Slide-out)"
                    description="Sliding overlays from screen edges."
                    code={`import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer"

<Sheet>
  <SheetTrigger><Button>Open</Button></SheetTrigger>
  <SheetContent side="right">Content</SheetContent>
</Sheet>`}
                  >
                    <div className="flex flex-wrap gap-3 justify-center">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button size="sm" variant="outline">
                            Open Sheet (Right)
                          </Button>
                        </SheetTrigger>
                        <SheetContent>
                          <SheetHeader>
                            <DialogTitle>Console Panel</DialogTitle>
                            <DialogDescription>
                              Configure environment options.
                            </DialogDescription>
                          </SheetHeader>
                          <div className="py-4 space-y-4">
                            <Field>
                              <FieldLabel>Port</FieldLabel>
                              <Input placeholder="3000" />
                            </Field>
                          </div>
                        </SheetContent>
                      </Sheet>

                      <Drawer>
                        <DrawerTrigger asChild>
                          <Button size="sm" variant="outline">
                            Open Drawer (Bottom)
                          </Button>
                        </DrawerTrigger>
                        <DrawerContent>
                          <div className="mx-auto w-full max-w-sm">
                            <DrawerHeader>
                              <DrawerTitle>Actions Menu</DrawerTitle>
                              <DrawerDescription>
                                Quick dashboard shortcut tools.
                              </DrawerDescription>
                            </DrawerHeader>
                            <div className="p-4 flex flex-col gap-2">
                              <Button size="sm">Restart Dev Server</Button>
                              <Button size="sm" variant="secondary">
                                Clear Cache
                              </Button>
                            </div>
                            <DrawerFooter>
                              <DrawerClose asChild>
                                <Button variant="outline" size="sm">
                                  Dismiss
                                </Button>
                              </DrawerClose>
                            </DrawerFooter>
                          </div>
                        </DrawerContent>
                      </Drawer>
                    </div>
                  </ShowcaseCard>

                  {/* Popovers, Tooltips & Hover Cards */}
                  <ShowcaseCard
                    title="Popovers, Tooltips & Hover Cards"
                    description="Floating contextual elements showing metadata."
                    code={`import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

<Tooltip>
  <TooltipTrigger>Hover</TooltipTrigger>
  <TooltipContent>Tip content</TooltipContent>
</Tooltip>`}
                  >
                    <div className="flex flex-wrap gap-4 justify-center items-center">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="sm" variant="outline">
                            Popover Info
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-4">
                          <h4 className="text-xs font-semibold mb-1">
                            Server Active
                          </h4>
                          <p className="text-[10px] text-neutral-400">
                            Response time: 42ms. Region: us-east-1.
                          </p>
                        </PopoverContent>
                      </Popover>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="p-2 border border-neutral-800 bg-neutral-900 rounded-lg cursor-help text-xs">
                            Hover Me
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-[10px]">Useful tooltip details!</p>
                        </TooltipContent>
                      </Tooltip>

                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <span className="text-xs text-indigo-400 underline cursor-pointer">
                            @nextjs
                          </span>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-64 p-3">
                          <div className="flex gap-2">
                            <Avatar className="size-6">
                              <AvatarImage src="https://github.com/vercel.png" />
                              <AvatarFallback>NX</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-bold">Next.js</p>
                              <p className="text-[10px] text-neutral-400 mt-0.5">
                                The React framework for the Web. Developed by
                                Vercel.
                              </p>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                  </ShowcaseCard>

                  {/* Image Cropper Dialog */}
                  <ShowcaseCard
                    title="Image Cropper Dialog"
                    description="Modal showing image cropping guide frame."
                    code={`import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog"

<ImageCropperDialog
  open={open}
  onOpenChange={setOpen}
  imageSrc="https://image-url..."
  aspectRatio={1}
  onCrop={(file) => console.log(file)}
/>`}
                  >
                    <div className="flex justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCropperOpen(true)}
                      >
                        Launch Cropper Tool
                      </Button>
                      <ImageCropperDialog
                        open={cropperOpen}
                        onOpenChange={setCropperOpen}
                        imageSrc="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop"
                        aspectRatio={1}
                        title="Crop Profile Avatar"
                        onCrop={(file) => {
                          toast.success(
                            `Cropped image successfully! File size: ${Math.round(file.size / 1024)} KB`,
                          );
                        }}
                      />
                    </div>
                  </ShowcaseCard>
                </div>
              </section>
            )}

            {/* Category: Layout & Structure */}
            {activeCategory === "layout" && (
              <section className="space-y-8 animate-in fade-in-50 duration-200">
                <div className="border-b border-neutral-800 pb-4">
                  <h3 className="text-base font-bold">
                    Layout & Content Structure
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Components designed to nest and display information
                    beautifully.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Tabs & Accordion */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ShowcaseCard
                      title="Tabs Switcher"
                      description="Switch between multiple tabs within one container."
                      code={`import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

<Tabs defaultValue="profile">
  <TabsList>
    <TabsTrigger value="profile">Profile</TabsTrigger>
  </TabsList>
  <TabsContent value="profile">Tab content...</TabsContent>
</Tabs>`}
                    >
                      <Tabs defaultValue="account" className="w-full">
                        <TabsList className="grid grid-cols-2 bg-neutral-950 p-1 border border-neutral-800">
                          <TabsTrigger
                            value="account"
                            className="text-xs cursor-pointer"
                          >
                            Profile
                          </TabsTrigger>
                          <TabsTrigger
                            value="password"
                            className="text-xs cursor-pointer"
                          >
                            Security
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent
                          value="account"
                          className="pt-3 text-xs text-neutral-400"
                        >
                          Manage public details and email addresses.
                        </TabsContent>
                        <TabsContent
                          value="password"
                          className="pt-3 text-xs text-neutral-400"
                        >
                          Configure passwords and MFA methods.
                        </TabsContent>
                      </Tabs>
                    </ShowcaseCard>

                    <ShowcaseCard
                      title="Accordion Items"
                      description="Stacked headers that expand to show body areas."
                      code={`import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"

<Accordion type="single" collapsible>
  <AccordionItem value="1">
    <AccordionTrigger>Toggle trigger</AccordionTrigger>
    <AccordionContent>Body details...</AccordionContent>
  </AccordionItem>
</Accordion>`}
                    >
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                          <AccordionTrigger className="cursor-pointer text-xs">
                            Is it accessible?
                          </AccordionTrigger>
                          <AccordionContent className="text-neutral-400">
                            Yes. It adheres to the WAI-ARIA design pattern.
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                          <AccordionTrigger className="cursor-pointer text-xs">
                            Is it responsive?
                          </AccordionTrigger>
                          <AccordionContent className="text-neutral-400">
                            Yes, it adapts flawlessly to mobile viewports.
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </ShowcaseCard>
                  </div>

                  {/* Empty state & List Items */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ShowcaseCard
                      title="Empty State Card"
                      description="Placeholder display when no items exist."
                      code={`import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"

<Empty>
  <EmptyHeader>
    <EmptyTitle>No database records</EmptyTitle>
    <EmptyDescription>Add code...</EmptyDescription>
  </EmptyHeader>
</Empty>`}
                    >
                      <Empty className="border-neutral-800 bg-neutral-950/20">
                        <EmptyHeader>
                          <EmptyTitle className="text-xs">
                            No entries found
                          </EmptyTitle>
                          <EmptyDescription className="text-[10px]">
                            Create your first database model to get started.
                          </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                          <Button size="xs">Create Entry</Button>
                        </EmptyContent>
                      </Empty>
                    </ShowcaseCard>

                    <ShowcaseCard
                      title="Item Components"
                      description="Standardized list items with media, titles, and action options."
                      code={`import { Item, ItemMedia, ItemContent, ItemTitle } from "@/components/ui/item"

<Item variant="outline">
  <ItemMedia>Icon</ItemMedia>
  <ItemContent><ItemTitle>Text</ItemTitle></ItemContent>
</Item>`}
                    >
                      <ItemGroup>
                        <Item
                          variant="outline"
                          size="sm"
                          className="bg-neutral-950/40 border-neutral-800"
                        >
                          <ItemMedia variant="icon" className="text-indigo-400">
                            <Sparkles className="size-4" />
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle className="text-xs">
                              Production Host
                            </ItemTitle>
                            <ItemDescription className="text-[10px]">
                              Active environment server cluster
                            </ItemDescription>
                          </ItemContent>
                          <ItemActions>
                            <Badge
                              variant="outline"
                              className="text-[9px] border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                            >
                              ONLINE
                            </Badge>
                          </ItemActions>
                        </Item>
                      </ItemGroup>
                    </ShowcaseCard>
                  </div>

                  {/* Table & Scroll Area */}
                  <ShowcaseCard
                    title="Table Grid & Scroll Area"
                    description="Organizing raw rows of data elements."
                    code={`import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

<ScrollArea className="h-40">
  <Table>
    <TableHeader><TableRow><TableHead>Head</TableHead></TableRow></TableHeader>
    <TableBody><TableRow><TableCell>Cell</TableCell></TableRow></TableBody>
  </Table>
</ScrollArea>`}
                  >
                    <ScrollArea className="h-40 rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-neutral-850 hover:bg-transparent">
                            <TableHead className="text-xs font-semibold text-neutral-400 h-8">
                              Client
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-neutral-400 h-8">
                              Status
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-neutral-400 h-8">
                              Usage
                            </TableHead>
                          </TableRow>
                        </TableHeader>

                        <TableBody>
                          <TableRow className="border-neutral-850 hover:bg-neutral-900/20">
                            <TableCell className="text-xs py-2">
                              Acme Inc
                            </TableCell>
                            <TableCell className="text-xs py-2">
                              <Badge
                                variant="default"
                                className="text-[9px] bg-indigo-900/20 text-indigo-400 border border-indigo-500/20"
                              >
                                Active
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs py-2 font-mono text-[10px]">
                              8.4 GB
                            </TableCell>
                          </TableRow>
                          <TableRow className="border-neutral-850 hover:bg-neutral-900/20">
                            <TableCell className="text-xs py-2">
                              Hooli Corp
                            </TableCell>
                            <TableCell className="text-xs py-2">
                              <Badge
                                variant="outline"
                                className="text-[9px] text-neutral-400 border-neutral-800"
                              >
                                Inactive
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs py-2 font-mono text-[10px]">
                              0.2 GB
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </ShowcaseCard>
                </div>
              </section>
            )}

            {/* Category: Feedback & Status */}
            {activeCategory === "feedback" && (
              <section className="space-y-8 animate-in fade-in-50 duration-200">
                <div className="border-b border-neutral-800 pb-4">
                  <h3 className="text-base font-bold">Feedback & Status</h3>
                  <p className="text-xs text-neutral-400">
                    Indicators showing progress, status updates, toasts, and
                    loading skeletons.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Toasts (Sonner) */}
                  <ShowcaseCard
                    title="Interactive Toasts (Sonner)"
                    description="Triggers temporary toast status messages."
                    code={`import { toast } from "sonner"

<Button onClick={() => toast.success("Completed!")}>Trigger Success</Button>`}
                  >
                    <div className="flex flex-wrap gap-2.5 justify-center">
                      <Button
                        size="sm"
                        onClick={() =>
                          toast.success("Process executed successfully!")
                        }
                      >
                        Trigger Success
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toast.error("Error connecting to host.")}
                      >
                        Trigger Error
                      </Button>
                    </div>
                  </ShowcaseCard>

                  {/* Progress & Spinners */}
                  <ShowcaseCard
                    title="Progress Bars & Spinners"
                    description="Loading progress rails and spinner loops."
                    code={`import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"

<Progress value={65} />
<Spinner />`}
                  >
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] text-neutral-400">
                          <span>Build upload progression</span>
                          <span>{progressValue}%</span>
                        </div>
                        <Progress value={progressValue} className="h-2" />
                      </div>

                      <div className="flex gap-4 items-center">
                        <Spinner className="size-4 text-indigo-500" />
                        <span className="text-xs text-neutral-400">
                          Server compiling...
                        </span>
                      </div>
                    </div>
                  </ShowcaseCard>

                  {/* Skeletons */}
                  <ShowcaseCard
                    title="Content Skeletons"
                    description="Placeholder blocks indicating upcoming loading content."
                    code={`import { Skeleton } from "@/components/ui/skeleton"

<Skeleton className="size-10 rounded-full" />
<Skeleton className="h-4 w-1/3" />`}
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-10 rounded-full bg-neutral-800" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/3 bg-neutral-800" />
                        <Skeleton className="h-3 w-2/3 bg-neutral-800" />
                      </div>
                    </div>
                  </ShowcaseCard>

                  {/* Alert component */}
                  <ShowcaseCard
                    title="Alert Box"
                    description="Important messages styled clearly."
                    code={`import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

<Alert>
  <AlertTitle>Warning</AlertTitle>
  <AlertDescription>Details...</AlertDescription>
</Alert>`}
                  >
                    <Alert>
                      <Info className="size-4 text-indigo-400" />
                      <AlertTitle className="text-xs font-semibold">
                        Deployment Tip
                      </AlertTitle>
                      <AlertDescription className="text-[11px] text-neutral-400">
                        You can speed up subsequent deployment tasks by enabling
                        asset caching inside turbo.json settings.
                      </AlertDescription>
                    </Alert>
                  </ShowcaseCard>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
