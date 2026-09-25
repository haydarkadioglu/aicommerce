"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/stores/app-store";
import { useAuthActions } from "@/hooks/use-api";
import { Loader2, Sparkles, ShieldCheck, KeyRound, User, Mail } from "lucide-react";

export function AuthModal({ open }: { open: boolean }) {
  const mode = useAppStore((s) => s.authModal);
  const setAuthModal = useAppStore((s) => s.setAuthModal);
  const { login, register } = useAuthActions();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => setAuthModal("none");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else if (mode === "register") {
        await register({ email, password, name: name || undefined });
      }
      // reset
      setEmail("");
      setPassword("");
      setName("");
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = () => {
    setEmail("admin@ai-commerce.os");
    setPassword("AdminPass123");
    setAuthModal("login");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden">
        <div className="relative">
          <div className="mesh-bg absolute inset-0 opacity-50 pointer-events-none" />
          <div className="relative p-6">
            <DialogHeader className="text-center">
              <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl brand-gradient text-white">
                <Sparkles className="size-5" />
              </div>
              <DialogTitle className="text-xl">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </DialogTitle>
              <DialogDescription>
                {mode === "login"
                  ? "Sign in to your AI Commerce OS workspace."
                  : "Start building with AI agents in seconds."}
              </DialogDescription>
            </DialogHeader>

            <Tabs
              value={mode === "register" ? "register" : "login"}
              onValueChange={(v) => setAuthModal(v as "login" | "register")}
              className="mt-5"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign in</TabsTrigger>
                <TabsTrigger value="register">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4">
                <form onSubmit={handleSubmit} className="space-y-3">
                  <Field label="Email" icon={<Mail className="size-4" />}>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                    />
                  </Field>
                  <Field label="Password" icon={<KeyRound className="size-4" />}>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </Field>

                  {error && (
                    <p className="text-sm text-destructive" role="alert">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full brand-gradient text-white"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-4">
                <form onSubmit={handleSubmit} className="space-y-3">
                  <Field label="Display name (optional)" icon={<User className="size-4" />}>
                    <Input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </Field>
                  <Field label="Email" icon={<Mail className="size-4" />}>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </Field>
                  <Field label="Password" icon={<KeyRound className="size-4" />}>
                    <Input
                      type="password"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </Field>

                  {error && (
                    <p className="text-sm text-destructive" role="alert">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full brand-gradient text-white"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Create account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative my-5">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                Demo access
              </span>
            </div>

            <button
              type="button"
              onClick={fillDemo}
              className="flex w-full items-center justify-center gap-2 rounded-lg border bg-background/60 px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              <ShieldCheck className="size-4 text-primary" />
              Use admin demo credentials
            </button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              admin@ai-commerce.os · AdminPass123
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </Label>
      {children}
    </div>
  );
}
