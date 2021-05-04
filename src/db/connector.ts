import { ConnectionOptions, createConnection } from "typeorm";
import merge from "deepmerge";
import path from "path";

export const ENTITIES_PATH = path.resolve(__dirname, "entities/*.js");

function makeConfig(opts: ConnectionOptions): ConnectionOptions {
    // @ts-ignore
    return merge({
        entities: [
            ENTITIES_PATH
        ]
    }, opts as any) as ConnectionOptions;
}

export async function connectToDatabase(options: ConnectionOptions): Promise<void> {
    await createConnection(makeConfig(options));
}