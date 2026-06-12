"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { loginAction, type LoginState } from "./actions";

type LoginFormProps = {
  from: string;
};

const initialState: LoginState = {
  error: null,
};

export function LoginForm({ from }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <Card className="w-full max-w-sm border-border bg-surface shadow-sm">
      <CardHeader>
        <CardTitle className="font-serif text-2xl text-ink">登录铁蛋的网站</CardTitle>
        <CardDescription>输入管理员账号，继续访问你的私人收藏册。</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="from" value={from} />

          <label className="block space-y-2 text-sm font-medium text-ink">
            <span>用户名</span>
            <Input
              name="username"
              autoComplete="username"
              required
              className="bg-surface"
            />
          </label>

          <label className="block space-y-2 text-sm font-medium text-ink">
            <span>密码</span>
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="bg-surface"
            />
          </label>

          {state.error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "正在登录..." : "登录"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
