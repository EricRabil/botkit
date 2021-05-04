import dotenv from "dotenv";
Object.assign(process.env, dotenv.config().parsed!);

import { DiscordController } from "./bot/controller";
import { connectToDatabase } from "./db/connector";
import { ERLog } from "./util/log";
import { version } from "./util/meta";
import { ClientOpts as RedisOpts } from "redis";
import { RedisConnection } from "./db/redis";
import { ConnectionOptions } from "typeorm";

export interface UninferredBotKitOptionsSegment<ControllerClass extends typeof DiscordController> {
    database: ConnectionOptions | false;
    discord: ConstructorParameters<ControllerClass>[0];
}

export type InferredBotKitOptionsSegment<DotEnv extends boolean, ControllerClass extends typeof DiscordController> = DotEnv extends true ? Partial<UninferredBotKitOptionsSegment<ControllerClass>> : UninferredBotKitOptionsSegment<ControllerClass>;

export type BotKitOptions<DotEnv extends boolean = false, ControllerClass extends typeof DiscordController = typeof DiscordController> = {
    redis?: RedisOpts | false;
    controllerClass?: ControllerClass;
    dotenv?: DotEnv;
    plugins?: any[];
    commands?: any[];
} & InferredBotKitOptionsSegment<DotEnv, ControllerClass>;

function env_namespace(namespace: string): Record<string, any> {
    return Object.fromEntries(Object.entries(process.env).filter(([ key ]) => key.startsWith(`${namespace}_`)).map(([ key, value ]: [ string, any ]) => {
        switch (value) {
            case "true":
                value = true;
                break;
            case "false":
                value = false;
                break;
            default:
                // eslint-disable-next-line no-case-declarations
                const numValue = +value;

                if (!isNaN(numValue) && numValue.toString() === value) value = numValue;
                break;
        }

        return [ key.slice(`${namespace}_`.length).toLowerCase(), value! ];
    }));
}

function initDiscord<ControllerClass extends typeof DiscordController>(controllerClass: ControllerClass, options: ConstructorParameters<ControllerClass>[0]): InstanceType<ControllerClass> {
    const instance = new controllerClass(options) as unknown as InstanceType<ControllerClass>;

    DiscordController.shared = controllerClass.shared = instance;

    return instance;
}

export async function setup<DotEnv extends boolean = false, ControllerClass extends typeof DiscordController = typeof DiscordController>({ database, dotenv, discord, redis, controllerClass, plugins, commands }: BotKitOptions<DotEnv, ControllerClass>): Promise<InstanceType<ControllerClass>> {
    type Options = BotKitOptions<DotEnv, ControllerClass>;
    type DiscordOptions = NonNullable<Options["discord"]>;

    if (!controllerClass) controllerClass = DiscordController as unknown as ControllerClass;
    
    const Log = ERLog("boot");

    Log(`BotKit v${version} is here`);

    if (dotenv) {
        Object.assign(process.env, (await import("dotenv")).config().parsed!);

        if (!discord) discord = env_namespace("DISCORD") as unknown as DiscordOptions;
        if (database === undefined) database = env_namespace("DB") as unknown as ConnectionOptions;
        if (redis === undefined) {
            redis = env_namespace("REDIS");
            if (Object.keys(redis).length === 0) redis = false;
        }
    }

    if (!discord) throw new Error("Could not satisfy Discord configuration");
    if (database === undefined) throw new Error("Could not satisfy database configuration");

    if (redis) {
        Log("Connecting to redis");

        RedisConnection.shared.take(redis);
    }

    if (database) {
        Log("Connecting to database");

        await connectToDatabase(database).then(Log.time(duration => `Connected to database in ${duration}ms`));
    }

    Log("Connecting to Discord");

    const instance = initDiscord(controllerClass, discord);
    await instance.connect().then(Log.time(duration => `Connected to Discord in ${duration}ms`));

    if (plugins) {
        await Promise.all(plugins.map(plugin => instance.loadPlugin(plugin)));
    }

    if (commands) {
        for (const command of commands) {
            instance.loadCommandBlob(command);
        }
    }

    return instance;
}
