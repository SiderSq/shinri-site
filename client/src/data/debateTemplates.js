// Pre-configured debate templates for quick trial setup on Shinri Trial server

export const DEBATE_TEMPLATES = [
  {
    id: 'tpl_alibi_time',
    name: '1. Противоречие времени алиби (Хронометраж)',
    description: 'Подозреваемый утверждает, что покинул место задолго до преступления. Опровергается логами или свидетельством.',
    topic: 'СПОР ОБ АЛИБИ И ПЕРЕМЕЩЕНИЯХ // КЛАССНЫЙ СУД',
    interrogationTitle: 'ПЕРЕКРЁСТНЫЙ ДОПРОС: ХРОНОЛОГИЯ ПЕРЕМЕЩЕНИЙ',
    generateStatements: (speakerName = 'Подозреваемый', speakerRole = 'Ученик Академии') => [
      {
        id: 'STMT_01',
        speaker: speakerName,
        role: speakerRole,
        text: 'Я закончил(а) все свои дела и заранее вернулся(лась) в свой жилой сектор.',
        speed: 'normal',
        trajectory: 'linear',
        weakPoints: [
          {
            id: 'WP_01',
            phrase: 'вернулся(лась) в свой жилой сектор',
            startIndex: 32,
            endIndex: 65
          }
        ]
      },
      {
        id: 'STMT_02',
        speaker: speakerName,
        role: speakerRole,
        text: 'Питание отключилось только после моего ухода, и я покинул(а) отсек до 21:05!',
        speed: 'fast',
        trajectory: 'wave',
        weakPoints: [
          {
            id: 'WP_02',
            phrase: 'покинул(а) отсек до 21:05',
            startIndex: 49,
            endIndex: 74
          }
        ]
      },
      {
        id: 'STMT_03',
        speaker: speakerName,
        role: speakerRole,
        text: 'У меня не было никакой причины оставаться там или караулить жертву.',
        speed: 'normal',
        trajectory: 'linear'
      },
      {
        id: 'STMT_04',
        speaker: speakerName,
        role: speakerRole,
        text: 'Камеры отключились из-за аварийного скачка напряжения, я не имею к этому отношения!',
        speed: 'fast',
        trajectory: 'perspective',
        weakPoints: [
          {
            id: 'WP_04',
            phrase: 'аварийного скачка напряжения',
            startIndex: 23,
            endIndex: 51
          }
        ]
      },
      {
        id: 'STMT_05',
        speaker: speakerName,
        role: speakerRole,
        text: 'Никаких доказательств моего присутствия на месте после выключения света нет!',
        speed: 'normal',
        trajectory: 'wave',
        weakPoints: [
          {
            id: 'WP_05',
            phrase: 'Никаких доказательств моего присутствия',
            startIndex: 0,
            endIndex: 39
          }
        ]
      }
    ],
    bullets: [
      {
        id: 'BULLET_LOGS',
        code: 'BULLET_LOGS',
        title: 'Логи терминала СКУД',
        summary: 'В 21:07 зафиксирован вход по личному Монопаду подозреваемого.'
      },
      {
        id: 'BULLET_AUTOPSY',
        code: 'BULLET_AUTOPSY',
        title: 'Файл Монокумы',
        summary: 'Время наступления смерти жертвы: 21:05 – 21:15.'
      },
      {
        id: 'BULLET_CLUE_1',
        code: 'BULLET_CLUE_1',
        title: 'Обрывки ткани на пороге',
        summary: 'Волокна одежды соответствуют школьной форме подозреваемого.'
      },
      {
        id: 'BULLET_CLUE_2',
        code: 'BULLET_CLUE_2',
        title: 'Свидетельство очевидца',
        summary: 'Очевидец слышал шаги у двери за минуту до отключения освещения.'
      }
    ],
    truthRule: {
      statementId: 'STMT_02',
      weakPointId: 'WP_02',
      bulletId: 'BULLET_LOGS',
      counterStatement: '«Твоё алиби рушится прямо здесь! Логи терминала чётко показывают, что ты находился(лась) внутри после 21:05!»',
      nextStage: 'DEBATE_RESOLVED',
      unlockedClue: 'CLUE_TIMING_CONTRADICTION'
    }
  },

  {
    id: 'tpl_weapon_denial',
    name: '2. Отрицание орудия убийства (Отпечатки / Вещдок)',
    description: 'Подозреваемый отрицает контакт с орудием убийства. Опровергается отпечатками или следами на предмете.',
    topic: 'СПОР ОБ ОРУДИИ ПРЕСТУПЛЕНИЯ // КЛАССНЫЙ СУД',
    interrogationTitle: 'ПЕРЕКРЁСТНЫЙ ДОПРОС: ПРИНАДЛЕЖНОСТЬ ОРУДИЯ',
    generateStatements: (speakerName = 'Подозреваемый', speakerRole = 'Ученик Академии') => [
      {
        id: 'STMT_01',
        speaker: speakerName,
        role: speakerRole,
        text: 'Каждый в этой комнате знает, что у меня нет навыков обращения с подобными орудиями.',
        speed: 'normal',
        trajectory: 'linear'
      },
      {
        id: 'STMT_02',
        speaker: speakerName,
        role: speakerRole,
        text: 'Я категорически отрицаю, что держал(а) в руках смертоносный предмет на верстаке!',
        speed: 'fast',
        trajectory: 'wave',
        weakPoints: [
          {
            id: 'WP_02',
            phrase: 'держал(а) в руках смертоносный предмет',
            startIndex: 28,
            endIndex: 66
          }
        ]
      },
      {
        id: 'STMT_03',
        speaker: speakerName,
        role: speakerRole,
        text: 'Любой мог пробраться в мастерскую и взять детали без моего ведома.',
        speed: 'normal',
        trajectory: 'linear'
      },
      {
        id: 'STMT_04',
        speaker: speakerName,
        role: speakerRole,
        text: 'На месте преступления не найдено ничего, что прямо связывало бы меня с жертвой!',
        speed: 'fast',
        trajectory: 'perspective',
        weakPoints: [
          {
            id: 'WP_04',
            phrase: 'не найдено ничего, что прямо связывало бы',
            startIndex: 24,
            endIndex: 65
          }
        ]
      }
    ],
    bullets: [
      {
        id: 'BULLET_PRINTS',
        code: 'BULLET_PRINTS',
        title: 'Дактилоскопия рукояти орудия',
        summary: 'На спусковом механизме обнаружены чёткие отпечатки пальцев подозреваемого.'
      },
      {
        id: 'BULLET_AUTOPSY',
        code: 'BULLET_AUTOPSY',
        title: 'Файл Монокумы',
        summary: 'Характер ранений указывает на применение модифицированного орудия.'
      },
      {
        id: 'BULLET_FIBERS',
        code: 'BULLET_FIBERS',
        title: 'Микроволокна перчаток',
        summary: 'Следы ткани с верстака совпадают с формой подозреваемого.'
      }
    ],
    truthRule: {
      statementId: 'STMT_02',
      weakPointId: 'WP_02',
      bulletId: 'BULLET_PRINTS',
      counterStatement: '«Но это абсолютная ложь! На спусковом механизме остались твои свежие отпечатки пальцев!»',
      nextStage: 'DEBATE_RESOLVED',
      unlockedClue: 'CLUE_WEAPON_FINGERPRINTS'
    }
  },

  {
    id: 'tpl_locked_room',
    name: '3. Тайна запертой комнаты (Проникновение)',
    description: 'Подозреваемый утверждает, что комната была запечатана и вход был физически невозможен. Опровергается скрытым проходом.',
    topic: 'СПОР О ЗАПЕРТОЙ КОМНАТЕ // КЛАССНЫЙ СУД',
    interrogationTitle: 'ПЕРЕКРЁСТНЫЙ ДОПРОС: МЕТОД ПРОНИКНОВЕНИЯ',
    generateStatements: (speakerName = 'Подозреваемый', speakerRole = 'Ученик Академии') => [
      {
        id: 'STMT_01',
        speaker: speakerName,
        role: speakerRole,
        text: 'Все внешние шлюзы были автоматически запечатаны системой защиты.',
        speed: 'normal',
        trajectory: 'linear'
      },
      {
        id: 'STMT_02',
        speaker: speakerName,
        role: speakerRole,
        text: 'Проникнуть внутрь через запертую бронедверь было абсолютно невозможно!',
        speed: 'fast',
        trajectory: 'wave',
        weakPoints: [
          {
            id: 'WP_02',
            phrase: 'было абсолютно невозможно',
            startIndex: 42,
            endIndex: 68
          }
        ]
      },
      {
        id: 'STMT_03',
        speaker: speakerName,
        role: speakerRole,
        text: 'Ключ-карта всё время находилась у дежурного, и дубликатов не существовало.',
        speed: 'normal',
        trajectory: 'perspective',
        weakPoints: [
          {
            id: 'WP_03',
            phrase: 'дубликатов не существовало',
            startIndex: 48,
            endIndex: 74
          }
        ]
      }
    ],
    bullets: [
      {
        id: 'BULLET_VENT',
        code: 'BULLET_VENT',
        title: 'Схема технической вентиляции',
        summary: 'Вентиляционная шахта соединяет архив со смежным помещением в обход бронедвери.'
      },
      {
        id: 'BULLET_DUPLICATE',
        code: 'BULLET_DUPLICATE',
        title: 'Временный сервисный пропуск',
        summary: 'Запасная сервисная карта была выдана утром.'
      }
    ],
    truthRule: {
      statementId: 'STMT_02',
      weakPointId: 'WP_02',
      bulletId: 'BULLET_VENT',
      counterStatement: '«Дверь действительно была заперта, но убийце не нужна была дверь! Вентиляционный канал вел прямо внутрь!»',
      nextStage: 'DEBATE_RESOLVED',
      unlockedClue: 'CLUE_SECRET_PASSAGE'
    }
  }
];
