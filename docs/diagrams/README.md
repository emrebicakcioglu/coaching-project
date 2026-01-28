# PM-System Prozessdiagramme

Dieses Verzeichnis enthält alle Visualisierungen des PM-Systems in verschiedenen Formaten.

## Dateien

| Datei | Format | Verwendung |
|-------|--------|------------|
| `01_story_dependencies.mmd` | Mermaid | GitHub, GitLab, Obsidian, VS Code |
| `02_runtime_process.mmd` | Mermaid | BPMN-ähnlicher Laufzeit-Prozess |
| `03_dependencies.dot` | Graphviz DOT | Graphviz, Online-Viewer |
| `04_process.bpmn` | BPMN 2.0 XML | Camunda, Bizagi, bpmn.io |
| `05_activity.puml` | PlantUML | PlantUML Server, IDE Plugins |
| `06_critical_path.txt` | ASCII | Terminal, Dokumentation |

## Online-Tools

- **Mermaid**: https://mermaid.live
- **Graphviz**: https://dreampuf.github.io/GraphvizOnline
- **BPMN**: https://demo.bpmn.io
- **PlantUML**: https://www.plantuml.com/plantuml

## Legende

### Story-Kategorien

| Farbe | Kategorie |
|-------|-----------|
| Blau | Infrastruktur (001-xxx) |
| Gelb/Orange | Backend (002-004) |
| Gruen | Frontend (005-008) |

### Status

| Symbol | Bedeutung |
|--------|-----------|
| Ausgefuellt | Abgeschlossen |
| Gestrichelt | In Bearbeitung |
| Leer | Ausstehend |

## Kritischer Pfad

```
001-001 -> 002-001 -> 003-001 -> 003-002 -> 006-002 -> 006-003 -> 008-002
```

**8 Stories** auf dem kritischen Pfad - diese bestimmen die minimale Projektdauer.

---
*Generiert am 2026-01-28*
