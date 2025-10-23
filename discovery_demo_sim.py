
#!/usr/bin/env python3
"""
discovery_demo_sim.py
A compact, runnable simulation of the 5-day discovery in ~30 seconds.
- Spawns 9 logical agents as lightweight tasks (no external deps)
- Emits events into a local queue
- Orchestrator computes convergence + dashboards
- Writes events.jsonl and dashboard_snapshots.jsonl
Run: python discovery_demo_sim.py
"""
import asyncio, json, random, time
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from pathlib import Path

RUNTIME_SECONDS = 30  # ~5 days compressed
EVENT_RATE = 30       # events per second across all agents
SNAPSHOT_EVERY = 1.0  # seconds

base = Path(__file__).resolve().parent
ev_path = base / "events.jsonl"
dash_path = base / "dashboard_snapshots.jsonl"

@dataclass
class AgentState:
    name: str
    completeness: float = 0.0
    events_published: int = 0
    last_activity: str = ""
    running: bool = True

class Bus:
    def __init__(self):
        self.q = asyncio.Queue()
    async def publish(self, etype, data):
        evt = {"event_type": etype, "data": data, "ts": datetime.utcnow().isoformat()+"Z"}
        await self.q.put(evt)
        return evt
    async def get(self):
        return await self.q.get()

class Orchestrator:
    def __init__(self, bus: Bus):
        self.bus = bus
        self.metrics = {
            "processes": 0, "requirements": 0, "risks": 0,
            "estimate_total": 0.0, "estimate_confidence": 0.2,
            "data_quality_score": 0.2, "process_coverage": 0.05,
            "requirements_complete": 0.05, "fsd_completeness": 0.05,
            "agent_idle_percentage": 0.0
        }
        self.agents = {a: AgentState(a) for a in [
            "process_mapper","suite_exporter","master_data","policy_compiler",
            "fsd_drafter","estimator","configuration_assistant","engagement_planner","orchestrator_helper"
        ]}
        self.start = datetime.utcnow()

    def day(self): return min((datetime.utcnow()-self.start).seconds // 6 + 1, 5)
    def hours_to_cutoff(self):
        # compress day length: each "day" is 6s; cutoff day5 noon => +3s into day5
        elapsed = (datetime.utcnow()-self.start).seconds
        total = (4*6) + 3
        rem = max(0, total - elapsed)
        return round(rem / 0.25, 2)  # 0.25s ~ 1 hour

    async def pump(self):
        # Event consumer that updates metrics
        with ev_path.open("w", encoding="utf-8") as evlog:
            while True:
                try:
                    evt = await asyncio.wait_for(self.bus.get(), timeout=0.2)
                except asyncio.TimeoutError:
                    if (datetime.utcnow()-self.start).seconds > RUNTIME_SECONDS:
                        break
                    continue
                evlog.write(json.dumps(evt) + "\n")
                et = evt["event_type"]; d = evt["data"]
                if et == "process.discovered":
                    self.metrics["processes"] += 1
                    self.metrics["process_coverage"] = min(0.95, self.metrics["process_coverage"] + 0.01)
                elif et == "requirement.identified":
                    self.metrics["requirements"] += 1
                    self.metrics["requirements_complete"] = min(0.95, self.metrics["requirements_complete"] + 0.01)
                elif et == "risk.identified":
                    self.metrics["risks"] += 1
                elif et == "estimate.updated":
                    self.metrics["estimate_total"] = d.get("total_hours", self.metrics["estimate_total"])
                    self.metrics["estimate_confidence"] = d.get("confidence", self.metrics["estimate_confidence"])
                elif et == "data.quality.score":
                    self.metrics["data_quality_score"] = max(self.metrics["data_quality_score"], d.get("score", 0.2))
                elif et == "fsd.section_drafted":
                    self.metrics["fsd_completeness"] = min(0.98, self.metrics["fsd_completeness"] + 0.02)

    async def dashboards(self):
        with dash_path.open("w", encoding="utf-8") as dlog:
            last = time.time()
            while (datetime.utcnow()-self.start).seconds <= RUNTIME_SECONDS:
                now = time.time()
                if now - last >= SNAPSHOT_EVERY:
                    last = now
                    # derive idle pct from avg completeness
                    avg_comp = sum(a.completeness for a in self.agents.values())/len(self.agents)
                    self.metrics["agent_idle_percentage"] = 0.35 if avg_comp >= 0.75 else 0.15 if avg_comp >= 0.5 else 0.05
                    snap = {
                        "ts": datetime.utcnow().isoformat()+"Z",
                        "day": self.day(),
                        "hours_to_cutoff": self.hours_to_cutoff(),
                        "metrics": self.metrics.copy()
                    }
                    dlog.write(json.dumps(snap) + "\n")
                await asyncio.sleep(0.05)

async def agent_worker(name: str, bus: Bus, state: AgentState, start: datetime):
    # each agent emits themed events at random; completeness grows with time
    while (datetime.utcnow()-start).seconds <= RUNTIME_SECONDS:
        await asyncio.sleep(random.uniform(0.02, 0.08))
        r = random.random()
        if name == "process_mapper" and r < 0.4:
            await bus.publish("process.discovered", {"process_id": f"proc_{state.events_published:04d}", "confidence": round(random.uniform(0.6, 0.95), 2)})
        elif name == "fsd_drafter" and r < 0.3:
            await bus.publish("fsd.section_drafted", {"section": "requirements"})
        elif name == "estimator" and r < 0.15:
            await bus.publish("estimate.updated", {"total_hours": 1200 + state.events_published*2, "confidence": min(0.9, 0.4 + state.events_published*0.01)})
        elif name == "master_data" and r < 0.25:
            await bus.publish("data.quality.score", {"score": min(0.95, 0.3 + state.events_published*0.02)})
        elif name == "policy_compiler" and r < 0.15:
            await bus.publish("requirement.identified", {"id": f"REQ-{state.events_published:04d}"})
        elif name == "engagement_planner" and r < 0.1:
            await bus.publish("plan.updated", {"duration_weeks": 16 - min(8, state.events_published//10)})
        elif r < 0.05:
            await bus.publish("risk.identified", {"id": f"R{state.events_published:03d}", "impact": 0.3, "probability": 0.3})
        state.events_published += 1
        # completeness curve (logistic-ish)
        t = (datetime.utcnow()-start).seconds / RUNTIME_SECONDS
        state.completeness = max(0.0, min(0.99, 1/(1+pow(2.71828, -6*(t-0.6)))))

async def main():
    bus = Bus()
    orch = Orchestrator(bus)
    start = datetime.utcnow()

    # Start orchestrator pumps
    tasks = [asyncio.create_task(orch.pump()), asyncio.create_task(orch.dashboards())]

    # Start agents
    for a in list(orch.agents.keys()):
        tasks.append(asyncio.create_task(agent_worker(a, bus, orch.agents[a], start)))

    # Let simulation run
    await asyncio.gather(*tasks)

    print("Simulation complete.")
    print(f"Events log: {ev_path}")
    print(f"Dashboard snapshots: {dash_path}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
