import { CharacterModel } from "../client/api";
import { getClientConfig } from "../config/client";
import {
  DEFAULT_CHARACTERS,
  DEFAULT_SIDEBAR_WIDTH,
  StoreKey,
} from "../constant";
import { createPersistStore } from "../utils/store";

export enum SubmitKey {
  Enter = "Enter",
  CtrlEnter = "Ctrl + Enter",
  ShiftEnter = "Shift + Enter",
  AltEnter = "Alt + Enter",
  MetaEnter = "Meta + Enter",
}

export enum Theme {
  Auto = "auto",
  Dark = "dark",
  Light = "light",
}

export const DEFAULT_CONFIG = {
  submitKey: SubmitKey.Enter,
  avatar: "1f603",
  assistant: "1f981",
  user: "User",
  fontSize: 14,
  theme: Theme.Auto as Theme,
  tightBorder: !!getClientConfig()?.isApp,
  sendPreviewBubble: true,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  characters: DEFAULT_CHARACTERS as any as CharacterModel[],
  characterConfig: "default",
};

export type ChatConfig = typeof DEFAULT_CONFIG;

export const useAppConfig = createPersistStore(
  { ...DEFAULT_CONFIG },
  (set, get) => ({
    reset() {
      set(() => ({ ...DEFAULT_CONFIG }));
    },

    mergeCharacters(newCharacters: CharacterModel[]) {
      if (!newCharacters || newCharacters.length === 0) {
        return;
      }

      const oldCharacters = get().characters;
      const characterMap: Record<string, CharacterModel> = {};

      for (const character of oldCharacters) {
        character.available = false;
        characterMap[character.name] = character;
      }

      for (const character of newCharacters) {
        character.available = true;
        characterMap[character.name] = character;
      }

      set(() => ({
        characters: Object.values(characterMap),
      }));
    },

    allCharacters() {},
  }),
  {
    name: StoreKey.Config,
  },
);
