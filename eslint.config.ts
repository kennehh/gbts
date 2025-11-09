import js from "@eslint/js";
import globals from "globals";
import * as tsParser from "@typescript-eslint/parser";
import { importX } from "eslint-plugin-import-x";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import solid from "eslint-plugin-solid/configs/typescript";
// import { configs as tsConfigs } from "typescript-eslint";
// import { defineConfig } from "eslint/config"; - does not like importX's flat configs, using typescript-eslint's config for now
import { configs as tsConfigs, config as defineConfig } from "typescript-eslint"


export default defineConfig([
    js.configs.recommended,
    tsConfigs.recommendedTypeChecked,
    tsConfigs.stylisticTypeChecked,
    importX.flatConfigs.recommended,
    importX.flatConfigs.typescript,
    solid,
    {
        files: ["**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}"],
        languageOptions: {
            parserOptions: {
                parser: tsParser,
                ecmaVersion: "latest",
                sourceType: "module",
                projectService: true,
            },
            globals: { ...globals.browser, ...globals.node },
        },
        rules: {
            "@typescript-eslint/no-unused-vars": "warn",
            "@typescript-eslint/no-empty-function": "warn",
            "@typescript-eslint/class-literal-property-style": "warn",
        }
    },
    eslintConfigPrettier,
]);
