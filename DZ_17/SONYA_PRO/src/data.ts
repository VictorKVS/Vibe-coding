export type ModuleId =
  | 'home'
  | 'menu'
  | 'kids'
  | 'desserts'
  | 'drinks'
  | 'events'
  | 'shopping'
  | 'tips'
  | 'fridge'
  | 'reminders'
  | 'calendar'
  | 'notes'
  | 'settings';

export type SonyaModule = {
  id: ModuleId;
  title: string;
  subtitle: string;
  emoji: string;
  bullets: string[];
  status: 'real' | 'mvp';
  accent: 'cyan' | 'blue' | 'berry' | 'violet' | 'mint';
};

export const modules: SonyaModule[] = [
  { id: 'home', title: 'Мой дом', subtitle: 'Сводка семьи и быстрые действия', emoji: '⌂', bullets: ['Сегодня', 'Семья', 'События', 'Задачи'], status: 'mvp', accent: 'cyan' },
  { id: 'menu', title: 'Планировщик меню', subtitle: 'Полезные и вкусные блюда для всей семьи', emoji: '🍽️', bullets: ['Завтрак', 'Обед', 'Ужин', 'Перекусы', 'Для детей'], status: 'real', accent: 'cyan' },
  { id: 'kids', title: 'Детский обед', subtitle: 'Вкусно. Полезно. Как праздник!', emoji: '😊', bullets: ['Полезно', 'Красиво', 'Любят дети', 'Быстрые рецепты', 'От 15 минут'], status: 'real', accent: 'blue' },
  { id: 'desserts', title: 'Десерты без сахара', subtitle: 'Натуральные сладости для маленьких гурманов', emoji: '🧁', bullets: ['Без сахара', 'Натурально', 'Вкусно', 'Для детей'], status: 'real', accent: 'berry' },
  { id: 'drinks', title: 'Компоты и морсы', subtitle: 'Натуральные напитки вместо сладкой газировки', emoji: '🥤', bullets: ['Натуральные', 'Витамины', 'Без сахара', 'Любимые вкусы'], status: 'real', accent: 'violet' },
  { id: 'events', title: 'Праздники и гости', subtitle: 'От идеи до последней тарелки', emoji: '🎁', bullets: ['Гости', 'Меню', 'Бюджет', 'Тайминг', 'Чек-лист'], status: 'mvp', accent: 'blue' },
  { id: 'shopping', title: 'Покупки', subtitle: 'Единый список из меню и домашних запасов', emoji: '🛒', bullets: ['Докупить', 'Уже дома', 'Количество', 'Приоритет'], status: 'mvp', accent: 'cyan' },
  { id: 'tips', title: 'Полезные советы', subtitle: 'Забота о здоровье каждый день', emoji: '💡', bullets: ['Здоровые привычки', 'Праздники', 'Сервировка', 'Идеи для семьи'], status: 'real', accent: 'mint' },
  { id: 'fridge', title: 'Мой холодильник', subtitle: 'Что есть дома и что приготовить', emoji: '❄️', bullets: ['Фото запасов', 'Остатки', 'Идеи блюд', 'Докупить'], status: 'real', accent: 'mint' },
  { id: 'reminders', title: 'Счета и напоминания', subtitle: 'Важные сроки без имитации оплаты', emoji: '🔔', bullets: ['Сроки', 'Напоминания', 'Статус'], status: 'mvp', accent: 'violet' },
  { id: 'calendar', title: 'Семейный календарь', subtitle: 'События, дни рождения и планы', emoji: '📅', bullets: ['События', 'Дни рождения', 'Планы'], status: 'mvp', accent: 'blue' },
  { id: 'notes', title: 'Заметки', subtitle: 'Идеи, списки и семейные записи', emoji: '📝', bullets: ['Идеи блюд', 'Списки', 'Заметки'], status: 'mvp', accent: 'cyan' },
  { id: 'settings', title: 'Настройки', subtitle: 'Профиль семьи, голос и интерфейс', emoji: '⚙️', bullets: ['Семья', 'Ограничения', 'Voice', 'Trace'], status: 'mvp', accent: 'violet' },
];

export const primaryModuleIds: ModuleId[] = ['menu', 'kids', 'desserts', 'drinks', 'tips'];

export function getModule(id: ModuleId) {
  return modules.find(module => module.id === id)!;
}
