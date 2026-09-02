export interface TaskDependencyState {
  taskKey: string;
  status: string;
}

export const areDependenciesComplete = (
  dependsOn: string[],
  tasks: TaskDependencyState[],
): boolean => {
  const completed = new Set(
    tasks
      .filter((task) => task.status === "COMPLETED")
      .map((task) => task.taskKey),
  );

  return dependsOn.every((dependency) =>
    completed.has(dependency),
  );
};