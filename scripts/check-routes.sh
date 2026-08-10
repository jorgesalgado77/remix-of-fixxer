#!/bin/bash
# Script para detectar rotas conflitantes no TanStack Router

echo "Verificando conflitos de rotas em src/routes/..."
duplicate_routes=$(find src/routes -type f | sed 's/\.tsx$//' | sed 's/\/index$//' | sed 's/_//g' | sort | uniq -d)

if [ -n "$duplicate_routes" ]; then
  echo "ERRO: Foram encontradas rotas conflitantes em potencial:"
  echo "$duplicate_routes"
  exit 1
else
  echo "Nenhum conflito de rota detectado."
  exit 0
fi
