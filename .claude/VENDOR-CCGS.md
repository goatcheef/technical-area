# Piezas de Claude Code Game Studios

Copiadas de https://github.com/Donchitos/Claude-Code-Game-Studios (licencia MIT, ver `LICENSE-ccgs.txt`) para probar la skill `/team-ui`.
Solo lo que esa skill necesita: las skills `team-ui`, `ux-design` y `ux-review`, los agentes `ux-designer`, `ui-programmer`, `art-director` y `accessibility-specialist`, el lector de configuración `hooks/yaml-helper.sh` (solo lee YAML con Python; en modo autónomo agrega líneas a `production/session-logs/decision-log.md`) y los documentos y plantillas que esas piezas citan.
También: la skill `reverse-document` (documentos de diseño a partir del código; sin su script `game-read.sh`, que solo sirve para juegos de un archivo HTML), los agentes `game-designer` y `systems-designer`, y las plantillas de concepto, índice de sistemas y documento de diseño. La configuración está en `project.yaml` y, la personal, en `project.local.yaml`.
No se copiaron los scripts de sesión, la barra de estado ni los permisos del sistema original.
