// Stable source keys; {0}, {1} interpolate numbers and localized labels.
const rows = `
Логин|Логин|Username
Логин или почта|Логин немесе пошта|Username or email
Показать пароль|Құпиясөзді көрсету|Show password
Скрыть пароль|Құпиясөзді жасыру|Hide password
3–24 символа: латинские буквы, цифры и _. Регистр не важен. Почта не нужна.|3–24 таңба: латын әріптері, сандар және _. Регистр маңызды емес. Пошта қажет емес.|3–24 characters: Latin letters, digits and _. Case insensitive. No email needed.
Пароль: 8–72 символа. Сохраните его: восстановление через почту для тестовых логинов недоступно.|Құпиясөз: 8–72 таңба. Оны сақтаңыз: тест логинін пошта арқылы қалпына келтіру мүмкін емес.|Password: 8–72 characters. Keep it safe: email recovery is unavailable for test usernames.
Играть с ботом|Ботпен ойнау|Play with bot
Играть с другом|Доспен ойнау|Play with friend
Таблица лидеров|Көшбасшылар кестесі|Leaderboard
С другом — по ссылке, после входа. Классические правила без карт способностей.|Доспен — кіргеннен кейін сілтеме арқылы. Қабілет карталарынсыз классикалық ережелер.|Invite a friend after signing in. Classic rules without ability cards.
ФЛОТ / СЕКТОР 10 · С ботом или с другом|ФЛОТ / СЕКТОР 10 · Ботпен немесе доспен|FLEET / SECTOR 10 · With a bot or a friend
Язык|Тіл|Language
Карты способностей|Қабілет карталары|Ability cards
АРСЕНАЛ КОМАНДИРА|КОМАНДИР АРСЕНАЛЫ|COMMANDER'S ARSENAL
Инвентарь аккаунта недоступен. Проверьте подключение.|Аккаунт заттары қолжетімсіз. Байланысты тексеріңіз.|Account inventory unavailable. Check your connection.
Бой завершён. Карты доступны в следующей партии.|Ұрыс аяқталды. Карталар келесі ойында қолжетімді.|Battle finished. Cards are available next match.
Ход противника — карты временно недоступны.|Қарсыластың кезегі — карталар уақытша қолжетімсіз.|Enemy turn — cards are temporarily unavailable.
Выберите карту. Обычный выстрел не расходует карточку.|Карта таңдаңыз. Қалыпты атыс картаны жұмсамайды.|Choose a card. Regular shots do not consume cards.
У вас пока нет карт. Купите их в магазине и вернитесь в этот бой.|Карталарыңыз жоқ. Дүкеннен сатып алып, осы ұрысқа оралыңыз.|You have no cards yet. Buy some in the shop and return to this battle.
Бонус уже активен|Бонус белсенді|Bonus already active
Недоступно сейчас|Қазір қолжетімсіз|Unavailable now
Карта выбрана|Карта таңдалды|Card selected
Готова к применению|Қолдануға дайын|Ready to use
Прицеливание: наведите на верхнюю левую клетку области и нажмите на поле. На телефоне первое касание выбирает область, второе подтверждает.|Көздеу: аймақтың жоғарғы сол жақ торын көздеп, алаңды басыңыз. Телефонда бірінші түрту аймақты таңдайды, екіншісі растайды.|Aim at the area's top-left cell and click the board. On a phone, tap once to preview and again to confirm.
Область выходит за край поля. Выберите другую клетку.|Аймақ алаң шетінен шығады. Басқа тор таңдаңыз.|Area crosses the board edge. Choose another cell.
Второй шанс: следующий выстрел сохраняет ход.|Екінші мүмкіндік: келесі атыс кезекті сақтайды.|Second chance: the next shot keeps your turn.
Перехват сигнала: контур корабля раскрыт, урон не нанесён.|Сигналды ұстау: кеме сұлбасы ашылды, зақым келтірілмеді.|Signal intercept: ship outline revealed without damage.
Кракен: корабль потоплен.|Кракен: кеме батты.|Kraken: ship sunk.
Глубинная бомба: попаданий — {0}, промахов — {1}.|Тереңдік бомбасы: тигені — {0}, мүлті — {1}.|Depth charge: hits — {0}, misses — {1}.
Катер занимает одну клетку — поворот не меняет позицию.|Катер бір торды алады — бұру орнын өзгертпейді.|The patrol boat occupies one cell — rotation does not change its position.
Партия изменена в другой вкладке. Обновите страницу.|Ойын басқа қойындыда өзгерді. Бетті жаңартыңыз.|The match changed in another tab. Reload the page.
Не удалось сохранить язык в профиле. Выбор сохранён на устройстве.|Тіл профильде сақталмады. Таңдау құрылғыда сақталды.|Could not save language to profile. Your choice is saved on this device.
Патрульный катер|Патрульдік катер|Patrol boat
Корвет|Корвет|Corvette
Эсминец|Эсминец|Destroyer
Авианосец|Әуе кеметасығыш|Aircraft carrier
Результат сохранён в профиле.|Нәтиже профильде сақталды.|Result saved to your profile.
Результат пока не отправлен в профиль. Проверьте подключение и повторите синхронизацию в профиле.|Нәтиже әлі жіберілмеді. Байланысты тексеріп, профильде қайта синхрондаңыз.|Result not uploaded. Check your connection and retry from your profile.
Между кораблями нужна свободная клетка, в том числе по диагонали.|Кемелер арасында, соның ішінде диагональ бойынша, бос тор болуы керек.|Leave an empty cell between ships, including diagonally.
Поворот невозможен: рядом нет свободного места.|Бұру мүмкін емес: жақын жерде бос орын жоқ.|Cannot rotate: no space nearby.
Корабль повёрнут.|Кеме бұрылды.|Ship rotated.
После поворота корабль выходит за поле или касается другого. Выберите свободную позицию.|Бұрылған кеме алаңнан шығады немесе басқа кемеге тиеді. Бос орын таңдаңыз.|Rotation crosses the boundary or another ship. Choose a free position.
потоплен|батты|sunk
корабль потоплен|кеме батты|ship sunk
попадание|тиді|hit
мимо|мүлт|miss
Вы|Сіз|You
Разверните свой флот|Флотыңызды орналастырыңыз|Deploy your fleet
Сектор под контролем|Сектор бақылауда|Sector secured
Операция завершена|Операция аяқталды|Operation complete
Держите противника на прицеле|Қарсыласты көздеңіз|Keep the enemy in your sights
Флот готов к выходу|Флот дайын|Fleet ready to sail
Подготовка к операции|Операцияға дайындық|Preparing for the operation
Победа, командир|Жеңіс, командир|Victory, commander
Ваш флот уничтожен|Флотыңыз жойылды|Your fleet was destroyed
Ваш ход, командир|Сіздің кезегіңіз, командир|Your turn, commander
Ход бота · противник стреляет|Боттың кезегі · қарсылас атуда|Bot's turn · enemy firing
ФЛОТ|ФЛОТ|FLEET
СЕКТОР 10|10-СЕКТОР|SECTOR 10
ТАКТИЧЕСКИЙ КОМАНДНЫЙ ЦЕНТР|ТАКТИКАЛЫҚ БАСҚАРУ ОРТАЛЫҒЫ|TACTICAL COMMAND CENTER
Магазин · ◈|Дүкен · ◈|Shop · ◈
Магазин|Дүкен|Shop
Профиль|Профиль|Profile
СУМЕРЕЧНЫЙ АРХИПЕЛАГ|ЫМЫРТТАҒЫ АРХИПЕЛАГ|TWILIGHT ARCHIPELAGO
Спокойное море|Тынық теңіз|Calm sea
Живое море|Жанды теңіз|Living sea
Системная настройка уменьшения движения включена|Жүйеде қозғалысты азайту қосылған|System reduced motion is enabled
Уменьшить движение: остановить волны, качку, акул и частицы|Қозғалысты азайту: толқындарды, тербелісті, акулаларды және бөлшектерді тоқтату|Reduce motion: pause waves, rocking, sharks and particles
Правила игры|Ойын ережелері|Game rules
Личный флот · история в профиле|Жеке флот · тарих профильде|Personal fleet · history in profile
Гостевой флот · сохранение на устройстве|Қонақ флоты · құрылғыда сақталады|Guest fleet · saved on this device
Сложность бота|Боттың қиындығы|Bot difficulty
Чем отличаются уровни|Деңгейлердің айырмашылығы|How levels differ
Противник:|Қарсылас:|Opponent:
Режим боя|Ұрыс режимі|Battle mode
Классический бой|Классикалық ұрыс|Classic battle
Бой с усилениями|Күшейткіштері бар ұрыс|Boosted battle
Купленные карты доступны только в ваш ход.|Сатып алынған карталар тек өз кезегіңізде қолжетімді.|Purchased cards are available only on your turn.
Классические правила, без карточек.|Классикалық ережелер, карталарсыз.|Classic rules, no cards.
Скрыть эмоции|Эмоцияларды жасыру|Hide emotes
/ СЕКТОР 10|/ 10-СЕКТОР|/ SECTOR 10
За скалами собирается гроза. Маяк ещё держит курс.|Жартастардың ар жағында дауыл жиналуда. Маяк әлі жол көрсетеді.|A storm gathers beyond the cliffs. The lighthouse still guides us.
СЕВЕРНЫЙ ТИХИЙ ОКЕАН|СОЛТҮСТІК ТЫНЫҚ МҰХИТЫ|NORTH PACIFIC OCEAN
СИНИЙ ЧАС|КӨГІЛДІР ЫМЫРТ|BLUE HOUR
Новая игра|Жаңа ойын|New game
Приказ командования|Қолбасшылық бұйрығы|Command orders
Разместите 10 кораблей, оставляя между ними клетку, включая диагонали. Корабль занимает клетки вправо или вниз от выбранной. Попадание сохраняет ход, промах передаёт его. Уничтожьте весь флот противника для победы. На сенсорном экране сначала выберите клетку, затем подтвердите действие кнопкой под полем. «Крупные клетки» увеличивают поле; его можно сдвигать в сторону.|10 кемені арасына, диагональ бойынша да, бір бос тор қалдырып орналастырыңыз. Кеме таңдалған тордан оңға немесе төмен орналасады. Дәл тисе кезек сақталады, мүлт кетсе қарсыласқа өтеді. Жеңу үшін қарсылас флотын толық жойыңыз. Сенсорлық экранда торды таңдап, алаң астындағы батырмамен растаңыз. «Ірі торлар» алаңды үлкейтеді; оны жылжытуға болады.|Place 10 ships with one empty cell between them, including diagonals. Ships extend right or down. A hit keeps your turn; a miss passes it. Destroy the enemy fleet to win. On touch screens choose a cell, then confirm below the board. Large cells zooms the board; scroll sideways to explore.
01 / РАССТАНОВКА|01 / ОРНАЛАСТЫРУ|01 / DEPLOYMENT
03 / ИТОГ ОПЕРАЦИИ|03 / ОПЕРАЦИЯ ҚОРЫТЫНДЫСЫ|03 / OPERATION RESULT
02 / МОРСКОЙ БОЙ|02 / ТЕҢІЗ ҰРЫСЫ|02 / NAVAL BATTLE
ПОСЛЕДНИЙ ВЫСТРЕЛ|СОҢҒЫ АТЫС|LAST SHOT
Ожидаем первый контакт|Алғашқы кездесуді күтеміз|Awaiting first contact
Размещено|Орналастырылды|Deployed
Ваш флот|Сіздің флотыңыз|Your fleet
Боевые клетки|Ұрыс торлары|Combat cells
Потоплено|Батырылды|Sunk
Награда за партию: +{0} жетонов|Ойын сыйлығы: +{0} жетон|Match reward: +{0} tokens
Награда ожидает сохранения.|Сыйлық сақталуды күтуде.|Reward awaiting save.
Выберите верхнюю левую клетку области, затем подтвердите применение.|Аймақтың жоғарғы сол жақ торын таңдап, қолдануды растаңыз.|Choose the area's top-left cell, then confirm use.
Нажмите «Применить карту» для подтверждения.|Растау үшін «Картаны қолдану» батырмасын басыңыз.|Press Use card to confirm.
Применить карту|Картаны қолдану|Use card
Отмена|Бас тарту|Cancel
Бонус активен: следующий выстрел сохраняет ход.|Бонус белсенді: келесі атыс кезекті сақтайды.|Bonus active: the next shot keeps your turn.
Гидролокатор: непоражённых сегментов — {0}|Гидролокатор: зақымданбаған бөлік — {0}|Sonar: undamaged segments — {0}
Применено: {0}|Қолданылды: {0}|Used: {0}
Выбор поля|Алаңды таңдау|Choose board
Противник|Қарсылас|Opponent
Все корабли на позиции|Барлық кеме орнында|All ships deployed
{0} · {1} кл.|{0} · {1} тор|{0} · {1} cells
Выбрать корабль|Кеме таңдау|Choose ship
Флот готов|Флот дайын|Fleet ready
кл.|тор|cells
Повернуть корабль · R|Кемені бұру · R|Rotate ship · R
Повернуть|Бұру|Rotate
АКВАТОРИЯ АЛЬФА|АЛЬФА АКВАТОРИЯСЫ|ALPHA WATERS
СОЮЗНЫЙ СЕКТОР|ОДАҚТАС СЕКТОР|ALLIED SECTOR
Ваше поле|Сіздің алаңыңыз|Your board
Выберите позицию для корабля|Кемеге орын таңдаңыз|Choose a position for the ship
{0} кораблей в строю|{0} кеме сапта|{0} ships afloat
СЕКТОР A–10|A–10 СЕКТОРЫ|SECTOR A–10
АКВАТОРИЯ БРАВО|БРАВО АКВАТОРИЯСЫ|BRAVO WATERS
НЕТ КОНТАКТА|БАЙЛАНЫС ЖОҚ|NO CONTACT
БОЙ ЗАВЕРШЁН|ҰРЫС АЯҚТАЛДЫ|BATTLE OVER
ЗОНА ПОИСКА|ІЗДЕУ АЙМАҒЫ|SEARCH ZONE
Поле противника|Қарсылас алаңы|Enemy board
Ожидание начала операции|Операцияның басталуын күту|Awaiting operation start
Выберите цель для выстрела|Ату нысанасын таңдаңыз|Choose a target
Ожидайте своего хода|Кезегіңізді күтіңіз|Wait for your turn
СЕКТОР B–10|B–10 СЕКТОРЫ|SECTOR B–10
Ваш корабль|Сіздің кемеңіз|Your ship
Промах|Мүлт|Miss
Попадание|Тиді|Hit
Потоплен|Батты|Sunk
ТАКТИЧЕСКИЙ ВИД|ТАКТИКАЛЫҚ КӨРІНІС|TACTICAL VIEW
СООБЩЕНИЕ КОМАНДОВАНИЯ|ҚОЛБАСШЫЛЫҚ ХАБАРЫ|COMMAND MESSAGE
ПОСЛЕДНИЙ КОНТАКТ|СОҢҒЫ БАЙЛАНЫС|LAST CONTACT
Флот готов. Можно начинать.|Флот дайын. Бастауға болады.|Fleet ready. You may begin.
Займите позиции, командир.|Орындарыңызды алыңыз, командир.|Take your positions, commander.
Первый выстрел за вами.|Алғашқы атыс сізден.|The first shot is yours.
Между кораблями нужна одна свободная клетка.|Кемелер арасында бір бос тор болуы керек.|Leave one empty cell between ships.
Цель поражена. Стреляющий сохраняет ход.|Нысанаға тиді. Атушы кезегін сақтайды.|Target hit. The attacker keeps the turn.
Точность важнее скорости. Выбирайте цель.|Дәлдік жылдамдықтан маңызды. Нысана таңдаңыз.|Accuracy matters more than speed. Choose a target.
УПРАВЛЕНИЕ ОПЕРАЦИЕЙ|ОПЕРАЦИЯНЫ БАСҚАРУ|OPERATION CONTROL
Состав флота|Флот құрамы|Fleet roster
Итог боя|Ұрыс қорытындысы|Battle result
Боевая сводка|Ұрыс есебі|Battle report
Выберите корабль, затем его позицию на своём поле.|Кемені, содан кейін өз алаңыңыздағы орнын таңдаңыз.|Choose a ship, then its position on your board.
Авторасстановка|Автоорналастыру|Auto deploy
Сбросить расстановку|Орналастыруды тазарту|Clear deployment
Готовность флота|Флот дайындығы|Fleet readiness
Начать операцию|Операцияны бастау|Start operation
Все системы готовы. Ваш первый ход.|Барлық жүйе дайын. Алғашқы кезек сізде.|All systems ready. You move first.
Осталось разместить: {0}|Орналастыру қалды: {0}|Ships left: {0}
ПОБЕДА|ЖЕҢІС|VICTORY
ПОРАЖЕНИЕ|ЖЕҢІЛІС|DEFEAT
Флот противника уничтожен. Море под вашим контролем.|Қарсылас флоты жойылды. Теңіз сіздің бақылауыңызда.|Enemy fleet destroyed. The sea is under your control.
Противник взял сектор. Новая операция — новый шанс.|Қарсылас секторды алды. Жаңа операция — жаңа мүмкіндік.|The enemy took the sector. A new operation is a new chance.
Новая операция|Жаңа операция|New operation
Флот противника|Қарсылас флоты|Enemy fleet
Журнал боя|Ұрыс журналы|Battle log
выстрелов|атыс|shots
Флот на позиции. Ожидаем первый выстрел.|Флот орнында. Алғашқы атысты күтеміз.|Fleet in position. Awaiting the first shot.
10 кораблей · 20 клеток~Один флот. Одна цель.|10 кеме · 20 тор~Бір флот. Бір мақсат.|10 ships · 20 cells~One fleet. One goal.
Попадание даёт ещё один ход. Промах передаёт ход противнику.|Тиген атыс тағы бір кезек береді. Мүлт кетсе кезек қарсыласқа өтеді.|A hit grants another turn. A miss passes the turn.
Открытое море · игра против бота|Ашық теңіз · ботқа қарсы ойын|Open sea · play against a bot
Прогресс сохранён на устройстве|Ойын құрылғыда сақталды|Progress saved on this device
Сохранение недоступно в этом браузере|Бұл браузерде сақтау қолжетімсіз|Saving is unavailable in this browser
ФЛОТ / СЕКТОР 10|ФЛОТ / 10-СЕКТОР|FLEET / SECTOR 10
ДЕРЖАТЬ КУРС. КОНТРОЛИРОВАТЬ СЕКТОР.|БАҒЫТТЫ ҰСТА. СЕКТОРДЫ БАҚЫЛА.|HOLD COURSE. CONTROL THE SECTOR.
НОВАЯ МИССИЯ|ЖАҢА МИССИЯ|NEW MISSION
Снова в открытое море?|Қайта ашық теңізге шығамыз ба?|Back to the open sea?
Текущая партия будет заменена новой расстановкой.|Ағымдағы ойын жаңа орналастырумен ауыстырылады.|The current match will be replaced by a new deployment.
Продолжить партию|Ойынды жалғастыру|Continue match
цель выбрана|нысана таңдалды|target selected
позиция доступна|орын қолжетімді|position available
нельзя разместить|орналастыруға болмайды|cannot deploy
Сетка 10 × 10|10 × 10 тор|10 × 10 grid
Всё поле|Толық алаң|Whole board
Крупные клетки|Ірі торлар|Large cells
{0}: область просмотра|{0}: көру аймағы|{0}: viewport
3D недоступно — клетки остаются доступны|3D қолжетімсіз — торлар қолжетімді|3D unavailable — cells remain accessible
ПОИСК КОНТАКТА|БАЙЛАНЫС ІЗДЕУ|SEARCHING FOR CONTACT
Корабли противника скрыты|Қарсылас кемелері жасырылған|Enemy ships are hidden
Сдвигайте поле в сторону, чтобы увидеть другие клетки.|Басқа торларды көру үшін алаңды жылжытыңыз.|Scroll sideways to see other cells.
Палубная команда видна на авианосце в увеличенном виде.|Үлкейтілген көріністе палуба экипажы көрінеді.|Deck crew are visible on the carrier when zoomed in.
Море успокоилось для плавного управления.|Басқару жеңіл болуы үшін теңіз тынышталды.|The sea paused to keep controls responsive.
Огонь|Ату|Fire
Разместить|Орналастыру|Deploy
Коснитесь клетки на поле|Алаңдағы торды түртіңіз|Tap a cell on the board
Ссылка подтверждения недействительна или устарела. Попробуйте войти либо запросите регистрацию снова.|Растау сілтемесі жарамсыз немесе ескірген. Кіріп көріңіз не қайта тіркеліңіз.|Confirmation link is invalid or expired. Try signing in or register again.
Восстановление сессии задерживается. Можно играть гостем.|Сессияны қалпына келтіру кешігуде. Қонақ ретінде ойнауға болады.|Session recovery is delayed. You can play as a guest.
Проверьте почту и подтвердите адрес по ссылке. Если аккаунт уже существует, воспользуйтесь входом.|Поштаны тексеріп, сілтемемен растаңыз. Аккаунт бар болса, кіріңіз.|Check your email and confirm the link. If you already have an account, sign in.
Подтвердите адрес по ссылке в письме.|Хаттағы сілтемемен мекенжайды растаңыз.|Confirm your address using the email link.
Неверная почта или пароль.|Пошта немесе құпиясөз қате.|Incorrect email or password.
Слишком много запросов. Попробуйте позже.|Сұрау тым көп. Кейінірек көріңіз.|Too many requests. Try later.
Не удалось выполнить запрос. Проверьте соединение, почту и пароль и повторите.|Сұрау орындалмады. Байланысты, поштаны және құпиясөзді тексеріңіз.|Request failed. Check your connection, email and password, then retry.
Гость · Войти|Қонақ · Кіру|Guest · Sign in
⚓ ФЛОТ / СЕКТОР 10|⚓ ФЛОТ / 10-СЕКТОР|⚓ FLEET / SECTOR 10
Возвращаемся на борт|Бортқа оралудамыз|Returning aboard
Восстанавливаем сессию…|Сессия қалпына келтірілуде…|Restoring session…
ТИХОЕ МОРЕ. БОЛЬШАЯ ОПЕРАЦИЯ.|ТЫНЫҚ ТЕҢІЗ. ҮЛКЕН ОПЕРАЦИЯ.|CALM SEA. GRAND OPERATION.
Создать аккаунт|Аккаунт ашу|Create account
С возвращением, командир|Қайта қош келдіңіз, командир|Welcome back, commander
Ваш флот ждёт приказа.|Флотыңыз бұйрық күтуде.|Your fleet awaits orders.
Десять кораблей. Неизвестный противник. Найдите свой курс среди островов сумеречного моря.|Он кеме. Белгісіз қарсылас. Ымырт теңізінің аралдары арасынан өз бағытыңызды табыңыз.|Ten ships. An unknown enemy. Find your course through the islands of the twilight sea.
Играть без регистрации|Тіркелмей ойнау|Play as guest
Войти|Кіру|Sign in
Гостевая партия сохраняется на этом устройстве.|Қонақ ойыны осы құрылғыда сақталады.|Guest matches are saved on this device.
Вход и регистрация пока недоступны: сервис аккаунтов не настроен. Гостевая игра полностью доступна.|Кіру және тіркелу әзірше қолжетімсіз: аккаунт қызметі бапталмаған. Қонақ ойыны қолжетімді.|Sign-in and registration are unavailable: the account service is not configured. Guest play is available.
Как подключить регистрацию|Тіркелуді қосу жолы|How to enable registration
Выполните SQL-миграцию из папки supabase/migrations в своём проекте Supabase.|Supabase жобаңызда supabase/migrations бумасындағы SQL миграцияларын орындаңыз.|Run the SQL migrations from supabase/migrations in your Supabase project.
Заполните VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY в .env.local и перезапустите приложение.|.env.local файлында VITE_SUPABASE_URL және VITE_SUPABASE_PUBLISHABLE_KEY толтырып, қолданбаны қайта іске қосыңыз.|Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local and restart the app.
Включите Email Auth и добавьте адрес приложения в Redirect URLs.|Email Auth қосып, қолданба мекенжайын Redirect URLs тізіміне қосыңыз.|Enable Email Auth and add the app address to Redirect URLs.
Нужен публичный ключ, не service_role. Полная инструкция — в README.|Жария кілт қажет, service_role емес. Толық нұсқаулық README файлында.|Use a public key, not service_role. Full instructions are in README.
Позывной|Шақыру аты|Callsign
Электронная почта|Электрондық пошта|Email
Пароль|Құпиясөз|Password
Подождите…|Күте тұрыңыз…|Please wait…
Зарегистрироваться|Тіркелу|Register
Войти в аккаунт|Аккаунтқа кіру|Sign in to account
Уже есть аккаунт — войти|Аккаунт бар — кіру|Already registered — sign in
На стартовый экран|Басты экранға|Home screen
ФЛОТ / СЕКТОР 10 · Одиночная игра против бота|ФЛОТ / 10-СЕКТОР · Ботқа қарсы жеке ойын|FLEET / SECTOR 10 · Solo battle against a bot
Командир|Командир|Commander
Не удалось загрузить профиль. Проверьте подключение и настройку базы. Результаты, ожидающие отправки, сохранены на устройстве.|Профиль жүктелмеді. Байланысты және базаны тексеріңіз. Жіберілмеген нәтижелер құрылғыда сақталған.|Profile could not load. Check connection and database setup. Pending results are saved locally.
ЛИЧНОЕ ДЕЛО|ЖЕКЕ ІС|PERSONNEL FILE
Профиль командира|Командир профилі|Commander profile
На службе с|Қызметте|Serving since
Имя сохранено.|Аты сақталды.|Name saved.
Не удалось сохранить имя. Попробуйте ещё раз.|Аты сақталмады. Қайталап көріңіз.|Could not save name. Try again.
Сохранить имя|Атты сақтау|Save name
Загрузка…|Жүктелуде…|Loading…
Сыграно|Ойналды|Played
Победы|Жеңістер|Wins
Поражения|Жеңілістер|Losses
Последние 100 партий против бота|Ботқа қарсы соңғы 100 ойын|Last 100 bot matches
Победа|Жеңіс|Victory
Поражение|Жеңіліс|Defeat
Завершённых партий пока нет. Начните первую операцию против бота.|Аяқталған ойындар жоқ. Ботқа қарсы алғашқы операцияны бастаңыз.|No completed matches yet. Start your first operation against a bot.
Вернуться к игре|Ойынға оралу|Back to game
Обновить профиль|Профильді жаңарту|Refresh profile
Не удалось выйти. Проверьте подключение и повторите.|Шығу мүмкін болмады. Байланысты тексеріп, қайталаңыз.|Could not sign out. Check your connection and retry.
Выйти из аккаунта|Аккаунттан шығу|Sign out
Включить звук|Дыбысты қосу|Enable sound
Выключить звук|Дыбысты өшіру|Mute sound
СНАБЖЕНИЕ ФЛОТА|ФЛОТТЫ ЖАБДЫҚТАУ|FLEET SUPPLIES
Морской арсенал|Теңіз арсеналы|Naval arsenal
жетонов|жетон|tokens
Жетоны можно получить за завершённые партии|Жетондарды аяқталған ойындар үшін алуға болады|Earn tokens by completing matches
Покупки сохраняются в аккаунте после подтверждения сервера.|Сатып алулар сервер растаған соң аккаунтта сақталады.|Purchases are saved to your account after server confirmation.
Гостевая коллекция хранится на этом устройстве.|Қонақ топтамасы осы құрылғыда сақталады.|Guest collection is stored on this device.
Эмоции|Эмоциялар|Emotes
Карточки|Карталар|Cards
Мои предметы|Менің заттарым|My items
Выберите до четырёх купленных эмоций для боя.|Ұрысқа сатып алынған төрт эмоцияға дейін таңдаңыз.|Equip up to four purchased emotes for battle.
Куплено навсегда|Мәңгіге сатып алынды|Owned forever
Постоянная эмоция|Тұрақты эмоция|Permanent emote
В наличии: {0}|Қолда бар: {0}|Owned: {0}
Куплено|Сатып алынды|Owned
Купить|Сатып алу|Buy
Убрать с панели|Панельден алу|Unequip
Добавить на панель|Панельге қосу|Equip
Коллекция пока пуста.|Топтама әзірше бос.|Your collection is empty.
Ха-ха|Ха-ха|Ha-ha
Весёлый сигнал вашему флоту.|Флотыңызға көңілді белгі.|A cheerful signal to your fleet.
Салют|Сәлем|Salute
Приветствие от командира.|Командирден сәлем.|A greeting from the commander.
Ой!|Ой!|Oops!
Даже капитаны ошибаются.|Капитандар да қателеседі.|Even captains make mistakes.
Удача|Сәттілік|Good luck
Пожелайте попутного ветра.|Жолсерік жел тілеңіз.|Wish them fair winds.
Впереди буря|Алда дауыл|Storm ahead
Предупредите о приближении грозы.|Жақындаған дауыл туралы ескертіңіз.|Warn of the approaching storm.
Хорошая игра|Жақсы ойын|Good game
Поблагодарите за сражение.|Ұрыс үшін алғыс айтыңыз.|Thank them for the battle.
Гидролокатор|Гидролокатор|Sonar
Считает непоражённые сегменты в квадрате 3×3. Не раскрывает точные клетки. Ход сохраняется.|3×3 аймақта зақымданбаған бөліктерді санайды. Нақты торларды ашпайды. Кезек сақталады.|Counts undamaged segments in a 3×3 area without revealing exact cells. Keeps your turn.
Второй шанс|Екінші мүмкіндік|Second chance
Следующий выстрел сохраняет ход даже при промахе. Бонус расходуется и при попадании.|Келесі атыс мүлт кетсе де кезекті сақтайды. Бонус тигенде де жұмсалады.|The next shot keeps your turn even on a miss. A hit also consumes the bonus.
Перехват сигнала|Сигналды ұстау|Signal intercept
Раскрывает один случайный скрытый корабль до потопления. Ход сохраняется.|Бір кездейсоқ жасырын кемені батқанша көрсетеді. Кезек сақталады.|Reveals one random hidden ship until sunk. Keeps your turn.
Глубинная бомба|Тереңдік бомбасы|Depth charge
Атакует свободные клетки 2×2. Хотя бы одно попадание сохраняет ход; все промахи передают ход.|2×2 аймақтың атылмаған торларына шабуылдайды. Бір рет тисе кезек сақталады; бәрі мүлт кетсе кезек өтеді.|Attacks unshot cells in a 2×2 area. Any hit keeps your turn; all misses pass it.
Кракен|Кракен|Kraken
Топит один случайный оставшийся корабль. Ход сохраняется.|Қалған кемелердің бірін кездейсоқ батырады. Кезек сақталады.|Sinks one random surviving ship. Keeps your turn.
Неизвестный предмет.|Белгісіз зат.|Unknown item.
Эмоция уже куплена.|Эмоция сатып алынған.|Emote already owned.
Недостаточно жетонов. Завершите ещё одну партию.|Жетон жеткіліксіз. Тағы бір ойынды аяқтаңыз.|Not enough tokens. Complete another match.
Можно выбрать не более четырёх эмоций.|Төрт эмоциядан артық таңдауға болмайды.|You can equip at most four emotes.
Нет доступной карточки.|Қолжетімді карта жоқ.|No card available.
Действие недоступно. Проверьте цель и очередь хода.|Әрекет қолжетімсіз. Нысана мен кезекті тексеріңіз.|Action unavailable. Check the target and turn.
Не удалось прочитать сохранение магазина.|Дүкен сақтауы оқылмады.|Could not read shop save.
Магазин аккаунта недоступен. Проверьте подключение и миграцию магазина.|Аккаунт дүкені қолжетімсіз. Байланысты және дүкен миграциясын тексеріңіз.|Account shop unavailable. Check connection and shop migration.
Сервер не подтвердил операцию. Проверьте баланс и подключение.|Сервер әрекетті растамады. Баланс пен байланысты тексеріңіз.|Server did not confirm the operation. Check balance and connection.
Операция не выполнена.|Әрекет орындалмады.|Operation failed.
Новичок|Жаңадан бастаушы|Rookie
Случайные выстрелы по свободным клеткам.|Бос торларға кездейсоқ атады.|Random shots at unshot cells.
Тактик|Тактик|Tactician
Ищет соседние клетки после попадания и добивает корабль.|Тиген соң көрші торларды тексеріп, кемені батырады.|Checks neighboring cells after a hit to finish the ship.
Адмирал|Адмирал|Admiral
Оценивает возможные положения оставшихся кораблей.|Қалған кемелердің ықтимал орындарын бағалайды.|Scores possible placements of remaining ships.
Нет доступных клеток|Қолжетімді торлар жоқ|No available cells
`;
export const dictionary:Record<string,[string,string]>=Object.fromEntries(rows.trim().split('\n').map(row=>{const [key,kk,en]=row.split('|').map(s=>s.replaceAll('~','\n'));return [key,[kk,en]];}));
