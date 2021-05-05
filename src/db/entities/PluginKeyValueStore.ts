import { BaseEntity, Column, Entity, Unique } from "typeorm";
import { RedisConnection } from "../redis";

@Entity()
@Unique(["plugin", "key"])
export class PluginKeyValueStore extends BaseEntity {
    @Column({ primary: true })
    plugin: string;

    @Column({ primary: true })
    key: string;

    @Column("json", { default: "{}" })
    value: any;

    public static async get<T = any>(plugin: string, key: string): Promise<T> {
        const cached = await RedisConnection.client?.get(`${plugin}:${key}`);
        if (cached === null || cached === undefined) {
            const resolved = await this.findOne({ plugin, key });
            if (resolved) {
                await RedisConnection.client?.set(`${plugin}:${key}`, JSON.stringify(resolved.value));
            }
            return resolved?.value;
        }
        return JSON.parse(cached);
    }

    public static async set(plugin: string, key: string, value: any) {
        await this.unset(plugin, key);
        await Promise.all([
            this.create({
                plugin,
                key,
                value
            }).save(),
            RedisConnection.client?.set(`${plugin}:${key}`, JSON.stringify(value))
        ]);
    }

    public static async unset(plugin: string, key: string) {
        await Promise.all([
            this.delete({ plugin, key }),
            RedisConnection.client?.del(`${plugin}:${key}`)
        ]);
    }
}