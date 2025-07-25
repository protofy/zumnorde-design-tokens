import StyleDictionary from "style-dictionary";
import { formats, transformGroups } from "style-dictionary/enums";

StyleDictionary.registerParser({
  name: "json-parser",
  pattern: /\.json$/,
  parser: ({ filePath, contents }) => {
    const tokens = JSON.parse(contents);

    function trimKeys(obj: any): any {
      if (Array.isArray(obj)) {
        return obj.map(trimKeys);
      } else if (obj !== null && typeof obj === "object") {
        return Object.fromEntries(
          Object.entries(obj).map(([key, value]) => [
            key.trim(),
            typeof value === "string"
              ? value.replace(/ \/ /g, ".")
              : trimKeys(value),
          ])
        );
      }
      return obj;
    }

    const trimmedTokens = trimKeys(tokens);

    return trimmedTokens;
  },
});

StyleDictionary.registerTransform({
  type: "name",
  name: `name/cleanup`,
  transitive: true,
  transform: (token) => {
    const regex = /(color-(?:[a-z0-9-]*?))\b([a-z]+)-\2\b/g;

    return token.name
      .replace("primitives-", "")
      .replace("semantic-", "")
      .replace("typography-styles", "typography")
      .replace(regex, (_, p1, p2) => {
        return `${p1}${p2}`;
      });
  },
});

const template = ({ dictionary }) => `export default {
    ${dictionary.allTokens
      .map((token) => `"${token.name}": ${JSON.stringify(token.value)},`)
      .join("\n")}
    }
    `;

StyleDictionary.registerFormat({
  name: "default-export",
  format: template,
});

const sd = new StyleDictionary({
  source: ["./tokens/tokens.json"],
  parsers: ["json-parser"],
  platforms: {
    cssVars: {
      transformGroup: transformGroups.css,
      transforms: ["name/cleanup"],
      buildPath: "./build/css/",
      files: [
        {
          destination: "variables.css",
          format: formats.cssVariables,
          options: {
            outputReferences: true,
            selector: "@theme",
          },
        },
      ],
    },
    js: {
      transformGroup: transformGroups.js,
      transforms: ["name/kebab", "name/cleanup"],
      buildPath: "./build/js/",
      files: [
        {
          destination: "variables.js",
          format: "default-export",
        },
      ],
    },
  },
  log: {
    verbosity: "verbose",
  },
});

sd.buildAllPlatforms();
