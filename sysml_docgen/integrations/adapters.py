"""Adapter registry for external engineering model and evidence exchange."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Protocol

from ..metamodel import default_stereotype
from ..xmi import parse_xmi_with_report
from .types import AdapterCapabilities, AdapterParseResult, MappingReport


SUPPORTED_TOOLS = {"auto", "json", "xmi", "cameo", "magicdraw", "sysmlv2", "syson", "jupyter", "matlab"}
TOOL_ALIASES = {
    "cameo": "xmi",
    "magicdraw": "xmi",
    "sysml-v2": "sysmlv2",
    "sysml_v2": "sysmlv2",
    "sysml2": "sysmlv2",
    "syson": "sysmlv2",
}


class AdapterError(RuntimeError):
    """Raised when no adapter can parse a tool artifact."""


class ToolAdapter(Protocol):
    id: str
    label: str
    capabilities: AdapterCapabilities

    def matches(self, path: Path, requested: str = "auto") -> bool: ...

    def parse_file(self, path: Path) -> AdapterParseResult: ...

    def parse_content(self, content: Any, filename: str = "") -> AdapterParseResult: ...

    def describe(self) -> dict[str, Any]: ...


class BaseAdapter:
    id = "base"
    label = "Base adapter"
    capabilities = AdapterCapabilities()

    def describe(self) -> dict[str, Any]:
        return {"id": self.id, "label": self.label, **self.capabilities.to_dict()}

    def matches(self, path: Path, requested: str = "auto") -> bool:
        return requested == self.id

    def parse_file(self, path: Path) -> AdapterParseResult:
        return self.parse_content(path.read_text(encoding="utf-8-sig"), str(path))

    def parse_content(self, content: Any, filename: str = "") -> AdapterParseResult:
        raise NotImplementedError

    def _model(self, elements: list[dict[str, Any]], source_file: str = "", format_name: str = "json") -> dict[str, Any]:
        report = MappingReport(adapter=self.id, imported=len(elements))
        model = {
            "format": format_name,
            "elements": elements,
            "source": {"adapter": self.id, "tool": self.id},
            "mapping_report": report.to_dict(),
        }
        if source_file:
            model["source"]["file"] = source_file
        return model


class JsonAdapter(BaseAdapter):
    id = "json"
    label = "SysML JSON Exchange"
    capabilities = AdapterCapabilities(
        category="model_source",
        source_kind="model",
        description="Structured SysML model exchange from this system or external tools.",
        can_read=True,
        can_write=True,
        can_validate=True,
        can_commit=True,
        can_rollback=False,
        formats=("json",),
        supported_extensions=(".json",),
        input_mime_types=("application/json",),
        output_formats=("json",),
        limitations=("Requires SysML DocGen element shape or an elements collection.",),
    )

    def matches(self, path: Path, requested: str = "auto") -> bool:
        return requested == self.id or (requested == "auto" and path.suffix.lower() == ".json")

    def parse_content(self, content: Any, filename: str = "") -> AdapterParseResult:
        payload = json.loads(content) if isinstance(content, str) else content
        elements = normalize_elements(payload)
        report = MappingReport(adapter=self.id, imported=len(elements))
        model = self._model(elements, filename)
        model["mapping_report"] = report.to_dict()
        return AdapterParseResult(model, report)


class XmiAdapter(BaseAdapter):
    id = "xmi"
    label = "XMI / Cameo Export"
    capabilities = AdapterCapabilities(
        category="model_source",
        source_kind="model",
        description="Standard XMI import, including XMI files exported from Cameo/MagicDraw.",
        can_read=True,
        can_write=True,
        can_validate=True,
        can_commit=True,
        can_rollback=False,
        formats=("xmi", "xml"),
        vendor="OMG XMI / Cameo Export",
        supported_extensions=(".xmi", ".xml"),
        input_mime_types=("application/xml", "text/xml"),
        output_formats=("xmi", "xml", "json"),
        limitations=(
            "Parses a pragmatic UML/XMI subset and preserves unsupported data as tagged values when possible.",
            "Cameo/MagicDraw support is file-level XMI import; native .mdzip parsing and live plugin sync are future extensions.",
        ),
    )

    def matches(self, path: Path, requested: str = "auto") -> bool:
        return requested == self.id or (requested == "auto" and path.suffix.lower() in {".xmi", ".xml"})

    def parse_content(self, content: Any, filename: str = "") -> AdapterParseResult:
        result = parse_xmi_with_report(str(content), self.id)
        result.model["source"] = {"adapter": self.id, "tool": self.id}
        if filename:
            result.model["source"]["file"] = filename
        result.model["mapping_report"] = result.report.to_dict()
        return result


class SysmlV2TextAdapter(BaseAdapter):
    id = "sysmlv2"
    label = "SysML v2 Text / SysON"
    capabilities = AdapterCapabilities(
        category="model_source",
        source_kind="model",
        description="Textual SysML v2 model import for open-source SysML v2 tooling such as SysON.",
        can_read=True,
        can_write=False,
        can_validate=True,
        can_commit=True,
        can_rollback=False,
        formats=("sysml", "kerml", "txt"),
        vendor="SysML v2 / SysON",
        supported_extensions=(".sysml", ".kerml", ".txt"),
        input_mime_types=("text/plain",),
        output_formats=("json",),
        limitations=(
            "Imports a lightweight textual subset: requirement, part/block, interface, action, state, constraint, testcase, and relation statements.",
            "Full SysML v2/KerML semantic resolution is not implemented in this prototype.",
        ),
    )

    def matches(self, path: Path, requested: str = "auto") -> bool:
        return requested == self.id or (requested == "auto" and path.suffix.lower() in {".sysml", ".kerml"})

    def parse_content(self, content: Any, filename: str = "") -> AdapterParseResult:
        return parse_sysmlv2_text(str(content), self.id, filename)


class JupyterAdapter(BaseAdapter):
    id = "jupyter"
    label = "Jupyter Analysis Evidence"
    capabilities = AdapterCapabilities(
        category="evidence_source",
        source_kind="verification_evidence",
        description="Notebook-based analysis results, validation relations, and requirement verification evidence.",
        can_read=True,
        can_write=False,
        can_validate=True,
        can_commit=True,
        can_rollback=False,
        formats=("ipynb",),
        vendor="Project Jupyter",
        supported_extensions=(".ipynb",),
        input_mime_types=("application/x-ipynb+json", "application/json"),
        output_formats=("json",),
        limitations=("Only metadata and sysml-docgen comment blocks are imported; this is not a full JupyterLab plugin.",),
    )

    def matches(self, path: Path, requested: str = "auto") -> bool:
        return requested == self.id or (requested == "auto" and path.suffix.lower() == ".ipynb")

    def parse_content(self, content: Any, filename: str = "") -> AdapterParseResult:
        notebook = json.loads(content) if isinstance(content, str) else content
        elements: list[dict[str, Any]] = []
        metadata = notebook.get("metadata", {}).get("sysml_docgen", {}) if isinstance(notebook, dict) else {}
        elements.extend(normalize_elements(metadata))
        for cell in notebook.get("cells", []) if isinstance(notebook, dict) else []:
            cell_metadata = cell.get("metadata", {}).get("sysml_docgen", {})
            elements.extend(normalize_elements(cell_metadata))
            source = "".join(cell.get("source", []))
            elements.extend(extract_commented_elements(source, "#"))
        return model_from_elements(elements, self.id, filename)


class MatlabAdapter(BaseAdapter):
    id = "matlab"
    label = "MATLAB Simulation Evidence"
    capabilities = AdapterCapabilities(
        category="evidence_source",
        source_kind="verification_evidence",
        description="MATLAB simulation results, test cases, and verification evidence.",
        can_read=True,
        can_write=False,
        can_validate=True,
        can_commit=True,
        can_rollback=False,
        formats=("m", "mlx"),
        vendor="MathWorks",
        supported_extensions=(".m", ".mlx"),
        input_mime_types=("text/x-matlab", "text/plain"),
        output_formats=("json",),
        limitations=("Only sysml-docgen comment blocks are imported from MATLAB files; this is not a full MATLAB toolbox plugin.",),
    )

    def matches(self, path: Path, requested: str = "auto") -> bool:
        return requested == self.id or (requested == "auto" and path.suffix.lower() in {".m", ".mlx"})

    def parse_content(self, content: Any, filename: str = "") -> AdapterParseResult:
        return model_from_elements(extract_commented_elements(str(content), "%"), self.id, filename)


ADAPTERS: tuple[ToolAdapter, ...] = (
    JsonAdapter(),
    XmiAdapter(),
    SysmlV2TextAdapter(),
    JupyterAdapter(),
    MatlabAdapter(),
)


def list_adapters() -> list[dict[str, Any]]:
    return [adapter.describe() for adapter in ADAPTERS]


def get_adapter(adapter_id: str) -> ToolAdapter:
    adapter_id = normalize_tool_id(adapter_id)
    for adapter in ADAPTERS:
        if adapter.id == adapter_id:
            return adapter
    supported = ", ".join(sorted(SUPPORTED_TOOLS))
    raise AdapterError(f"tool must be one of: {supported}")


def select_adapter(path: Path, requested: str = "auto") -> ToolAdapter:
    original_requested = requested.lower()
    requested = normalize_tool_id(original_requested)
    if requested not in {normalize_tool_id(tool) for tool in SUPPORTED_TOOLS}:
        supported = ", ".join(sorted(SUPPORTED_TOOLS))
        raise AdapterError(f"tool must be one of: {supported}")
    if requested != "auto":
        if path.suffix.lower() == ".mdzip":
            raise AdapterError("Cameo .mdzip is proprietary; export XMI from Cameo before pushing to MMS.")
        return get_adapter(requested)
    if path.suffix.lower() == ".mdzip":
        raise AdapterError("Cameo .mdzip is proprietary; export XMI from Cameo before pushing to MMS.")
    for adapter in ADAPTERS:
        if adapter.matches(path, requested):
            return adapter
    raise AdapterError(f"Cannot detect MDK adapter for file: {path.name}")


def load_model_result(file_path: str | Path, tool: str = "auto") -> AdapterParseResult:
    path = Path(file_path)
    if not path.exists():
        raise AdapterError(f"Model file does not exist: {path}")
    adapter = select_adapter(path, tool)
    return adapter.parse_file(path)


def load_model_file(file_path: str | Path, tool: str = "auto") -> dict[str, Any]:
    return load_model_result(file_path, tool).model


def parse_content(content: Any, filename: str = "", tool: str = "auto") -> AdapterParseResult:
    tool = normalize_tool_id(tool.lower()) if tool else "auto"
    if tool and tool != "auto":
        adapter = get_adapter(tool.lower())
    elif filename:
        adapter = select_adapter(Path(filename), "auto")
    else:
        adapter = get_adapter("json")
    return adapter.parse_content(content, filename)


def normalize_tool_id(tool: str) -> str:
    return TOOL_ALIASES.get((tool or "auto").lower(), (tool or "auto").lower())


def normalize_elements(payload: Any) -> list[dict[str, Any]]:
    if not payload:
        return []
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        if isinstance(payload.get("elements"), list):
            return [item for item in payload["elements"] if isinstance(item, dict)]
        if isinstance(payload.get("elements"), dict):
            return [item for item in payload["elements"].values() if isinstance(item, dict)]
        if isinstance(payload.get("element"), dict):
            return [payload["element"]]
        if {"id", "type"} <= set(payload):
            return [payload]
    return []


def extract_commented_elements(source: str, prefix: str) -> list[dict[str, Any]]:
    elements: list[dict[str, Any]] = []
    block_lines: list[str] = []
    in_block = False
    for raw_line in source.splitlines():
        line = raw_line.strip()
        if not line.startswith(prefix):
            continue
        content = line[len(prefix) :].strip()
        if content == "sysml-docgen:begin":
            in_block = True
            block_lines = []
            continue
        if content == "sysml-docgen:end":
            in_block = False
            elements.extend(normalize_elements(json.loads("\n".join(block_lines))))
            continue
        if in_block:
            block_lines.append(content)
            continue
        if content.startswith("sysml-docgen:element"):
            raw_json = content.removeprefix("sysml-docgen:element").strip()
            elements.extend(normalize_elements(json.loads(raw_json)))
        if content.startswith("sysml-docgen:elements"):
            raw_json = content.removeprefix("sysml-docgen:elements").strip()
            elements.extend(normalize_elements(json.loads(raw_json)))
    return elements


def model_from_elements(elements: list[dict[str, Any]], tool: str, source_file: str = "") -> AdapterParseResult:
    deduped = dedupe_elements(elements)
    report = MappingReport(adapter=tool, imported=len(deduped))
    if not deduped:
        report.warnings.append(f"{tool} file has no sysml_docgen elements")
    model = {
        "format": "json",
        "elements": deduped,
        "source": {"adapter": tool, "tool": tool},
        "mapping_report": report.to_dict(),
    }
    if source_file:
        model["source"]["file"] = source_file
    return AdapterParseResult(model, report)


SYSMLV2_TYPES = {
    "requirement": "Requirement",
    "req": "Requirement",
    "part": "Block",
    "partdef": "Block",
    "block": "Block",
    "item": "Block",
    "interface": "Interface",
    "interfaceblock": "Interface",
    "port": "Port",
    "constraint": "Constraint",
    "constraintdef": "Constraint",
    "action": "Activity",
    "actiondef": "Activity",
    "state": "State",
    "statedef": "State",
    "testcase": "TestCase",
    "test": "TestCase",
    "view": "View",
}

SYSMLV2_RELATIONS = {
    "satisfy",
    "satisfies",
    "verify",
    "verifies",
    "refine",
    "refines",
    "trace",
    "derive",
    "allocate",
    "connect",
    "constrain",
}

RELATION_ALIASES = {
    "satisfies": "satisfy",
    "verifies": "verify",
    "refines": "refine",
}


def parse_sysmlv2_text(content: str, adapter: str, filename: str = "") -> AdapterParseResult:
    elements: dict[str, dict[str, Any]] = {}
    report = MappingReport(adapter=adapter)

    for line_number, raw_line in enumerate(content.splitlines(), start=1):
        line = raw_line.split("//", 1)[0].strip().rstrip(";")
        if not line or line in {"}", "{"}:
            continue
        normalized = " ".join(line.replace("{", " ").replace("}", " ").split())
        tokens = normalized.split()
        if not tokens:
            continue

        keyword = tokens[0].replace(" ", "").replace("-", "").lower()
        element_type = SYSMLV2_TYPES.get(keyword)
        if element_type:
            element_id = _clean_sysmlv2_identifier(tokens[1] if len(tokens) > 1 else f"{element_type}-{line_number}")
            name = _quoted_text(normalized) or element_id
            elements[element_id] = {
                "id": element_id,
                "name": name,
                "type": element_type,
                "stereotype": default_stereotype(element_type),
                "description": "",
                "owner": "",
                "attributes": {"source_line": str(line_number), "source_syntax": "SysML v2 text"},
                "relations": [],
            }
            continue

        relation_keyword = RELATION_ALIASES.get(keyword, keyword)
        if relation_keyword in SYSMLV2_RELATIONS and len(tokens) >= 3:
            source = _clean_sysmlv2_identifier(tokens[1])
            target = _clean_sysmlv2_identifier(tokens[-1])
            elements.setdefault(source, _placeholder_sysmlv2_element(source, line_number))
            elements[source].setdefault("relations", []).append({"type": relation_keyword, "target": target})
            report.converted.append(
                {
                    "source": source,
                    "to": relation_keyword,
                    "target": target,
                    "reason": "textual relation statement mapped to repository relation",
                }
            )
            continue

        report.skipped.append({"line": line_number, "text": raw_line.strip(), "reason": "unsupported SysML v2 text subset"})

    report.imported = len(elements)
    if report.skipped:
        report.warnings.append("Some SysML v2 text lines were outside the lightweight import subset.")
    model = {
        "format": "sysmlv2-text",
        "elements": list(elements.values()),
        "source": {"adapter": adapter, "tool": "syson"},
        "mapping_report": report.to_dict(),
    }
    if filename:
        model["source"]["file"] = filename
    return AdapterParseResult(model, report)


def _clean_sysmlv2_identifier(value: str) -> str:
    cleaned = value.strip().strip("'\"").rstrip(":;,{")
    return cleaned.lstrip("#")


def _quoted_text(value: str) -> str:
    if '"' not in value:
        return ""
    parts = value.split('"')
    return parts[1].strip() if len(parts) >= 3 else ""


def _placeholder_sysmlv2_element(element_id: str, line_number: int) -> dict[str, Any]:
    return {
        "id": element_id,
        "name": element_id,
        "type": "Block",
        "stereotype": default_stereotype("Block"),
        "description": "",
        "owner": "",
        "attributes": {
            "source_line": str(line_number),
            "source_syntax": "SysML v2 text",
            "placeholder": "true",
        },
        "relations": [],
    }


def dedupe_elements(elements: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_id: dict[str, dict[str, Any]] = {}
    anonymous: list[dict[str, Any]] = []
    for element in elements:
        element_id = str(element.get("id", "")).strip()
        if element_id:
            by_id[element_id] = element
        else:
            anonymous.append(element)
    return [*by_id.values(), *anonymous]
