#!/usr/bin/env node
/**
 * MCP Server — Git Push para GitHub / Lovable
 * ─────────────────────────────────────────────
 * Ferramentas expostas:
 *  • git_status        — mostra o status do repositório
 *  • git_commit_push   — faz add, commit e push (com pull --rebase antes)
 *  • git_log           — últimos N commits
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";

/* ─── Helpers ───────────────────────────────────────── */

/**
 * Executa um comando git no diretório informado.
 * Retorna stdout ou lança erro com stderr.
 */
function git(cmd, cwd) {
  try {
    return execSync(`git ${cmd}`, {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (err) {
    throw new Error(
      err.stderr?.toString().trim() || err.stdout?.toString().trim() || err.message
    );
  }
}

/**
 * Valida que o caminho é um repositório git.
 */
function assertGitRepo(repoPath) {
  if (!existsSync(repoPath)) {
    throw new Error(`Caminho não encontrado: ${repoPath}`);
  }
  if (!existsSync(path.join(repoPath, ".git"))) {
    throw new Error(`Não é um repositório git: ${repoPath}`);
  }
}

/* ─── Definição das ferramentas ─────────────────────── */

const TOOLS = [
  {
    name: "git_status",
    description:
      "Retorna o status atual do repositório git (arquivos modificados, não rastreados, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        repo_path: {
          type: "string",
          description: "Caminho absoluto do repositório git.",
        },
      },
      required: ["repo_path"],
    },
  },
  {
    name: "git_commit_push",
    description:
      "Faz git add -A, git commit e git push para o branch remoto. Executa pull --rebase antes do push para evitar rejeições.",
    inputSchema: {
      type: "object",
      properties: {
        repo_path: {
          type: "string",
          description: "Caminho absoluto do repositório git.",
        },
        message: {
          type: "string",
          description: "Mensagem do commit.",
        },
        branch: {
          type: "string",
          description: "Branch de destino (padrão: main).",
          default: "main",
        },
        files: {
          type: "array",
          items: { type: "string" },
          description:
            "Lista de arquivos para adicionar. Deixe vazio para usar 'git add -A' (todos).",
        },
      },
      required: ["repo_path", "message"],
    },
  },
  {
    name: "git_log",
    description: "Retorna os últimos N commits do repositório.",
    inputSchema: {
      type: "object",
      properties: {
        repo_path: {
          type: "string",
          description: "Caminho absoluto do repositório git.",
        },
        n: {
          type: "number",
          description: "Quantidade de commits (padrão: 10).",
          default: 10,
        },
      },
      required: ["repo_path"],
    },
  },
];

/* ─── Handlers das ferramentas ──────────────────────── */

async function handleGitStatus({ repo_path }) {
  assertGitRepo(repo_path);
  const status = git("status", repo_path);
  const branch = git("branch --show-current", repo_path);
  return {
    content: [
      {
        type: "text",
        text: `🌿 Branch: ${branch}\n\n${status}`,
      },
    ],
  };
}

async function handleGitCommitPush({ repo_path, message, branch = "main", files = [] }) {
  assertGitRepo(repo_path);
  const log = [];

  // 1. Add
  if (files && files.length > 0) {
    const fileList = files.map((f) => `"${f}"`).join(" ");
    git(`add ${fileList}`, repo_path);
    log.push(`✅ git add ${fileList}`);
  } else {
    git("add -A", repo_path);
    log.push("✅ git add -A");
  }

  // 2. Verifica se há algo para commitar
  const statusAfterAdd = git("status --porcelain", repo_path);
  if (!statusAfterAdd) {
    // Nada para commitar, ainda faz o push para garantir sincronia
    log.push("ℹ️  Nada para commitar — arquivos já estão limpos.");
  } else {
    // 3. Commit
    git(`commit -m "${message.replace(/"/g, '\\"')}"`, repo_path);
    log.push(`✅ git commit -m "${message}"`);
  }

  // 4. Pull com rebase antes de subir (evita rejeição do remote)
  try {
    const pullOut = git(`pull --rebase origin ${branch}`, repo_path);
    log.push(`✅ git pull --rebase origin ${branch}\n   ${pullOut}`);
  } catch (err) {
    log.push(`⚠️  Pull --rebase falhou: ${err.message}\n   Tentando push mesmo assim...`);
  }

  // 5. Push
  git(`push origin ${branch}`, repo_path);
  log.push(`🚀 git push origin ${branch} — enviado com sucesso!`);

  return {
    content: [
      {
        type: "text",
        text: log.join("\n"),
      },
    ],
  };
}

async function handleGitLog({ repo_path, n = 10 }) {
  assertGitRepo(repo_path);
  const log = git(
    `log --oneline --decorate -${n}`,
    repo_path
  );
  return {
    content: [
      {
        type: "text",
        text: `📜 Últimos ${n} commits:\n\n${log}`,
      },
    ],
  };
}

/* ─── Servidor MCP ──────────────────────────────────── */

const server = new Server(
  { name: "mcp-git-push", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "git_status":
      return handleGitStatus(args);
    case "git_commit_push":
      return handleGitCommitPush(args);
    case "git_log":
      return handleGitLog(args);
    default:
      throw new Error(`Ferramenta desconhecida: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("🟢 MCP Git Push Server iniciado e aguardando conexões...");
