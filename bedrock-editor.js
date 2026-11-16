
/*
 * CostLite Creator — Bedrock Editor
 * Version 1.0
 *
 * Required scripts, in this order:
 * 1. JSZip
 * 2. bedrock-engine.js
 * 3. bedrock-templates.js
 * 4. bedrock-editor.js
 */

(function () {
  "use strict";

  const Engine = window.BedrockEngine;
  const Templates = window.BedrockTemplates;

  if (!Engine || !Templates || !window.JSZip) {
    console.error(
      "CostLite: загрузите JSZip, bedrock-engine.js и bedrock-templates.js перед редактором."
    );
    return;
  }

  const STORAGE_KEY = "costlite_bedrock_project_v1";

  let project = null;
  let selectedFile = null;

  const style = document.createElement("style");
  style.textContent = `
    #cl-bedrock-button {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 99990;
      border: 0;
      border-radius: 14px;
      background: #8b5cf6;
      color: white;
      padding: 14px 19px;
      font-weight: 800;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 8px 30px #0007;
    }

    #cl-bedrock-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: none;
      background: #09090f;
      color: #eeeef5;
      font-family: Arial, sans-serif;
      overflow-y: auto;
    }

    #cl-bedrock-overlay * {
      box-sizing: border-box;
    }

    .cl-editor {
      max-width: 1100px;
      margin: auto;
      padding: 20px;
    }

    .cl-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      border-bottom: 1px solid #292938;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }

    .cl-topbar h2 {
      margin: 0;
      font-size: 22px;
    }

    .cl-muted {
      color: #9999aa;
      font-size: 13px;
    }

    .cl-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .cl-card {
      background: #14141e;
      border: 1px solid #292938;
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 14px;
      min-width: 0;
    }

    .cl-card h3 {
      margin: 0 0 14px;
      font-size: 16px;
    }

    .cl-field {
      display: block;
      margin: 10px 0;
      color: #c8c8d5;
      font-size: 13px;
    }

    .cl-field input,
    .cl-field textarea,
    .cl-field select {
      display: block;
      width: 100%;
      margin-top: 6px;
      border: 1px solid #343447;
      background: #0c0c14;
      color: white;
      border-radius: 9px;
      padding: 11px;
      font: inherit;
      outline: none;
    }

    .cl-field textarea {
      min-height: 180px;
      resize: vertical;
      font-family: monospace;
      font-size: 13px;
    }

    .cl-btn {
      border: 0;
      border-radius: 9px;
      padding: 11px 14px;
      margin: 4px 4px 4px 0;
      background: #29293b;
      color: white;
      cursor: pointer;
      font-weight: 700;
    }

    .cl-btn.primary {
      background: #7c3aed;
    }

    .cl-btn.green {
      background: #16794a;
    }

    .cl-btn.red {
      background: #9f3434;
    }

    .cl-btn:disabled {
      opacity: .5;
      cursor: not-allowed;
    }

    .cl-file {
      display: block;
      width: 100%;
      text-align: left;
      background: #101019;
      color: #ddd;
      border: 1px solid #292938;
      border-radius: 8px;
      padding: 10px;
      margin: 5px 0;
      cursor: pointer;
      overflow-wrap: anywhere;
    }

    .cl-file.active {
      border-color: #8b5cf6;
      background: #211638;
    }

    .cl-status {
      padding: 12px;
      border-radius: 9px;
      background: #101019;
      border: 1px solid #292938;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font-size: 13px;
      margin-top: 12px;
    }

    .cl-status.error {
      border-color: #a33b3b;
      color: #ffaaaa;
    }

    .cl-status.success {
      border-color: #238451;
      color: #9df0bd;
    }

    .cl-close {
      background: #29293b;
      color: white;
      border: 0;
      border-radius: 9px;
      padding: 10px 14px;
      cursor: pointer;
    }

    @media(max-width: 700px) {
      .cl-grid {
        grid-template-columns: 1fr;
      }
      .cl-editor {
        padding: 13px;
      }
    }
  `;

  document.head.appendChild(style);

  const button = document.createElement("button");
  button.id = "cl-bedrock-button";
  button.textContent = "Bedrock Editor";
  document.body.appendChild(button);

  const overlay = document.createElement("div");
  overlay.id = "cl-bedrock-overlay";

  overlay.innerHTML = `
    <div class="cl-editor">
      <div class="cl-topbar">
        <div>
          <h2>CostLite Bedrock Editor</h2>
          <div class="cl-muted">Minecraft Bedrock Addon Studio</div>
        </div>
        <button class="cl-close" data-action="close">Закрыть</button>
      </div>

      <section class="cl-card">
        <h3>Проект</h3>
        <label class="cl-field">
          Название проекта
          <input id="cl-project-name" maxlength="64"
            placeholder="MyAddon">
        </label>
        <label class="cl-field">
          Описание
          <input id="cl-project-description" maxlength="200"
            placeholder="Мой аддон для Minecraft">
        </label>
        <button class="cl-btn primary" data-action="create-project">
          Создать проект
        </button>
        <button class="cl-btn" data-action="save-project">
          Сохранить
        </button>
        <button class="cl-btn green" data-action="export-addon">
          Экспорт .mcaddon
        </button>
        <button class="cl-btn" data-action="export-bp">
          Экспорт BP
        </button>
        <button class="cl-btn" data-action="export-rp">
          Экспорт RP
        </button>
        <button class="cl-btn" data-action="validate">
          Проверить проект
        </button>
        <div id="cl-status" class="cl-status">
          Создай проект, чтобы начать работу.
        </div>
      </section>

      <div class="cl-grid">
        <section class="cl-card">
          <h3>Создать моба</h3>
          <label class="cl-field">
            ID моба
            <input id="cl-mob-id" value="custom_mob">
          </label>
          <label class="cl-field">
            Отображаемое имя
            <input id="cl-mob-display" value="Custom Mob">
          </label>
          <label class="cl-field">
            Здоровье
            <input id="cl-mob-health" type="number" min="1"
              max="10000" value="20">
          </label>
          <label class="cl-field">
            Скорость
            <input id="cl-mob-speed" type="number" min="0"
              max="10" step="0.05" value="0.25">
          </label>
          <button class="cl-btn primary" data-action="create-mob">
            Создать моба
          </button>
        </section>

        <section class="cl-card">
          <h3>Создать предмет</h3>
          <label class="cl-field">
            ID предмета
            <input id="cl-item-id" value="custom_item">
          </label>
          <label class="cl-field">
            Отображаемое имя
            <input id="cl-item-display" value="Custom Item">
          </label>
          <label class="cl-field">
            Размер стака
            <input id="cl-item-stack" type="number" min="1"
              max="64" value="64">
          </label>
          <button class="cl-btn primary" data-action="create-item">
            Создать предмет
          </button>
        </section>

        <section class="cl-card">
          <h3>Создать рецепт</h3>
          <label class="cl-field">
            ID рецепта
            <input id="cl-recipe-id" value="custom_recipe">
          </label>
          <label class="cl-field">
            Предмет результата
            <input id="cl-recipe-result"
              value="minecraft:diamond">
          </label>
          <label class="cl-field">
            Количество результата
            <input id="cl-recipe-count" type="number"
              min="1" max="64" value="1">
          </label>
          <button class="cl-btn primary" data-action="create-recipe">
            Создать рецепт
          </button>
        </section>

        <section class="cl-card">
          <h3>Добавить свой JSON</h3>
          <label class="cl-field">
            Пакет
            <select id="cl-custom-pack">
              <option value="behavior">Behavior Pack</option>
              <option value="resources">Resource Pack</option>
            </select>
          </label>
          <label class="cl-field">
            Путь файла
            <input id="cl-custom-path"
              placeholder="entities/my_entity.json">
          </label>
          <label class="cl-field">
            Содержимое JSON
            <textarea id="cl-custom-content">{
  "example": true
}</textarea>
          </label>
          <button class="cl-btn primary" data-action="add-json">
            Добавить файл
          </button>
        </section>
      </div>

      <section class="cl-card">
        <h3>Файлы проекта</h3>
        <div class="cl-muted">
          Выбери файл, чтобы посмотреть или изменить его содержимое.
        </div>
        <div id="cl-file-list"></div>
        <label class="cl-field">
          Редактор файла
          <textarea id="cl-file-editor"
            placeholder="Выбери файл из списка..."></textarea>
        </label>
        <button class="cl-btn primary" data-action="save-file">
          Сохранить файл
        </button>
        <button class="cl-btn red" data-action="delete-file">
          Удалить файл
        </button>
      </section>
    </div>
  `;

  document.body.appendChild(overlay);

  const $ = function (selector) {
    return overlay.querySelector(selector);
  };

  function setStatus(message, type) {
    const status = $("#cl-status");
    status.textContent = message;
    status.className = "cl-status " + (type || "");
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function saveToStorage() {
    if (!project) return;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(project)
    );
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;

      const loaded = JSON.parse(raw);

      if (
        !loaded ||
        !loaded.behavior ||
        !loaded.resources
      ) {
        return false;
      }

      project = loaded;

      $("#cl-project-name").value = project.name || "";
      $("#cl-project-description").value =
        project.description || "";

      renderFiles();
      return true;
    } catch (error) {
      console.error("Не удалось загрузить проект:", error);
      return false;
    }
  }

  function requireProject() {
    if (!project) {
      setStatus("Сначала создай проект.", "error");
      return false;
    }

    return true;
  }

  function createProject() {
    const name = $("#cl-project-name").value.trim();
    const description =
      $("#cl-project-description").value.trim();

    if (!name) {
      setStatus("Введи название проекта.", "error");
      return;
    }

    project = Engine.createProject(name, description);
    selectedFile = null;

    saveToStorage();
    renderFiles();

    setStatus("Проект создан и сохранён.", "success");
  }

  function getAllFiles() {
    if (!project) return [];

    const files = [];

    ["behavior", "resources"].forEach(function (packName) {
      const pack = project[packName];

      Object.keys(pack.files || {}).forEach(function (path) {
        files.push({
          pack: packName,
          path: path,
          content: pack.files[path]
        });
      });
    });

    return files;
  }

  function renderFiles() {
    const container = $("#cl-file-list");
    container.innerHTML = "";

    if (!project) {
      container.textContent = "Нет проекта.";
      return;
    }

    const files = getAllFiles();

    if (!files.length) {
      container.textContent = "Файлов пока нет.";
      return;
    }

    files.forEach(function (file) {
      const fullPath = file.pack + "/" + file.path;
      const item = document.createElement("button");

      item.className = "cl-file" +
        (selectedFile === fullPath ? " active" : "");

      item.textContent = fullPath;
      item.dataset.file = fullPath;

      container.appendChild(item);
    });
  }

  function selectFile(fullPath) {
    if (!project) return;

    const parts = fullPath.split("/");
    const packName = parts.shift();
    const path = parts.join("/");

    if (!project[packName] ||
        !Object.prototype.hasOwnProperty.call(
          project[packName].files,
          path
        )) {
      return;
    }

    selectedFile = fullPath;
    $("#cl-file-editor").value =
      project[packName].files[path];

    renderFiles();
  }

  function createMob() {
    if (!requireProject()) return;

    try {
      const result = Templates.createMob(project, {
        namespace: "costlite",
        id: $("#cl-mob-id").value,
        displayName: $("#cl-mob-display").value,
        health: Number($("#cl-mob-health").value),
        speed: Number($("#cl-mob-speed").value)
      });

      saveToStorage();
      renderFiles();

      setStatus(
        "Моб создан: " + result.id +
        "\nКоманда для Minecraft: " + result.summonCommand,
        "success"
      );
    } catch (error) {
      setStatus(error.message, "error");
    }
  }

  function createItem() {
    if (!requireProject()) return;

    try {
      const result = Templates.createItem(project, {
        namespace: "costlite",
        id: $("#cl-item-id").value,
        displayName: $("#cl-item-display").value,
        maxStack: Number($("#cl-item-stack").value)
      });

      saveToStorage();
      renderFiles();

      setStatus(
        "Предмет создан: " + result.id +
        "\nКоманда: " + result.giveCommand,
        "success"
      );
    } catch (error) {
      setStatus(error.message, "error");
    }
  }

  function createRecipe() {
    if (!requireProject()) return;

    try {
      const result = Templates.createRecipe(project, {
        namespace: "costlite",
        id: $("#cl-recipe-id").value,
        result: $("#cl-recipe-result").value,
        count: Number($("#cl-recipe-count").value)
      });

      saveToStorage();
      renderFiles();

      setStatus(
        "Рецепт создан: " + result.id,
        "success"
      );
    } catch (error) {
      setStatus(error.message, "error");
    }
  }

  function addCustomJSON() {
    if (!requireProject()) return;

    try {
      const pack = $("#cl-custom-pack").value;
      const path = $("#cl-custom-path").value.trim();
      const content = $("#cl-custom-content").value;

      if (!path.toLowerCase().endsWith(".json")) {
        throw new Error("Укажи путь к файлу с расширением .json");
      }

      JSON.parse(content);

      Engine.addFile(project, pack, path, content);

      saveToStorage();
      renderFiles();

      setStatus("JSON добавлен: " + pack + "/" + path, "success");
    } catch (error) {
      setStatus("Ошибка: " + error.message, "error");
    }
  }

  function saveFile() {
    if (!requireProject()) return;

    if (!selectedFile) {
      setStatus("Сначала выбери файл.", "error");
      return;
    }

    const parts = selectedFile.split("/");
    const pack = parts.shift();
    const path = parts.join("/");
    const content = $("#cl-file-editor").value;

    try {
      if (path.toLowerCase().endsWith(".json")) {
        JSON.parse(content);
      }

      project[pack].files[path] = content;

      saveToStorage();
      renderFiles();

      setStatus("Файл сохранён.", "success");
    } catch (error) {
      setStatus("Ошибка JSON: " + error.message, "error");
    }
  }

  function deleteFile() {
    if (!requireProject()) return;

    if (!selectedFile) {
      setStatus("Сначала выбери файл.", "error");
      return;
    }

    if (!confirm("Удалить файл " + selectedFile + "?")) {
      return;
    }

    const parts = selectedFile.split("/");
    const pack = parts.shift();
    const path = parts.join("/");

    Engine.removeFile(project, pack, path);

    selectedFile = null;
    $("#cl-file-editor").value = "";

    saveToStorage();
    renderFiles();

    setStatus("Файл удалён.", "success");
  }

  function validate() {
    if (!requireProject()) return;

    const result = Engine.validateProject(project);

    if (result.valid) {
      setStatus(
        "Проверка завершена. Ошибок JSON и путей не найдено.",
        "success"
      );
    } else {
      setStatus(
        "Найдены ошибки:\n" + result.errors.join("\n"),
        "error"
      );
    }
  }

  async function exportAddon() {
    if (!requireProject()) return;

    try {
      setStatus("Собираю .mcaddon...");

      const blob = await Templates.exportAddon(project);

      await Engine.download(
        blob,
        (project.name || "addon") + ".mcaddon"
      );

      setStatus("Аддон собран и скачан.", "success");
    } catch (error) {
      setStatus("Ошибка экспорта:\n" + error.message, "error");
    }
  }

  async function exportSinglePack(packName) {
    if (!requireProject()) return;

    try {
      setStatus("Собираю пакет...");

      const blob = await Engine.exportPack(project, packName);

      const suffix = packName === "behavior" ? "_BP" : "_RP";

      await Engine.download(
        blob,
        (project.name || "addon") + suffix + ".mcpack"
      );

      setStatus("Пакет скачан.", "success");
    } catch (error) {
      setStatus("Ошибка экспорта:\n" + error.message, "error");
    }
  }

  overlay.addEventListener("click", function (event) {
    const actionButton = event.target.closest("[data-action]");
    const fileButton = event.target.closest("[data-file]");

    if (fileButton) {
      selectFile(fileButton.dataset.file);
      return;
    }

    if (!actionButton) return;

    const action = actionButton.dataset.action;

    switch (action) {
      case "close":
        overlay.style.display = "none";
        break;

      case "create-project":
        createProject();
        break;

      case "save-project":
        if (requireProject()) {
          saveToStorage();
          setStatus("Проект сохранён.", "success");
        }
        break;

      case "create-mob":
        createMob();
        break;

      case "create-item":
        createItem();
        break;

      case "create-recipe":
        createRecipe();
        break;

      case "add-json":
        addCustomJSON();
        break;

      case "save-file":
        saveFile();
        break;

      case "delete-file":
        deleteFile();
        break;

      case "validate":
        validate();
        break;

      case "export-addon":
        exportAddon();
        break;

      case "export-bp":
        exportSinglePack("behavior");
        break;

      case "export-rp":
        exportSinglePack("resources");
        break;
    }
  });

  button.addEventListener("click", function () {
    overlay.style.display = "block";
  });

  // Restore saved project when the page opens.
  loadFromStorage();

  // Public API for future integration with the main site.
  window.CostLiteBedrockEditor = {
    open: function () {
      overlay.style.display = "block";
    },
    close: function () {
      overlay.style.display = "none";
    },
    getProject: function () {
      return project;
    },
    createProject: createProject,
    validate: validate,
    save: saveToStorage
  };

  console.log("CostLite Bedrock Editor loaded.");
})();
