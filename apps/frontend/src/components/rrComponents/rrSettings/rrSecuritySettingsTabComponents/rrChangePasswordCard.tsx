import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface RrChangePasswordCardProps {
  isSubmitting: boolean;
  onChangePassword: (current: string, newPass: string) => Promise<void>;
}

export function RrChangePasswordCard({
  isSubmitting,
  onChangePassword,
}: RrChangePasswordCardProps): React.JSX.Element {
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showCurrentPassword, setShowCurrentPassword] =
    useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);
  const [passwordTouched, setPasswordTouched] = useState<boolean>(false);
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    maxLength: false,
    uppercase: false,
    number: false,
    special: false,
  });

  const validatePassword = (value: string): void => {
    setPasswordCriteria({
      length: value.length >= 16,
      maxLength: value.length <= 64,
      uppercase: /[A-Z]/.test(value),
      number: /[0-9]{2,}/.test(value),
      special: /[!@#$%^&*(),.?":{}|<>~'_\-+=/\\[\]`]/.test(value),
    });
  };

  const isPasswordValid =
    !newPassword ||
    (passwordCriteria.length &&
      passwordCriteria.maxLength &&
      passwordCriteria.uppercase &&
      passwordCriteria.number &&
      passwordCriteria.special);

  const handleClear = (): void => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordTouched(false);
  };

  const handleSave = async (): Promise<void> => {
    if (
      !currentPassword ||
      !newPassword ||
      !isPasswordValid ||
      newPassword !== confirmPassword
    ) {
      return;
    }
    await onChangePassword(currentPassword, newPassword);
    handleClear();
  };

  const showSaveBar = !!(currentPassword || newPassword || confirmPassword);

  return (
    <div className="flex flex-col gap-4 text-left">
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sec-current-password">Current Password</Label>
            <div className="relative">
              <Input
                id="sec-current-password"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="h-9 px-3 pr-9"
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                onClick={() => setShowCurrentPassword((v) => !v)}
                aria-label={
                  showCurrentPassword ? "Hide password" : "Show password"
                }
              >
                {showCurrentPassword ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sec-new-password">New Password</Label>
            <div className="relative">
              <Input
                id="sec-new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                maxLength={64}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  validatePassword(e.target.value);
                  if (!passwordTouched) setPasswordTouched(true);
                }}
                onFocus={(e) => {
                  if (!passwordTouched && e.target.value.length > 0)
                    setPasswordTouched(true);
                }}
                onBlur={() => setPasswordTouched(false)}
                placeholder="••••••••"
                className={cn(
                  "h-9 px-3 pr-9",
                  newPassword &&
                    !isPasswordValid &&
                    "border-destructive/55 bg-destructive/5 focus-visible:ring-destructive/30",
                )}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                onClick={() => setShowNewPassword((v) => !v)}
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
              </button>
            </div>

            {(passwordTouched ||
              (newPassword.length > 0 && !isPasswordValid)) && (
              <div className="mt-1.5 p-3 rounded-xl bg-muted/35 border border-border/50 animate-in fade-in slide-in-from-top-1 duration-150">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Password Criteria
                </p>
                <ul className="grid grid-cols-1 gap-1.5">
                  {[
                    { key: "length", label: "Min 16 characters" },
                    { key: "maxLength", label: "Max 64 characters" },
                    { key: "uppercase", label: "One uppercase letter" },
                    { key: "number", label: "Two numbers" },
                    { key: "special", label: "One special character" },
                  ].map((item) => (
                    <li
                      key={item.key}
                      className={cn(
                        "flex items-center gap-2 text-[11px] transition-all duration-200",
                        passwordCriteria[
                          item.key as keyof typeof passwordCriteria
                        ]
                          ? "text-emerald-500 font-medium"
                          : "text-muted-foreground/60",
                      )}
                    >
                      <div
                        className={cn(
                          "size-1.5 rounded-full transition-all",
                          passwordCriteria[
                            item.key as keyof typeof passwordCriteria
                          ]
                            ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                            : "bg-muted-foreground/30",
                        )}
                      />
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sec-confirm-password">Confirm Password</Label>
            <div className="relative">
              <Input
                id="sec-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={cn(
                  "h-9 px-3 pr-9",
                  confirmPassword &&
                    newPassword !== confirmPassword &&
                    "border-destructive/55 bg-destructive/5 focus-visible:ring-destructive/30",
                )}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[11px] text-destructive mt-1">
                Passwords do not match.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Password buttons (Local to Password change) */}
      {showSaveBar && (
        <div className="flex justify-end gap-3 p-4 rounded-xl border border-border bg-muted/10 animate-in fade-in duration-200">
          <Button
            variant="ghost"
            onClick={handleClear}
            className="text-xs h-9 cursor-pointer"
            disabled={isSubmitting}
          >
            Clear Fields
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isSubmitting ||
              !currentPassword ||
              !newPassword ||
              newPassword !== confirmPassword ||
              !isPasswordValid
            }
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl px-5 text-xs h-9 cursor-pointer"
          >
            {isSubmitting ? "Updating..." : "Update Password"}
          </Button>
        </div>
      )}
    </div>
  );
}
