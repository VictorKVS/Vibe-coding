import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { GENRES } from "../src/m1-contract.js";

async function waitFor(label, predicate) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (predicate()) return;
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
  }
  assert.fail(`тайм-аут ожидания: ${label}`);
}

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: "http://127.0.0.1/",
  pretendToBeVisual: true,
});

Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  localStorage: dom.window.localStorage,
  HTMLElement: dom.window.HTMLElement,
  Event: dom.window.Event,
  MouseEvent: dom.window.MouseEvent,
  getComputedStyle: dom.window.getComputedStyle,
  requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
  cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});

// React DOM определяет доступность браузерной среды при импорте, поэтому
// загружаем его только после установки JSDOM globals.
const { default: React, act } = await import("react");
const { createRoot } = await import("react-dom/client");

const vite = await createServer({
  appType: "custom",
  logLevel: "error",
  server: { middlewareMode: true },
});

try {
  const { default: App } = await vite.ssrLoadModule("/src/App.jsx");
  const root = createRoot(document.querySelector("#root"));

  await act(async () => root.render(React.createElement(App)));

  const bookButton = [...document.querySelectorAll("button")].find((button) =>
    button.textContent.includes("Сценарий книги"),
  );
  assert.ok(bookButton, "на стартовом экране нет кнопки «Сценарий книги»");
  await act(async () => bookButton.dispatchEvent(new MouseEvent("click", { bubbles: true })));

  const select = document.querySelector("#genre-select");
  assert.ok(select, "после входа не появился dropdown жанра");
  assert.deepEqual(
    [...select.options].map((option) => option.textContent),
    GENRES,
    "варианты dropdown не совпадают с контрактом",
  );
  assert.equal(select.value, GENRES[0], "начальное значение dropdown неверно");
  assert.match(document.querySelector(".current-genre").textContent, new RegExp(GENRES[0]));

  const modelGateway = document.querySelector(".model-gateway");
  assert.ok(modelGateway, "не появился универсальный Model Gateway");
  const localModelSelect = modelGateway.querySelector(".model-field-wide select");
  assert.ok(localModelSelect, "нет dropdown локальных моделей");
  assert.equal(localModelSelect.options.length, 9, "локальный инвентарь должен содержать 9 LLM");

  await act(async () => {
    select.value = "Триллер";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });

  assert.equal(select.value, "Триллер", "контролируемый dropdown не сохранил новый state");
  assert.match(
    document.querySelector(".current-genre").textContent,
    /Текущий жанр:\s*Триллер/,
    "отображаемый текущий жанр не изменился вместе со state",
  );

  const demoButton = [...document.querySelectorAll("button")].find((button) =>
    button.textContent.includes("Загрузить демо"),
  );
  assert.ok(demoButton, "нет кнопки загрузки ограниченного M1-демо");
  await act(async () => demoButton.dispatchEvent(new MouseEvent("click", { bubbles: true })));

  assert.equal(document.querySelectorAll(".character-profile").length, 4, "демо загрузило не 4 героев");
  const scriptEditors = [...document.querySelectorAll(".script-block textarea")];
  assert.equal(scriptEditors.length, 3, "редактор должен содержать три части сценария");
  assert.ok(scriptEditors[0].value.length > 40, "вступление демо не загрузилось");
  assert.ok(scriptEditors[1].value.length > 40, "развитие демо не загрузилось");
  assert.equal(scriptEditors[2].value, "", "до генерации финальная сцена должна быть пустой");

  const generatedFinale =
    "Передатчик назвал Лею её детским именем, а Незнакомец снял маску: сигнал отправил её брат из завтрашнего Петербурга.";
  const mockFetch = async (url, options) => {
    assert.equal(url, "/llm-api/v1/chat/completions", "генерация ушла не в локальный API");
    const request = JSON.parse(options.body);
    assert.equal(request.model, "gigachat3-10b-a18b-q4");
    assert.ok(request.messages.some((message) => message.content?.includes("Невский после полуночи")));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              assistantMessage: "Финальная сцена создана и требует авторской проверки.",
              introduction: scriptEditors[0].value,
              development: scriptEditors[1].value,
              finale: generatedFinale,
            }),
          },
        }],
      }),
    };
  };
  globalThis.fetch = mockFetch;
  dom.window.fetch = mockFetch;

  const sendButton = [...document.querySelectorAll("button")].find((button) =>
    button.textContent.includes("Отправить"),
  );
  assert.ok(sendButton && !sendButton.disabled, "готовый запрос демо нельзя отправить");
  await act(async () => sendButton.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await waitFor("ответ контролируемого локального API", () => scriptEditors[2].value === generatedFinale);

  const manualFinale = `${generatedFinale} Автор оставил последнее решение за Леей.`;
  const textareaValueSetter = Object.getOwnPropertyDescriptor(
    dom.window.HTMLTextAreaElement.prototype,
    "value",
  ).set;
  await act(async () => {
    textareaValueSetter.call(scriptEditors[2], manualFinale);
    scriptEditors[2].dispatchEvent(new Event("input", { bubbles: true }));
    scriptEditors[2].dispatchEvent(new Event("change", { bubbles: true }));
  });
  assert.equal(scriptEditors[2].value, manualFinale, "ручная правка финала не сохранилась");

  await act(async () => {
    select.value = "Роман";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  assert.equal(scriptEditors[2].value, manualFinale, "смена жанра затёрла ручную правку");

  await act(async () => root.unmount());
  console.log("PASS MIN-UI: реальный React dropdown содержит 5 жанров и меняет отображаемый state");
  console.log("PASS MED-UI: демо получает одну сцену от локального API и сохраняет ручную правку");
} finally {
  await vite.close();
  dom.window.close();
}
