/*
 * CostLite Creator
 * Bedrock Templates v1.0
 *
 * Requires:
 *   bedrock-engine.js
 *   JSZip
 */

(function (global) {
  "use strict";

  const Engine = global.BedrockEngine;

  if (!Engine) {
    throw new Error("Сначала подключи bedrock-engine.js");
  }

  function safeId(value) {
    return String(value || "object")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/^[^a-z]+/, "")
      .slice(0, 32) || "object";
  }

  function safeNamespace(value) {
    return safeId(value || "costlite");
  }

  function identifier(namespace, name) {
    return safeNamespace(namespace) + ":" + safeId(name);
  }

  function add(pack, path, data, project) {
    Engine.addFile(project, pack, path, JSON.stringify(data, null, 2));
  }

  // ==========================================
  // 1. MOB / ENTITY
  // ==========================================

  function createMob(project, options) {
    options = options || {};

    const namespace = safeNamespace(options.namespace);
    const name = safeId(options.id || options.name || "custom_mob");
    const id = identifier(namespace, name);

    const displayName = options.displayName || "Custom Mob";
    const health = Math.max(1, Number(options.health) || 20);
    const speed = Math.max(0, Number(options.speed) || 0.25);

    const behaviorEntity = {
      format_version: "1.20.80",
      "minecraft:entity": {
        description: {
          identifier: id,
          is_spawnable: true,
          is_summonable: true,
          is_experimental: false
        },
        components: {
          "minecraft:type_family": {
            family: ["costlite", "mob"]
          },
          "minecraft:nameable": {},
          "minecraft:health": {
            value: health,
            max: health
          },
          "minecraft:movement": {
            value: speed
          },
          "minecraft:collision_box": {
            width: 0.6,
            height: 1.8
          },
          "minecraft:physics": {},
          "minecraft:pushable": {
            is_pushable: true,
            is_pushable_by_piston: true
          },
          "minecraft:navigation.walk": {
            can_path_over_water: true,
            avoid_water: false
          },
          "minecraft:movement.basic": {},
          "minecraft:jump.static": {},
          "minecraft:behavior.random_stroll": {
            priority: 6,
            speed_multiplier: 1
          },
          "minecraft:behavior.random_look_around": {
            priority: 7
          },
          "minecraft:behavior.look_at_player": {
            priority: 8,
            look_distance: 8,
            probability: 0.02
          }
        }
      }
    };

    const clientEntity = {
      format_version: "1.10.0",
      "minecraft:client_entity": {
        description: {
          identifier: id,
          materials: {
            default: "entity_alphatest"
          },
          textures: {
            default: "textures/entity/zombie/zombie"
          },
          geometry: {
            default: "geometry.humanoid"
          },
          render_controllers: [
            "controller.render.default"
          ],
          spawn_egg: {
            base_color: "#387A42",
            overlay_color: "#A8D878"
          }
        }
      }
    };

    add(
      "behavior",
      "entities/" + name + ".json",
      behaviorEntity,
      project
    );

    add(
      "resources",
      "entity/" + name + ".entity.json",
      clientEntity,
      project
    );

    return {
      id: id,
      displayName: displayName,
      behaviorPath: "entities/" + name + ".json",
      resourcePath: "entity/" + name + ".entity.json",
      summonCommand: "/summon " + id
    };
  }

  // ==========================================
  // 2. ITEM
  // ==========================================

  function createItem(project, options) {
    options = options || {};

    const namespace = safeNamespace(options.namespace);
    const name = safeId(options.id || options.name || "custom_item");
    const id = identifier(namespace, name);

    const displayName = options.displayName || "Custom Item";
    const maxStack = Math.min(
      64,
      Math.max(1, Number(options.maxStack) || 64)
    );

    const item = {
      format_version: "1.20.50",
      "minecraft:item": {
        description: {
          identifier: id,
          menu_category: {
            category: "items"
          }
        },
        components: {
          "minecraft:max_stack_size": maxStack,
          "minecraft:icon": {
            texture: "apple"
          },
          "minecraft:display_name": {
            value: displayName
          }
        }
      }
    };

    add(
      "behavior",
      "items/" + name + ".json",
      item,
      project
    );

    return {
      id: id,
      displayName: displayName,
      path: "items/" + name + ".json",
      giveCommand: "/give @s " + id
    };
  }

  // ==========================================
  // 3. SHAPED CRAFTING RECIPE
  // ==========================================

  function createRecipe(project, options) {
    options = options || {};

    const namespace = safeNamespace(options.namespace);
    const name = safeId(options.id || "custom_recipe");

    const resultId = options.result || "minecraft:diamond";
    const count = Math.min(
      64,
      Math.max(1, Number(options.count) || 1)
    );

    const pattern = options.pattern || [
      "AAA",
      "A A",
      "AAA"
    ];

    const key = options.key || {
      A: {
        item: "minecraft:diamond"
      }
    };

    const recipe = {
      format_version: "1.20.10",
      "minecraft:recipe_shaped": {
        description: {
          identifier: identifier(namespace, name)
        },
        tags: [
          "crafting_table"
        ],
        pattern: pattern,
        key: key,
        result: {
          item: resultId,
          count: count
        }
      }
    };

    add(
      "behavior",
      "recipes/" + name + ".json",
      recipe,
      project
    );

    return {
      id: identifier(namespace, name),
      path: "recipes/" + name + ".json"
    };
  }

  // ==========================================
  // 4. EXPORT FIX
  // Creates real .mcpack files inside .mcaddon
  // ==========================================

  async function makePack(pack) {
    if (typeof global.JSZip === "undefined") {
      throw new Error("JSZip не загружен");
    }

    const zip = new global.JSZip();

    zip.file(
      "manifest.json",
      JSON.stringify(pack.manifest, null, 2)
    );

    Object.entries(pack.files || {}).forEach(function (entry) {
      const path = entry[0];
      const content = entry[1];

      zip.file(path, content);
    });

    return zip.generateAsync({
      type: "blob",
      mimeType: "application/zip"
    });
  }

  async function exportAddon(project) {
    if (typeof global.JSZip === "undefined") {
      throw new Error("JSZip не загружен");
    }

    const validation = Engine.validateProject(project);

    if (!validation.valid) {
      throw new Error(validation.errors.join("\n"));
    }

    const behaviorBlob = await makePack(project.behavior);
    const resourceBlob = await makePack(project.resources);

    const addon = new global.JSZip();

    const baseName = safeId(project.name || "costlite_addon");

    addon.file(baseName + "_BP.mcpack", behaviorBlob);
    addon.file(baseName + "_RP.mcpack", resourceBlob);

    return addon.generateAsync({
      type: "blob",
      mimeType: "application/zip"
    });
  }

  // Replace the earlier incomplete exporter.
  Engine.exportAddon = exportAddon;

  // ==========================================
  // 5. PUBLIC API
  // ==========================================

  global.BedrockTemplates = {
    version: "1.0.0",
    createMob: createMob,
    createItem: createItem,
    createRecipe: createRecipe,
    exportAddon: exportAddon
  };

})(window);
