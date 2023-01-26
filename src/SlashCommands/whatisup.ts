import { CommandInteraction } from "discord.js";
import { IBotHelperClient, IEmbedOptions } from "../../types/helperTypes";
import { createSlashCmd, addStringOptionWithChoicesToSlashCmd, createEmbed } from "../../utils/discordjsHelper";
import fetch from "isomorphic-fetch";
const cmd = createSlashCmd("whatisup", "This command will tell you what server is up right now");
addStringOptionWithChoicesToSlashCmd(
  cmd,
  "Server",
  "Select the server you want to check",
  [
    { name: "Forge", value: "forge.play.thesqu1ggang.com" },
    { name: "Vanilla", value: "play.thesqu1ggang.com" },
  ],
  true
);
module.exports = {
  data: cmd,
  async execute(interaction: CommandInteraction, client: IBotHelperClient) {
    try {
      await interaction.deferReply();

      const chosenServer = interaction.options.get("server");

      if (!chosenServer) return interaction.editReply("Error Occurred");

      const res = await fetch(`https://api.mcsrvstat.us/2/${chosenServer?.value}`, {
        method: "GET",
      });

      if (!res.ok) return await interaction.editReply(`Could not get details for server ${chosenServer.value}`);

      const responseJson = await res.json();

      const eOptions: IEmbedOptions = {
        setTitle: `${chosenServer.value} is ${responseJson.online === true ? "Online" : "Offline"}`,
        setDescription: `The status of the minecraft server ${chosenServer.value}`,
        addFields: [
          {
            name: "Currently hosting",
            value: `${responseJson?.motd?.clean ?? "None"}`,
            inline: false,
          },
          {
            name: "Game Version",
            value: `${responseJson?.version ?? "None"}`,
            inline: false,
          },
        ],
      };

      const embed = createEmbed(eOptions);

      await interaction.editReply({ embeds: [embed] });

      return;
    } catch (err) {
      console.log(err);
      await interaction.channel.send("Error Occurred");
    }
  },
};
