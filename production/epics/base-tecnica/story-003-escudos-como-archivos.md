# Story 003: Escudos como archivos

> **Epic**: Base técnica
> **Status**: Ready
> **Layer**: Foundation
> **Type**: Integration
> **Estimate**: M
> **Manifest Version**: N/A — docs/architecture/control-manifest.md does not exist
> **Last Updated**: [set by /dev-story when implementation begins]

## Context

**GDD**: N/A — épico técnico (requisitos en production/epics/base-tecnica/EPIC.md)
**Requirement**: `TR-base-tecnica-003`, y parte de `TR-base-tecnica-001` (sacar los escudos del paquete principal; el resto de la descarga va en la historia 004)
*(`docs/architecture/tr-registry.yaml` does not exist; the requirement text is in `production/epics/base-tecnica/EPIC.md`)*

**ADR Governing Implementation**: ADR-0001: Carga de escudos y datos fuera del paquete principal
**ADR Decision Summary**: Cada escudo es un WebP propio de 64 y 128 px generado en el build desde `data/crests.json` y servido con `<img loading="lazy" decoding="async">`; `Badge` conserva su API y cae al escudo de reemplazo si falta o falla.
**ADR Version**: 2026-11-22

**Engine**: Web (version unset) | **Risk**: NOT ASSESSED (no VERSION.md risk rating)
**Engine Notes**: Verificar (ADR-0001): (1) `loading="lazy"` dentro del contenedor desplazable `.main` en Firefox y Safari 16.4+; (2) WebP con transparencia en Safari 14+ (101 PNG con alfa, un JPEG); Vite 8.3.8: `import.meta.glob` con `query: '?url'`, `import: 'default'`, `eager: true` da URLs con hash; `build.assetsInlineLimit` como función con `false` deja 0 `data:image` en los JS.

**Control Manifest Rules (this layer)** *(del registro `docs/registry/architecture.yaml`, ADR-0001)*:
- Required: `crestSrc(clubId)` como único lugar que sabe dónde están los escudos (`crest_lookup`); `<img loading=lazy decoding=async>` con WebP 64/128 px (`crest_delivery`).
- Forbidden: `crest_base64_in_bundle` (ningún archivo de `src/` importa `crests.json` ni contiene imágenes en base64).
- Guardrail: `initial-download` ≤ 1,5 MB comprimido (hoy 3,06 MB; 2,70 MB son escudos); `dist/` ≤ 255 archivos.

---

## Acceptance Criteria

*From ADR-0001 (Decision, Validation Criteria) and TR-base-tecnica-003:*

- [ ] `tools/build-crests.ts` y `npm run crests` (corre en `predev` y `prebuild`, se saltea si el sello coincide) leen `data/crests.json` y escriben `src/assets/crests/<id>-64.webp` y `<id>-128.webp` más `.stamp`; WebP con alfa (calidad 85, alfa sin pérdida), centrado en un cuadrado transparente; `sharp` como devDependency; los WebP generados están en `.gitignore`.
- [ ] `crests.json` vive en `data/crests.json` (los dos scripts de Python escriben ahí); ningún archivo de `src/` lo importa ni contiene imágenes en base64, y ningún `.js` de `dist/` contiene `data:image/`.
- [ ] `src/ui/crests.ts` exporta `crestSrc(clubId): { src, srcSet } | null` con `import.meta.glob('../assets/crests/*.webp', { query: '?url', import: 'default', eager: true })`; `Badge` obtiene la imagen solo de `crestSrc`.
- [ ] `Badge` conserva su firma, `className="crest"`, `data-cid`, `alt={club.short}`, `width`/`height` fijos y las reglas de tamaño del reemplazo; el `<img>` lleva `loading="lazy"`, `decoding="async"`, `srcSet` 64w/128w y `sizes={size + 'px'}`; no pinta relleno provisorio mientras carga.
- [ ] Sin entrada en el mapa (los 7 clubes sin escudo) o con `onError`, `Badge` dibuja el escudo de reemplazo con colores y código desde 40 px; con `page.route` bloqueando `assets/*.webp` no hay errores en la consola ni error fatal.
- [ ] `vite.config.ts` excluye `src/assets/crests/` del inlineado (`build.assetsInlineLimit` como función que devuelve `false` para esa carpeta); `tests/perf/sizes.mjs` y `tests/perf/vite.stub.config.mjs` leen la ruta nueva, y `sizes.mjs` cuenta los archivos de `dist/` (≤ 255) y reporta la descarga inicial antes (3,06 MB brotli) y después.
- [ ] `tests/ui/bandeja.cjs`, `mercado.cjs` y `vestuario.cjs` pasan esperando `img.complete` de los `img.crest` visibles antes de cada captura (ajuste en `tests/ui/helpers.cjs`); en las capturas los escudos se ven nítidos a 18-96 px.
- [ ] `npm run build` y `npm run test:engine` pasan; `node tests/ui/guardado.cjs` pasa sin cambios.

---

## Implementation Notes

*Derived from ADR-0001 Implementation Guidelines:*

- Ningún archivo de `src/` debe importar `crests.json` ni contener imágenes en base64; `Badge` debe obtener la imagen solo de `crestSrc`.
- `vite.config.ts` debe excluir `src/assets/crests/` del inlineado (`build.assetsInlineLimit` como función que devuelve `false` para esa carpeta).
- `Badge` debe conservar `className="crest"`, `data-cid`, `alt={club.short}`, `width`/`height` y el escudo de reemplazo con sus reglas de tamaño; no debe pintar un relleno provisorio mientras carga.
- Todo `<img>` de escudo debe llevar `loading="lazy"` y `decoding="async"`; no se agregan props a `Badge`.
- Los WebP deben generarse con alfa (calidad 85, alfa sin pérdida) a 64 y 128 px de lado, centrados en un cuadrado transparente.
- `index.html` no debe pedir recursos de otros dominios.
- Riesgos del ADR: escudos borrosos o con halo al bajar de 250 a 64 px (revisión visual en las capturas, ajuste de calidad por escudo); las capturas pueden salir con huecos por la carga diferida (esperar `img.complete`); `tests/perf/sizes.mjs:10` y `vite.stub.config.mjs` dependen de la ruta vieja y se actualizan en el mismo cambio.

---

## Out of Scope

*Handled by neighbouring stories — do not implement here:*

- Story 004 (`story-004-paginas-datos-fuentes.md`): código por pantalla, `loadDb()`, fuentes propias, cascarón de carga y los presupuestos de descarga y de tiempo hasta poder jugar.
- Story 002 (`story-002-fronteras-de-error.md`): las fallas de `<img>` no son errores fatales (manejadores sin captura).

---

## Files

- `tools/build-crests.ts` (nuevo)
- `package.json` (`crests`, `predev`, `prebuild`, `sharp`), `.gitignore`
- `data/crests.json` (movido desde `src/`), `tools/fetch_crests.py`, `tools/import_extra.py`
- `src/ui/crests.ts` (nuevo), `src/ui/common.tsx` (`Badge`)
- `vite.config.ts`
- `tests/perf/sizes.mjs`, `tests/perf/vite.stub.config.mjs`, `tests/ui/helpers.cjs`
- `tests/ui/escudos.cjs` (nuevo, prueba de `page.route` con 404; waived at qa.level minimal)

---

## QA Test Cases

*N/A — no qa-lead specs at this tier; implement against the Acceptance Criteria above*

---

## Test Evidence

*Governed by `qa.level`: at `qa.level: minimal` tests are **waived** (advisory), but a Visual/Feel or UI story's retained screenshot is not.*

**Story Type**: Integration
**Required evidence**:
- Integration: Test: waived at qa.level minimal (advisory)

**Status**: [ ] Not yet created

---

## Dependencies

- Depends on: None
- Unlocks: `production/epics/base-tecnica/story-004-paginas-datos-fuentes.md`
