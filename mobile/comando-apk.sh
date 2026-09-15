#!/usr/bin/env bash
# ============================================================================
#  comando-apk.sh — Genera el APK instalable de BuenPrecio para tu Android
# ============================================================================
# Requisitos previos:
#   1) Mac y teléfono en la MISMA RED Wi-Fi.
#   2) Cuenta en https://expo.dev (la creas tú en el navegador si no la tienes).
#   3) Repo en GitHub (lo creas tú; te pedirá el URL y/o tu usuario aquí).
#   4) En el teléfono: permitir "instalar apps de fuentes desconocidas"
#      (Android pedirá permiso al instalár el .apk).
#
# Uso:
#   bash comando-apk.sh
#
# ============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:-todo}"        # modos: todo | push | build | firewall

say()  { printf '\n\033[1;36m== %s ==\033[0m\n' "$*"; }
die()  { printf '\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }
ask()  { printf '%s' "$*"; read -r; }

which git >/dev/null 2>&1 || die "no encuentro git"

# ------------------------------------------------------------------ push ----
git_push() {
  say "PUSH a GitHub"
  git -C "$ROOT" status --porcelain >/dev/null 2>&1 || { git -C "$ROOT" init; }
  git -C "$ROOT" add -A
  git -C "$ROOT" commit -m "BuenPrecio v2: monorepo unificado (api/web/mobile/shared)" 2>/dev/null \
    || say "nada nuevo que commitear (repo ya al día)"

  REMOTE="$(git -C "$ROOT" remote get-url origin 2>/dev/null || true)"
  if [ -z "$REMOTE" ]; then
    echo "Primero crea un repo VACÍO en github.com (ej: 'BuenPrecio') y pega SU URL:"
    ask "URL del repo (https://github.com/USUARIO/BuenPrecio.git): "
    [ -n "$REPLY" ] && git -C "$ROOT" remote add origin "$REPLY"
  fi
  REMOTE="$(git -C "$ROOT" remote get-url origin)"
  echo "  remote → $REMOTE"
  git -C "$ROOT" branch -M main 2>/dev/null
  git -C "$ROOT" push -u origin main || say "push falló — revisa que el repo esté vacío y tengas acceso"
}

# ------------------------------------------------------------------ build ----
eas_setup() {
  say "EAS Login + Init (interactivo) — tu cuenta de expo.dev"
  if ! command -v eas >/dev/null 2>&1; then
    t=""; which srcml >/dev/null 2>&1 && t="$t"; npm config get registry | grep -qi npmmirror && REG="--registry=https://registry.npmmirror.com --proxy=$(npm config get proxy) --https-proxy=$(npm config get https-proxy)" || REG=""
    npm install -g eas-cli $REG 2>/dev/null || npm install -g eas-cli || die "no pude instalar eas-cli (¿red?)"
  fi
  command -v eas >/dev/null 2>&1 || die "eas-cli no está instalado"
  eas login || die "login falló — ¿usuario/clave correctos?"
  say "Vinculando proyecto a tu cuenta (genera projectId)"
  (cd "$ROOT" && eas init) || say "eas init advirtió; seguimos"
}

eas_build() {
  say "BUILD APK final (EAS, ~15-25 min) — esto es lo importante: al terminar te dará un enlace .apk"
  (cd "$ROOT" && eas build --platform android --profile preview --non-interactive) \
    || die "el build falló — pega la salida para depurarla"
}

# ---------------------------------------------------------------- firewall ----
firewall() {
  say "FIREWALL de macOS — DEJA que el teléfono alcance la API del Mac (pide tu contraseña)"
  echo "  Ejecuta en OTRA terminal (sudo puede pedir password):"
  echo "    sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node"
  echo "    sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setappmode /usr/local/bin/node allow"
  echo
  echo "  Alternativa gráfica: Ajustes del Sistema → Red → Firewall → Opciones →"
  echo "  añade 'node' a 'Permitir conexiones entrantes'."
}

# ------------------------------------------------------------- ip (aviso) ----
lan_ip() { ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "DESCONOCIDA"; }

# ================================================================= main =====
case "$MODE" in
  todo)
    git_push
    eas_setup
    eas_build
    firewall
    say "LISTO — el enlace .apk está arriba. En tu Android: móvil Buen Precio."
    echo "  Recordatorio de IP (si tu red guarda la IP vieja): la API apunta a"
    echo "  http://$(lan_ip):3000 (IP actual del Mac). Si cambia, usa la pantalla"
    echo "  'Servidor' en la app para re-apuntar sin recompilar."
    ;;
  push)     git_push ;;
  build)    eas_setup; eas_build ;;
  firewall) firewall ;;
  *)        die "modo no reconocido: $MODE (usa: todo | push | build | firewall)" ;;
esac
