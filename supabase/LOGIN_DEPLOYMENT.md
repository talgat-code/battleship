# Причина ошибки регистрации на Netlify

Проверено 30 сентября 2026 года для `ztimlpcqwbsxqfmetbpe`:

- Сайт `https://flot-sector.netlify.app` отвечает 200. Опубликованный `/assets/index-C_SpU9Mx.js` содержит правильный URL проекта и вызов `login-auth`.
- `OPTIONS` и `POST` на `/functions/v1/login-auth` отвечают **404**, `{"code":"NOT_FOUND","message":"Requested function was not found"}`. Это отсутствие функции по нужному адресу, а не ошибка пароля, базы или Vite.
- В Chrome ошибка формы воспроизведена без подмены HTTP-ответов. Браузер показывает `net::ERR_FAILED`: ответ на preflight отсутствующей функции не предоставляет необходимые CORS-заголовки. Не нужно чинить это отключением защиты браузера.
- Параметр `?room=…` сохранился при переходе к регистрации и после ошибки. `Entry.tsx` сохраняет query и направляет вошедшего игрока в сетевой экран; успешная регистрация с переходом пока заблокирована отсутствующей функцией.
- Публичная REST-проверка с `limit=0`: `profiles` → 401/42501 (анонимное чтение запрещено — ожидаемо); `login_accounts` и `login_rate_limits` → 404/PGRST205 (нет в кэше схемы). Это основание проверить миграцию 005 в SQL Editor, но не доказательство отсутствия таблиц непосредственно в PostgreSQL. Не выдавайте `anon` права на эти таблицы по подсказке REST.
- `npx --yes supabase projects list --output json` сообщает `Access token not provided`. Доступа к развёртыванию, секретам, SQL Editor и журналам сейчас нет. Реальная регистрация → выход → повторный вход → тот же профиль не пройдены; это не исправлено одной локальной сборкой.

## 1. Проверить схему в существующем проекте

Откройте SQL Editor проекта `ztimlpcqwbsxqfmetbpe` и выполните **read-only** файл `supabase/check_schema.sql`.

Для регистрации нужны:

- Миграция **001**: `profiles`, функция `create_fleet_profile`, триггер `fleet_profile_created` на `auth.users`, RLS профиля.
- Миграция **005**: `login_accounts`, `login_rate_limits`, `create_login_identity`, триггер `fleet_login_created`, RPC `fleet_auth_limit(text,integer,integer)` и права `service_role` на него. Пароль остаётся в Supabase Auth, не в этих таблицах.
- Миграции 002–004 нужны для языка профиля, кошелька, тестовых жетонов и игры с другом; они не заменяют 005. Не повторяйте ранее выполненные миграции.

Если объекты 005 отсутствуют целиком, выполните весь `supabase/migrations/202609300005_login_accounts.sql` один раз. Если присутствует лишь часть, сначала сравните схему с миграцией: не удаляйте таблицы и не запускайте вслепую `db push`. Если таблицы уже существуют, а REST продолжает отвечать PGRST205, обновите кэш схемы: `NOTIFY pgrst, 'reload schema';`.

## 2. Развернуть функцию (не требует Docker)

В PowerShell на своём компьютере:

```powershell
Set-Location 'C:\Users\JR_\Desktop\incubator_narxoz'
npx --yes supabase login
npx --yes supabase projects list
npx --yes supabase functions deploy login-auth --project-ref ztimlpcqwbsxqfmetbpe --no-verify-jwt --use-api
npx --yes supabase functions list --project-ref ztimlpcqwbsxqfmetbpe
node scripts/check-login-auth.mjs
```

Авторизуйтесь в CLI самостоятельно; не присылайте access token или пароли в чат. Функция берётся из `supabase/functions/login-auth/index.ts`. В `supabase/config.toml` уже есть `[functions.login-auth] verify_jwt = false`: регистрация вызывается до появления пользовательского JWT, пароль проверяется внутри Supabase Auth. Эта настройка не отключает RLS.

Ожидаемый результат пробника: **OPTIONS 204**, **POST 400/invalid_login** для пустого тела, `Access-Control-Allow-Origin: https://flot-sector.netlify.app`. Это подтверждает доступность обработчика и CORS, но не успешность создания аккаунта.

## 3. Переменные окружения Edge Function

Текущий код использует `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (или `FLEET_PUBLISHABLE_KEY` вместо последнего). Первые три обычно автоматически предоставляет Supabase. Их проверяют в Edge Functions → Secrets, не в Netlify. Не создавайте вручную переменные с зарезервированным префиксом `SUPABASE_` и не переносите административный ключ в `.env.local`/`VITE_*`.

Если отсутствует legacy anon key, добавьте **FLEET_PUBLISHABLE_KEY** со значением публичного publishable key этого проекта в Edge Functions → Secrets. Если недоступен и legacy service-role key, текущей функции потребуется отдельная адаптация к `SUPABASE_SECRET_KEYS`; не подставляйте publishable key вместо административного.

`ALLOWED_ORIGINS` необязателен: адрес Netlify уже включён в код. Если секрет задан ранее, в его списке обязательно должно быть `https://flot-sector.netlify.app` (без завершающего `/`, значения разделены запятыми). Для Auth должен быть включён Email provider: функция использует случайный внутренний адрес, подтверждает только создаваемый тестовый аккаунт и сразу выполняет password sign-in. Настройки подтверждения старых email-аккаунтов менять не нужно.

## 4. Если после развёртывания ошибка осталась

Смотрите Edge Functions → login-auth → Invocations/Logs; для ошибок создания пользователя также Authentication → Logs. Не добавляйте логирование тела запроса, пароля или сессии.

| Ответ | Что проверять |
| --- | --- |
| 404/NOT_FOUND | Имя функции, project-ref, успешный deploy |
| OPTIONS не 204 / неверный Allow-Origin | ALLOWED_ORIGINS, точный origin, доступность функции |
| 401 до исполнения обработчика / Invalid JWT | verify_jwt=false при deploy |
| 401/invalid_credentials | Функция исполнилась; логин/пароль неверны |
| 403/origin_denied | Origin не входит в разрешённые |
| 409/login_taken | Логин уже зарегистрирован — нужен вход |
| 429/rate_limited | Серверный лимит попыток, дождаться сброса |
| 500 или boot error | Журнал запуска, импорт зависимости, конфигурация runtime |
| 503/service_unavailable | Секреты, 005, права RPC, триггеры 001/005, Auth logs; код сейчас сводит эти серверные ошибки в 503 |
| 503/account_created | Аккаунт уже создан: повторить вход, не регистрацию |

## 5. Настоящая проверка после развёртывания

На **опубликованном сайте** зарегистрируйте новый тестовый логин, откройте профиль, запишите позывной/баланс, выйдите, войдите тем же логином и паролем. Проверьте в Authentication → Users и таблице profiles, что UUID остаётся тем же. Повторите вход в отдельном браузере, проверьте баланс и покупки. Затем откройте ссылку комнаты, выйдите и войдите/зарегистрируйтесь через неё: query `room` должен сохраниться и открыться тот же сетевой экран. Для нового участника нужна ссылка `?invite=…` от создателя: один лишь ID комнаты не даёт постороннему членство.

**Новая загрузка dist для устранения найденного 404 не требуется:** нужный клиент уже опубликован. Нужно применить недостающую схему и отдельно развернуть Edge Function. В этом исправлении изменены только инструкции и диагностический скрипт, фронтенд не изменялся.

Официальные инструкции: https://supabase.com/docs/guides/functions/deploy и https://supabase.com/docs/guides/functions/secrets.
