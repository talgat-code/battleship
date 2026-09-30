export const emotions = [
  {id:'laugh', name:'Ха-ха', phrases:{ru:'Ха-ха!',kk:'Ха-ха!',en:'Ha ha!'}},
  {id:'salute', name:'Салют', phrases:{ru:'Привет, капитан!',kk:'Сәлем, капитан!',en:'Hello, captain!'}},
  {id:'oops', name:'Ой!', phrases:{ru:'Ой, промах!',kk:'Қап, мүлт кетті!',en:'Oops, missed!'}},
  {id:'luck', name:'Удача', phrases:{ru:'Попутного ветра!',kk:'Желің оңынан соқсын!',en:'Fair winds!'}},
  {id:'storm', name:'Впереди буря', phrases:{ru:'Надвигается буря!',kk:'Дауыл жақындап келеді!',en:'A storm is coming!'}},
  {id:'gg', name:'Хорошая игра', phrases:{ru:'Хорошая игра!',kk:'Жақсы ойын болды!',en:'Good game!'}},
] as const;
export type EmotionId = typeof emotions[number]['id'];
export const isEmotion = (id:unknown):id is EmotionId => emotions.some(e=>e.id===id);
export const emotionImage = (id:EmotionId) => `/emotions/${id}.png`;
export const COOLDOWN = 3000;
