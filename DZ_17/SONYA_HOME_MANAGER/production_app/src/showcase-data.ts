export type ShowcaseModuleId =
  | 'home'
  | 'menu'
  | 'kids'
  | 'dessert'
  | 'drinks'
  | 'events'
  | 'shopping'
  | 'tips'
  | 'fridge'
  | 'reminders'
  | 'calendar'
  | 'notes'
  | 'settings';

export type ShowcaseModule = {
  id: ShowcaseModuleId;
  title: string;
  subtitle: string;
  emoji: string;
  bullets: string[];
  accent: 'aqua' | 'blue' | 'violet' | 'berry' | 'mint';
};

export const showcaseModules: ShowcaseModule[] = [
  { id: 'menu', title: 'Планировщик меню', subtitle: 'Полезные и вкусные блюда для всей семьи', emoji: '🥗', bullets: ['Завтрак', 'Обед', 'Ужин', 'Перекусы', 'Для детей'], accent: 'aqua' },
  { id: 'kids', title: 'Детский обед', subtitle: 'Вкусно. Полезно. Как праздник!', emoji: '🐻', bullets: ['Полезно', 'Красиво', 'Любят дети', 'Быстрые рецепты', 'От 15 минут'], accent: 'blue' },
  { id: 'dessert', title: 'Десерты без сахара', subtitle: 'Натуральные сладости для маленьких гурманов', emoji: '🍓', bullets: ['Без сахара', 'Натурально', 'Вкусно', 'Для детей'], accent: 'berry' },
  { id: 'drinks', title: 'Компоты и морсы', subtitle: 'Натуральные напитки вместо сладкой газировки', emoji: '🫐', bullets: ['Натуральные', 'Витамины', 'Без сахара', 'Любимые вкусы'], accent: 'violet' },
  { id: 'tips', title: 'Полезные советы', subtitle: 'Забота о здоровье каждый день', emoji: '💡', bullets: ['Здоровые привычки', 'Идеи для праздников', 'Сервировка', 'Советы педиатров'], accent: 'mint' },
  { id: 'events', title: 'Праздники и гости', subtitle: 'От идеи до последней тарелки', emoji: '🎈', bullets: ['Гости', 'Меню', 'Бюджет', 'Тайминг', 'Чек-лист'], accent: 'blue' },
  { id: 'shopping', title: 'Покупки', subtitle: 'Единый список из меню и домашних запасов', emoji: '🛒', bullets: ['Докупить', 'Уже дома', 'Количество', 'Приоритет'], accent: 'aqua' },
  { id: 'fridge', title: 'Мой холодильник', subtitle: 'Что есть дома и что приготовить', emoji: '❄️', bullets: ['Фото запасов', 'Остатки', 'Идеи блюд', 'Докупить'], accent: 'mint' },
  { id: 'reminders', title: 'Счета и напоминания', subtitle: 'Не забыть важное — без имитации оплаты', emoji: '🔔', bullets: ['Сроки', 'Напоминания', 'Статус'], accent: 'violet' },
  { id: 'calendar', title: 'Семейный календарь', subtitle: 'События, дни рождения и планы', emoji: '📅', bullets: ['События', 'Дни рождения', 'Планы'], accent: 'blue' },
  { id: 'notes', title: 'Заметки', subtitle: 'Идеи, списки и семейные записи', emoji: '📝', bullets: ['Идеи блюд', 'Списки', 'Заметки'], accent: 'aqua' },
  { id: 'settings', title: 'Настройки', subtitle: 'Профиль семьи, голос и интерфейс', emoji: '⚙️', bullets: ['Семья', 'Ограничения', 'Voice', 'Trace'], accent: 'violet' },
];

export function getShowcaseModule(id: ShowcaseModuleId) {
  return showcaseModules.find(module => module.id === id);
}
