import {
  ApiPath,
  StoreKey,
} from "../constant";
import { getClientConfig } from "../config/client";
import { createPersistStore } from "../utils/store";

const DEFAULT_API_URL =
  getClientConfig()?.buildMode === "export" ? "/" : ApiPath.OctetChat;

const DEFAULT_ACCESS_STATE = {
  useCustomConfig: true,
  url: DEFAULT_API_URL,
};

export const useAccessStore = createPersistStore(
  { ...DEFAULT_ACCESS_STATE },

  (set, get) => ({}),
  {
    name: StoreKey.Access,
  },
);
