import { useMemo } from "react";
import { useAppConfig } from "../store";
import { collectCharacters } from "./model";

export function useAllCharacters() {
  const configStore = useAppConfig();
  const characters = useMemo(() => {
    return collectCharacters(configStore.characters);
  }, [configStore.characters]);
  return characters;
}
