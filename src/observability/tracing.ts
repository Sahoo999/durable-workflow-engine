import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-node";
import {
  BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-base";

const sdk = new NodeSDK({
  spanProcessor: new BatchSpanProcessor(
    new ConsoleSpanExporter(),
  ),
});

export const startTracing = (): void => {
  sdk.start();
};

export const shutdownTracing = async (): Promise<void> => {
  await sdk.shutdown();
};