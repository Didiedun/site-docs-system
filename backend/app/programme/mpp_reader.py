"""Reads MS Project .mpp and returns a structured progress snapshot.

This is infrastructure: it adapts the contractor's programme into the domain
shape (overall + per-block plan/actual/variance + status lists). The 'Plan'
custom field holds planned %; standard % Complete holds actual.
"""
import jpype
import mpxj  # noqa: F401  (adds MPXJ jars to the JVM classpath)

_STARTED = False


def _ensure_jvm() -> None:
    global _STARTED
    if not _STARTED:
        if not jpype.isJVMStarted():
            jpype.startJVM()
        _STARTED = True


def _num(x):
    if x is None:
        return None
    try:
        return float(x.doubleValue())
    except Exception:
        try:
            return float(x)
        except Exception:
            return None


def _plan_pct(v):
    if v is None:
        return None
    s = str(v).replace("%", "").strip()
    try:
        return float(s)
    except Exception:
        return None


def _short(name: str) -> str:
    u = name.upper()
    for key, lab in (("T07", "T07"), ("T08", "T08"),
                     ("GERBANG", "Gerbang Senai T01"), ("TO1", "Gerbang Senai T01"),
                     ("CTLD", "CTLD")):
        if key in u:
            return lab
    return name


def parse_programme(path: str) -> dict:
    _ensure_jvm()
    from org.mpxj.reader import UniversalProjectReader

    project = UniversalProjectReader().read(path)
    props = project.getProjectProperties()

    plan_field = None
    for cf in project.getCustomFields():
        if str(cf.getAlias() or "") == "Plan":
            plan_field = cf.getFieldType()

    def actual(t):
        return _num(t.getPercentageComplete()) or 0.0

    def plan(t):
        return _plan_pct(t.get(plan_field)) if plan_field else None

    def level(t):
        x = t.getOutlineLevel()
        return int(x) if x is not None else 0

    tasks = [t for t in project.getTasks() if t is not None]
    order = [(level(t), t) for t in tasks]

    overall_plan, overall_actual = next(
        ((plan(t), actual(t)) for lvl, t in order if lvl == 0), (None, None))

    blocks = []
    for idx, (lvl, t) in enumerate(order):
        if lvl != 2:
            continue
        name = str(t.getName())
        if name in ("Start", "Finish") or "PRELIMINARIES" in name:
            continue
        children, j = [], idx + 1
        while j < len(order) and order[j][0] > 2:
            if order[j][0] == 3:
                children.append(order[j][1])
            j += 1
        child_names = [str(c.getName()) for c in children]
        if any(cn.upper().startswith("BLOK") for cn in child_names):
            for c in children:
                cn = str(c.getName())
                if cn.upper().startswith("BLOK"):
                    p, a = plan(c), actual(c)
                    blocks.append({"label": cn.replace("BLOK ", "").strip(),
                                   "plan": p, "actual": a,
                                   "variance": None if p is None else round(a - p)})
        else:
            p, a = plan(t), actual(t)
            blocks.append({"label": _short(name), "plan": p, "actual": a,
                           "variance": None if p is None else round(a - p)})

    return {
        "statusDate": str(props.getStatusDate()) if props.getStatusDate() else None,
        "startDate": str(props.getStartDate()) if props.getStartDate() else None,
        "finishDate": str(props.getFinishDate()) if props.getFinishDate() else None,
        "overall": {"plan": overall_plan, "actual": overall_actual,
                    "variance": None if overall_plan is None else round(overall_actual - overall_plan)},
        "blocks": blocks,
        "notStarted": [b["label"] for b in blocks if b["actual"] == 0],
        "inProgress": [b["label"] for b in blocks if 0 < b["actual"] < 100],
        "complete":   [b["label"] for b in blocks if b["actual"] >= 100],
    }
