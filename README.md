# Mangystau Cargo Connect

Создай веб-приложение "Go Mangystau”— биржу грузоперевозок внутри Мангистауской области (Казахстан), в стиле OLX.

СТЕК: React + Supabase (auth, database, realtime, storage для фото).

БАЗА ДАННЫХ (создай в Supabase следующие таблицы):

1. profiles

- id (uuid, PK, = auth.users.id)

- username text

- nickname text

- phone text

- show_contact boolean default false

- role text ('sender' | 'carrier' | 'both')

- created_at timestamp

2. carrier_routes (объявления перевозчиков)

- id uuid PK

- carrier_id uuid FK -> profiles

- from_city text

- to_city text

- travel_date date

- vehicle_type text

- vehicle_photo_url text

- capacity_kg numeric

- price numeric

- status text ('open' | 'matched' | 'in_transit' | 'completed')

- created_at timestamp

3. shipment_requests (заявки отправителей)

- id uuid PK

- sender_id uuid FK -> profiles

- from_city text

- to_city text

- cargo_type text

- weight_kg numeric

- photo_url text

- price_offer numeric

- status text ('open' | 'matched' | 'in_transit' | 'completed')

- created_at timestamp

4. matches (связка объявления и заявки, двойное подтверждение)

- id uuid PK

- route_id uuid FK -> carrier_routes

- request_id uuid FK -> shipment_requests

- carrier_confirmed boolean default false

- sender_confirmed boolean default false

- status text ('pending' | 'confirmed' | 'in_transit' | 'delivered')

- created_at timestamp

5. live_tracking

- id uuid PK

- match_id uuid FK -> matches

- lat numeric

- lng numeric

- updated_at timestamp

6. messages (чат для тех, кто скрыл контакты)

- id uuid PK

- match_id uuid FK -> matches

- sender_id uuid FK -> profiles

- text text

- created_at timestamp

АУТЕНТИФИКАЦИЯ:

- Регистрация через Supabase Auth: email, телефон, username, nickname

- Подтверждение email через встроенный Supabase Auth OTP (одноразовый код автоматически отправляется на почту при регистрации, без сторонних сервисов типа EmailJS)

- При регистрации выбор роли: "Отправитель груза" / "Перевозчик" / "Оба"

- В настройках профиля переключатель "Показывать мои контакты всем" — если выключен, доступен только внутренний чат

ГЛАВНАЯ СТРАНИЦА (в стиле OLX):

- Лента карточек объявлений (объявления перевозчиков и заявки отправителей вперемешку, с бейджем "Еду" / "Нужна машина")

- Каждая карточка: фото (машины или груза), маршрут "Актау → Жанаозен", дата, цена, тип груза или грузоподъёмность

- Фильтры сверху: город "откуда" (select), город "куда" (select), дата, тип объявления (все/перевозчики/отправители)

- Список городов для фильтра и создания объявлений: Актау, Жанаозен, Бейнеу, Курык, Форт-Шевченко, Шетпе, Сай-Утес

СОЗДАНИЕ ОБЪЯВЛЕНИЯ (только для зарегистрированных):

- Перевозчик: форма "откуда, куда, дата, тип авто (выбор из списка), фото машины (загрузка), грузоподъёмность кг, цена"

- Отправитель: форма "откуда, куда, тип груза, вес кг, фото груза (загрузка), желаемая цена"

- Если пользователь не загрузил фото — сгенерируй подходящее изображение через встроенный AI image generation

КАРТОЧКА ОБЪЯВЛЕНИЯ (детальная страница):

- Вся информация об объявлении + кнопка "Откликнуться"

- Если у автора включены контакты — показать телефон

- Если контакты скрыты — кнопка "Написать сообщение", открывающая чат в реальном времени через Supabase Realtime

МАТЧИНГ И ПОДТВЕРЖДЕНИЕ:

- Когда одна сторона откликается на объявление другой — создаётся запись в matches со статусом pending

- Обе стороны видят в личном кабинете "Ожидает подтверждения" с кнопкой "Подтвердить"

- Когда carrier_confirmed = true И sender_confirmed = true — статус меняется на confirmed, обе стороны получают уведомление, открывается страница трекинга

ЖИВОЙ ТРЕКИНГ:

- После подтверждения перевозчик на странице заказа жмёт "Начать поездку"

- Приложение запрашивает разрешение на геолокацию через navigator.geolocation.watchPosition

- Координаты каждые 10-15 секунд записываются в таблицу live_tracking через Supabase

- Отправитель на своей странице заказа видит карту (Leaflet или Google Maps embed) с маркером машины, обновляющимся в реальном времени через Supabase Realtime subscription

- Кнопка у перевозчика "Прибыл" меняет статус на delivered

ЛИЧНЫЙ КАБИНЕТ:

- Мои объявления (активные/завершённые)

- Входящие отклики

- Активные заказы с трекингом

- Чаты

ДИЗАЙН: чистый, современный, в стиле OLX/Avito — карточки с тенями, крупные фото, акцентный цвет (оранжевый или синий), мобильно-адаптивный интерфейс.

Используй реальные координаты городов Мангистауской области для карты: Актау (43.6511, 51.1990), Жанаозен (43.3413, 52.8593), Бейнеу (45.3167, 55.2000), Курык (43.2039, 51.6564), Форт-Шевченко (44.5089, 50.2589), Шетпе (44.1667, 52.1167).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://way-mangystau.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6ee42a0f-7e4d-4cd2-8d8a-f8d3f09a1944).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
