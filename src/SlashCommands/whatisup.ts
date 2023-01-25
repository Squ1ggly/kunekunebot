import { CommandInteraction } from "discord.js";
import { IBotHelperClient } from "../../types/helperTypes";
import { createSlashCmd, addStringOptionWithChoicesToSlashCmd } from "../../utils/discordjsHelper";
import fetch from 'isomorphic-fetch'
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
      const chosenServer = interaction.options.data.find((e) => e.name.toString().toLowerCase() === "server");
      if (!chosenServer) return interaction.reply("Error Occurred");
      const res = await fetch(`https://api.mcsrvstat.us/2/${chosenServer?.value}`, {
        method: "GET",
      });
      if (res.ok) {
        const responseJson = await res.json();
        if (!responseJson.online) return await interaction.reply(`The server ${chosenServer.value} is offline :(`);
        const replyMessage = `${responseJson?.hostname} is ${
          responseJson.online === true ? "Online" : "Offline"
        }.\nCurrently hosting ${responseJson?.motd?.clean}\nGame Ver: ${responseJson?.version}`;
        await interaction.reply(replyMessage);
        return;
      }
      await interaction.reply(`Could not get details for server ${chosenServer.value}`);
    } catch (err) {
      console.log(err);
      await interaction.reply("Error Occurred");
    }
  },
};
