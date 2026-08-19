import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { BackButton } from "@/components/BackButton";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CARGO_TYPES, CITY_NAMES, VEHICLE_TYPES } from "@/lib/cities";
import { base64ToBlob, uploadPhoto } from "@/lib/photos";
import { generateListingImage } from "@/lib/ai-image.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Разместить объявление — Go Mangystau" },
      {
        name: "description",
        content: "Опубликуйте маршрут перевозчика или заявку на перевозку груза по Мангистау.",
      },
      { property: "og:title", content: "Разместить объявление — Go Mangystau" },
      { property: "og:description", content: "Маршруты перевозчиков и заявки отправителей." },
    ],
  }),
  component: CreatePage,
});

function CreatePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const genImage = useServerFn(generateListingImage);
  const [busy, setBusy] = useState(false);

  const [fromCity, setFromCity] = useState(CITY_NAMES[0]!);
  const [toCity, setToCity] = useState(CITY_NAMES[1]!);
  const [date, setDate] = useState("");
  const [vehicleType, setVehicleType] = useState(VEHICLE_TYPES[2]!);
  const [capacity, setCapacity] = useState("");
  const [price, setPrice] = useState("");
  const [cargoType, setCargoType] = useState(CARGO_TYPES[0]!);
  const [weight, setWeight] = useState("");
  const [file, setFile] = useState<File | null>(null);

  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="mx-auto max-w-md px-3 py-10 text-center">
          <h1 className="text-xl font-bold">Нужен аккаунт</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Размещать объявления могут только зарегистрированные пользователи.
          </p>
          <Button className="mt-4" onClick={() => navigate({ to: "/auth" })}>
            Войти или зарегистрироваться
          </Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  const resolvePhoto = async (prompt: string) => {
    if (!user) return null;
    if (file) {
      const ext = file.name.split(".").pop() || "jpg";
      return uploadPhoto(file, user.id, ext);
    }
    try {
      const res = await genImage({ data: { prompt } });
      if (!res.image) return null;
      return await uploadPhoto(base64ToBlob(res.image), user.id, "jpg");
    } catch {
      return null;
    }
  };

  const submitRoute = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const photo = await resolvePhoto(
        `Реалистичное фото грузового транспорта «${vehicleType}» на трассе в степи Мангистауской области Казахстана, дневной свет`,
      );
      const { error } = await supabase.from("carrier_routes").insert({
        carrier_id: user.id,
        from_city: fromCity,
        to_city: toCity,
        travel_date: date || null,
        vehicle_type: vehicleType,
        vehicle_photo_url: photo,
        capacity_kg: capacity ? Number(capacity) : null,
        price: price ? Number(price) : null,
      });
      if (error) throw error;
      toast.success("Объявление опубликовано");
      navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось опубликовать");
    } finally {
      setBusy(false);
    }
  };

  const submitRequest = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const photo = await resolvePhoto(
        `Реалистичное фото груза «${cargoType}», подготовленного к перевозке, нейтральный фон склада`,
      );
      const { error } = await supabase.from("shipment_requests").insert({
        sender_id: user.id,
        from_city: fromCity,
        to_city: toCity,
        travel_date: date || null,
        cargo_type: cargoType,
        weight_kg: weight ? Number(weight) : null,
        photo_url: photo,
        price_offer: price ? Number(price) : null,
      });
      if (error) throw error;
      toast.success("Заявка опубликована");
      navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось опубликовать");
    } finally {
      setBusy(false);
    }
  };

  const CityFields = (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Откуда</Label>
          <Select value={fromCity} onValueChange={setFromCity}>
            <SelectTrigger aria-label="Откуда">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CITY_NAMES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Куда</Label>
          <Select value={toCity} onValueChange={setToCity}>
            <SelectTrigger aria-label="Куда">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CITY_NAMES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="date">Дата</Label>
        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
    </>
  );

  const PhotoField = (
    <div>
      <Label htmlFor="photo">Фото (если не загрузить — сгенерируем автоматически)</Label>
      <Input
        id="photo"
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="mx-auto max-w-xl px-3 py-6">
        <h1 className="mb-4 text-2xl font-extrabold">Новое объявление</h1>
        <Tabs defaultValue="carrier">
          <TabsList className="w-full">
            <TabsTrigger className="flex-1" value="carrier">
              Я перевозчик
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="sender">
              Мне нужна машина
            </TabsTrigger>
          </TabsList>

          <TabsContent value="carrier">
            <div className="card-elevated space-y-3 p-4">
              {CityFields}
              <div>
                <Label>Тип авто</Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                  <SelectTrigger aria-label="Тип авто">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="cap">Грузоподъёмность, кг</Label>
                  <Input
                    id="cap"
                    inputMode="numeric"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="price1">Цена, ₸</Label>
                  <Input
                    id="price1"
                    inputMode="numeric"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              </div>
              {PhotoField}
              <Button className="w-full" disabled={busy} onClick={() => void submitRoute()}>
                {busy ? "Публикуем…" : "Опубликовать маршрут"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="sender">
            <div className="card-elevated space-y-3 p-4">
              {CityFields}
              <div>
                <Label>Тип груза</Label>
                <Select value={cargoType} onValueChange={setCargoType}>
                  <SelectTrigger aria-label="Тип груза">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARGO_TYPES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="weight">Вес, кг</Label>
                  <Input
                    id="weight"
                    inputMode="numeric"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="price2">Желаемая цена, ₸</Label>
                  <Input
                    id="price2"
                    inputMode="numeric"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              </div>
              {PhotoField}
              <Button className="w-full" disabled={busy} onClick={() => void submitRequest()}>
                {busy ? "Публикуем…" : "Опубликовать заявку"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
}
