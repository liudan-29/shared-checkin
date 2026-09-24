"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { useSession } from "@/lib/use-session";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionLoading && session) {
      router.replace("/");
    }
  }, [sessionLoading, session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const supabase = getSupabase();
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        const errorText = `${signInError.name} ${signInError.message}`.toLowerCase();
        if (
          signInError.name === "AuthRetryableFetchError" ||
          /failed to fetch|network|timeout|load failed/.test(errorText)
        ) {
          setError("网络连接失败，请检查网络后重试");
        } else if (signInError.code === "invalid_credentials") {
          setError("邮箱或密码不对");
        } else if (signInError.code === "email_not_confirmed") {
          setError("这个邮箱还没有完成确认");
        } else {
          setError("登录失败，请稍后重试");
        }
        return;
      }
      router.replace("/");
    } catch {
      setError("网络连接失败，请检查网络后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-start justify-center px-4 pt-[20vh]">
      <div className="w-full max-w-[343px]">
        <div className="mb-8 flex flex-col items-center">
          <div
            className="mb-4 flex h-[72px] w-[72px] -rotate-[4deg] items-center justify-center rounded-md bg-danger shadow-md"
            style={{ boxShadow: "var(--shadow-md)" }}
          >
            <div
              className="flex h-full w-full items-center justify-center rounded-[6px]"
              style={{
                border: "1.5px solid var(--color-text-on-accent)",
                margin: "4px",
                width: "calc(100% - 8px)",
                height: "calc(100% - 8px)",
              }}
            >
              <span
                className="font-display text-primary-foreground"
                style={{ fontSize: "24px", writingMode: "vertical-rl" }}
              >
                打卡
              </span>
            </div>
          </div>
          <h1 className="font-display text-xl text-foreground">三人打卡</h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            你的拖延，组员看得见
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="h-12"
              error={Boolean(error)}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="h-12"
              error={Boolean(error)}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-danger">
              <CircleAlert className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="h-12 w-full"
            loading={submitting}
            loadingText="登录中…"
          >
            进入
          </Button>
        </form>
      </div>
    </main>
  );
}
