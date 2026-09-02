export interface WorkflowTaskDefinition {
  id: string;
  dependsOn?: string[];
}

export const validateDag = (
  tasks: WorkflowTaskDefinition[],
): void => {
  const taskIds = new Set(tasks.map((task) => task.id));

  for (const task of tasks) {
    const dependencies = task.dependsOn ?? [];

    for (const dependency of dependencies) {
      if (!taskIds.has(dependency)) {
        throw new Error(
          `Task "${task.id}" depends on unknown task "${dependency}"`,
        );
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (taskId: string): void => {
    if (visiting.has(taskId)) {
      throw new Error(
        `Workflow contains a dependency cycle involving "${taskId}"`,
      );
    }

    if (visited.has(taskId)) {
      return;
    }

    visiting.add(taskId);

    const task = tasks.find(
      (candidate) => candidate.id === taskId,
    );

    for (const dependency of task?.dependsOn ?? []) {
      visit(dependency);
    }

    visiting.delete(taskId);
    visited.add(taskId);
  };

  for (const task of tasks) {
    visit(task.id);
  }
};