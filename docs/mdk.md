# MDK 集成说明

MDK（Model Development Kit）的目标不是单纯读取文件，而是让工程师在真实工具中工作时，把模型结构或验证证据同步到 MMS。调整后，MDK 的边界更清晰：

- 建模工具负责提供模型结构。
- 分析/仿真工具负责提供验证证据。
- MMS 负责集中管理模型、追踪关系、版本和文档生成。

## 适配器结构

当前保留 5 个对外展示的适配器。

### 模型来源适配器

| 适配器 | 用途 |
| --- | --- |
| SysML JSON Exchange | 用于系统内部或外部工具导出的结构化模型交换。 |
| XMI / Cameo Export | 用于导入标准 XMI 文件，也支持 Cameo/MagicDraw 导出的 XMI。 |
| SysML v2 Text / SysON | 用于支持开源 SysML v2 工具 SysON 的文本模型导入。 |

### 验证证据来源适配器

| 适配器 | 用途 |
| --- | --- |
| Jupyter Analysis Evidence | 导入 Notebook 中的分析结果、验证关系和需求验证证据。 |
| MATLAB Simulation Evidence | 导入 MATLAB 脚本中的仿真结果、测试用例和验证证据。 |

说明：Cameo Systems Modeler XMI 不再作为单独适配器展示。当前系统支持 Cameo/MagicDraw 导出的 XMI 文件级导入；真正的 Cameo 原生插件、模型监听和双向同步属于后续扩展。

## 命令行适配

命令行用于批量导入、调试和没有工具内插件环境时的备用流程。

```powershell
python tools/mdk_sync.py adapters
python tools/mdk_sync.py parse --file data/import_example.json --tool json
python tools/mdk_sync.py push --file data/upload_graph_test.xmi --tool xmi --commit --validate
python tools/mdk_sync.py parse --file model.sysml --tool syson
python tools/mdk_sync.py push --file mdk/jupyter/example_analysis.ipynb --tool jupyter --commit --validate
python tools/mdk_sync.py push --file mdk/matlab/example_analysis.m --tool matlab --commit --validate
python tools/mdk_sync.py pull --format json --out data/exported_model.json
python tools/mdk_sync.py generate --format html --out outputs/from-mdk.html
```

历史命令中的 `--tool cameo` 仍作为兼容别名处理，但推荐新文档和演示统一使用 `--tool xmi`。

## Jupyter Analysis Evidence

Jupyter 当前提供 `mdk/jupyter/sysml_docgen_notebook.py`，可在 Notebook 中把分析结论同步为 Requirement、TestCase 或验证关系。它体现的是“验证证据来源”，不是完整 JupyterLab 插件。

```python
%load_ext mdk.jupyter.sysml_docgen_notebook
%sysml_config --server http://127.0.0.1:8000 --project satellite-power --branch main --user engineer

%%sysml_test TST-JUP-010 "SOC 最坏工况仿真" --owner 分析组 --criterion "SOC_min >= 30%" --verifies REQ-JUP-010
使用 Notebook 运行能量平衡仿真，检查最坏工况下 SOC 最小值。
```

## MATLAB Simulation Evidence

MATLAB 当前提供 `mdk/matlab/sysml_docgen_sync.m`，可在 MATLAB 内部通过 `webwrite` 调用 MMS。它用于上传仿真结果、测试用例和验证证据，不代表完整 MATLAB 工具箱插件。

```matlab
elements = struct("id", "TST-MAT-003", "name", "MATLAB SOC 仿真", "type", "TestCase");
sysml_docgen_sync(elements);
```

## XMI / Cameo Export

Cameo/MagicDraw 的完整深度集成需要 Java 插件和 Cameo OpenAPI。当前推荐流程是：

1. 在 Cameo/MagicDraw 中导出 XMI。
2. 使用 `XMI / Cameo Export` 适配器导入 MMS。
3. 在 VE 中检查元素、关系、映射报告和追踪矩阵。

```powershell
python tools/mdk_sync.py push --file exported-from-cameo.xmi --tool xmi --commit --validate
```

仓库中的 `mdk/cameo-plugin/` 仅保留为后续扩展 scaffold，不作为当前已完成能力展示。
