import { tool } from "langchain"
import * as z from "zod"

import fs from "node:fs"
import { exec } from "node:child_process";

export const PokeTools = tool(
    async ({ name }: { name: string }) => {
        console.log(`Buscando informações sobre o Pokemon ${name}`);
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
        return response.json();
    },
    { 
        name: "PokeTools",
        description: `Use essa tools para buscar informações sobre POKEMONS`,
        schema: z.object({
            name: z.string().describe("O nome do Pokemon"),
        }),
    }
)


export const ListFiles = tool(
    async () => {
        console.log(`Listando arquivos`);
        const files = fs.readdirSync(".");
        return files;
    },
    {
        name: "ListFiles",
        description: `Use essa tools para listar arquivos`,
    }
)

export const ReadFile = tool(
    async ({ path }: { path: string }) => {
        console.log(`Lendo arquivo ${path}`);
        const content = fs.readFileSync(path, "utf8");
        return content;
    },
    {
        name: "ReadFile",
        description: `Use essa tools para ler arquivos`,
        schema: z.object({
            path: z.string().describe("O caminho do arquivo"),
        }),
    }
)
