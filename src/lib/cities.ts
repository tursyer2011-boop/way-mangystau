export type City = {
  name: string;
  lat: number;
  lng: number;
};

export const CITIES: City[] = [
  { name: "Актау", lat: 43.6511, lng: 51.199 },
  { name: "Жанаозен", lat: 43.3413, lng: 52.8593 },
  { name: "Бейнеу", lat: 45.3167, lng: 55.2 },
  { name: "Курык", lat: 43.2039, lng: 51.6564 },
  { name: "Форт-Шевченко", lat: 44.5089, lng: 50.2589 },
  { name: "Шетпе", lat: 44.1667, lng: 52.1167 },
  { name: "Сай-Утес", lat: 44.3167, lng: 54.0833 },
  { name: "Жетыбай", lat: 43.5911, lng: 52.0842 },
  { name: "Ақшукыр", lat: 43.7594, lng: 51.3417 },
];

export const CITY_NAMES = CITIES.map((c) => c.name);

export function cityCoords(name?: string | null): City | undefined {
  return CITIES.find((c) => c.name === name);
}

export const VEHICLE_TYPES = [
  "Легковая",
  "Пикап",
  "Газель",
  "Микроавтобус",
  "Бортовой грузовик",
  "Рефрижератор",
  "Фура",
  "Эвакуатор",
];

export const CARGO_TYPES = [
  "Документы / посылка",
  "Мебель",
  "Бытовая техника",
  "Стройматериалы",
  "Продукты",
  "Запчасти",
  "Животные",
  "Другое",
];
