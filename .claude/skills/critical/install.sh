#!/usr/bin/env bash
# Устанавливает скилл critical глобально для Claude Code (все проекты).
# Запускать на своей машине: bash .claude/skills/critical/install.sh
# Повторный запуск безопасен: скилл перезаписывается, правило не дублируется.
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
MARKER='<!-- critical-skill-rule -->'

mkdir -p "$DEST/skills/critical"
cp "$SRC/SKILL.md" "$DEST/skills/critical/SKILL.md"
echo "✓ скилл: $DEST/skills/critical/SKILL.md"

if [ -f "$DEST/CLAUDE.md" ] && grep -qF "$MARKER" "$DEST/CLAUDE.md"; then
  echo "= правило уже в $DEST/CLAUDE.md, пропускаю"
else
  [ -s "${DEST}/CLAUDE.md" ] && printf '\n' >> "$DEST/CLAUDE.md"
  cat >> "$DEST/CLAUDE.md" <<'RULEEOF'
<!-- critical-skill-rule -->
## Ответы на оценочные вопросы

Когда я спрашиваю мнение, оценку или выбор между вариантами — «как ты
думаешь», «что лучше», «стоит ли», «оцени мой план», «согласен?» — а также
когда я спорю с уже данным ответом, применяй скилл `critical` до того,
как писать ответ.

Кратко, если скилл почему-то не загрузился:

- Проверь, не подстроен ли вывод под то, как я сформулировал вопрос.
- Назови сильнейший контраргумент к собственному выводу.
- Отдели проверенное от предположенного — предположения помечай словами.
- Дай одну рекомендацию, а не «оба варианта хороши», и назови условие,
  при котором она меняется.
- Меняй позицию от довода, а не от того, что я возразил. Когда я прав —
  скажи это в одну строку, без искусственных возражений.
<!-- /critical-skill-rule -->
RULEEOF
  echo "✓ правило: $DEST/CLAUDE.md"
fi

echo
echo "Готово для Claude Code. Приложения claude.ai (сайт, телефон, десктоп)"
echo "эти файлы не читают — для них см. GLOBAL.md, раздел 1."
