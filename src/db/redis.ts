import { ClientOpts as RedisOptions } from "redis";
import { WrappedNodeRedisClient } from "handy-redis";

export class RedisConnection {
    public static shared = new RedisConnection();

    private constructor() {}

    #connection: WrappedNodeRedisClient;

    public take(opts: RedisOptions) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        this.client = require("handy-redis").createNodeRedisClient(opts);
    }

    public get client(): WrappedNodeRedisClient {
        return this.#connection;
    }

    public set client(connection: WrappedNodeRedisClient) {
        const oldConnection = this.#connection;
        this.#connection = connection;
        if (oldConnection) oldConnection.quit();
    }

    public static get client(): WrappedNodeRedisClient {
        return this.shared.client;
    }

    public static set client(client: WrappedNodeRedisClient) {
        this.shared.client = client;
    }
}