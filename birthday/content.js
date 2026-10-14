// ALL game content lives here: texts, answers, hints, photo paths, hotspots.
// Edit the Russian texts freely. Keep the quotes and commas intact.
// Photo paths are relative to index.html, e.g. 'photos/us.jpg'.

window.CONTENT = {

  // Her name for the final screen.
  name: 'Маша',

  // Laptop password. Checked case-insensitively.
  // Each item gives part of it: 1→w 2→A 3→n 4→k 5→e 6→r 7→6-7
  password: 'wAnker6-7',

  // Small labels used everywhere.
  ui: {
    hint: 'Подсказка',
    close: 'Закрыть',
    ok: 'Понятно',
    solvedLine: 'Улика №{n} раскрыта. Символ: {s}',
    stamp: 'РАСКРЫТО',
    back: '← Назад к столу',
    // Frame around the game.
    menu: 'МЕНЮ',
    menuTitle: 'Меню',
    menuContinue: 'Продолжить',
    menuRestart: 'Начать заново',
    restartConfirm: 'Точно? Нажми ещё раз',
    inventoryTitle: 'Улики',
    // Shown in the text box at the bottom.
    welcome: 'Маша, на столе и на доске спрятаны 7 улик. Наводи лупу и нажимай на предметы.',
    helpText: 'Нажимай на предметы на столе и на доске. Каждая раскрытая улика попадает в коробку справа внизу. Собери символы и введи пароль на ноутбуке.'
  },

  // Note pinned to the top-left of the board.
  board: {
    noteTitle: 'Дело особой важности',
    noteText: 'Маша, раскрой 7 улик. Каждая даст символ. Собери пароль и введи его на ноутбуке.'
  },

  items: {

    1: {
      title: 'Дело №1: Студия пилатеса',
      sceneLabel: 'Дело №1',
      symbol: 'w',
      hint: 'Жми «УДАР!», когда бегунок внутри зелёной зоны. Можно нажимать пробел.',
      story: 'Ещё до нашей дружбы дверь студии пилатеса заклинило намертво, а ты осталась внутри. Спасение пришло с ноги. Повтори этот подвиг: ударь, когда бегунок в зелёной зоне.',
      kickButton: 'УДАР!',
      meterLabel: 'Сила удара',
      doorSign: 'ПИЛАТЕС',
      // Green zone width as a share of the meter (0.12 = 12%).
      greenZone: 0.12,
      // Width after 3 misses.
      greenZoneWide: 0.26,
      hitLine: 'БАМ! Дверь распахнулась!',
      missLines: [
        'Дверь даже не заметила.',
        'Слабовато! Пилатес не прокачал ноги?',
        'Дверь хихикнула и осталась закрытой.',
        'Ещё раз, с разбегу!',
        'Тренер по пилатесу разочарован.',
        'Представь, что за дверью торт.'
      ],
      widenLine: 'Ладно, дверь устала сопротивляться. Зелёная зона стала шире.'
    },

    2: {
      title: 'Роман «Её тайный цветок»',
      sceneLabel: 'Её тайный цветок',
      symbol: 'A',
      hint: 'Прочитай только первые буквы каждого предложения на обложке.',
      coverTitle: 'Её тайный цветок',
      coverAuthor: 'Роза Нежная',
      coverTagline: 'Роман о самой деликатной тайне',
      flipHint: 'Нажми на обложку, чтобы перевернуть книгу',
      // The first letters of these 6 sentences must spell ЦВЕТОК.
      blurb: [
        'Целый год она хранила секрет, о котором не знали даже лучшие подруги.',
        'Врачи загадочно молчали, а аптекарша понимающе кивала.',
        'Её жизнь стала вечным выбором: сесть или постоять ещё немного?',
        'Только одна подруга знала правду и умела хранить тайны.',
        'Однажды ночью секрет расцвёл с новой силой.',
        'Как долго она сможет прятать свою нежную тайну от мира?'
      ],
      question: 'Как героиня называла свою тайну?',
      placeholder: 'Твой ответ',
      submit: 'Проверить',
      // Accepted answers. Case, spaces, punctuation and ё/е are ignored.
      answers: ['цветок', 'цветочек'],
      wrongLines: [
        'Не то. Перечитай аннотацию внимательнее.',
        'Холодно. Начни с начала… каждого предложения.',
        'Героиня бы так не сказала.'
      ],
      bookmarkText: 'Засушенный цветок выпал из книги'
    },

    3: {
      title: 'Порванный билет',
      sceneLabel: 'Билет',
      symbol: 'n',
      hint: 'Перетаскивай кусочки в пунктирную рамку. Кусочек встанет на место сам, если положить его рядом с правильным местом.',
      instruction: 'Собери билет в пунктирной рамке.',
      artist: 'КАНЬЕ',
      show: 'LIVE · ОДИН ВЕЧЕР',
      venue: 'Стадион, главная сцена',
      fields: [
        { label: 'ВОРОТА', value: 'H' },
        { label: 'ЯРУС', value: 'I' },
        { label: 'СЕКТОР', value: '9' },
        { label: 'РЯД', value: '11' }
      ],
      seatLabel: 'МЕСТО',
      // Shown in the seat field until the ticket is complete.
      seatHidden: '—',
      stubText: 'ВХОД',
      giftNote: 'Подарок от Маши и Максима ♥'
    },

    4: {
      title: 'Рентгеновские снимки',
      sceneLabel: 'Снимки',
      symbol: 'k',
      hint: 'Когда навалилось всё сразу, что-то не выдерживает и даёт трещину.',
      caseCard: 'Студентка, сессия, в день экзамена начались месячные. Что случилось?',
      instruction: 'Выбери снимок, который объясняет случившееся.',
      // id must be one of: healthy, cavity, braces, wisdom, filling, cracked.
      correct: 'cracked',
      films: [
        { id: 'healthy', label: 'Пациент 1: отличница', diagnosis: 'Здоровые зубы. Скучно! Эта студентка явно сдала всё досрочно.' },
        { id: 'cavity',  label: 'Пациент 2: сладкоежка', diagnosis: 'Кариес. Слишком много шоколадок во время подготовки. Месячные тут ни при чём.' },
        { id: 'braces',  label: 'Пациент 3: перфекционистка', diagnosis: 'Брекеты. Ровные зубы, ровные оценки. Не наш случай.' },
        { id: 'wisdom',  label: 'Пациент 4: зубрила', diagnosis: 'Зуб мудрости. Мудрость пришла, но явно не в день экзамена.' },
        { id: 'filling', label: 'Пациент 5: ветеран сессий', diagnosis: 'Пломба. Уже лечили, всё под контролем. Следующий!' },
        { id: 'cracked', label: 'Пациент 6: студентка', diagnosis: 'Трещина. Сессия плюс месячные: зуб не выдержал.' }
      ]
    },

    5: {
      title: 'Фотография и лупа',
      sceneLabel: 'Мы',
      symbol: 'e',
      hint: 'Посмотри на её руки.',
      photo: 'photos/item5-us.jpg',
      question: 'Самая важная улика всегда на виду. Найди её у Маши.',
      // Hidden detail. x and y are shares of the photo width and height
      // (0 = left/top, 1 = right/bottom). r is the radius as a share of
      // the photo width. Use ?debug and click the photo to read values.
      hotspot: { x: 0.72, y: 0.30, r: 0.05 },
      zoom: 2.5,
      wrongLines: [
        'Не здесь.',
        'Холодно.',
        'Смотри внимательнее.',
        'Это просто фон.',
        'Почти… нет, не почти.'
      ]
    },

    6: {
      title: 'Карта Грузии',
      sceneLabel: 'Грузия',
      symbol: 'r',
      hint: 'Вспомни, в каком порядке мы ездили. Потом разложи фото в том же порядке, слева направо, сверху вниз.',
      stopLabel: 'Остановка {n} из {m}',
      mapPrompt: 'Нажми на карте место, о котором речь.',
      seaLabel: 'Чёрное море',
      // Click tolerance in pixels on the map.
      tolerance: 40,
      warmLine: 'Тепло! Совсем рядом.',
      coldLines: ['Холодно.', 'Не туда.', 'Мы там не были… или были?'],
      allFoundLine: 'Все места найдены!',
      assemblePrompt: 'Разложи фотографии по порядку поездки.',
      assembleButton: 'Разложить фото',
      // Part of the map shown in the close-up, in degrees.
      mapView: { west: 44.4, east: 46.5, south: 41.3, north: 42.2 },
      // Grid line spacing in degrees.
      gridStep: 0.5,
      // Places drawn on the map for orientation only (not stops).
      landmarks: [
        { name: 'Тбилиси', lat: 41.7151, lon: 44.8271 }
      ],
      // Trip stops in order. lat/lon in decimal degrees (Google Maps: right-click → copy).
      stops: [
        { name: 'Сигнахи',            lat: 41.6186, lon: 45.9217, photo: 'photos/georgia-1.jpg', clue: 'Черновик: город на холме, крепостная стена и вид на всю Алазанскую долину.' },
        { name: 'Сагареджо',          lat: 41.7340, lon: 45.3315, photo: 'photos/georgia-2.jpg', clue: 'Черновик: первый городок Кахетии по дороге из Тбилиси.' },
        { name: 'Гомборский перевал', lat: 41.8686, lon: 45.3472, photo: 'photos/georgia-3.jpg', clue: 'Черновик: серпантин через лес, где уши закладывает от высоты.' },
        { name: 'Кисисхеви',          lat: 41.8978, lon: 45.5436, photo: 'photos/georgia-4.jpg', clue: 'Черновик: деревня у Телави, виноградники и тишина.' },
        { name: 'Коджори',            lat: 41.6640, lon: 44.7020, photo: 'photos/georgia-5.jpg', clue: 'Черновик: над Тбилиси, в горах, куда едут за прохладой.' }
      ]
    },

    7: {
      title: 'Заблокированный телефон',
      sceneLabel: 'Телефон',
      symbol: '6-7',
      hint: 'Злодей тот, кто вечно что-то замышляет. И ты его прекрасно знаешь.',
      captchaTitle: 'Выберите изображение со злодеем',
      captchaSub: 'Нажмите на подходящую картинку',
      unlockedText: '6-7',
      // 9 photos. Exactly one has villain: true.
      people: [
        { photo: 'photos/captcha-1.jpg', text: 'Подозреваемый 1: слишком милый, чтобы быть злодеем.' },
        { photo: 'photos/captcha-2.jpg', text: 'Подозреваемый 2: у него алиби. Он спал.' },
        { photo: 'photos/captcha-3.jpg', text: 'Подозреваемый 3: максимум может съесть последний кусок пиццы.' },
        { photo: 'photos/captcha-4.jpg', text: 'Подозреваемый 4: злодей? Он даже паука не обидит.' },
        { photo: 'photos/captcha-maksim.jpg', text: 'Максим! Злодей пойман.', villain: true },
        { photo: 'photos/captcha-5.jpg', text: 'Подозреваемый 5: просто проходил мимо.' },
        { photo: 'photos/captcha-6.jpg', text: 'Подозреваемый 6: подозрительно, но нет.' },
        { photo: 'photos/captcha-7.jpg', text: 'Подозреваемый 7: этот злодей только в караоке.' },
        { photo: 'photos/captcha-8.jpg', text: 'Подозреваемый 8: слишком хорош для этой роли.' }
      ]
    }
  },

  laptop: {
    title: 'Введите пароль',
    sub: 'Девять символов. Подсказки над ячейками.',
    button: 'Войти',
    wrongLine: 'Неверный пароль. Красные ячейки не подходят.',
    // Tooltip over each of the 9 boxes.
    tooltips: [
      'Улика №1: папка на столе',
      'Улика №2: роман на столе',
      'Улика №3: билет на доске',
      'Улика №4: снимки на доске',
      'Улика №5: фото в рамке',
      'Улика №6: карта на доске',
      'Улика №7: телефон (символ 1 из 3)',
      'Улика №7: телефон (символ 2 из 3)',
      'Улика №7: телефон (символ 3 из 3)'
    ],
    lockedScreen: 'Заблокировано',
    unlockedScreen: 'Открыто ♥'
  },

  finale: {
    // {NAME} is replaced with name above.
    title: 'С днём рождения, {NAME}!',
    subtitle: 'Дело закрыто. Детектив, ты лучшая.',
    clickHint: 'Нажми, чтобы открыть рабочий стол'
  },

  // Laptop desktop after the password. Everything here is draggable.
  desktop: {
    title: 'Рабочий стол',
    notes: [
      { text: 'Черновик: тут будет моё первое послание.', color: 'yellow' },
      { text: 'Черновик: спасибо, что ты есть.', color: 'pink' },
      { text: 'Черновик: помнишь Грузию?', color: 'green' },
      { text: 'Черновик: с днём рождения! ♥', color: 'blue' }
    ],
    photos: [
      { src: 'photos/desktop-1.jpg', caption: 'Черновик подписи 1' },
      { src: 'photos/desktop-2.jpg', caption: 'Черновик подписи 2' },
      { src: 'photos/desktop-3.jpg', caption: 'Черновик подписи 3' },
      { src: 'photos/desktop-4.jpg', caption: 'Черновик подписи 4' }
    ]
  },

  // Hidden clickable spots on the desk. x, y, w, h in scene pixels (the room view is 1460x640).
  // Use ?debug and click the scene to read coordinates.
  // look: 'mug', 'duck', 'paper' draws an object; '' makes an invisible spot.
  // text and photo are optional (leave '' to skip).
  eggs: [
    { x: 1330, y: 292, w: 70, h: 85,  look: 'mug',   title: 'Кофе детектива', text: 'Черновик: холодный, как это дело.', photo: 'photos/egg-1.jpg' },
    { x: 1335, y: 400, w: 95, h: 78,  look: 'duck',  title: 'Уточка-помощник', text: 'Черновик: объясни загадку уточке, и ответ придёт сам.', photo: '' },
    { x: 905,  y: 428, w: 60, h: 52,  look: 'paper', title: 'Скомканный листок', text: '', photo: 'photos/egg-3.jpg' }
  ]
};
