import { CharacterModel } from "../client/api";

export function collectCharacterTable(
  characters: readonly CharacterModel[],
) {
  const characterTable: Record<
    string,
    {
      available: boolean;
      name: string;
      displayName: string;
    }
  > = {};

  // default characters
  characters.forEach((m) => {
    characterTable[m.name] = {
      ...m,
      displayName: m.name, // 'provider' is copied over if it exists
    };
  });
  return characterTable;
}

/**
 * Generate full model table.
 */
export function collectCharacters(
  characters: readonly CharacterModel[],
) {
  const characterTable = collectCharacterTable(characters);
  const allCharacters = Object.values(characterTable);

  return allCharacters;
}
