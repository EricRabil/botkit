import "./commando-devs-are-pedantic-fucks";
import { Client, CommandoClientOptions } from "discord.js-commando";
import { PostgresSettingsProvider } from "./psql-setting-provider";
import { compileCommandGroup, CompiledCommandGroup } from "./util/declarative-commands";
import { compilePlugin } from "./util/declarative-plugins";
import { Entitlements } from "./native-plugins/entitlements";
import { DeleteReply } from "./native-plugins/delete-reply";
import { ERLog } from "../util/log";
import { DefaultsManager } from "./native-plugins/defaults";
import merge from "deepmerge";
import omit from "lodash.omit";

const Log = ERLog("DiscordController");

export interface DiscordControllerOptions extends CommandoClientOptions {
    token: string;
}

export class DiscordController {
    public static shared: DiscordController = null!;

    public client: Client;

    public entitlements = new Entitlements();

    #token: string;

    public constructor(options: DiscordControllerOptions) {
        this.#token = options.token;
        this.client = new Client(merge(omit(options, "token"), {
            ws: {
                intents: ["GUILD_MESSAGE_REACTIONS", "GUILD_MESSAGES", "GUILDS"]
            },
            partials: ["MESSAGE", "CHANNEL", "REACTION"]
        }));

        this.client.on("debug", console.log);
    }

    public async connect(): Promise<void> {
        this.client.registry.registerDefaultTypes();

        this.client.commandPrefix = "m!";
        await this.client.login(this.#token);
        await this.client.setProvider(PostgresSettingsProvider.shared);

        await Promise.all([
            this.loadPlugin(this.entitlements),
            this.loadPlugin(new DefaultsManager()),
            this.loadPlugin(new DeleteReply())
        ]);
    }

    public async loadPlugin(plugin: any) {
        const { metadata, commandGroups, listeners, hooks, lifecycleHooks } = compilePlugin(plugin);

        commandGroups.forEach(group => this.loadCompiledCommandGroup(group));
        listeners.forEach(({ key, metadata }) => this.client.on(metadata.name, (...args: any[]) => plugin[key](...args)));
        // @ts-ignore(2345)
        hooks.forEach(({ key, metadata }) => Object.entries(metadata).forEach(([ listener, enabled ]) => enabled && this.client.on(`command:${listener}`, (...args: any[]) => plugin[key](...args))));

        await Promise.all(lifecycleHooks.map(async ({ key, metadata }) => {
            if (metadata.loaded) await plugin[key]();
        }));

        Log(`Registered plugin ${metadata.id}`);
    }

    public loadCommandBlob(commandBlob: any) {
        this.loadCompiledCommandGroup(compileCommandGroup(commandBlob));
    }

    public loadCompiledCommandGroup({ group, commands }: CompiledCommandGroup) {
        this.client.registry.registerGroup(group(this.client));
        this.client.registry.registerCommands(commands);
    }
}
