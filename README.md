# botkit
My framework for Discord.JS bots, abstracting over Commando

## Motivation
Commando developers are too nitpicky with the level of customization you can have. Why? I don't know.

> If you deny a feature that's been asked for and shows decent demand, your users will find a way to make it anyways. Don't shoot things down blindly. Customization for a bot framework is key to making bots personalized and unique.

## Design
BotKit is very much decorator-oriented. It aims to be as declarative as possible, so that you don't need to worry about the actual discord layer. Just write your methods and go!

## Example
```ts
import { CommandoMessage } from "discord.js-commando";
import { DPlugin, DPluginLoaded, DPluginUnloaded, DCommandReplied, DCommandCompleted, DCommandDenied, DCommandGroup, BaseDPlugin, DCommandInfo } from "discord-botkit";

@DPlugin("ping")
@DCommandGroup("ping")
export class PingPlugin extends BaseDPlugin {
    @DCommand("ping", "does a ping!")
    async ping(message: CommandoMessage) {
        const count = await this.increment();

        await message.reply(`Ping ${count}`);
    }

    @DPluginLoaded
    pluginLoaded() {}

    @DPluginUnloaded
    pluginUnloadedMethodNameDoesntMatter() {}

    @DPluginUnloaded
    multipleListenersItDoesntCare() {}

    @DCommandReplied
    botReplied(botMessage: Message | Message[], origin: CommandoMessage) {}

    @DCommandCompleted
    commandCompleted(botMessage: Message | Message[], origin: CommandoMessage) {}

    @DCommandDenied
    userWasDeniedACommand(message: Message, info: DCommandInfo) {}

    async increment(): Promise<number> {
        const oldCount = await this.get<number>("counter");
        await this.set("counter", oldCount + 1);
        return oldCount + 1;
    }
}

@DCommandGroup("ping-no-plugin")
export class PingCommandGroup {
    @DCommand("ping", "pings hehee")
    async ping(message: CommandoMessage) {
        // its nice to nest into a plugin because you get persistence. if you dont need it, use command groups
        await message.reply(`Ping...`);
    }
}
```