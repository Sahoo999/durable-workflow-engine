import client from "prom-client";

export const register = new client.Registry();

client.collectDefaultMetrics({
  register,
});

export const taskExecutionsTotal =
  new client.Counter({
    name: "workflow_task_executions_total",
    help: "Total number of task executions",
    labelNames: ["task_type", "status"],
    registers: [register],
  });

export const taskRetriesTotal =
  new client.Counter({
    name: "workflow_task_retries_total",
    help: "Total number of scheduled task retries",
    labelNames: ["task_type"],
    registers: [register],
  });

export const taskFailuresTotal =
  new client.Counter({
    name: "workflow_task_failures_total",
    help: "Total number of failed task executions",
    labelNames: ["task_type"],
    registers: [register],
  });

export const taskDurationSeconds =
  new client.Histogram({
    name: "workflow_task_execution_duration_seconds",
    help: "Task execution duration in seconds",
    labelNames: ["task_type", "status"],
    buckets: [
      0.1,
      0.5,
      1,
      2,
      5,
      10,
      30,
    ],
    registers: [register],
  });