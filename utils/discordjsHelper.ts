import {
  Collection,
  SlashCommandBuilder,
  EmbedAuthorData,
  EmbedBuilder,
  REST,
  Routes,
  Message,
  Interaction,
  CommandInteraction,
  InteractionResponse,
  APIApplicationCommandOptionChoice,
} from "discord.js";
import { IEmbedOptions, IBotHelperClient, ISlashCommand, IPrefixCommand } from "../types/helperTypes";
import { readdirSync } from "fs";
import { DateTime } from "luxon";
import dotenv from "dotenv";
import { commandPrefix, globalCoolDown } from "../src";
import path from "path";
const env = dotenv.config({
  path: "./.env",
}).parsed;

/**
 * This function will return true if the message is a command and false if not.
 * @param {IPrefixCommand[] | ISlashCommand[]} commandsArray : The Commands
 * @param {string} commandMsg : The message string
 * @returns {boolean}
 */
export function checkCommand(commandsArray: IPrefixCommand[] | ISlashCommand[], commandMsg: string): boolean {
  for (const command of commandsArray) {
    if (command.name === commandMsg) return true;
  }
  return false;
}

/**
 * This function will create a cool down message if a user is spamming commands : Configured in globalCoolDown variable in the index
 * @param message : The message
 * @param coolDowns : The stored cool downs in the client
 * @param coolDownCMD : the command string
 * @returns
 */
export async function coolDown(
  message: Message | Interaction,
  coolDowns: Map<string, Collection<string, number>>,
  coolDownCMD: string
): Promise<InteractionResponse<boolean>> {
  const id: string = !(message as Message)?.author?.id ? message.member.user.id : (message as Message).author.id;
  try {
    if (!coolDowns.has(coolDownCMD)) {
      coolDowns.set(coolDownCMD, new Collection());
    }
    const now = Date.now();
    const timeStamps = coolDowns.get(coolDownCMD);
    const coolDownAmount = globalCoolDown;
    if (timeStamps.has(id)) {
      const expirationTime = timeStamps.get(id) + coolDownAmount;
      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        console.log(`User ${id} is too fast`);
        return (message as CommandInteraction).reply(
          `Please wait ${timeLeft.toFixed(1)} more seconds before using ${coolDownCMD}`
        );
      }
    }
    timeStamps.set(id, now);
    setTimeout(() => timeStamps.delete(id), coolDownAmount);
  } catch (error) {
    await message.channel.send(`${error}`);
  }
}

/**
 * The function will return a SlashCommand built and ready.
 * Please no spaces in strings
 * @param cmdName : The name of the command
 * @param cmdDesc : Command description
 * @returns
 */
export function createSlashCmd(cmdName: string, cmdDesc: string) {
  return new SlashCommandBuilder().setName(cmdName.toLowerCase()).setDescription(cmdDesc.toLowerCase());
}

/**
 * The function will return a SlashCommand built and ready.
 * Please no spaces in strings
 * @param cmdName : The name of the command
 * @param cmdDesc : Command description
 * @param optName : The name of the option
 * @param optDesc : Option description
 * @param required : Is option required for command?
 * @returns
 */
export function createSlashCmdWithOpts(
  cmdName: string,
  cmdDesc: string,
  optName: string,
  optDesc: string,
  required: boolean = false
) {
  return new SlashCommandBuilder()
    .setName(cmdName.toLowerCase())
    .setDescription(cmdDesc.toLowerCase())
    .addStringOption((option) =>
      option.setName(optName.toLowerCase()).setDescription(optDesc.toLowerCase()).setRequired(required)
    );
}

/**
 * This manipulate your slashCmd to have extra options with choices
 * @param cmd : Your Slash object
 * @param optName : Option name
 * @param optDesc : Option Description
 * @param choices : An array of choices for your option
 * @param required : Is option required or not
 */
export function addStringOptionWithChoicesToSlashCmd(
  cmd: SlashCommandBuilder,
  optName: string,
  optDesc: string,
  choices: APIApplicationCommandOptionChoice<string>[],
  required: boolean = false
) {
  cmd.addStringOption((option) =>
    option.setName(optName.toLowerCase()).setDescription(optDesc.toLowerCase()).addChoices(...choices).setRequired(required)
  );
}

/**
 * This manipulate your slashCmd to have extra options
 * @param cmd : Your Slash object
 * @param optName : Option name
 * @param optDesc : Option Description
 * @param required : Is option required or not
 */
export function addStringOptionToSlashCmd(
  cmd: SlashCommandBuilder,
  optName: string,
  optDesc: string,
  required: boolean = false
) {
  cmd.addStringOption((option) =>
    option.setName(optName.toLowerCase()).setDescription(optDesc.toLowerCase()).setRequired(required)
  );
}

/**
 * removes null and empty string keys from object and returns a new one
 * @param obj : And object to clean
 * @returns a new object that is clean
 */
export function removeUnusedKeys(obj: object): Object {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== null && v !== ""));
}

/**
 * This function takes IEmbedOptions and returns a new embed
 * @param {IEmbedOptions} options : A json object of the options for your embed
 * @returns { Embed }
 */
export function createEmbed(options: IEmbedOptions): EmbedBuilder {
  console.log(`Creating embed ${JSON.stringify(options, null, 2)}`);
  const cleanOptions = removeUnusedKeys(options) as IEmbedOptions;
  return new EmbedBuilder()
    .setColor(cleanOptions?.setColor ?? 0)
    .setTitle(cleanOptions?.setTitle)
    .setAuthor(
      cleanOptions?.setAuthor ?? {
        name: null,
      }
    )
    .setDescription(cleanOptions?.setDescription)
    .setThumbnail(cleanOptions?.setThumbnail ?? null)
    .addFields(cleanOptions?.addFields ?? [])
    .setImage(cleanOptions?.setImage ?? null)
    .setTimestamp(cleanOptions?.setTimestamp ?? DateTime.now().toMillis())
    .setFooter(cleanOptions?.setFooter ?? { text: null })
    .setURL(cleanOptions?.setURL ?? null);
}

/**
 * Generate help message for each command
 * @param {IPrefixCommand[] | ISlashCommand[]} commandArray : The commands
 * @param {EmbedAuthorData} author : A Embed author
 * @param {string} optionalPrefix : This is an override for global prefix. Used for selecting slash command prefix
 * @returns {EmbedBuilder} : Returns a Embed object
 */
export function genHelpMessage(
  commandArray: IPrefixCommand[] | ISlashCommand[],
  author: EmbedAuthorData,
  optionalPrefix: string = null
): EmbedBuilder {
  console.log(`Generating help message for ${JSON.stringify(commandArray, null, 2)}`);
  const fields = [];
  const prefix = !optionalPrefix ? commandPrefix : optionalPrefix;
  for (const helpObj of commandArray) {
    fields.push({
      name: prefix + helpObj.name,
      value: helpObj.description,
      inline: false,
    });
  }

  const eObj: IEmbedOptions = {
    setColor: 0x0099ff,
    setTitle: "Help Message!",
    setURL: env?.botImage,
    setAuthor: author,
    setDescription: "This is a list of commands that you can run",
    setThumbnail: env?.botImage, // Global bot image to use for embeds. Configured in .env
    addFields: fields,
    setImage: null,
    setTimestamp: DateTime.now().toMillis(),
    setFooter: { text: null },
  };
  const embed = createEmbed(eObj);
  return embed;
}

/**
 * Assemble slash commands and store them in the client for later use
 * @param {IBotHelperClient} client
 */
export function setSlashCommands(client: IBotHelperClient) {
  console.log(`Setting slash commands`);
  client.slashCommands = new Collection();
  const upDir = path.join(__dirname, "../");
  const commandFiles = readdirSync(upDir + "/src/SlashCommands").filter((e) => e.endsWith(".ts") || e.endsWith(".js"));

  client.slashCommandsInfo = [];

  for (const file of commandFiles) {
    const command = require(`../src/SlashCommands/${file}`);
    const commandObj: ISlashCommand = {
      name: command.data.name,
      description: command.data.description,
    };
    if (command.data.options.length > 0) commandObj.options = command.data.options;
    client.slashCommandsInfo.push(commandObj);
    client.slashCommands.set(command.data.name, command);
  }
  console.log(`Finished setting slash commands`);
}

/**
 * Assemble prefix commands and store them in the client for later use
 * @param {IBotHelperClient} client
 */
export function setPrefixCommands(client: IBotHelperClient) {
  console.log(`Setting prefix commands`);
  client.prefixCommands = new Collection();
  const upDir = path.join(__dirname, "../");
  const commandFiles = readdirSync(upDir + "/src/PrefixCommands").filter((e) => e.endsWith(".ts") || e.endsWith(".js"));
  client.prefixCommandsInfo = [];
  for (const file of commandFiles) {
    const command = require(`../src/PrefixCommands/${file}`);
    const commandObj: IPrefixCommand = {
      name: command.name,
      description: command.description,
    };
    client.prefixCommandsInfo.push(commandObj);
    client.prefixCommands.set(command.name, command);
  }
  console.log(`Finished setting prefix commands`);
}

/**
 * Globally scoped slash commands
 * @param {ICommand[]} commands : An array of discord slash commands
 */
export async function updateDiscordCommands(commands: IPrefixCommand[] | ISlashCommand[]) {
  const rest = new REST({ version: "10" }).setToken(env.token);
  console.log("Started refreshing application (/) commands.");
  await rest.put(Routes.applicationCommands(env.botId), { body: [] });
  await rest.put(Routes.applicationCommands(env.botId), { body: commands });
  console.log("Getting Current (/) Commands");
  console.log(await rest.get(`/applications/${env.botId}/commands`));
  console.log("Successfully reloaded application (/) commands.");
}

/**
 * Clear globally scoped commands
 */
export async function clearBotLevelCommands() {
  const rest = new REST({ version: "10" }).setToken(env.token);
  const curr = (await rest.get(`/applications/${env.botId}/commands`)) as any[];
  if (curr.length > 0) {
    console.log("Started clearing application (/) commands.");
    await rest.put(Routes.applicationCommands(env.botId), { body: [] });
    console.log("Successfully cleared application (/) commands.");
  }
}

/**
 * Use this for server specific bots
 * @param serverId : The id of your discord server
 * @param commands : An array of slash commands
 */
export async function updateGuildCommands(commands: IPrefixCommand[] | ISlashCommand[] = []) {
  const rest = new REST({ version: "10" }).setToken(env.token);
  console.log("Started refreshing application guild (/) commands.");
  await rest.put(Routes.applicationGuildCommands(env.botId, env.serverId), { body: [] });
  if (commands.length > 0) {
    await rest.put(Routes.applicationGuildCommands(env.botId, env.serverId), { body: commands });
  }
  console.log("Successfully reloaded application guild (/) commands.");
}
