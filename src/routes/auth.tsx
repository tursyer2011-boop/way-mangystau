import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Вход и регистрация — Go Mangystau" },
      {
        name: "description",
        content: "Войдите или зарегистрируйтесь, чтобы размещать грузы и маршруты по Мангистау.",
      },
      { property: "og:title", content: "Вход — Go Mangystau" },
      { property: "og:description", content: "Регистрация отправителей и перевозчиков." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("both");

  const signUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { username, nickname, phone, role },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setOtpEmail(email);
    toast.success("Код подтверждения отправлен на почту");
  };

  const verify = async () => {
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: otpEmail!,
      token: otp.trim(),
      type: "signup",
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Почта подтверждена");
    navigate({ to: "/cabinet" });
  };

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-md px-3 py-8">
        <h1 className="mb-4 text-2xl font-extrabold">Аккаунт Go Mangystau</h1>

        {otpEmail ? (
          <div className="card-elevated space-y-3 p-4">
            <p className="text-sm text-muted-foreground">
              Введите код из письма, отправленного на {otpEmail}. Ссылка в письме тоже работает.
            </p>
            <Label htmlFor="otp">Код подтверждения</Label>
            <Input
              id="otp"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
            />
            <Button className="w-full" disabled={loading} onClick={() => void verify()}>
              Подтвердить
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setOtpEmail(null)}>
              Назад
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="signin">
            <TabsList className="w-full">
              <TabsTrigger className="flex-1" value="signin">
                Вход
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="signup">
                Регистрация
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <div className="card-elevated space-y-3 p-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Пароль</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button className="w-full" disabled={loading} onClick={() => void signIn()}>
                  Войти
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="signup">
              <div className="card-elevated space-y-3 p-4">
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input
                    id="su-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="su-password">Пароль</Label>
                  <Input
                    id="su-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="su-username">Имя (username)</Label>
                  <Input
                    id="su-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="su-nick">Никнейм</Label>
                  <Input
                    id="su-nick"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="su-phone">Телефон</Label>
                  <Input
                    id="su-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 700 000 00 00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Роль</Label>
                  <RadioGroup value={role} onValueChange={setRole}>
                    {[
                      { v: "sender", l: "Отправитель груза" },
                      { v: "carrier", l: "Перевозчик" },
                      { v: "both", l: "Оба" },
                    ].map((r) => (
                      <label key={r.v} className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value={r.v} id={`role-${r.v}`} />
                        {r.l}
                      </label>
                    ))}
                  </RadioGroup>
                </div>
                <Button className="w-full" disabled={loading} onClick={() => void signUp()}>
                  Зарегистрироваться
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link to="/" className="underline">
            Вернуться к объявлениям
          </Link>
        </p>
      </main>
    </div>
  );
}
