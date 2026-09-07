function neutralizeStartScreen() {
  const card = document.querySelector(".story-card");
  if (!card || card.dataset.bookcraftNeutralized === "1") return;
  card.dataset.bookcraftNeutralized = "1";

  const title = card.querySelector("h3");
  if (title) title.innerHTML = "Новый<br />проект";

  const subtitle = card.querySelector("p");
  if (subtitle) subtitle.textContent = "Рассказ · книга · комикс · видео";

  const label = card.querySelector(".story-label");
  if (label) label.textContent = "ПРОЕКТ · НОВЫЙ";

  const status = card.querySelector(".story-status");
  if (status) status.innerHTML = "<i></i> готов к работе";

  const notes = Array.from(document.querySelectorAll(".story-visual .floating-note"));
  if (notes[0]) notes[0].textContent = "Загрузить источник";
  if (notes[1]) notes[1].textContent = "Создать с нуля";

  const scenes = Array.from(card.querySelectorAll(".scene-stack > div"));
  const values = [
    ["ИСТОЧНИК", "Не добавлен"],
    ["СТРУКТУРА", "Не разобрана"],
    ["ПРОИЗВОДНЫЕ", "Ещё не созданы"],
  ];
  scenes.forEach((scene, index) => {
    const [name, value] = values[index] || ["ЭТАП", "Не начат"];
    const span = scene.querySelector("span");
    const strong = scene.querySelector("strong");
    if (span) span.textContent = name;
    if (strong) strong.textContent = value;
  });

  const nodes = Array.from(card.querySelectorAll(".plot-node"));
  nodes.forEach((node, index) => {
    node.classList.remove("complete", "active");
    if (index === 0) node.classList.add("active");
  });
}

export function mountNeutralStartScreen() {
  const observer = new MutationObserver(neutralizeStartScreen);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  neutralizeStartScreen();
}
