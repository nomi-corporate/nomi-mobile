#!/usr/bin/env python3
"""Convert the Figma mascot export and motion tracks into editable Rive RML."""

from __future__ import annotations

import json
import math
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "src" / "assets" / "rive"
SOURCE = ASSET_ROOT / "figma-mascot-source.json"
PROJECT = ASSET_ROOT / "nomi-mascots"
POSE_LABELS = {
    "saudando": "Saudando",
    "atento": "Atento",
    "pensando": "Pensando",
    "comemorando": "Comemorando",
    "ouvindo": "Ouvindo",
    "explicando": "Explicando",
    "dormindo": "Dormindo",
}

TOKENS = re.compile(
    r"([MmZzLlHhVvCcSsQqTtAa])|([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)"
)


def f(value: float) -> str:
    if abs(value) < 1e-10:
        value = 0
    return f"{value:.7g}"


def safe_name(value: str) -> str:
    value = value.replace("�", "").replace("·", "-")
    value = re.sub(r"[^\w -]+", "", value, flags=re.UNICODE).strip()
    return value or "Nomi"


def parse_svg_path(data: str) -> list[dict]:
    tokens = [a or b for a, b in TOKENS.findall(data)]
    result: list[dict] = []
    i = 0
    command = None
    x = y = sx = sy = 0.0
    previous_cubic = None
    previous_quadratic = None
    current = None

    def number() -> float:
        nonlocal i
        value = float(tokens[i])
        i += 1
        return value

    def point(relative: bool) -> tuple[float, float]:
        nonlocal x, y
        px, py = number(), number()
        if relative:
            px += x
            py += y
        return px, py

    def ensure_contour():
        nonlocal current
        if current is None:
            current = {"segments": [], "closed": False, "start": (x, y)}
            result.append(current)

    def add_line(end: tuple[float, float]):
        nonlocal x, y, previous_cubic, previous_quadratic
        ensure_contour()
        start = (x, y)
        dx, dy = end[0] - x, end[1] - y
        current["segments"].append(
            (start, (x + dx / 3, y + dy / 3), (x + dx * 2 / 3, y + dy * 2 / 3), end)
        )
        x, y = end
        previous_cubic = previous_quadratic = None

    while i < len(tokens):
        if tokens[i].isalpha():
            command = tokens[i]
            i += 1
        if command is None:
            raise ValueError(f"Path command missing near token {i}: {data[:100]}")
        upper = command.upper()
        relative = command.islower()

        if upper == "M":
            px, py = point(relative)
            x, y = px, py
            sx, sy = x, y
            current = {"segments": [], "closed": False, "start": (x, y)}
            result.append(current)
            previous_cubic = previous_quadratic = None
            command = "l" if relative else "L"
        elif upper == "L":
            add_line(point(relative))
        elif upper == "H":
            px = number() + (x if relative else 0)
            add_line((px, y))
        elif upper == "V":
            py = number() + (y if relative else 0)
            add_line((x, py))
        elif upper == "C":
            ensure_contour()
            start = (x, y)
            c1, c2, end = point(relative), point(relative), point(relative)
            current["segments"].append((start, c1, c2, end))
            x, y = end
            previous_cubic = c2
            previous_quadratic = None
        elif upper == "S":
            ensure_contour()
            start = (x, y)
            c1 = (2 * x - previous_cubic[0], 2 * y - previous_cubic[1]) if previous_cubic else start
            c2, end = point(relative), point(relative)
            current["segments"].append((start, c1, c2, end))
            x, y = end
            previous_cubic = c2
            previous_quadratic = None
        elif upper == "Q":
            ensure_contour()
            start = (x, y)
            q, end = point(relative), point(relative)
            c1 = (x + 2 * (q[0] - x) / 3, y + 2 * (q[1] - y) / 3)
            c2 = (end[0] + 2 * (q[0] - end[0]) / 3, end[1] + 2 * (q[1] - end[1]) / 3)
            current["segments"].append((start, c1, c2, end))
            x, y = end
            previous_quadratic = q
            previous_cubic = None
        elif upper == "T":
            ensure_contour()
            start = (x, y)
            q = (2 * x - previous_quadratic[0], 2 * y - previous_quadratic[1]) if previous_quadratic else start
            end = point(relative)
            c1 = (x + 2 * (q[0] - x) / 3, y + 2 * (q[1] - y) / 3)
            c2 = (end[0] + 2 * (q[0] - end[0]) / 3, end[1] + 2 * (q[1] - end[1]) / 3)
            current["segments"].append((start, c1, c2, end))
            x, y = end
            previous_quadratic = q
            previous_cubic = None
        elif upper == "A":
            raise ValueError("SVG arc path command A is not supported in the Figma export")
        elif upper == "Z":
            if current is not None:
                if abs(x - sx) > 1e-8 or abs(y - sy) > 1e-8:
                    start = (x, y)
                    dx, dy = sx - x, sy - y
                    current["segments"].append(
                        (start, (x + dx / 3, y + dy / 3), (x + dx * 2 / 3, y + dy * 2 / 3), (sx, sy))
                    )
                current["closed"] = True
                x, y = sx, sy
                current = None
            previous_cubic = previous_quadratic = None
            command = None
        else:
            raise ValueError(f"Unsupported SVG path command {command}")

    return [c for c in result if c["segments"]]


def cubic_value(p0, p1, p2, p3, t):
    u = 1 - t
    return u**3 * p0 + 3 * u**2 * t * p1 + 3 * u * t**2 * p2 + t**3 * p3


def contour_bounds(contours):
    points = []
    for contour in contours:
        for p0, p1, p2, p3 in contour["segments"]:
            points.extend((p0, p3))
            for axis in (0, 1):
                a = -p0[axis] + 3 * p1[axis] - 3 * p2[axis] + p3[axis]
                b = 2 * (p0[axis] - 2 * p1[axis] + p2[axis])
                c = p1[axis] - p0[axis]
                roots = []
                if abs(a) < 1e-12:
                    if abs(b) > 1e-12:
                        roots.append(-c / b)
                else:
                    disc = b * b - 4 * a * c
                    if disc >= 0:
                        roots.extend(((-b + math.sqrt(disc)) / (2 * a), (-b - math.sqrt(disc)) / (2 * a)))
                for t in roots:
                    if 0 < t < 1:
                        points.append(tuple(cubic_value(p0[k], p1[k], p2[k], p3[k], t) for k in (0, 1)))
    if not points:
        return (0.0, 0.0, 0.0, 0.0)
    return (min(p[0] for p in points), min(p[1] for p in points), max(p[0] for p in points), max(p[1] for p in points))


def vector_ids(frame):
    ids = []
    def walk(node):
        if node["type"] == "VECTOR":
            ids.append(node["id"])
        for child in node.get("children", []):
            walk(child)
    walk(frame)
    return ids


def add_tag(parent, tag, attrs=None, **kwargs):
    values = {} if attrs is None else dict(attrs)
    values.update(kwargs)
    return ET.SubElement(parent, tag, {k: str(v) for k, v in values.items() if v is not None})


def color_argb(value: str, alpha: float = 1.0) -> str:
    value = value.strip().lstrip("#")
    if len(value) == 3:
        value = "".join(ch * 2 for ch in value)
    if len(value) == 8:
        rgb, own_alpha = value[:6], int(value[6:8], 16) / 255
        alpha *= own_alpha
    else:
        rgb = value[:6]
    return f"{round(alpha * 255):02X}{rgb.upper()}"


def set_path_geometry(shape, path_data, offset_x, offset_y, ids):
    contours = parse_svg_path(path_data)
    for contour in contours:
        endpoints = [segment[0] for segment in contour["segments"]]
        if contour["closed"]:
            endpoints.append(contour["segments"][-1][3])
        area = sum(
            endpoints[k][0] * endpoints[(k + 1) % len(endpoints)][1]
            - endpoints[(k + 1) % len(endpoints)][0] * endpoints[k][1]
            for k in range(len(endpoints))
        )
        is_clockwise = area >= 0
        path = add_tag(shape, "PointsPath", name="Path", id=ids.next(), isClosed=str(contour["closed"]).lower(), isClockwise=str(is_clockwise).lower())
        segs = contour["segments"]
        count = len(segs)
        vertices = []
        for index in range(count):
            seg = segs[index]
            point = seg[0]
            incoming = segs[index - 1][2] if index > 0 else (segs[-1][2] if contour["closed"] else point)
            outgoing = seg[1]
            vertices.append((point, incoming, outgoing))
        if not contour["closed"]:
            end = segs[-1][3]
            vertices.append((end, segs[-1][2], end))
        for point, incoming, outgoing in vertices:
            ix, iy = incoming[0] - point[0], incoming[1] - point[1]
            ox, oy = outgoing[0] - point[0], outgoing[1] - point[1]
            attrs = {
                "x": f(point[0] - offset_x), "y": f(point[1] - offset_y),
                "inRotation": f(math.atan2(iy, ix)), "inDistance": f(math.hypot(ix, iy)),
                "outRotation": f(math.atan2(oy, ox)), "outDistance": f(math.hypot(ox, oy)),
            }
            add_tag(path, "CubicDetachedVertex", attrs, name="Vertex")
    return contours


class Ids:
    def __init__(self):
        self.value = 1
    def next(self):
        self.value += 1
        return f"0:{self.value}"


def paint_for_path(shape, svg_path, gradient_map, center, ids):
    fill = svg_path.get("fill", "#000000")
    opacity = float(svg_path.get("opacity", "1"))
    fill_rule = svg_path.get("fill-rule", "nonzero")
    fill_node = add_tag(shape, "Fill", id=ids.next(), name="Fill", fillRule="evenOdd" if fill_rule == "evenodd" else "nonZero")
    if fill.startswith("url("):
        key = fill[5:-1].strip().lstrip("#")
        gradient = gradient_map.get(key)
        if gradient is None:
            raise ValueError(f"Gradient {key} was not found")
        if gradient.tag.endswith("linearGradient"):
            units = gradient.get("gradientUnits", "objectBoundingBox")
            values = {k: float(gradient.get(k, "0")) for k in ("x1", "y1", "x2", "y2")}
            if units == "objectBoundingBox":
                width, height = float(svg_path.get("_width", "1")), float(svg_path.get("_height", "1"))
                values = {"x1": values["x1"] * width, "x2": values["x2"] * width, "y1": values["y1"] * height, "y2": values["y2"] * height}
            g = add_tag(fill_node, "LinearGradient", id=ids.next(), name="Gradient", startX=f(values["x1"] - center[0]), startY=f(values["y1"] - center[1]), endX=f(values["x2"] - center[0]), endY=f(values["y2"] - center[1]))
            for stop in gradient:
                if not stop.tag.endswith("stop"):
                    continue
                stop_color = stop.get("stop-color", "#000000")
                stop_opacity = float(stop.get("stop-opacity", "1")) * opacity
                pos = stop.get("offset", "0").strip()
                position = float(pos[:-1]) / 100 if pos.endswith("%") else float(pos)
                add_tag(g, "GradientStop", colorValue=color_argb(stop_color, stop_opacity), position=f(position))
        else:
            raise ValueError(f"Unsupported gradient {gradient.tag}")
    elif fill != "none":
        add_tag(fill_node, "SolidColor", id=ids.next(), name="Color", colorValue=color_argb(fill, opacity))


def add_shape_for_vector(parent, vector, path_element, gradients, ids, frame_center):
    path_data = path_element.get("d", "")
    contours = parse_svg_path(path_data)
    bbox = contour_bounds(contours)
    center = ((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2)
    node = add_tag(parent, "Node", id=ids.next(), name=safe_name(vector.get("name", vector["id"])), x=f(center[0] - frame_center[0]), y=f(center[1] - frame_center[1]), opacity=f(float(vector.get("opacity", 1))))
    shape = add_tag(node, "Shape", id=ids.next(), name="Vector")
    for contour in contours:
        # All SVG path contours for one Figma vector share the same paint.
        break
    # Preserve multiple contours as sibling PointsPaths inside one Shape.
    # set_path_geometry builds them as a group so all contours are painted together.
    set_path_geometry(shape, path_data, center[0], center[1], ids)
    path_element_copy = dict(path_element.attrib)
    path_element_copy["_width"] = f(bbox[2] - bbox[0])
    path_element_copy["_height"] = f(bbox[3] - bbox[1])
    paint_for_path(shape, path_element_copy, gradients, center, ids)
    return node, center


def sample_track(keyframes, seconds):
    if not keyframes:
        return 0.0
    if seconds <= float(keyframes[0]["timelinePosition"]):
        return float(keyframes[0]["value"]["value"])
    for left, right in zip(keyframes, keyframes[1:]):
        t0, t1 = float(left["timelinePosition"]), float(right["timelinePosition"])
        if t0 <= seconds <= t1:
            amount = 0 if t1 == t0 else (seconds - t0) / (t1 - t0)
            return float(left["value"]["value"]) + (float(right["value"]["value"]) - float(left["value"]["value"])) * amount
    return float(keyframes[-1]["value"]["value"])


def interpolation_for(keyframe):
    easing = keyframe.get("easing", {})
    curve = easing.get("easingFunctionCubicBezier")
    if easing.get("type") == "EASE_IN_AND_OUT" and curve:
        return "cubic", curve
    if easing.get("type") in ("LINEAR", "LINEAR_NONE"):
        return "linear", None
    return "cubic", {"x1": .42, "y1": 0, "x2": .58, "y2": 1}


def generate_pose(pose, motion_by_id, ids):
    root = pose["tree"]
    frame = root["children"][0]
    pose_dir = ASSET_ROOT / f"nomi-{pose['name']}-source"
    svg_root = ET.parse(pose_dir / "pose.svg").getroot()
    svg_paths = [element for element in svg_root.iter() if element.tag.endswith("path")]
    gradients = {element.get("id"): element for element in svg_root.iter() if element.tag.endswith("linearGradient")}
    vectors = vector_ids(root)
    if len(vectors) != len(svg_paths):
        raise ValueError(f"{pose['name']}: vectors {len(vectors)} != SVG paths {len(svg_paths)}")
    vector_elements = {node_id: path for node_id, path in zip(vectors, svg_paths)}
    vector_nodes = {}
    vector_centers = {}

    artboard_id = ids.next()
    style_id = ids.next()
    sm_id, sm_layer_id, entry_anim_state_id, anim_id = ids.next(), ids.next(), ids.next(), ids.next()
    artboard = ET.Element("Artboard", {
        "name": POSE_LABELS[pose["name"]], "id": artboard_id,
        "width": "400", "height": "400", "originX": "0", "originY": "0",
        "styleId": style_id, "defaultStateMachineId": sm_id,
        "x": str((list(POSE_LABELS).index(pose["name"])) * 500), "y": "0",
    })
    add_tag(artboard, "LayoutComponentStyle", id=style_id, name="Artboard Style")
    frame_center = (float(frame["x"]) + float(frame["width"]) / 2, float(frame["y"]) + float(frame["height"]) / 2)
    frame_node = add_tag(artboard, "Node", id=ids.next(), name="Mascote", x=f(frame_center[0]), y=f(frame_center[1]), opacity=f(float(frame.get("opacity", 1))))
    frame_center_abs = frame_center

    def abs_group_center(node):
        return (float(frame["x"]) + float(node["x"]) + float(node["width"]) / 2,
                float(frame["y"]) + float(node["y"]) + float(node["height"]) / 2)

    def build_node(source_node, parent_xml, parent_center):
        source_type = source_node["type"]
        if source_type == "VECTOR":
            element = vector_elements[source_node["id"]]
            created, center = add_shape_for_vector(parent_xml, source_node, element, gradients, ids, parent_center)
            vector_nodes[source_node["id"]] = created
            vector_centers[source_node["id"]] = center
            for child in reversed(source_node.get("children", [])):
                build_node(child, created, center)
            return created
        center = abs_group_center(source_node)
        node = add_tag(parent_xml, "Node", id=ids.next(), name=safe_name(source_node.get("name", source_node["id"])), x=f(center[0] - parent_center[0]), y=f(center[1] - parent_center[1]), opacity=f(float(source_node.get("opacity", 1))))
        vector_nodes[source_node["id"]] = node
        for child in reversed(source_node.get("children", [])):
            if child["type"] in ("GROUP", "VECTOR", "FRAME"):
                build_node(child, node, center)
        return node

    vector_nodes[frame["id"]] = frame_node
    for child in reversed(frame.get("children", [])):
        build_node(child, frame_node, frame_center_abs)

    pose_motion_nodes = [n for n in motion_by_id.values() if n["nodeId"] in vector_nodes]
    machine = add_tag(artboard, "StateMachine", id=sm_id, name=f"{POSE_LABELS[pose['name']]} Loop")
    layer = add_tag(machine, "StateMachineLayer", id=sm_layer_id, name="Default")
    add_tag(layer, "EntryState", id=ids.next(), x="0", y="0")
    entry = layer[-1]
    add_tag(entry, "StateTransition", stateToId=entry_anim_state_id)
    add_tag(layer, "AnimationState", id=entry_anim_state_id, animationId=anim_id, x="220", y="0")
    animation = add_tag(artboard, "LinearAnimation", id=anim_id, name=f"{POSE_LABELS[pose['name']]} Motion", duration="192", fps="60", loopValue="loop")
    by_target = {}
    for motion_node in pose_motion_nodes:
        source_id = motion_node["nodeId"]
        target_xml = vector_nodes[source_id]
        for source_property, tracks_data in motion_node.get("motion", {}).get("animations", {}).items():
            tracks = tracks_data.get("tracks", [])
            if not tracks:
                continue
            track = tracks[0]
            keyframes = track.get("keyframes", [])
            property_name = {
                "TRANSLATION_X": "x", "TRANSLATION_Y": "y", "ROTATION": "rotation",
                "SCALE_X": "scaleX", "SCALE_Y": "scaleY", "OPACITY": "opacity",
            }.get(source_property)
            if not property_name:
                continue
            if source_property in ("TRANSLATION_X", "TRANSLATION_Y"):
                base = float(target_xml.get(property_name, "0"))
                values = [base + float(key["value"]["value"]) for key in keyframes]
            elif source_property == "ROTATION":
                values = [math.radians(float(key["value"]["value"])) for key in keyframes]
            else:
                values = [float(key["value"]["value"]) for key in keyframes]
            target = by_target.setdefault(source_id, (target_xml, []))
            target[1].append((property_name, keyframes, values))
    for source_id, (target_xml, properties) in by_target.items():
        keyed = add_tag(animation, "KeyedObject", objectId=target_xml.get("id"))
        for property_name, keyframes, values in properties:
            prop = add_tag(keyed, "KeyedProperty", property=property_name)
            for index, (kf, value) in enumerate(zip(keyframes, values)):
                frame_index = round(float(kf["timelinePosition"]) * 60)
                interpolation, curve = interpolation_for(kf)
                if index == len(keyframes) - 1:
                    interpolation, curve = "linear", None
                interp_id = ids.next() if curve and index < len(keyframes) - 1 else None
                key = add_tag(prop, "KeyFrameDouble", value=f(value), frame=str(frame_index), interpolationType=interpolation, interpolatorId=interp_id)
                if curve and index < len(keyframes) - 1:
                    add_tag(key, "CubicEaseInterpolator", id=interp_id, x1=f(float(curve["x1"])), y1=f(float(curve["y1"])), x2=f(float(curve["x2"])), y2=f(float(curve["y2"])))
    return artboard, len(vector_elements), len(pose_motion_nodes)


def main():
    if not SOURCE.exists():
        raise SystemExit(f"Missing Figma source data: {SOURCE}")
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    motion_by_id = {n["nodeId"]: n for n in data["motionNodes"]}
    ids = Ids()
    root = ET.Element("Rive", {"version": "1", "kind": "fragment"})
    summaries = []
    for pose in data["poses"]:
        artboard, vector_count, animated_count = generate_pose(pose, motion_by_id, ids)
        root.append(artboard)
        summaries.append((pose["name"], vector_count, animated_count))
    ET.indent(root, space="  ")
    PROJECT.mkdir(parents=True, exist_ok=True)
    (PROJECT / "rive.yaml").write_text("name: nomi_mascots\n", encoding="utf-8")
    (PROJECT / "scene.rml").write_text(ET.tostring(root, encoding="unicode", xml_declaration=True) + "\n", encoding="utf-8")
    for name, vectors, animated in summaries:
        print(f"{name}: {vectors} vetores, {animated} alvos animados")
    print(f"Generated {PROJECT / 'scene.rml'} ({ids.value} Rive object IDs)")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Rive generation failed: {error}", file=sys.stderr)
        raise
