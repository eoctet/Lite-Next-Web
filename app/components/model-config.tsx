import { ChatConfig } from "../store";
import { ClientApi } from "../client/api";
import Locale from "../locales";
import { ListItem, Select,showConfirm } from "./ui-lib";
import { useAllCharacters } from "../utils/hooks";
import { IconButton } from "./button";
import {
} from "../constant";

export function CharacterConfigList(props: {
  chatConfig: ChatConfig;
  updateConfig: (updater: (config: ChatConfig) => void) => void;
}) {
  const allCharacters = useAllCharacters();

  return (
    <>

      <ListItem
         title={Locale.Settings.Model.Title}
         subTitle={Locale.Settings.Model.SubTitle}
      >
        <Select
          value={props.chatConfig.characterConfig}
          onChange={(e) => {
            props.updateConfig(
              () => (props.chatConfig.characterConfig = e.currentTarget.value),
            );
          }}
        >
           <option value="default" key="-1">{Locale.Settings.Model.Reload.default}</option>
          {allCharacters
            .filter((v) => v.available)
            .map((v, i) => (
              <option value={v.name} key={i}>
                {v.displayName}
              </option>
            ))}
        </Select>
        <IconButton
          text={Locale.Settings.Danger.Reload.Action}
          onClick={async () => {
            if (await showConfirm(Locale.Settings.Danger.Reload.Confirm)) {
              var api: ClientApi = new ClientApi();
              api.llm.reload(props.chatConfig.characterConfig)
            }
          }}
          type="primary"
        />
      </ListItem>

    </>
  );
}
