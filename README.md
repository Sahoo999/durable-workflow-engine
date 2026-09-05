<div align="center">

# Durable Workflow Engine

### A fault-tolerant, DAG-based workflow orchestration platform, built from scratch

<p>
  <strong>TypeScript</strong> · <strong>Fastify</strong> · <strong>PostgreSQL</strong> · <strong>Redis</strong> · <strong>BullMQ</strong> · <strong>Drizzle ORM</strong> · <strong>React</strong> · <strong>React Flow</strong> · <strong>OpenTelemetry</strong> · <strong>Prometheus</strong>
</p>

<p>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white">
  <img alt="Redis" src="https://img.shields.io/badge/Redis-BullMQ-DC382D?logo=redis&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111827">
</p>

</div>

---

## The Problem

Almost every backend eventually needs to run a sequence of steps that depend on each other — charge a card, then reserve inventory, then ship, then notify — where any step can fail, retries have to happen safely, and someone needs to be able to answer "what actually happened?" after the fact.

The naive version of this is a single function that calls step after step. It works until:

- the process crashes halfway through step 3, and now you don't know if step 3 ran or not;
- a retry fires while the original attempt is *also* still running, and both try to write the result;
- a step needs a human to approve something before continuing, which could take minutes or days;
- an operator needs to see, without reading logs, exactly which step failed and why.

A message queue (BullMQ, SQS, RabbitMQ) solves *delivery* — getting a job to a worker. It does not solve *execution state*: which tasks in a multi-step graph are done, which worker currently owns a task, whether that worker is still alive, or whether an old worker's result should even be trusted anymore.

**Durable Workflow Engine** is my attempt to build the layer that sits on top of a queue and actually answers those questions — using PostgreSQL as the source of truth for everything that matters, and Redis/BullMQ purely as the mechanism that wakes workers up.

---

## Why I Built This

Production orchestration systems — Temporal, Airflow, AWS Step Functions — all solve the same underlying problem: keeping a multi-step process correct when the world around it is unreliable. I wanted to understand *how*, not just use one, so I built the core of that problem myself and solved it end to end.

That meant confronting the failure modes directly, not just reading about them:

**"A worker died mid-task. Now what?"**
Without persisted state, the answer is "nobody knows." Here, the answer is: the task's heartbeat goes stale, the system detects it, and the task is safely handed to a new worker — because every task's status lives in Postgres, not in the crashed process's memory.

**"The old worker came back and tried to write its result anyway."**
This is the failure mode that actually breaks systems — not the crash itself, but a *stale* writer winning a race after the fact. I implemented **fencing tokens** so that once a task is reassigned, the old worker's write is rejected outright, no matter what result it's carrying.

**"A step failed. Was that a blip, or is it actually broken?"**
Retry policies with exponential backoff make that distinction automatically, and a task that's genuinely exhausted its retries lands in a dead-letter queue with full context — not a silently dropped job.

**"Did this workflow actually finish?"**
Run status is never a field some process sets and forgets — it's *recomputed* from the real state of every task, every time, so it can never silently drift from the truth.

Solving each of these required the same underlying discipline: **treat state as the thing that must survive, and treat every process — API, worker, queue — as something that could disappear at any moment.** That constraint is what turned this from a job-runner script into an actual durable execution engine, complete with a React dashboard for operators to see and act on all of it.

---

## Why a Queue Isn't Enough

This is the core design argument of the project, so it's worth stating directly.

A queue guarantees a message gets delivered (at least once, usually). It does **not** track:

| Question | A queue answers this? |
|---|---|
| What version of the workflow created this run? | No |
| Which tasks have completed, and in what order? | No |
| Is the worker currently holding this task still alive? | No |
| Could a crashed worker still write a stale result after a retry succeeded? | No |
| Should this failure be retried, or is it permanent? | No |
| Can an operator safely replay a failed task without side effects? | No |
| Did the workflow as a whole actually finish? | No |

Every one of these questions requires durable, queryable state — which is exactly what a queue message, sitting in Redis, is not designed to be. So this engine keeps **PostgreSQL** as the durable record of workflow definitions, versions, runs, tasks, attempts, workers, approvals, and DLQ entries, and uses Redis/BullMQ only to get already-decided, already-persisted work in front of a worker process.

---

## Architecture

```text
                         ┌──────────────────────┐
                         │   React Dashboard     │
                         │  Operations Console   │
                         └──────────┬────────────┘
                                    │ HTTP
                                    ▼
                         ┌──────────────────────┐
                         │      Fastify API      │
                         └──────┬─────────┬──────┘
                                │         │
                        state   │         │ dispatch
                                ▼         ▼
                     ┌──────────────┐  ┌─────────────────┐
                     │  PostgreSQL  │  │  Redis + BullMQ  │
                     │ Durable      │  │ Async task       │
                     │ source of    │  │ delivery         │
                     │ truth        │  └────────┬─────────┘
                     └──────┬───────┘            │
                            │                    │
                            └─────────┬──────────┘
                                      ▼
                            ┌───────────────────┐
                            │      Worker(s)     │
                            │  execute task      │
                            │  create attempt    │
                            │  send heartbeat     │
                            │  report result      │
                            └───────────────────┘
```

**The one decision that shapes everything else:** state and delivery are two different systems, and the API never lets a worker's message *be* the truth. A worker reports "I finished task X" by writing to Postgres; BullMQ's only job was to have told the worker to start in the first place. This is what makes crash recovery, fencing, and reconciliation possible — if the queue message were the source of truth, a lost or duplicated message would mean lost or duplicated state, with no way to reconstruct what really happened.

### How a run actually executes

Given a workflow shaped like this:

```text
        A
       / \
      B   C
       \ /
        D
```

execution proceeds as a sequence of persisted transitions, not a single in-process call chain:

```text
Workflow run created → tasks persisted → dependency analysis
    → ready tasks (A) dispatched to BullMQ → worker executes A
    → attempt persisted (success) → B and C become ready
    → dispatched, executed, attempts persisted
    → D becomes ready only once both B and C are COMPLETED
    → D executes → run status reconciled from task states
```

If the process running any of this dies at any point, nothing is lost — the next reconciliation pass reads task state from Postgres and picks up exactly where things left off.

---

## Task State Model

Tasks move through explicit states, not implicit control flow:

```text
PENDING → QUEUED → RUNNING → COMPLETED
```

On failure:

```text
RUNNING → FAILED ──retry available──▶ PENDING (loops back)
                └──max attempts reached──▶ DEAD LETTER QUEUE
```

Each execution is recorded as a distinct **attempt**, not just an overwritten status field:

```text
Task: charge-payment
  Attempt #1 → FAILED   (gateway timeout)
  Attempt #2 → FAILED   (gateway timeout)
  Attempt #3 → COMPLETED
```

Keeping full attempt history (rather than a single mutable status) is what lets the system reason about retries, fencing, and post-incident debugging without losing information along the way.

---

## Reliability Model

This is where most of the actual engineering is, so each mechanism gets its own section.

### 1. Heartbeats

While a worker executes a task, it periodically writes a heartbeat timestamp. If the heartbeat goes stale — the worker hasn't checked in within its expected interval — that's the signal the system uses to suspect the worker has died or hung, without waiting for it to time out some other way.

### 2. Fencing Tokens

Detecting a dead worker is only half the problem. The harder half: what if the "dead" worker isn't actually dead — it's just slow, or paused (a GC pause, a network partition) — and it comes back and tries to write a result *after* the system has already reassigned its task to someone else?

```text
Worker A takes task, gets fencing token 1
Worker A stalls (long GC pause, network partition — not actually dead)
System sees a stale heartbeat, reassigns the task
Worker B takes over, gets fencing token 2, completes the task
Worker A finally wakes up, tries to write its result with token 1
                              │
                              ▼
                    rejected — token 1 is no longer current
```

Every write checks its token against the current one for that task. An old token is refused, full stop, regardless of whether the result it's carrying is "correct." This is the standard fencing-token pattern used to prevent split-brain writes in distributed systems, and implementing it was the part of this project that most changed how I think about "worker crashed" — it's never actually binary.

### 3. Retries and Backoff

```text
Task fails
   │
   ▼
attempts remaining? ──no──▶ mark FAILED permanently → write DLQ entry
   │
  yes
   │
   ▼
calculate exponential backoff delay → schedule next attempt via delayed BullMQ job
```

### 4. Idempotent Dispatch

The API needs to be safe to call more than once for the same logical dispatch (e.g., a client retries an HTTP request because it timed out, even though the server actually processed it). This is solved with a deterministic BullMQ job ID:

```text
Normal dispatch:  <workflowRunId>-<taskId>
Retry dispatch:   <workflowRunId>-<taskId>-attempt-2
```

Two dispatch calls for the same task produce the same job ID, so BullMQ treats the second as a duplicate rather than double-executing it. Retries get a distinct suffix so they aren't mistaken for duplicates of the original.

### 5. Run-State Reconciliation

The workflow run's overall status is never tracked as its own independent field that some process updates and could get out of sync. It's *derived* from the current state of every task in it, every time it's checked:

```text
all tasks COMPLETED → run COMPLETED
any task permanently FAILED → run FAILED
otherwise → run still IN_PROGRESS
```

This means the run status can never drift from reality — it's recomputed from ground truth rather than cached and hoped to be correct.

---

## Human Approval / Wait States

Not everything can or should be automated — financial authorization, release gates, and manual review steps all need a human in the loop. The engine supports pausing a task on an approval request:

```text
Task → approval requested → WAITING
                              │
                    ┌─────────┴─────────┐
                 APPROVED             REJECTED
                    │                    │
              resume execution    resolved per workflow logic
```

A workflow can sit in `WAITING` for seconds or days — since state lives in Postgres and not in a running process, there's no timeout pressure on how long a human takes to respond.

---

## Dead Letter Queue

When a task exhausts its retries, it doesn't just fail silently into a log line — it's written to a dead-letter table with the full failure context (which attempt, what error, when). From the dashboard, an operator can inspect exactly what went wrong and **replay** the task, which re-queues it as a fresh attempt:

```text
DLQ entry → operator clicks Replay → task re-enters QUEUED → worker picks it up
```

This turns failure handling from "go read the logs and manually re-trigger something" into an actual operational workflow.

---

## Workflow Versioning

Workflow definitions are immutable once published; editing a workflow creates a new version rather than mutating the old one. A run is permanently pinned to whichever version created it:

```text
order-processing v1 ──▶ Run A   (still executes against v1's definition)
order-processing v2 ──▶ Run B
order-processing v3 ──▶ Run C
```

This avoids the genuinely nasty class of bug where you "fix" a workflow definition and it silently changes the behavior of runs that are already halfway through executing.

---

## Observability

A durable execution engine needs to be diagnosable in production, not just locally, so it ships with both tracing and metrics rather than either alone.

**OpenTelemetry** spans are created per task execution, tagged with task ID, workflow run ID, task type, attempt number, worker ID, duration, and success/error status — enough to trace one execution across the whole distributed path from dispatch to completion.

**Prometheus** metrics cover task executions, failures, retries, and duration, exposed at:

```http
GET /metrics
GET /health
```

---

## Operations Dashboard

The React dashboard is the control plane for everything above — it exists so none of this reliability machinery requires reading raw database rows to use.

- **Workflow overview** — all workflow definitions, with navigation into their versions and runs
- **Run detail** — the DAG rendered visually via React Flow, showing live execution status per node, not just a flat task list
- **Task inspection** — click into any task to see its full attempt history
- **Approvals** — see pending approval requests and approve/reject directly
- **Dead Letter Queue** — inspect and replay permanently failed tasks
- **Workers** — live worker identity, hostname, status, and heartbeat freshness

```text
       A ✓
      /   \
     ▼     ▼
    B ✓   C ⟳ (running)
      \   /
       ▼ ▼
       D •  (waiting on dependencies)
```

---

## Technology Choices

| Technology | Why it's used here |
|---|---|
| **TypeScript** | Type safety across the engine, worker, and dashboard — especially valuable for the task-state-machine logic, where an invalid transition should be a compile error, not a runtime surprise |
| **PostgreSQL** | Transactional durability for workflow/run/task/attempt state — this is the whole point of the project, so it had to be a real relational database, not an in-memory store |
| **Drizzle ORM** | Typed SQL access without hiding the actual queries — matters a lot when reasoning about state transitions and locking |
| **Redis + BullMQ** | Battle-tested async delivery, delayed jobs for backoff, and job-ID-based deduplication — chosen deliberately as the *delivery* layer, not the state layer |
| **Fastify** | Low-overhead HTTP API for both the dashboard and any future API consumers |
| **React + React Flow** | React Flow specifically because a workflow run is fundamentally a graph, and a flat task list loses the dependency structure that makes the DAG understandable at a glance |
| **OpenTelemetry + Prometheus** | Tracing and metrics as first-class concerns, since a system whose whole purpose is reliability needs to be observable, not just theoretically correct |

---

## Project Structure

```text
durable-workflow-engine/
├── src/
│   ├── api/                          # Fastify routes
│   ├── db/
│   │   ├── repositories/
│   │   └── schema.ts
│   ├── observability/
│   │   ├── metrics.ts
│   │   └── tracing.ts
│   ├── queue/
│   │   ├── task-dispatcher.ts        # idempotent BullMQ dispatch
│   │   └── task-queue.ts
│   ├── worker/
│   │   ├── worker.ts
│   │   ├── task-execution-service.ts
│   │   └── task-heartbeat.ts
│   └── workflow/
│       ├── task-state-machine.ts     # explicit lifecycle transitions
│       ├── retry-policy.ts
│       ├── workflow-orchestrator.ts
│       ├── workflow-run-coordinator.ts  # run-state reconciliation
│       ├── approval-service.ts
│       └── dead-letter-service.ts
├── tests/
├── drizzle/
└── docker-compose.yml

workflow-dashboard/
└── src/
    ├── api/
    ├── components/
    ├── pages/
    └── App.tsx
```

---

## API Surface

```http
GET  /health                             GET  /metrics

POST /workflows                          GET  /workflows              GET /workflows/:name
POST /workflows/:name/runs               GET  /workflows/:name/runs

GET  /runs/:id                           GET  /runs/:id/tasks
GET  /tasks/:id                          GET  /tasks/:id/attempts     POST /tasks/:id/approval

GET  /approvals                          POST /approvals/:id/approve  POST /approvals/:id/reject
GET  /dead-letter                        POST /dead-letter/:id/replay
GET  /workers
```

---

## Real-World Use Cases

**Order fulfillment** — validate order → reserve inventory → charge payment → create shipment → send confirmation. A failed charge or shipment step retries independently without restarting the whole order.

**ETL pipelines** — extract → validate → transform → load, with independent branches executing concurrently and converging downstream.

**CI/CD** — build → test → security checks → **manual approval** → deploy → smoke test. The approval gate is exactly the human-in-the-loop mechanism this engine implements natively.

**Financial operations** — generate transaction → risk validation → manual approval → settlement → audit event, where durable attempt history matters for after-the-fact auditing.

**Document processing** — upload → OCR → validation → enrichment → storage, where each stage benefits from independent retry.

---

## Getting Started

**Prerequisites:** Node.js 20+, npm, Docker Desktop

```bash
# 1. Start Postgres + Redis
docker compose up -d

# 2. Install dependencies
npm install

# 3. Run migrations
npx drizzle-kit migrate

# 4. Validate
npm run typecheck && npm test && npm run build

# 5. Start the API
npm run dev

# 6. Start a worker (separate terminal)
npm run worker

# 7. Start the dashboard (separate terminal, from workflow-dashboard/)
npm install && npm run dev
```

---

## Future Improvements

- Horizontal worker autoscaling
- Richer branching/conditional logic in workflow definitions
- Concurrency limits and resource pools per task type
- Workflow-level cancellation and pause/resume
- Multi-tenant authorization
- Chaos-testing and larger-scale performance benchmarks

---

<div align="center">

<br>

### ⚙️ Durable by design. Every crash is a state to recover from, not an error to swallow.

<sub>Built from scratch — state machines, fencing, retries, and reconciliation, implemented end to end.</sub>

<br>

</div>
