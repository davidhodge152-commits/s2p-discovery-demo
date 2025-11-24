import React, { useState } from "react";
import "./App.css";

type SafetyMode = "OPEN" | "PAUSED" | "RESTRICTED";

interface QueueItem {
  id: number;
  user: string;
  amount: number;
  createdAt: string;
  status: "PENDING" | "EXECUTED";
}

interface ConversionResult {
  executedNow: number;
  queued: number;
  message: string;
  mode: SafetyMode;
}

function App() {
  const [eligible, setEligible] = useState<boolean>(true);
  const [safetyMode, setSafetyMode] = useState<SafetyMode>("OPEN");
  const [capacityToday, setCapacityToday] = useState<number>(7_500_000);
  const [requestedAmount, setRequestedAmount] = useState<string>("1000000");
  const [userName, setUserName] = useState<string>("0xUserWallet");
  const [kldrBalance, setKldrBalance] = useState<number>(1_250_000);
  const [ksvrBalance, setKsvrBalance] = useState<number>(0);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const [lastResult, setLastResult] = useState<ConversionResult | null>(null);

  const log = (msg: string) => {
    setLogs((prev) => [`${new Date().toLocaleTimeString()}: ${msg}`, ...prev]);
  };

  const parseAmount = (value: string): number => {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const handleRequestConversion = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseAmount(requestedAmount);

    if (amount <= 0) {
      log("Invalid amount.");
      setLastResult(null);
      return;
    }

    if (amount > kldrBalance) {
      log("Insufficient KLDR balance.");
      setLastResult(null);
      return;
    }

    // GATE 1: ELIGIBILITY
    if (!eligible) {
      const msg =
        "Eligibility gate failed: wallet is not eligible for KSVR.";
      log(msg);
      setLastResult({
        executedNow: 0,
        queued: 0,
        message: msg,
        mode: safetyMode,
      });
      return;
    }

    // GATE 3: SAFETY (checked before capacity because it overrides behaviour)
    if (safetyMode === "RESTRICTED") {
      const msg =
        "Safety gate: RESTRICTED mode. All KLDR → KSVR conversions rejected.";
      log(msg);
      setLastResult({
        executedNow: 0,
        queued: 0,
        message: msg,
        mode: safetyMode,
      });
      return;
    }

    if (safetyMode === "PAUSED") {
      const now = new Date();
      const item: QueueItem = {
        id: Date.now(),
        user: userName,
        amount,
        createdAt: now.toLocaleString(),
        status: "PENDING",
      };
      setQueue((prev) => [...prev, item]);

      const msg =
        "Safety gate: PAUSED mode. Full amount queued for later execution when mode returns to OPEN.";
      log(msg);
      setLastResult({
        executedNow: 0,
        queued: amount,
        message: msg,
        mode: safetyMode,
      });
      return;
    }

    // SAFETY = OPEN
    // GATE 2: CAPACITY
    if (capacityToday <= 0) {
      const now = new Date();
      const item: QueueItem = {
        id: Date.now(),
        user: userName,
        amount,
        createdAt: now.toLocaleString(),
        status: "PENDING",
      };
      setQueue((prev) => [...prev, item]);

      const msg =
        "Capacity gate: no capacity remaining today. Full amount queued.";
      log(msg);
      setLastResult({
        executedNow: 0,
        queued: amount,
        message: msg,
        mode: safetyMode,
      });
      return;
    }

    let executedNow = 0;
    let queued = 0;

    if (capacityToday >= amount) {
      executedNow = amount;
      queued = 0;
    } else {
      executedNow = capacityToday;
      queued = amount - capacityToday;
    }

    if (executedNow > 0) {
      setKldrBalance((prev) => prev - executedNow);
      setKsvrBalance((prev) => prev + executedNow);
      setCapacityToday((prev) => prev - executedNow);
    }

    if (queued > 0) {
      const now = new Date();
      const item: QueueItem = {
        id: Date.now(),
        user: userName,
        amount: queued,
        createdAt: now.toLocaleString(),
        status: "PENDING",
      };
      setQueue((prev) => [...prev, item]);
    }

    const msg =
      executedNow > 0 && queued > 0
        ? `Executed $${executedNow.toLocaleString()} now, queued $${queued.toLocaleString()}.`
        : executedNow > 0
        ? `Executed full $${executedNow.toLocaleString()} now.`
        : `Queued full $${queued.toLocaleString()}.`;

    log(msg);
    setLastResult({
      executedNow,
      queued,
      message: msg,
      mode: safetyMode,
    });
  };

  const handleProcessQueue = () => {
    if (safetyMode !== "OPEN") {
      log("Queue can only be processed when Safety mode = OPEN.");
      return;
    }

    let remainingCapacity = capacityToday;
    const updatedQueue: QueueItem[] = [];
    let executedFromQueue = 0;

    for (const item of queue) {
      if (item.status === "EXECUTED") {
        updatedQueue.push(item);
        continue;
      }

      if (remainingCapacity <= 0) {
        updatedQueue.push(item);
        continue;
      }

      if (remainingCapacity >= item.amount) {
        setKldrBalance((prev) => prev - item.amount);
        setKsvrBalance((prev) => prev + item.amount);

        executedFromQueue += item.amount;
        remainingCapacity -= item.amount;

        updatedQueue.push({ ...item, status: "EXECUTED" });
      } else {
        setKldrBalance((prev) => prev - remainingCapacity);
        setKsvrBalance((prev) => prev + remainingCapacity);

        executedFromQueue += remainingCapacity;

        updatedQueue.push({
          ...item,
          amount: item.amount - remainingCapacity,
        });

        remainingCapacity = 0;
      }
    }

    setCapacityToday(remainingCapacity);
    setQueue(updatedQueue);

    if (executedFromQueue > 0) {
      log(
        `Processed queue and executed $${executedFromQueue.toLocaleString()}.`
      );
    } else {
      log("No queued items executed.");
    }
  };

  const handleResetDay = () => {
    setCapacityToday(7_500_000);
    log("Daily capacity reset to $7,500,000.");
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Keelson KLDR → KSVR Gating Demo</h1>
        <p className="subtitle">
          Live simulation of Eligibility → Capacity → Safety gates with partial mint + queue behaviour.
        </p>
      </header>

      <main className="grid">
        <section className="card">
          <h2>Protocol State</h2>

          <div className="field-group">
            <label>Wallet / User</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
          </div>

          <div className="field-group">
            <label>Eligibility</label>
            <div className="toggle-row">
              <button
                className={eligible ? "btn btn-primary" : "btn"}
                onClick={() => setEligible(true)}
              >
                Eligible
              </button>
              <button
                className={!eligible ? "btn btn-danger" : "btn"}
                onClick={() => setEligible(false)}
              >
                Not Eligible
              </button>
            </div>
          </div>

          <div className="field-group">
            <label>Safety Mode</label>
            <div className="toggle-row">
              {(["OPEN", "PAUSED", "RESTRICTED"] as SafetyMode[]).map((m) => (
                <button
                  key={m}
                  className={
                    safetyMode === m ? "btn btn-primary small" : "btn small"
                  }
                  onClick={() => setSafetyMode(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="field-group">
            <label>Capacity Remaining Today (USD)</label>
            <input
              type="number"
              value={capacityToday}
              onChange={(e) => setCapacityToday(Number(e.target.value) || 0)}
              min={0}
            />
          </div>

          <div className="field-group">
            <button className="btn" onClick={handleResetDay}>
              Reset Daily Capacity
            </button>
            <button className="btn" onClick={handleProcessQueue}>
              Process Queue
            </button>
          </div>

          <div className="balances">
            <h3>Wallet Balances</h3>
            <p>
              KLDR: <strong>${kldrBalance.toLocaleString()}</strong>
            </p>
            <p>
              KSVR: <strong>${ksvrBalance.toLocaleString()}</strong>
            </p>
          </div>
        </section>

        <section className="card">
          <h2>Convert KLDR → KSVR</h2>

          <form onSubmit={handleRequestConversion} className="conversion-form">
            <div className="field-group">
              <label>Amount (USD)</label>
              <input
                type="text"
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(e.target.value)}
              />
            </div>

            <button className="btn btn-primary" type="submit">
              Submit
            </button>
          </form>

          <div className="result">
            <h3>Gating Outcome</h3>
            {lastResult ? (
              <div className="result-box">
                <p>
                  <strong>Safety Mode:</strong> {lastResult.mode}
                </p>
                <p>{lastResult.message}</p>

                {lastResult.executedNow > 0 && (
                  <p>
                    Executed now:{" "}
                    <strong>
                      ${lastResult.executedNow.toLocaleString()}
                    </strong>
                  </p>
                )}
                {lastResult.queued > 0 && (
                  <p>
                    Queued:{" "}
                    <strong>${lastResult.queued.toLocaleString()}</strong>
                  </p>
                )}
              </div>
            ) : (
              <p className="hint">Submit a request to see behaviour.</p>
            )}
          </div>
        </section>

        <section className="card">
          <h2>Queued Conversions</h2>

          {queue.length === 0 && <p>No queued items.</p>}

          {queue.length > 0 && (
            <ul className="queue-list">
              {queue.map((item) => (
                <li key={item.id} className="queue-item">
                  <div>
                    <div className="queue-title">
                      {item.user} — ${item.amount.toLocaleString()}
                    </div>
                    <div className="queue-meta">Created: {item.createdAt}</div>
                  </div>

                  <span
                    className={
                      item.status === "PENDING"
                        ? "status-pill pending"
                        : "status-pill executed"
                    }
                  >
                    {item.status}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <h2 style={{ marginTop: "1.5rem" }}>Event Log</h2>
          <div className="log-box">
            {logs.length === 0 && (
              <p className="hint">Logs will appear here.</p>
            )}
            {logs.map((l, i) => (
              <div key={i} className="log-line">
                {l}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
