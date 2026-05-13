#!/bin/bash
echo "🔍 Verificando sintaxe TypeScript..."
npx tsc --noEmit
if [ $? -eq 0 ]; then
  echo "✅ Sintaxe OK"
else
  echo "❌ Erros encontrados. Corrija antes do commit."
  exit 1
fi
echo "📦 Build de teste..."
bun run build --mode development
if [ $? -eq 0 ]; then
  echo "✅ Build OK"
else
  echo "❌ Falha no build. Verifique os erros acima."
  exit 1
fi
echo "🚀 Pronto para commit!"
