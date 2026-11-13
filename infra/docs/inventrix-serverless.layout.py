#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Write inventrix-serverless.drawio (connectivity preset) beside this script."""

from __future__ import annotations

import json
from pathlib import Path
from xml.sax.saxutils import quoteattr

HERE = Path(__file__).resolve().parent
ICONS = json.loads(
    (Path.home() / ".claude" / "skills" / "aws-diagram" / "references" / "aws-icons.json").read_text()
)["services"]

G = (
    "points=[[0,0],[0.25,0],[0.5,0],[0.75,0],[1,0],[1,0.25],[1,0.5],[1,0.75],[1,1],[0.75,1],[0.5,1],"
    "[0.25,1],[0,1],[0,0.75],[0,0.5],[0,0.25]];outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;"
    "fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;"
    "shape=mxgraph.aws4.group;verticalAlign=top;align=left;spacingLeft=30;"
)
CLOUD = G + "grIcon=mxgraph.aws4.group_aws_cloud_alt;strokeColor=#232F3E;fillColor=none;fontColor=#232F3E;dashed=0;"
FRAME = (
    "rounded=0;fillColor=none;strokeColor=#879196;dashed=1;verticalAlign=top;align=left;spacingLeft=10;"
    "fontColor=#5A6B86;fontSize=12;whiteSpace=wrap;html=1;container=1;collapsible=0;recursiveResize=0;"
)
LABEL_POS = {
    "bottom": "verticalLabelPosition=bottom;verticalAlign=top;align=center;",
    "top": "verticalLabelPosition=top;verticalAlign=bottom;align=center;",
}
EDGE = (
    "edgeStyle=orthogonalEdgeStyle;rounded=0;endArrow=block;endFill=1;html=1;strokeColor=#545B64;"
    "strokeWidth=1.5;fontSize=11;labelBackgroundColor=#FFFFFF;"
)

ICON = 58
R0, R1, R2 = 140, 300, 460
C1, C2, C3, C4 = 260, 480, 700, 920

# id: (parent, kind, absolute x, y, w, h, label)
groups = [
    ("cloud", "1", CLOUD, 160, 60, 920, 730, "AWS Cloud · us-east-1"),
    ("workshop", "cloud", FRAME, 220, 600, 340, 160, "既有 workshop-stack（Inventrix 尚未整合）"),
]
# id: (parent, icon, x, y, label, label side)
icons = [
    ("users", "1", "users", 40, R1, "使用者<br>（瀏覽器）", "bottom"),
    ("waf", "cloud", "waf", C1, R0, "AWS WAF<br>掛在 CloudFront", "bottom"),
    ("cloudfront", "cloud", "cloudfront", C1, R1, "CloudFront<br>單一入口", "bottom"),
    ("s3_site", "cloud", "s3", C2, R0, "前端 SPA<br>S3 bucket", "bottom"),
    ("httpapi", "cloud", "api_gateway", C2, R1, "HTTP API<br>API Gateway", "bottom"),
    ("s3_images", "cloud", "s3", C2, R2, "商品圖片<br>S3 bucket", "bottom"),
    ("lambda_api", "cloud", "lambda", C3, R1, "Inventrix API<br>Lambda（Express）", "top"),
    ("bedrock", "cloud", "bedrock", C4, R0, "Nova Canvas<br>Bedrock", "bottom"),
    ("aurora", "cloud", "aurora", C4, R1, "Aurora Serverless v2<br>PostgreSQL", "bottom"),
    ("secret_jwt", "cloud", "secrets_manager", C4, R2, "JWT secret<br>Secrets Manager", "bottom"),
    ("secret_db", "cloud", "secrets_manager", C3, R2, "DB 帳密<br>Secrets Manager", "bottom"),
    ("agentcore_runtime", "workshop", "bedrock_agentcore", 361, 650, "strands_agent<br>AgentCore Runtime", "bottom"),
]

MID = ICON / 2
# id: (source, target, exit, entry, waypoints, label)
edges = [
    ("e_users_cf", "users", "cloudfront", (1, 0.5), (0, 0.5), [], ""),
    ("e_cf_site", "cloudfront", "s3_site", (1, 0.25), (0, 0.5), [(380, R1 + ICON * 0.25), (380, R0 + MID)], ""),
    ("e_cf_api", "cloudfront", "httpapi", (1, 0.5), (0, 0.5), [], ""),
    ("e_cf_images", "cloudfront", "s3_images", (1, 0.75), (0, 0.5), [(400, R1 + ICON * 0.75), (400, R2 + MID)], ""),
    ("e_api_lambda", "httpapi", "lambda_api", (1, 0.5), (0, 0.5), [], ""),
    ("e_lambda_aurora", "lambda_api", "aurora", (1, 0.5), (0, 0.5), [], "Data API"),
    ("e_lambda_bedrock", "lambda_api", "bedrock", (1, 0.25), (0, 0.5), [(820, R1 + ICON * 0.25), (820, R0 + MID)], ""),
    ("e_lambda_jwt", "lambda_api", "secret_jwt", (1, 0.75), (0, 0.5), [(840, R1 + ICON * 0.75), (840, R2 + MID)], ""),
    ("e_lambda_images", "lambda_api", "s3_images", (0, 0.75), (1, 0.5), [(620, R1 + ICON * 0.75), (620, R2 + MID)], "寫入生成圖片"),
    ("e_lambda_dbsecret", "lambda_api", "secret_db", (0.5, 1), (0.5, 0), [], "經 Data API 讀取"),
]

origin: dict[str, tuple[float, float]] = {"1": (0, 0)}
cells: list[str] = []


def cell(attrs: dict[str, str], geometry: str) -> None:
    rendered = " ".join(f"{k}={quoteattr(v)}" for k, v in attrs.items())
    cells.append(f"<mxCell {rendered}>{geometry}</mxCell>")


def rel(parent: str, x: float, y: float) -> tuple[float, float]:
    ox, oy = origin[parent]
    return x - ox, y - oy


def icon_style(name: str, side: str) -> str:
    spec = ICONS[name]
    if spec.get("kind") == "standalone":
        base = f"shape=mxgraph.aws4.{spec['shape']};fillColor={spec['fill']};strokeColor=none;aspect=fixed;"
    else:
        base = (
            f"shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.{spec['shape']};"
            f"fillColor={spec['fill']};strokeColor=#ffffff;"
        )
    return base + LABEL_POS[side] + "html=1;whiteSpace=wrap;fontSize=12;fontColor=#232F3E;labelWidth=150;"


cell(
    {"id": "title", "parent": "1", "vertex": "1", "value": "Inventrix Serverless 架構",
     "style": "text;html=1;align=left;verticalAlign=middle;fontSize=16;fontStyle=1;"},
    '<mxGeometry x="160" y="20" width="500" height="30" as="geometry"/>',
)
for gid, parent, style, x, y, w, h, label in groups:
    rx, ry = rel(parent, x, y)
    origin[gid] = (x, y)
    cell({"id": gid, "parent": parent, "vertex": "1", "value": label, "style": style},
         f'<mxGeometry x="{rx}" y="{ry}" width="{w}" height="{h}" as="geometry"/>')
for iid, parent, name, x, y, label, side in icons:
    rx, ry = rel(parent, x, y)
    cell({"id": iid, "parent": parent, "vertex": "1", "value": label, "style": icon_style(name, side)},
         f'<mxGeometry x="{rx}" y="{ry}" width="{ICON}" height="{ICON}" as="geometry"/>')
for eid, src, tgt, (ex, ey), (nx, ny), points, label in edges:
    style = EDGE + f"exitX={ex};exitY={ey};exitDx=0;exitDy=0;entryX={nx};entryY={ny};entryDx=0;entryDy=0;"
    pts = "".join(f'<mxPoint x="{px}" y="{py}"/>' for px, py in points)
    array = f'<Array as="points">{pts}</Array>' if pts else ""
    geometry = f'<mxGeometry relative="1" as="geometry">{array}</mxGeometry>'
    cell({"id": eid, "parent": "1", "edge": "1", "source": src, "target": tgt, "value": label, "style": style}, geometry)

xml = (
    '<mxfile host="aws-diagram"><diagram id="inventrix-serverless" name="inventrix-serverless">'
    '<mxGraphModel dx="1400" dy="1000" grid="1" gridSize="10" page="0"><root>'
    '<mxCell id="0"/><mxCell id="1" parent="0"/>' + "".join(cells) + "</root></mxGraphModel></diagram></mxfile>\n"
)
(HERE / "inventrix-serverless.drawio").write_text(xml)
print(HERE / "inventrix-serverless.drawio")
