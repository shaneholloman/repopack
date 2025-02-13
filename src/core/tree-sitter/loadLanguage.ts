import { createRequire } from 'node:module';
import path from 'node:path';
import Parser from 'web-tree-sitter';

const require = createRequire(import.meta.url);

export async function loadLanguage(langName: string) {
  const wasmPath = require.resolve(`tree-sitter-wasms/out/tree-sitter-${langName}.wasm`);
  return await Parser.Language.load(wasmPath);
}
