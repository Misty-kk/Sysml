# 基于 SysML 模型的文档自动生成系统

## 项目简介

本项目是一个基于 SysML 模型的文档自动生成系统，目标是通过基于模型的系统工程方法解决传统系统工程中的信息孤岛、重复录入、模型与文档不一致等问题。系统将 SysML 风格模型作为单一可信源，集中管理模型结构、验证证据、追踪关系、版本历史和工程文档，使工程师能够在统一环境中完成建模、分析、验证和文档生成。

传统系统工程实践通常以 Word、Excel、建模工具和仿真脚本等分散文件为中心。模型数据和叙述性文档容易脱节，需求、结构、接口、验证结果和设计说明需要在多个文件之间重复维护，导致协作成本高、错误风险大、版本一致性难以保证。本系统采用“一次编辑，处处使用”的理念，将文档中心流程升级为模型中心流程：模型元素和验证证据统一进入 MMS，由文档生成模块按模板自动生成 Markdown、HTML、PDF 和 Word 文档，并保留模型指纹、来源分支、来源提交和追踪矩阵。

## 项目目标

- 提供一个模型驱动的文档自动生成环境，使工程文档能够从模型数据动态生成。
- 建立统一的模型管理服务，集中存储 SysML 风格模型元素、关系、分支、提交和审计记录。
- 支持浏览器中的模型查看、编辑、追踪和文档生成，使非专业建模人员也能参与评审。
- 支持外部工具接入，将建模工具、分析工具和仿真工具产生的数据纳入统一模型仓库。
- 保证需求、设计、验证证据和文档之间的可追溯性，降低重复维护和信息不一致风险。

## 系统组成

### 1. MMS 模型管理功能

MMS（Model Management System）是系统的核心，负责作为模型的单一可信源。它通过 RESTful API 提供模型仓库的创建、读取、更新、删除、分支、提交、差异比较、回滚、合并和审计能力。

当前实现支持：

- 项目和分支管理
- SysML 风格模型元素 CRUD
- 模型关系维护和语义校验
- 提交快照、Diff、Rollback、Merge
- 模型导入导出
- 审计日志和版本追踪
- 基于用户工作区的演示级隔离

### 2. VE 视图编辑器

VE（View Editor）是基于 Web 的交互式模型工作台。用户无需打开专业建模软件，即可在浏览器中查看、筛选、编辑模型元素，并通过视图、图谱和追踪矩阵理解模型之间的关系。

当前前端工作台包括：

- 项目总览
- 模型工作台
- View / Viewpoint 管理
- 关系图谱
- 需求追踪矩阵
- 版本管理
- 文档生成
- 外部导入

### 3. MDK 模型开发工具包

MDK（Model Development Kits）用于连接外部建模、分析和仿真工具与 MMS。为了避免把系统误解为多个文件解析器，本项目将 MDK 适配器按工程语义分为两类：模型来源适配器和验证证据来源适配器。

| 类别 | 适配器 | 当前能力 |
| --- | --- | --- |
| 模型来源 | SysML JSON Exchange | 导入/导出结构化 JSON 模型 |
| 模型来源 | XMI / Cameo Export | 导入标准 XMI，也支持 Cameo/MagicDraw 导出的 XMI 文件 |
| 模型来源 | SysML v2 Text / SysON | 导入轻量 SysML v2 / SysON 文本模型 |
| 验证证据来源 | Jupyter Analysis Evidence | 导入 Notebook 中的分析结果、验证关系和需求验证证据 |
| 验证证据来源 | MATLAB Simulation Evidence | 导入 MATLAB 脚本中的仿真结果、测试用例和验证证据 |

说明：当前系统支持 Cameo/MagicDraw 导出的 XMI 文件级导入，但尚未实现真正的 Cameo 原生插件和双向同步。Jupyter 和 MATLAB 也以文件级验证证据导入为主，不宣称已完成工具内插件。

### 4. DocGen 文档生成管理

DocGen 根据 MMS 中的模型数据、视图和追踪关系生成工程文档。用户可以通过模板标记引用模型元素字段、需求表、结构表、验证表、追踪矩阵和语义校验结果。

当前支持输出：

- Markdown
- HTML
- PDF
- Word DOCX

常用模板标记：

| 标记 | 作用 |
| --- | --- |
| `{{element:REQ-001.name}}` | 引用指定模型元素字段 |
| `{{element:REQ-001.attributes.text}}` | 引用元素扩展属性 |
| `{{model:summary}}` | 生成模型统计摘要 |
| `{{table:requirements}}` | 生成需求表 |
| `{{table:blocks}}` | 生成结构块表 |
| `{{table:interfaces}}` | 生成接口与端口表 |
| `{{table:constraints}}` | 生成约束表 |
| `{{table:tests}}` | 生成验证表 |
| `{{trace:matrix}}` | 生成需求追踪矩阵 |
| `{{validation:issues}}` | 生成语义校验结果 |

## 快速运行

```powershell
python -m pip install -r requirements.txt

cd frontend
npm install
npm run build

cd ..
python server.py --host 127.0.0.1 --port 8000
```

访问系统：

```text
http://127.0.0.1:8000
```

OpenAPI 文档：

```text
http://127.0.0.1:8000/docs
```

如果 `frontend/dist` 不存在，后端会提示前端构建产物缺失。请在 `frontend` 目录执行 `npm install` 和 `npm run build`。

## 演示账号

| 用户 | 密码 | 说明 |
| --- | --- | --- |
| `teacher` | `teacher123` | 独立示例工作区 |
| `engineer` | `engineer123` | 独立示例工作区 |
| `reviewer` | `reviewer123` | 独立示例工作区 |

## MDK 测试文件

测试文件位于：

```text
data/mdk_tests/
```

示例命令：

```powershell
python tools/mdk_sync.py parse --file data/mdk_tests/model_exchange.json --tool json
python tools/mdk_sync.py push --file data/mdk_tests/cameo_export.xmi --tool xmi --commit --validate
python tools/mdk_sync.py push --file data/mdk_tests/syson_model.sysml --tool sysmlv2 --commit --validate
python tools/mdk_sync.py push --file data/mdk_tests/jupyter_analysis_evidence.ipynb --tool jupyter --commit --validate
python tools/mdk_sync.py push --file data/mdk_tests/matlab_simulation_evidence.m --tool matlab --commit --validate
```

## 测试

```powershell
python -B -m unittest discover -s tests
```

前端构建验证：

```powershell
cd frontend
npm run build
```

## Docker

```powershell
docker compose up --build
```

默认本地运行使用 SQLite。Docker Compose 会启动 MongoDB，可通过环境变量切换：

```text
SYSML_STORAGE=sqlite|mongodb
SYSML_OUTPUT_DIR=outputs
SYSML_FRONTEND_DIST=frontend/dist
SYSML_ALLOW_STATIC_FRONTEND=false
SYSML_MAX_MODEL_BYTES=10485760
SYSML_PANDOC_PATH=
SYSML_PDF_ENGINE=pandoc|wkhtmltopdf|builtin-fallback
SYSML_DOCX_REFERENCE=
```

## 目录结构

```text
server.py                  FastAPI 启动入口
sysml_docgen/              后端服务、模型仓库、MDK、DocGen 和 API
frontend/                  React 前端工作台
data/mdk_tests/            MDK 导入测试文件
docs/                      用户手册、API 文档和 MDK 文档
mdk/                       外部工具示例和辅助脚本
tests/                     单元测试和接口测试
tools/mdk_sync.py          MDK 命令行同步工具
tools/md_to_docx.py        Markdown 转 Word 辅助工具
```

## 文档

- [用户手册](docs/user-manual.md)
- [API 文档](docs/api.md)
- [MDK 集成说明](docs/mdk.md)
- [课程设计报告](docs/course-design-report.md)
