import Fastify from "fastify";
import cors from "@fastify/cors";

const app = Fastify({ logger: true });

async function start() {
    try {
        await app.register(cors, {
            origin: "*"
        });

        app.listen({ port: 3000 }, () => {
            console.log("Running on localhost:3000");
        });
    } catch(error) {
        console.error(error);
        process.exit(1)
    }
}

start();