<div align="center">

# Durable Workflow Engine

### A fault-tolerant, DAG-based workflow execution platform built from scratch

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

<p>
  <a href="#why-i-built-this">Why I built this</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#reliability-model">Reliability</a> ·
  <a href="#dashboard">Dashboard</a> ·
  <a href="#getting-started">Getting started</a> ·
  <a href="#real-world-use-cases">Use cases</a>
</p>

</div>

---

## Overview

**Durable Workflow Engine** is a workflow orchestration platform designed around a simple production problem:

> **How do you reliably execute a multi-step workflow when tasks can fail, workers can disappear, retries can overlap, and operators still need visibility and control?**

Instead of treating a workflow as one long-running process, this project models execution as **durable state in PostgreSQL plus asynchronous task delivery through Redis/BullMQ**.

A workflow is defined as a **directed acyclic graph (DAG)**. Each task has a persistent lifecycle, execution attempts, dependency information, retry policy, heartbeat state, and observable execution history.

That makes the system closer to a small workflow platform than a simple job queue.

---

## Why I Built This

Most application backends eventually need some variation of:

- run these steps in a specific order;
- wait for dependencies before continuing;
- retry transient failures;
- survive a worker crash;
- avoid stale workers overwriting newer results;
- pause for human approval;
- preserve execution history;
- expose enough information for operators to understand what happened.

A basic queue can execute jobs, but **durable orchestration requires more than queueing**.

I built this project from scratch to explore those distributed-systems problems directly: state transitions, idempotency, retries, failure recovery, worker coordination, database durability, observability, and operational tooling.

The result is a complete end-to-end system with both the **execution engine** and a **control-plane dashboard**.

---

# What It Does

At a high level, the platform lets you:

1. Define a workflow as a versioned DAG.
2. Start a workflow run with input data.
3. Persist the run and task state in PostgreSQL.
4. Dispatch ready tasks to BullMQ/Redis.
5. Execute tasks on independent workers.
6. Track each task through explicit execution attempts.
7. Retry failed tasks using configurable retry limits and exponential backoff.
8. Detect stale execution using heartbeats.
9. Protect state from stale workers with fencing tokens.
10. Recover execution after worker failures.
11. Pause workflows for human approval.
12. Move permanently failed tasks to a dead-letter queue.
13. Replay dead-lettered work.
14. Reconcile the overall workflow-run status from task state.
15. Inspect all of this through a React operations dashboard.

---

# The Core Idea

The most important architectural decision is the separation between **durable state** and **asynchronous delivery**.

```text
                         ┌──────────────────────┐
                         │   React Dashboard    │
                         │  Operations Console  │
                         └──────────┬───────────┘
                                    │ HTTP
                                    ▼
                         ┌──────────────────────┐
                         │      Fastify API     │
                         └──────┬─────────┬─────┘
                                │         │
                        state   │         │ dispatch
                                ▼         ▼
                     ┌──────────────┐  ┌────────────────┐
                     │ PostgreSQL   │  │ Redis + BullMQ │
                     │ Durable     │  │ Async delivery │
                     │ state       │  └───────┬────────┘
                     └──────┬───────┘          │
                            │                  │
                            └────────┬─────────┘
                                     ▼
                           ┌──────────────────┐
                           │     Worker(s)    │
                           │                  │
                           │ execute task     │
                           │ create attempt  │
                           │ heartbeat        │
                           │ report result    │
                           └──────────────────┘
```

PostgreSQL is the durable record of workflow, run, task, attempt, worker, approval, and event state. Redis/BullMQ is responsible for getting executable work to workers.

This distinction matters because **a queue message is not the workflow's source of truth**.

---

# How a Workflow Executes

Suppose a workflow is:

```text
             ┌───────┐
             │   A   │
             └───┬───┘
                 / \
                /   \
          ┌────▼─┐ ┌─▼────┐
          │  B   │ │  C   │
          └───┬──┘ └──┬───┘
              \       /
               \     /
                └──┬─┘
                 ┌─▼───┐
                 │  D  │
                 └─────┘
```

The engine does not simply execute `A → B → C → D` as one process.

Instead:

```text
Workflow definition
        │
        ▼
Workflow run created
        │
        ▼
Tasks persisted
        │
        ▼
Dependency analysis
        │
        ▼
Ready tasks dispatched
        │
        ▼
BullMQ queue
        │
        ▼
Worker executes task
        │
        ▼
Task attempt persisted
        │
        ├── success ───────────────┐
        │                           │
        └── failure → retry/DLQ     │
                                    ▼
                         Dependent tasks become ready
                                    │
                                    ▼
                           Run state reconciled
```

Every important transition is represented explicitly in persistent state.

---

# Task State Model

Tasks move through explicit lifecycle states rather than relying on implicit in-memory control flow.

Typical execution:

```text
PENDING
   │
   ▼
QUEUED
   │
   ▼
RUNNING
   │
   ▼
COMPLETED
```

Failure path:

```text
RUNNING
   │
   ▼
FAILED
   │
   ├──────── retry available ────────► PENDING → QUEUED → RUNNING
   │
   └──────── max attempts reached ──► DLQ
```

This explicit state-machine approach makes recovery and reconciliation possible without depending on process memory.

---

# Reliability Model

Reliability is the main engineering goal of this project.

## 1. Durable State

Workflow definitions, immutable versions, workflow runs, tasks, attempts, workers, approvals, and DLQ records are stored in PostgreSQL.

A worker process can disappear without deleting the workflow's persisted state.

## 2. Task Attempts

A task is not just `SUCCESS` or `FAILED`.

Each execution creates an attempt:

```text
Task: payment

Attempt #1 → FAILED
Attempt #2 → FAILED
Attempt #3 → COMPLETED
```

This gives the engine an execution history and a concrete unit for recovery and fencing.

## 3. Retries and Backoff

Failed tasks can be retried up to their configured maximum attempt count.

Retry jobs use delayed BullMQ delivery and exponential backoff.

```text
Failure
   ↓
Should retry?
   │
   ├── yes → calculate delay → queue next attempt
   │
   └── no  → mark FAILED → write DLQ entry
```

## 4. Heartbeats

Workers maintain heartbeat timestamps while executing work.

A stale heartbeat is evidence that an execution owner may have disappeared.

## 5. Fencing Tokens

Fencing prevents an old worker from committing results after a newer attempt has taken ownership.

Conceptually:

```text
Worker A → token 1
Worker crashes

Worker B → token 2

Worker A comes back and tries to write
                │
                ▼
          rejected as stale
```

This is important because simply detecting a stale worker is not enough; the system must also prevent stale work from winning a race against newer work.

## 6. Stale-Worker Recovery

The system can detect stale execution and recover work so the workflow can continue instead of remaining permanently stuck in `RUNNING`.

## 7. Idempotent Dispatch

Normal dispatch uses a deterministic BullMQ job ID derived from the workflow run and task IDs.

```text
<workflowRunId>-<taskId>
```

Retries receive a distinct attempt suffix:

```text
<workflowRunId>-<taskId>-attempt-2
```

This gives duplicate normal dispatches the same queue identity while keeping retries distinct.

## 8. Run-State Reconciliation

A workflow run is derived from the state of its tasks rather than trusting a single worker process.

```text
All tasks COMPLETED
        ↓
Run COMPLETED
```

```text
Any task permanently FAILED
        ↓
Run FAILED
```

That makes workflow state recoverable and observable.

---

# Human Approval / Wait States

Some workflows cannot be fully automated.

The engine supports approval requests so execution can pause and wait for an operator decision.

```text
Task
  │
  ▼
Approval requested
  │
  ▼
WAITING
  │
  ├──── APPROVED ────► resume execution
  │
  └──── REJECTED ────► resolve according to workflow logic
```

The dashboard exposes pending approvals so an operator can approve or reject work without interacting directly with the database.

This is useful for processes involving manual review, financial authorization, release gates, or other human-in-the-loop decisions.

---

# Dead Letter Queue

When a task exhausts its retry budget, the system preserves the failure in a dead-letter queue.

```text
Task fails
   ↓
retry #1
   ↓
retry #2
   ↓
retry #3
   ↓
maximum attempts reached
   ↓
Dead Letter Queue
```

DLQ records contain the failed task and failure context, allowing an operator to inspect what happened.

The platform also supports replay:

```text
DLQ
 │
 └── Replay
       ↓
     QUEUED
       ↓
     Worker
```

This turns the DLQ from a passive error bucket into an operational recovery mechanism.

---

# Workflow Versioning

Workflow definitions are versioned rather than mutated in place.

A run references the workflow version that created it.

```text
Workflow: order-processing

Version 1 ──► Run A
Version 2 ──► Run B
Version 3 ──► Run C
```

This avoids ambiguity when a workflow definition changes while older runs are still executing or being investigated.

---

# Observability

The system includes both tracing and metrics because a durable execution engine should be observable in production, not just debuggable locally.

## OpenTelemetry

Task execution creates tracing spans with execution context such as:

- task ID;
- workflow run ID;
- task type;
- attempt number;
- worker ID;
- execution duration;
- success/error status.

## Prometheus Metrics

The engine records metrics for:

- task executions;
- task failures;
- task retries;
- task duration.

The API exposes:

```text
GET /metrics
```

and a basic health endpoint:

```text
GET /health
```

---

# Operations Dashboard

The project includes a React-based control plane for monitoring the engine.

## Workflow Overview

The dashboard lists workflow definitions and provides navigation into individual workflow details.

## Workflow Runs

A workflow page exposes its runs, including run status and creation information.

## Run Details

A run can be inspected as an actual DAG rather than a flat list of jobs.

The graph shows dependencies and execution status visually:

```text
       A ✓
      /   \
     ▼     ▼
    B ✓   C ⟳
      \   /
       ▼ ▼
       D •
```

## Task Inspection

Tasks can be selected to inspect details and their execution attempts.

## Approvals

Operators can see pending approval requests and approve or reject them from the dashboard.

## Dead Letter Queue

Operators can inspect permanently failed tasks and replay them.

## Workers

The worker view exposes worker identity, status, hostname, start time, and heartbeat information.

---

# Technology Choices

| Technology | Why it is used |
|---|---|
| **TypeScript** | Type-safe implementation across the engine and UI |
| **Node.js** | Runtime for the API and workers |
| **Fastify** | Lightweight, high-performance HTTP API |
| **PostgreSQL** | Durable transactional workflow state |
| **Drizzle ORM** | Typed SQL access and schema management |
| **Redis** | Fast coordination and queue backing store |
| **BullMQ** | Durable asynchronous task delivery and delayed jobs |
| **React** | Operations dashboard |
| **React Router** | Dashboard navigation |
| **React Flow** | Workflow DAG visualization |
| **OpenTelemetry** | Distributed/task tracing |
| **Prometheus** | Metrics collection |
| **GitHub Actions** | Automated typecheck, tests, and builds |

The important part is not the individual technologies; it is how they are combined around a durable execution model.

---

# Project Structure

```text
durable-workflow-engine/
├── src/
│   ├── api/
│   │   └── routes.ts
│   │
│   ├── config/
│   │
│   ├── db/
│   │   ├── repositories/
│   │   └── schema.ts
│   │
│   ├── observability/
│   │   ├── metrics.ts
│   │   └── tracing.ts
│   │
│   ├── queue/
│   │   ├── task-dispatcher.ts
│   │   └── task-queue.ts
│   │
│   ├── types/
│   │
│   ├── worker/
│   │   ├── worker.ts
│   │   ├── worker-service.ts
│   │   ├── task-execution-service.ts
│   │   └── task-heartbeat.ts
│   │
│   └── workflow/
│       ├── task-state-machine.ts
│       ├── retry-policy.ts
│       ├── workflow-orchestrator.ts
│       ├── workflow-run-coordinator.ts
│       ├── approval-service.ts
│       └── dead-letter-service.ts
│
├── tests/
├── drizzle/
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── docker-compose.yml
└── package.json

workflow-dashboard/
└── src/
    ├── api/
    ├── components/
    ├── pages/
    ├── types/
    └── App.tsx
```

---

# API Surface

The backend exposes endpoints for workflows, runs, tasks, approvals, DLQ, workers, health, and metrics.

## Health and Observability

```http
GET /health
GET /metrics
```

## Workflows

```http
POST /workflows
GET  /workflows
GET  /workflows/:name
```

## Runs

```http
POST /workflows/:name/runs
GET  /workflows/:name/runs
GET  /runs/:id
GET  /runs/:id/tasks
```

## Tasks and Attempts

```http
GET /tasks/:id
GET /tasks/:id/attempts
POST /tasks/:id/approval
```

## Approvals

```http
GET  /approvals
POST /approvals/:id/approve
POST /approvals/:id/reject
```

## Dead Letter Queue

```http
GET  /dead-letter
POST /dead-letter/:id/replay
```

## Workers

```http
GET /workers
```

---

# Real-World Use Cases

This architecture maps well to systems where work spans multiple dependent steps and failures must not lose state.

## Order Fulfillment

```text
Validate order
     ↓
Reserve inventory
     ↓
Charge payment
     ↓
Create shipment
     ↓
Send confirmation
```

A failed payment or shipment step can be retried without restarting the entire workflow.

## Data / ETL Pipelines

```text
Extract
  ↓
Validate
  ↓
Transform
  ↓
Load
```

Independent branches can execute concurrently and converge on downstream tasks.

## CI/CD and Release Automation

```text
Build
  ↓
Unit tests
  ↓
Security checks
  ↓
Manual approval
  ↓
Deploy
  ↓
Smoke test
```

The approval state is useful when production deployment requires a human gate.

## Financial / Back-Office Operations

```text
Generate transaction
       ↓
Risk validation
       ↓
Manual approval
       ↓
Settlement
       ↓
Audit event
```

Durable task attempts and explicit state make this model easier to inspect after failures.

## Document Processing

```text
Upload document
       ↓
OCR
       ↓
Validation
       ↓
Enrichment
       ↓
Storage
```

Each stage can be independently retried or investigated.

---

# Why Not Just Use a Queue?

A queue solves **delivery**.

A workflow engine must solve **execution state**.

A production workflow system needs answers to questions such as:

- What version of the workflow was this run created from?
- Which tasks have completed?
- Which task is blocking the DAG?
- How many times has this task executed?
- Is the current worker still alive?
- Could an old worker still write a stale result?
- Should this failure be retried or sent to a DLQ?
- Can an operator safely replay the failed task?
- Did the overall workflow actually finish?

This project was built around those questions rather than treating the queue as the system of record.

---

# Getting Started

## Prerequisites

- Node.js 20+
- npm
- Docker Desktop
- PostgreSQL and Redis available through Docker Compose

## 1. Start infrastructure

From the backend project:

```bash
docker compose up -d
```

## 2. Install dependencies

```bash
npm install
```

## 3. Apply database migrations

Use the repository's configured Drizzle migration workflow, for example:

```bash
npx drizzle-kit migrate
```

## 4. Validate the backend

```bash
npm run typecheck
npm test
npm run build
```

## 5. Start the API

```bash
npm run dev
```

## 6. Start a worker

In another terminal:

```bash
npm run worker
```

## 7. Start the dashboard

In the dashboard directory:

```bash
npm install
npm run dev
```

The Vite development server will print the local dashboard URL.

---

# Verification Checklist

A full local verification should cover:

```text
[✓] PostgreSQL running
[✓] Redis running
[✓] API health endpoint
[✓] Workflow creation/versioning
[✓] Workflow run creation
[✓] DAG execution
[✓] Task attempts
[✓] Retries and backoff
[✓] Worker heartbeat
[✓] Stale-worker recovery
[✓] Fencing
[✓] Run-state reconciliation
[✓] Idempotent dispatch
[✓] Human approval
[✓] Dead-letter queue
[✓] DLQ replay
[✓] Worker lifecycle
[✓] React dashboard
[✓] CI pipeline
```

---

# Testing Philosophy

The test suite is intended to protect the invariants that matter most for a workflow engine:

### DAG readiness
A task must not execute until its dependencies are complete.

### Retry boundaries
A task retries while it has attempts remaining and becomes terminal after the configured limit.

### Idempotent dispatch
Repeated normal dispatches resolve to the same logical queue job ID.

### Fencing
Older execution owners must not be able to overwrite state after a newer attempt takes ownership.

### Recovery
Stale execution can be detected and recovered.

### Run reconciliation
A workflow run becomes terminal based on the state of its tasks.

These are the properties that make the implementation durable rather than merely functional on the happy path.

---

# CI

GitHub Actions runs the core backend checks automatically:

```text
npm ci
   ↓
npm run typecheck
   ↓
npm test
   ↓
npm run build
```

The dashboard is built as part of the repository's frontend validation workflow where configured.

---

# Engineering Highlights

From a software-engineering perspective, the project demonstrates several concepts that commonly appear in distributed backend systems:

- explicit state machines instead of implicit lifecycle state;
- persistence-first workflow execution;
- asynchronous work queues separated from durable state;
- retry and backoff policies;
- execution-attempt history;
- worker liveness tracking;
- fencing against stale execution;
- recovery from partial failure;
- idempotent queue identity;
- immutable workflow versions;
- human-in-the-loop orchestration;
- dead-letter handling and replay;
- API-driven operational tooling;
- tracing and metrics for production visibility;
- automated CI validation.

The goal was not to reproduce a commercial workflow platform feature-for-feature. The goal was to **build the core primitives yourself and understand why each one is necessary**.

---

# Screenshots

The repository's `workflow-dashboard` application provides screenshots that are useful for understanding the control plane:

- workflow overview;
- workflow details and versions;
- workflow run monitoring;
- DAG visualization;
- task and attempt inspection;
- approvals;
- dead-letter queue;
- worker health.

Add the final dashboard screenshots to the repository under a `docs/screenshots/` directory and reference them here once committed.

Example:

```markdown
![Workflow overview](docs/screenshots/workflows.png)
![Run DAG](docs/screenshots/run-dag.png)
![Approvals](docs/screenshots/approvals.png)
![Workers](docs/screenshots/workers.png)
```

---

# Future Improvements

The current implementation focuses on the core durable-execution model. Natural next steps would include:

- horizontal worker autoscaling;
- richer workflow expressions and branching;
- concurrency limits and resource pools;
- workflow cancellation and pause/resume controls;
- stronger multi-tenant authorization;
- event streaming and audit feeds;
- more advanced queue-level observability;
- production deployment manifests;
- larger-scale performance and chaos benchmarks.

These are intentionally treated as extensions rather than prerequisites for the core engine.

---

# What I Learned Building It

The most important lesson from the project is that **reliability is mostly about making state explicit**.

A worker can crash.
A network request can be duplicated.
A retry can overlap with an old execution.
A task can fail after partially doing work.
A human can take hours to approve a step.

The implementation therefore cannot assume that one process remembers what happened.

Instead, the engine persists enough information to reconstruct the workflow state, identify stale execution, reject obsolete writers, retry safely, and give operators a useful explanation of what happened.

That is the central idea behind the project.

---

<div align="center">

## Built from scratch with a focus on durability, failure recovery, and operational visibility.

</div>
