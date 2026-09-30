export const catalog = [
  {id:'laugh',kind:'emotion',price:0,icon:'☺',name:'Ха-ха',description:'Весёлый сигнал вашему флоту.'},
  {id:'salute',kind:'emotion',price:0,icon:'⚑',name:'Салют',description:'Приветствие от командира.'},
  {id:'oops',kind:'emotion',price:0,icon:'!',name:'Ой!',description:'Даже капитаны ошибаются.'},
  {id:'luck',kind:'emotion',price:0,icon:'✧',name:'Удача',description:'Пожелайте попутного ветра.'},
  {id:'storm',kind:'emotion',price:0,icon:'ϟ',name:'Впереди буря',description:'Предупредите о приближении грозы.'},
  {id:'gg',kind:'emotion',price:0,icon:'⚓',name:'Хорошая игра',description:'Поблагодарите за сражение.'},
  {id:'sonar',kind:'card',price:180,icon:'◎',name:'Гидролокатор',description:'Считает непоражённые сегменты в квадрате 3×3. Не раскрывает точные клетки. Ход сохраняется.'},
  {id:'chance',kind:'card',price:240,icon:'↻',name:'Второй шанс',description:'Следующий выстрел сохраняет ход даже при промахе. Бонус расходуется и при попадании.'},
  {id:'signal',kind:'card',price:450,icon:'⌁',name:'Перехват сигнала',description:'Раскрывает один случайный скрытый корабль до потопления. Ход сохраняется.'},
  {id:'bomb',kind:'card',price:520,icon:'◈',name:'Глубинная бомба',description:'Атакует свободные клетки 2×2. Хотя бы одно попадание сохраняет ход; все промахи передают ход.'},
  {id:'kraken',kind:'card',price:800,icon:'Ψ',name:'Кракен',description:'Топит один случайный оставшийся корабль. Ход сохраняется.'},
] as const;
export type ItemId = typeof catalog[number]['id'];
