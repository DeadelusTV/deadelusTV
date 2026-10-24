#!/usr/bin/env bash
# Publie uniquement public/, dans un nouveau dossier de version.
# Le serveur HTTP et son domaine doivent déjà être configurés séparément.
set -Eeuo pipefail

for name in OVH_HOST OVH_USER OVH_SSH_KEY OVH_KNOWN_HOSTS OVH_PATH; do
  if [[ -z "${!name:-}" ]]; then
    printf 'Configuration manquante : %s\n' "$name" >&2
    exit 1
  fi
done

OVH_PORT="${OVH_PORT:-22}"
DEPLOY_SHA="${GITHUB_SHA:-}"
[[ "$OVH_HOST" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*$ ]] || { echo 'Hôte SSH invalide.' >&2; exit 1; }
[[ "$OVH_USER" =~ ^[a-z_][a-z0-9_-]*$ ]] || { echo 'Utilisateur SSH invalide.' >&2; exit 1; }
[[ "$OVH_PORT" =~ ^[0-9]{1,5}$ ]] && (( 10#$OVH_PORT > 0 && 10#$OVH_PORT <= 65535 )) || { echo 'Port SSH invalide.' >&2; exit 1; }
[[ "$OVH_PATH" =~ ^/[A-Za-z0-9_-]+(/[A-Za-z0-9_.-]+)+$ ]] && [[ ! "$OVH_PATH" =~ /\.\.?(/|$) ]] || { echo 'Dossier de publication invalide.' >&2; exit 1; }
[[ "$DEPLOY_SHA" =~ ^[a-f0-9]{40}$ ]] || { echo 'SHA de version invalide.' >&2; exit 1; }

cd "$(dirname "$0")/.."
python3 scripts/verify-static.py
umask 077
work="$(mktemp -d)"
trap 'rm -rf -- "$work"' EXIT
printf '%s\n' "$OVH_SSH_KEY" > "$work/key"
printf '%s\n' "$OVH_KNOWN_HOSTS" > "$work/known_hosts"
ssh_options=(-T -i "$work/key" -p "$OVH_PORT" -o BatchMode=yes -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$work/known_hosts" -o ConnectTimeout=15)
remote="$OVH_USER@$OVH_HOST"
release="$OVH_PATH/releases/$DEPLOY_SHA"

# Refuse d'écraser une ancienne version ou un dossier de site existant.
ssh "${ssh_options[@]}" "$remote" "set -eu; if [ -e '$OVH_PATH/current' ] && [ ! -L '$OVH_PATH/current' ]; then echo 'current doit être un lien symbolique.' >&2; exit 1; fi; if [ -e '$release' ]; then echo 'Cette version existe déjà. Aucun fichier modifié.' >&2; exit 1; fi; mkdir -p '$OVH_PATH/releases'; mkdir '$release'"
tar -czf - -C public . | ssh "${ssh_options[@]}" "$remote" "tar --no-same-owner --no-same-permissions -xzf - -C '$release'"
ssh "${ssh_options[@]}" "$remote" "set -eu; test -s '$release/index.html'; ln -s '$release' '$OVH_PATH/.current-$DEPLOY_SHA'; mv -Tf '$OVH_PATH/.current-$DEPLOY_SHA' '$OVH_PATH/current'"
printf 'Version %s transférée et activée sur le VPS.\n' "$DEPLOY_SHA"
