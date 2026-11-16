/*
 * CostLite Creator
 * Bedrock Addon Engine v1.0
 *
 * Requires JSZip loaded globally.
 */

(function (global) {
  "use strict";

  const VERSION = [1, 0, 0];

  function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : (r & 3 | 8);
        return v.toString(16);
      }
    );
  }

  function cleanName(value) {
    return String(value || "MyAddon")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 64) || "MyAddon";
  }

  function validatePath(path) {
    if (typeof path !== "string" || !path.trim()) {
      throw new Error("Пустой путь файла");
    }

    const normalized = path.replace(/\\/g, "/");

    if (
      normalized.startsWith("/") ||
      normalized.split("/").includes("..") ||
      normalized.includes("\0")
    ) {
      throw new Error("Недопустимый путь: " + path);
    }

    return normalized;
  }

  function createManifest(name, description, moduleType, dependencies) {
    const modules = [
      {
        type: moduleType,
        uuid: uuid(),
        version: VERSION
      }
    ];

    return {
      format_version: 2,
      header: {
        name: name,
        description: description,
        uuid: uuid(),
        version: VERSION,
        min_engine_version: [1, 20, 0]
      },
      modules: modules,
      dependencies: dependencies || []
    };
  }

  function jsonFile(value) {
    return JSON.stringify(value, null, 2);
  }

  function createProject(name, description) {
    const safeName = cleanName(name);

    const behaviorUUID = uuid();
    const resourceUUID = uuid();

    const behaviorManifest = createManifest(
      safeName + " Behavior",
      description || "Created with CostLite Creator",
      "data",
      [
        {
          module_name: "@minecraft/server",
          version: "1.0.0"
        },
        {
          uuid: resourceUUID,
          version: VERSION
        }
      ]
    );

    const resourceManifest = createManifest(
      safeName + " Resources",
      description || "Created with CostLite Creator",
      "resources",
      []
    );

    // Use stable UUIDs for the dependency relationship.
    behaviorManifest.dependencies[1].uuid = resourceUUID;

    return {
      name: safeName,
      description: description || "",
      behavior: {
        manifest: behaviorManifest,
        files: {}
      },
      resources: {
        manifest: resourceManifest,
        files: {}
      }
    };
  }

  function addFile(project, pack, path, content) {
    if (!project || !project[pack]) {
      throw new Error("Неизвестный пакет: " + pack);
    }

    const safePath = validatePath(path);

    if (safePath === "manifest.json") {
      throw new Error("Нельзя заменить системный manifest.json");
    }

    project[pack].files[safePath] = String(content);

    return true;
  }

  function removeFile(project, pack, path) {
    if (!project || !project[pack]) {
      throw new Error("Неизвестный пакет");
    }

    const safePath = validatePath(path);
    delete project[pack].files[safePath];
  }

  function validateProject(project) {
    const errors = [];

    if (!project || !project.behavior || !project.resources) {
      return {
        valid: false,
        errors: ["Некорректная структура проекта"]
      };
    }

    for (const packName of ["behavior", "resources"]) {
      const pack = project[packName];

      if (!pack.manifest) {
        errors.push(packName + ": отсутствует manifest");
      }

      for (const [path, content] of Object.entries(pack.files || {})) {
        try {
          validatePath(path);

          if (path.toLowerCase().endsWith(".json")) {
            JSON.parse(content);
          }
        } catch (error) {
          errors.push(packName + "/" + path + ": " + error.message);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  function addToZip(zip, pack) {
    zip.file(
      "manifest.json",
      jsonFile(pack.manifest)
    );

    for (const [path, content] of Object.entries(pack.files || {})) {
      zip.file(validatePath(path), content);
    }
  }

  async function exportPack(project, packName) {
    if (typeof JSZip === "undefined") {
      throw new Error("JSZip не загружен. Проверь подключение библиотеки.");
    }

    const validation = validateProject(project);

    if (!validation.valid) {
      throw new Error(validation.errors.join("\n"));
    }

    const pack = project[packName];

    if (!pack) {
      throw new Error("Неизвестный тип пакета");
    }

    const zip = new JSZip();
    addToZip(zip, pack);

    return zip.generateAsync({
      type: "blob",
      mimeType: "application/zip"
    });
  }

  async function exportAddon(project) {
    if (typeof JSZip === "undefined") {
      throw new Error("JSZip не загружен. Проверь подключение библиотеки.");
    }

    const validation = validateProject(project);

    if (!validation.valid) {
      throw new Error(validation.errors.join("\n"));
    }

    const addon = new JSZip();

    const behaviorZip = addon.folder("Behavior");
    const resourceZip = addon.folder("Resources");

    addToZip(behaviorZip, project.behavior);
    addToZip(resourceZip, project.resources);

    return addon.generateAsync({
      type: "blob",
      mimeType: "application/zip"
    });
  }

  async function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  global.BedrockEngine = {
    version: VERSION,
    createProject,
    addFile,
    removeFile,
    validateProject,
    exportPack,
    exportAddon,
    download
  };

})(window);
