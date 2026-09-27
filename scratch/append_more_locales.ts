import * as fs from 'fs';

const moreLocales = `

// --- Spanish (es) ---
const ES_STANDARD_TOOLS = {
  'Mano': { intensity: 2, ratio: 8 },
  'Regla': { intensity: 3, ratio: 8 },
  'Tabla de madera': { intensity: 5, ratio: 8 },
  'Vara de bambú': { intensity: 7, ratio: 8 },
  'Palmeta': { intensity: 5, ratio: 8 },
  'Azote rojo': { intensity: 7, ratio: 8 },
  'Azote verde': { intensity: 7, ratio: 8 },
  'Barra de silicona': { intensity: 9, ratio: 6 },
  'Cable': { intensity: 9, ratio: 8 },
  'Cepillo de pelo': { intensity: 5, ratio: 8 },
  'Fusta de cuero': { intensity: 7, ratio: 8 },
  'Placa acrílica': { intensity: 7, ratio: 6 },
} as const

const ES_STANDARD_BODY_PARTS = {
  'Trasero': { sensitivity: 10, ratio: 80 },
  'Espalda': { sensitivity: 7, ratio: 5 },
  'Muslos': { sensitivity: 5, ratio: 5 },
  'Hendidura': { sensitivity: 2, ratio: 5 },
  'Palmas': { sensitivity: 2, ratio: 5 },
} as const

const ES_STANDARD_POSITIONS = {
  'De pie': { ratio: 20, compatibleBodyParts: ['Trasero', 'Espalda', 'Muslos', 'Hendidura', 'Palmas'] },
  'Apoyado en pared': { ratio: 20, compatibleBodyParts: ['Trasero', 'Espalda', 'Muslos', 'Hendidura'] },
  'Sobre la mesa': { ratio: 20, compatibleBodyParts: ['Trasero', 'Espalda', 'Muslos', 'Hendidura'] },
  'Sujetando rodillas': { ratio: 20, compatibleBodyParts: ['Trasero', 'Muslos', 'Hendidura'] },
  'A gatas': { ratio: 20, compatibleBodyParts: ['Trasero', 'Espalda', 'Muslos', 'Hendidura'] },
} as const

const ES_STANDARD_TRAPS: TrapAction[] = [
  { name: 'Trampa de exposición', description: 'Exponer el trasero por 5 minutos' },
  { name: 'Trampa de castigo', description: 'El jugador anterior te castiga con cualquier herramienta. Debes pedirlo en voz alta.' },
]

const ES_PARTY_TRAPS: TrapAction[] = [
  { name: 'Trampa de exposición', description: 'Exponer el trasero por 5 minutos', trapVariant: 'text' },
  { name: 'Trampa de ruego', description: 'Pedir el castigo en voz alta', trapVariant: 'text' },
  { name: 'Trampa grupal', description: 'El que activó la trampa da 3 palmadas a todos', trapVariant: 'all_players' },
  { name: 'Prueba de reflejos', description: 'El más rápido se libra de un castigo', trapVariant: 'mini_game_reaction' },
  { name: 'Memoria', description: 'Recuerda las 3 cartas. Si fallas, doble castigo', trapVariant: 'mini_game_memory' },
]

const ES_PARTY_QA_QUESTIONS = {
  warmup: ['¿Cuál es tu palabra de seguridad?', '¿Cuál es tu herramienta favorita?', '¿Cuándo conociste el SP?', '¿Haces ruido al ser castigado?', '¿Qué duele más, la anticipación o el golpe?', '¿Límite de intensidad?', '¿Posición que deseas probar?', '¿Ansiedad de espera o dolor?'],
  heating: ['Describe tu castigo más memorable', '¿Qué no aceptarías jamás?', '¿Has llorado en una sesión?', '¿Has sido castigado de pie o de rodillas?', '¿Cuánto aftercare necesitas?', '¿Has pensado en usar tu palabra de seguridad?', '¿Son necesarios los regaños previos?'],
  finale: ['¿Prefieres dar o recibir?', '¿Tu relación SP ideal?', '¿SP cotidiano?', '¿Límite máximo por tu pareja?', '¿Dolor puro o ritual?', 'Describe tu fantasía favorita'],
} as const

const ES_PARTY_DARE_INSTRUCTIONS = {
  warmup: ['Adivina la herramienta con los ojos cerrados', 'Finge expresión de dolor 10 seg', 'Masaje de 30 seg al de tu izquierda', 'Exige castigo al de tu derecha', 'Muestra posición de castigo 15 seg'],
  heating: ['El de tu derecha elige tu posición', 'Adivina quién te dio 3 palmadas', 'Mira a alguien 30 seg sin reír', 'Ruega por perdón', 'Cambia posición en el tablero con el de tu derecha'],
  finale: ['Voten quién resistió mejor', 'Dale 5 golpes suaves al de tu elección', 'Pide un castigo formalmente', 'Recibe 3 palmadas del de tu izquierda sin moverte', 'Cuenta tu fantasía y voten si hacerla ahora'],
} as const

const ES_STANDARD_PUNISHMENT_CONFIG: PunishmentConfig = {
  tools: Object.fromEntries(Object.entries(ES_STANDARD_TOOLS).map(([name, value]) => [name, { ...value, name }])),
  bodyParts: Object.fromEntries(Object.entries(ES_STANDARD_BODY_PARTS).map(([name, value]) => [name, { ...value, name }])),
  positions: Object.fromEntries(Object.entries(ES_STANDARD_POSITIONS).map(([name, value]) => [name, { ...value, name, compatibleBodyParts: [...value.compatibleBodyParts] }])) as Record<string, PunishmentPosition>,
  minStrikes: 10, maxStrikes: 30, step: 5, maxTakeoffFailures: 5, doublePunishmentChance: 20,
}

// --- French (fr) ---
const FR_STANDARD_TOOLS = {
  'Main': { intensity: 2, ratio: 8 },
  'Règle': { intensity: 3, ratio: 8 },
  'Planche': { intensity: 5, ratio: 8 },
  'Canne': { intensity: 7, ratio: 8 },
  'Martinet': { intensity: 5, ratio: 8 },
  'Fouet rouge': { intensity: 7, ratio: 8 },
  'Fouet vert': { intensity: 7, ratio: 8 },
  'Bâton de colle': { intensity: 9, ratio: 6 },
  'Câble': { intensity: 9, ratio: 8 },
  'Brosse': { intensity: 5, ratio: 8 },
  'Cravache': { intensity: 7, ratio: 8 },
  'Acrylique': { intensity: 7, ratio: 6 },
} as const

const FR_STANDARD_BODY_PARTS = {
  'Fesses': { sensitivity: 10, ratio: 80 },
  'Dos': { sensitivity: 7, ratio: 5 },
  'Cuisses': { sensitivity: 5, ratio: 5 },
  'Sillon': { sensitivity: 2, ratio: 5 },
  'Paumes': { sensitivity: 2, ratio: 5 },
} as const

const FR_STANDARD_POSITIONS = {
  'Debout': { ratio: 20, compatibleBodyParts: ['Fesses', 'Dos', 'Cuisses', 'Sillon', 'Paumes'] },
  'Au mur': { ratio: 20, compatibleBodyParts: ['Fesses', 'Dos', 'Cuisses', 'Sillon'] },
  'Sur la table': { ratio: 20, compatibleBodyParts: ['Fesses', 'Dos', 'Cuisses', 'Sillon'] },
  'Attrape-genoux': { ratio: 20, compatibleBodyParts: ['Fesses', 'Cuisses', 'Sillon'] },
  'À quatre pattes': { ratio: 20, compatibleBodyParts: ['Fesses', 'Dos', 'Cuisses', 'Sillon'] },
} as const

const FR_STANDARD_TRAPS: TrapAction[] = [
  { name: 'Piège d\\'exposition', description: 'Exposer ses fesses 5 min' },
  { name: 'Punition surprise', description: 'Demander à voix haute une punition au joueur précédent.' },
]

const FR_PARTY_TRAPS: TrapAction[] = [
  { name: 'Piège d\\'exposition', description: 'Exposer ses fesses 5 min', trapVariant: 'text' },
  { name: 'Demande de punition', description: 'Demander une punition à voix haute', trapVariant: 'text' },
  { name: 'Piège de groupe', description: 'Donner 3 fessées à tout le monde', trapVariant: 'all_players' },
  { name: 'Test de réflexes', description: 'Le plus rapide évite une punition', trapVariant: 'mini_game_reaction' },
  { name: 'Mémoire', description: 'Échouer double la prochaine punition', trapVariant: 'mini_game_memory' },
]

const FR_PARTY_QA_QUESTIONS = {
  warmup: ['Safeword ?', 'Outil préféré ?', 'Première découverte du SP ?', 'Fais-tu du bruit ?', 'Peur ou douleur ?', 'Limite max ?', 'Position à essayer ?', 'Attente ou action ?'],
  heating: ['Pire/meilleure punition ?', 'Limite stricte ?', 'Déjà pleuré ?', 'Au coin ?', 'Temps d\\'aftercare ?', 'Pensé au safeword ?', 'Sermon utile ?'],
  finale: ['Donner ou recevoir ?', 'Relation idéale ?', 'SP au quotidien ?', 'Gros sacrifice ?', 'Douleur vs Rituel ?', 'Fantasme ultime ?'],
} as const

const FR_PARTY_DARE_INSTRUCTIONS = {
  warmup: ['Deviner l\\'outil à l\\'aveugle', 'Mimer la douleur 10s', 'Masser qqn 30s', 'Ordonner une punition', 'Tenir une position 15s'],
  heating: ['Le voisin choisit ta position', 'Deviner qui a frappé', 'Regarder sans rire 30s', 'Supplier le pardon', 'Échanger sa place'],
  finale: ['Voter le plus résistant', 'Frapper qqn doucement 5 fois', 'Demander formellement', 'Prendre 3 coups sans bouger', 'Raconter un fantasme à réaliser'],
} as const

const FR_STANDARD_PUNISHMENT_CONFIG: PunishmentConfig = {
  tools: Object.fromEntries(Object.entries(FR_STANDARD_TOOLS).map(([name, value]) => [name, { ...value, name }])),
  bodyParts: Object.fromEntries(Object.entries(FR_STANDARD_BODY_PARTS).map(([name, value]) => [name, { ...value, name }])),
  positions: Object.fromEntries(Object.entries(FR_STANDARD_POSITIONS).map(([name, value]) => [name, { ...value, name, compatibleBodyParts: [...value.compatibleBodyParts] }])) as Record<string, PunishmentPosition>,
  minStrikes: 10, maxStrikes: 30, step: 5, maxTakeoffFailures: 5, doublePunishmentChance: 20,
}

// --- German (de) ---
const DE_STANDARD_TOOLS = {
  'Hand': { intensity: 2, ratio: 8 },
  'Lineal': { intensity: 3, ratio: 8 },
  'Holzbrett': { intensity: 5, ratio: 8 },
  'Rohrstock': { intensity: 7, ratio: 8 },
  'Tatzenstecken': { intensity: 5, ratio: 8 },
  'Rote Peitsche': { intensity: 7, ratio: 8 },
  'Grüne Peitsche': { intensity: 7, ratio: 8 },
  'Heißklebestick': { intensity: 9, ratio: 6 },
  'Kabel': { intensity: 9, ratio: 8 },
  'Haarbürste': { intensity: 5, ratio: 8 },
  'Lederpaddel': { intensity: 7, ratio: 8 },
  'Acrylglas': { intensity: 7, ratio: 6 },
} as const

const DE_STANDARD_BODY_PARTS = {
  'Hintern': { sensitivity: 10, ratio: 80 },
  'Rücken': { sensitivity: 7, ratio: 5 },
  'Oberschenkel': { sensitivity: 5, ratio: 5 },
  'Spalte': { sensitivity: 2, ratio: 5 },
  'Handflächen': { sensitivity: 2, ratio: 5 },
} as const

const DE_STANDARD_POSITIONS = {
  'Stehend': { ratio: 20, compatibleBodyParts: ['Hintern', 'Rücken', 'Oberschenkel', 'Spalte', 'Handflächen'] },
  'An der Wand': { ratio: 20, compatibleBodyParts: ['Hintern', 'Rücken', 'Oberschenkel', 'Spalte'] },
  'Auf dem Tisch': { ratio: 20, compatibleBodyParts: ['Hintern', 'Rücken', 'Oberschenkel', 'Spalte'] },
  'Knie festhalten': { ratio: 20, compatibleBodyParts: ['Hintern', 'Oberschenkel', 'Spalte'] },
  'Vierfüßler': { ratio: 20, compatibleBodyParts: ['Hintern', 'Rücken', 'Oberschenkel', 'Spalte'] },
} as const

const DE_STANDARD_TRAPS: TrapAction[] = [
  { name: 'Expositionsfalle', description: '5 Minuten den Hintern entblößen' },
  { name: 'Zufallsstrafe', description: 'Bitte laut um eine Strafe vom vorherigen Spieler.' },
]

const DE_PARTY_TRAPS: TrapAction[] = [
  { name: 'Expositionsfalle', description: '5 Minuten den Hintern entblößen', trapVariant: 'text' },
  { name: 'Bitte um Strafe', description: 'Laut um Strafe bitten', trapVariant: 'text' },
  { name: 'Gruppenfalle', description: 'Gib jedem 3 Schläge', trapVariant: 'all_players' },
  { name: 'Reaktionstest', description: 'Der Schnellste vermeidet Strafe', trapVariant: 'mini_game_reaction' },
  { name: 'Gedächtnis', description: 'Bei Fehler doppelte Strafe', trapVariant: 'mini_game_memory' },
]

const DE_PARTY_QA_QUESTIONS = {
  warmup: ['Safeword?', 'Lieblingswerkzeug?', 'Erstes Mal SP?', 'Machst du Geräusche?', 'Schmerz oder Angst?', 'Max. Limit?', 'Neue Position?', 'Warten oder Schmerz?'],
  heating: ['Erinnerung?', 'Absolutes No-Go?', 'Schon mal geweint?', 'In der Ecke gestanden?', 'Wie viel Aftercare?', 'An Safeword gedacht?', 'Vorherige Predigt?'],
  finale: ['Geben oder Nehmen?', 'Ideale SP-Beziehung?', 'SP im Alltag?', 'Größter Kompromiss?', 'Schmerz oder Ritual?', 'Größte Fantasie?'],
} as const

const DE_PARTY_DARE_INSTRUCTIONS = {
  warmup: ['Werkzeug blind erraten', 'Schmerzgesicht 10s mimen', 'Jemanden 30s massieren', 'Strafe anordnen', 'Position 15s halten'],
  heating: ['Nachbar wählt Position', 'Rate, wer geschlagen hat', '30s Augenkontakt ohne Lachen', 'Um Gnade betteln', 'Platz tauschen'],
  finale: ['Härtester Spieler Wahl', 'Jemandem 5 leichte Schläge geben', 'Offiziell um Strafe bitten', '3 Schläge ohne Zucken', 'Fantasie erzählen & abstimmen'],
} as const

const DE_STANDARD_PUNISHMENT_CONFIG: PunishmentConfig = {
  tools: Object.fromEntries(Object.entries(DE_STANDARD_TOOLS).map(([name, value]) => [name, { ...value, name }])),
  bodyParts: Object.fromEntries(Object.entries(DE_STANDARD_BODY_PARTS).map(([name, value]) => [name, { ...value, name }])),
  positions: Object.fromEntries(Object.entries(DE_STANDARD_POSITIONS).map(([name, value]) => [name, { ...value, name, compatibleBodyParts: [...value.compatibleBodyParts] }])) as Record<string, PunishmentPosition>,
  minStrikes: 10, maxStrikes: 30, step: 5, maxTakeoffFailures: 5, doublePunishmentChance: 20,
}


// --- Russian (ru) ---
const RU_STANDARD_TOOLS = {
  'Ладонь': { intensity: 2, ratio: 8 },
  'Линейка': { intensity: 3, ratio: 8 },
  'Доска': { intensity: 5, ratio: 8 },
  'Трость': { intensity: 7, ratio: 8 },
  'Указка': { intensity: 5, ratio: 8 },
  'Красный кнут': { intensity: 7, ratio: 8 },
  'Зеленый кнут': { intensity: 7, ratio: 8 },
  'Клеевой стержень': { intensity: 9, ratio: 6 },
  'Кабель': { intensity: 9, ratio: 8 },
  'Щетка': { intensity: 5, ratio: 8 },
  'Плетка': { intensity: 7, ratio: 8 },
  'Акрил': { intensity: 7, ratio: 6 },
} as const

const RU_STANDARD_BODY_PARTS = {
  'Ягодицы': { sensitivity: 10, ratio: 80 },
  'Спина': { sensitivity: 7, ratio: 5 },
  'Бедра': { sensitivity: 5, ratio: 5 },
  'Ложбинка': { sensitivity: 2, ratio: 5 },
  'Ладони': { sensitivity: 2, ratio: 5 },
} as const

const RU_STANDARD_POSITIONS = {
  'Стоя': { ratio: 20, compatibleBodyParts: ['Ягодицы', 'Спина', 'Бедра', 'Ложбинка', 'Ладони'] },
  'У стены': { ratio: 20, compatibleBodyParts: ['Ягодицы', 'Спина', 'Бедра', 'Ложбинка'] },
  'На столе': { ratio: 20, compatibleBodyParts: ['Ягодицы', 'Спина', 'Бедра', 'Ложбинка'] },
  'Держа колени': { ratio: 20, compatibleBodyParts: ['Ягодицы', 'Бедра', 'Ложбинка'] },
  'На четвереньках': { ratio: 20, compatibleBodyParts: ['Ягодицы', 'Спина', 'Бедра', 'Ложбинка'] },
} as const

const RU_STANDARD_TRAPS: TrapAction[] = [
  { name: 'Ловушка показа', description: 'Оголить ягодицы на 5 минут' },
  { name: 'Случайное наказание', description: 'Громко попросить наказание у предыдущего игрока.' },
]

const RU_PARTY_TRAPS: TrapAction[] = [
  { name: 'Ловушка показа', description: 'Оголить ягодицы на 5 минут', trapVariant: 'text' },
  { name: 'Просьба наказания', description: 'Громко попросить наказание', trapVariant: 'text' },
  { name: 'Групповая ловушка', description: 'Дать каждому по 3 шлепка', trapVariant: 'all_players' },
  { name: 'Тест реакции', description: 'Самый быстрый избегает наказания', trapVariant: 'mini_game_reaction' },
  { name: 'Память', description: 'Ошибка удваивает наказание', trapVariant: 'mini_game_memory' },
]

const RU_PARTY_QA_QUESTIONS = {
  warmup: ['Стоп-слово?', 'Любимый инструмент?', 'Первый опыт SP?', 'Издаешь звуки?', 'Боль или ожидание?', 'Максимум?', 'Новая поза?', 'Ожидание или боль?'],
  heating: ['Лучшее воспоминание?', 'Табу?', 'Плакал(а)?', 'Стоял(а) в углу?', 'Афтеркеа?', 'Думал(а) о стоп-слове?', 'Нужна ли лекция?'],
  finale: ['Давать или получать?', 'Идеальные отношения?', 'SP каждый день?', 'Компромисс?', 'Боль или ритуал?', 'Главная фантазия?'],
} as const

const RU_PARTY_DARE_INSTRUCTIONS = {
  warmup: ['Угадай инструмент вслепую', 'Изобрази боль 10 сек', 'Массаж 30 сек', 'Прикажи наказать', 'Держи позу 15 сек'],
  heating: ['Сосед выбирает позу', 'Угадай, кто ударил', '30 сек зрительного контакта', 'Моли о пощаде', 'Поменяйся местами'],
  finale: ['Выбор самого стойкого', 'Дать кому-то 5 шлепков', 'Официально попросить наказание', '3 удара без движений', 'Рассказать фантазию'],
} as const

const RU_STANDARD_PUNISHMENT_CONFIG: PunishmentConfig = {
  tools: Object.fromEntries(Object.entries(RU_STANDARD_TOOLS).map(([name, value]) => [name, { ...value, name }])),
  bodyParts: Object.fromEntries(Object.entries(RU_STANDARD_BODY_PARTS).map(([name, value]) => [name, { ...value, name }])),
  positions: Object.fromEntries(Object.entries(RU_STANDARD_POSITIONS).map(([name, value]) => [name, { ...value, name, compatibleBodyParts: [...value.compatibleBodyParts] }])) as Record<string, PunishmentPosition>,
  minStrikes: 10, maxStrikes: 30, step: 5, maxTakeoffFailures: 5, doublePunishmentChance: 20,
}

// --- Portuguese (pt) ---
const PT_STANDARD_TOOLS = {
  'Mão': { intensity: 2, ratio: 8 },
  'Régua': { intensity: 3, ratio: 8 },
  'Tábua': { intensity: 5, ratio: 8 },
  'Vara': { intensity: 7, ratio: 8 },
  'Palmatória': { intensity: 5, ratio: 8 },
  'Chicote vermelho': { intensity: 7, ratio: 8 },
  'Chicote verde': { intensity: 7, ratio: 8 },
  'Cola quente': { intensity: 9, ratio: 6 },
  'Cabo': { intensity: 9, ratio: 8 },
  'Escova': { intensity: 5, ratio: 8 },
  'Palmatória de couro': { intensity: 7, ratio: 8 },
  'Acrílico': { intensity: 7, ratio: 6 },
} as const

const PT_STANDARD_BODY_PARTS = {
  'Bumbum': { sensitivity: 10, ratio: 80 },
  'Costas': { sensitivity: 7, ratio: 5 },
  'Coxas': { sensitivity: 5, ratio: 5 },
  'Fenda': { sensitivity: 2, ratio: 5 },
  'Palmas': { sensitivity: 2, ratio: 5 },
} as const

const PT_STANDARD_POSITIONS = {
  'Em pé': { ratio: 20, compatibleBodyParts: ['Bumbum', 'Costas', 'Coxas', 'Fenda', 'Palmas'] },
  'Na parede': { ratio: 20, compatibleBodyParts: ['Bumbum', 'Costas', 'Coxas', 'Fenda'] },
  'Na mesa': { ratio: 20, compatibleBodyParts: ['Bumbum', 'Costas', 'Coxas', 'Fenda'] },
  'Segurando joelhos': { ratio: 20, compatibleBodyParts: ['Bumbum', 'Coxas', 'Fenda'] },
  'De quatro': { ratio: 20, compatibleBodyParts: ['Bumbum', 'Costas', 'Coxas', 'Fenda'] },
} as const

const PT_STANDARD_TRAPS: TrapAction[] = [
  { name: 'Armadilha de exposição', description: 'Expor o bumbum por 5 min' },
  { name: 'Punição surpresa', description: 'Pedir punição ao jogador anterior em voz alta.' },
]

const PT_PARTY_TRAPS: TrapAction[] = [
  { name: 'Armadilha de exposição', description: 'Expor o bumbum por 5 min', trapVariant: 'text' },
  { name: 'Pedido de punição', description: 'Pedir punição em voz alta', trapVariant: 'text' },
  { name: 'Armadilha em grupo', description: 'Dar 3 palmadas em todos', trapVariant: 'all_players' },
  { name: 'Teste de reflexo', description: 'O mais rápido evita punição', trapVariant: 'mini_game_reaction' },
  { name: 'Memória', description: 'Errar dobra a punição', trapVariant: 'mini_game_memory' },
]

const PT_PARTY_QA_QUESTIONS = {
  warmup: ['Safeword?', 'Ferramenta favorita?', 'Primeira vez no SP?', 'Faz barulho?', 'Medo ou dor?', 'Limite?', 'Nova posição?', 'Esperar ou apanhar?'],
  heating: ['Melhor lembrança?', 'Não aceita nunca?', 'Já chorou?', 'De castigo?', 'Tempo de aftercare?', 'Pensou no safeword?', 'Sermão ajuda?'],
  finale: ['Dar ou receber?', 'Relação ideal?', 'SP todo dia?', 'Maior sacrifício?', 'Dor ou ritual?', 'Fantasia favorita?'],
} as const

const PT_PARTY_DARE_INSTRUCTIONS = {
  warmup: ['Adivinhar ferramenta', 'Fingir dor 10s', 'Massagem 30s', 'Ordenar punição', 'Manter posição 15s'],
  heating: ['Vizinho escolhe posição', 'Adivinhar quem bateu', 'Olhar 30s sem rir', 'Implorar perdão', 'Trocar de lugar'],
  finale: ['Votar no mais resistente', 'Dar 5 palmadas leves', 'Pedir punição formalmente', '3 golpes sem se mover', 'Contar fantasia para votação'],
} as const

const PT_STANDARD_PUNISHMENT_CONFIG: PunishmentConfig = {
  tools: Object.fromEntries(Object.entries(PT_STANDARD_TOOLS).map(([name, value]) => [name, { ...value, name }])),
  bodyParts: Object.fromEntries(Object.entries(PT_STANDARD_BODY_PARTS).map(([name, value]) => [name, { ...value, name }])),
  positions: Object.fromEntries(Object.entries(PT_STANDARD_POSITIONS).map(([name, value]) => [name, { ...value, name, compatibleBodyParts: [...value.compatibleBodyParts] }])) as Record<string, PunishmentPosition>,
  minStrikes: 10, maxStrikes: 30, step: 5, maxTakeoffFailures: 5, doublePunishmentChance: 20,
}

// --- Italian (it) ---
const IT_STANDARD_TOOLS = {
  'Mano': { intensity: 2, ratio: 8 },
  'Righello': { intensity: 3, ratio: 8 },
  'Tavola': { intensity: 5, ratio: 8 },
  'Canna': { intensity: 7, ratio: 8 },
  'Bacchetta': { intensity: 5, ratio: 8 },
  'Frusta rossa': { intensity: 7, ratio: 8 },
  'Frusta verde': { intensity: 7, ratio: 8 },
  'Colla a caldo': { intensity: 9, ratio: 6 },
  'Cavo': { intensity: 9, ratio: 8 },
  'Spazzola': { intensity: 5, ratio: 8 },
  'Scudiscio': { intensity: 7, ratio: 8 },
  'Acrilico': { intensity: 7, ratio: 6 },
} as const

const IT_STANDARD_BODY_PARTS = {
  'Sedera': { sensitivity: 10, ratio: 80 },
  'Schiena': { sensitivity: 7, ratio: 5 },
  'Cosce': { sensitivity: 5, ratio: 5 },
  'Fessura': { sensitivity: 2, ratio: 5 },
  'Palmi': { sensitivity: 2, ratio: 5 },
} as const

const IT_STANDARD_POSITIONS = {
  'In piedi': { ratio: 20, compatibleBodyParts: ['Sedera', 'Schiena', 'Cosce', 'Fessura', 'Palmi'] },
  'Al muro': { ratio: 20, compatibleBodyParts: ['Sedera', 'Schiena', 'Cosce', 'Fessura'] },
  'Sul tavolo': { ratio: 20, compatibleBodyParts: ['Sedera', 'Schiena', 'Cosce', 'Fessura'] },
  'Tenendo ginocchia': { ratio: 20, compatibleBodyParts: ['Sedera', 'Cosce', 'Fessura'] },
  'A carponi': { ratio: 20, compatibleBodyParts: ['Sedera', 'Schiena', 'Cosce', 'Fessura'] },
} as const

const IT_STANDARD_TRAPS: TrapAction[] = [
  { name: 'Trappola esposizione', description: 'Esporre il sedere per 5 min' },
  { name: 'Punizione a sorpresa', description: 'Chiedi ad alta voce una punizione al giocatore precedente.' },
]

const IT_PARTY_TRAPS: TrapAction[] = [
  { name: 'Trappola esposizione', description: 'Esporre il sedere per 5 min', trapVariant: 'text' },
  { name: 'Richiesta di punizione', description: 'Chiedi una punizione ad alta voce', trapVariant: 'text' },
  { name: 'Trappola di gruppo', description: 'Dai 3 sculacciate a tutti', trapVariant: 'all_players' },
  { name: 'Test di riflessi', description: 'Il più veloce evita la punizione', trapVariant: 'mini_game_reaction' },
  { name: 'Memoria', description: 'Sbagliare raddoppia la punizione', trapVariant: 'mini_game_memory' },
]

const IT_PARTY_QA_QUESTIONS = {
  warmup: ['Safeword?', 'Strumento preferito?', 'Prima volta in SP?', 'Fai rumore?', 'Paura o dolore?', 'Limite?', 'Nuova posizione?', 'Aspettare o dolore?'],
  heating: ['Miglior ricordo?', 'Mai accettato?', 'Hai pianto?', 'In castigo?', 'Tempo di aftercare?', 'Pensato al safeword?', 'Discorsetto utile?'],
  finale: ['Dare o ricevere?', 'Relazione ideale?', 'SP tutti i giorni?', 'Miglior compromesso?', 'Dolore o rito?', 'Fantasia preferita?'],
} as const

const IT_PARTY_DARE_INSTRUCTIONS = {
  warmup: ['Indovina strumento alla cieca', 'Mima dolore 10s', 'Massaggio 30s', 'Ordina punizione', 'Tieni posizione 15s'],
  heating: ['Il vicino sceglie la posizione', 'Indovina chi ha colpito', 'Guarda 30s senza ridere', 'Implora perdono', 'Scambia posto'],
  finale: ['Vota il più resistente', 'Dai 5 colpi leggeri', 'Chiedi punizione formalmente', '3 colpi senza muoverti', 'Racconta fantasia per votazione'],
} as const

const IT_STANDARD_PUNISHMENT_CONFIG: PunishmentConfig = {
  tools: Object.fromEntries(Object.entries(IT_STANDARD_TOOLS).map(([name, value]) => [name, { ...value, name }])),
  bodyParts: Object.fromEntries(Object.entries(IT_STANDARD_BODY_PARTS).map(([name, value]) => [name, { ...value, name }])),
  positions: Object.fromEntries(Object.entries(IT_STANDARD_POSITIONS).map(([name, value]) => [name, { ...value, name, compatibleBodyParts: [...value.compatibleBodyParts] }])) as Record<string, PunishmentPosition>,
  minStrikes: 10, maxStrikes: 30, step: 5, maxTakeoffFailures: 5, doublePunishmentChance: 20,
}

// Locale contents
const ES_LOCALE_CONTENT: LocaleContent = {
  punishmentConfig: ES_STANDARD_PUNISHMENT_CONFIG,
  standardTraps: ES_STANDARD_TRAPS,
  partyTraps: ES_PARTY_TRAPS,
  partyQaQuestions: ES_PARTY_QA_QUESTIONS,
  partyDareInstructions: ES_PARTY_DARE_INSTRUCTIONS,
  defaultPlayerName: (index: number) => \`Jugador \${index + 1}\`,
}

const FR_LOCALE_CONTENT: LocaleContent = {
  punishmentConfig: FR_STANDARD_PUNISHMENT_CONFIG,
  standardTraps: FR_STANDARD_TRAPS,
  partyTraps: FR_PARTY_TRAPS,
  partyQaQuestions: FR_PARTY_QA_QUESTIONS,
  partyDareInstructions: FR_PARTY_DARE_INSTRUCTIONS,
  defaultPlayerName: (index: number) => \`Joueur \${index + 1}\`,
}

const DE_LOCALE_CONTENT: LocaleContent = {
  punishmentConfig: DE_STANDARD_PUNISHMENT_CONFIG,
  standardTraps: DE_STANDARD_TRAPS,
  partyTraps: DE_PARTY_TRAPS,
  partyQaQuestions: DE_PARTY_QA_QUESTIONS,
  partyDareInstructions: DE_PARTY_DARE_INSTRUCTIONS,
  defaultPlayerName: (index: number) => \`Spieler \${index + 1}\`,
}

const RU_LOCALE_CONTENT: LocaleContent = {
  punishmentConfig: RU_STANDARD_PUNISHMENT_CONFIG,
  standardTraps: RU_STANDARD_TRAPS,
  partyTraps: RU_PARTY_TRAPS,
  partyQaQuestions: RU_PARTY_QA_QUESTIONS,
  partyDareInstructions: RU_PARTY_DARE_INSTRUCTIONS,
  defaultPlayerName: (index: number) => \`Игрок \${index + 1}\`,
}

const PT_LOCALE_CONTENT: LocaleContent = {
  punishmentConfig: PT_STANDARD_PUNISHMENT_CONFIG,
  standardTraps: PT_STANDARD_TRAPS,
  partyTraps: PT_PARTY_TRAPS,
  partyQaQuestions: PT_PARTY_QA_QUESTIONS,
  partyDareInstructions: PT_PARTY_DARE_INSTRUCTIONS,
  defaultPlayerName: (index: number) => \`Jogador \${index + 1}\`,
}

const IT_LOCALE_CONTENT: LocaleContent = {
  punishmentConfig: IT_STANDARD_PUNISHMENT_CONFIG,
  standardTraps: IT_STANDARD_TRAPS,
  partyTraps: IT_PARTY_TRAPS,
  partyQaQuestions: IT_PARTY_QA_QUESTIONS,
  partyDareInstructions: IT_PARTY_DARE_INSTRUCTIONS,
  defaultPlayerName: (index: number) => \`Giocatore \${index + 1}\`,
}

`;

const path = 'packages/game-core/src/sharedConfig.ts';
let content = fs.readFileSync(path, 'utf8');

// replace getLocaleContent again
const originalFunc = `export function getLocaleContent(language: string): LocaleContent {
  const normalized = language.toLowerCase()
  if (normalized.startsWith('zh')) return ZH_LOCALE_CONTENT
  if (normalized.startsWith('ja')) return JA_LOCALE_CONTENT
  if (normalized.startsWith('ko')) return KO_LOCALE_CONTENT
  return EN_LOCALE_CONTENT
}`;
const newFunc = `export function getLocaleContent(language: string): LocaleContent {
  const normalized = language.toLowerCase()
  if (normalized.startsWith('zh')) return ZH_LOCALE_CONTENT
  if (normalized.startsWith('ja')) return JA_LOCALE_CONTENT
  if (normalized.startsWith('ko')) return KO_LOCALE_CONTENT
  if (normalized.startsWith('es')) return ES_LOCALE_CONTENT
  if (normalized.startsWith('fr')) return FR_LOCALE_CONTENT
  if (normalized.startsWith('de')) return DE_LOCALE_CONTENT
  if (normalized.startsWith('ru')) return RU_LOCALE_CONTENT
  if (normalized.startsWith('pt')) return PT_LOCALE_CONTENT
  if (normalized.startsWith('it')) return IT_LOCALE_CONTENT
  return EN_LOCALE_CONTENT
}`;

if (!content.includes(newFunc)) {
  content = content.replace(originalFunc, newFunc);
  const insertIndex = content.indexOf('/**\n * Returns the appropriate locale content');
  content = content.slice(0, insertIndex) + moreLocales + content.slice(insertIndex);
  fs.writeFileSync(path, content);
}
