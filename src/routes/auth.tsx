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
import { useServerFn } from "@tanstack/react-start";
import { storeVerificationCode, verifyCodeAndRegister } from "@/lib/verification.functions";
import { generatePasscode, sendPasscodeEmail } from "@/lib/emailjs";

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

  const storeCode = useServerFn(storeVerificationCode);
  const verifyCode = useServerFn(verifyCodeAndRegister);

  const sendCode = async (target: string) => {
    const code = generatePasscode();
    const { expiresAt } = await storeCode({ data: { email: target, code } });
    await sendPasscodeEmail(target, code, new Date(expiresAt));
  };

  const signUp = async () => {
    if (!email.trim() || password.length < 6) {
      toast.error("Введите email и пароль (минимум 6 символов)");
      return;
    }
    setLoading(true);
    try {
      await sendCode(email.trim().toLowerCase());
      setOtpEmail(email.trim().toLowerCase());
      setOtp("");
      toast.success("Код подтверждения отправлен на почту");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отправить код");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!otpEmail) return;
    setLoading(true);
    try {
      await sendCode(otpEmail);
      toast.success("Новый код отправлен");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отправить код");
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(otp.trim())) {
      toast.error("Код состоит из 6 цифр");
      return;
    }
    setLoading(true);
    try {
      const res = await verifyCode({
        data: {
          email: otpEmail!,
          code: otp.trim(),
          password,
          username,
          nickname,
          phone,
          role: role as "sender" | "carrier" | "both",
        },
      });
      if (!res.ok) {
        toast.error(
          res.reason === "expired"
            ? "Срок действия кода истёк — запросите новый"
            : res.reason === "invalid"
              ? "Неверный код подтверждения"
              : ("message" in res && res.message) || "Не удалось создать аккаунт",
        );
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: otpEmail!,
        password,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Почта подтверждена, аккаунт создан");
      navigate({ to: "/cabinet" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка подтверждения");
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
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
