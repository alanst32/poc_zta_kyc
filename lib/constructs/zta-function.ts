// A TypeScript Lambda with the experiment's standard settings: esbuild bundling, a log group
// with bounded retention, and the runtime/memory reported with the latency numbers.
import path from "node:path";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { LAMBDA_SETTINGS, PROJECT_ROOT, REMOVAL_POLICY } from "../config";

export interface ZtaFunctionProps {
  /** Handler source, relative to the project root, e.g. "src/target/handler.ts". */
  entry: string;
  environment?: Record<string, string>;
}

export class ZtaFunction extends Construct {
  readonly function: lambda.IFunction;
  readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: ZtaFunctionProps) {
    super(scope, id);

    this.logGroup = new logs.LogGroup(this, "Logs", {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: REMOVAL_POLICY,
    });

    this.function = new NodejsFunction(this, "Function", {
      ...LAMBDA_SETTINGS,
      entry: path.join(PROJECT_ROOT, props.entry),
      handler: "handler",
      environment: { NODE_OPTIONS: "--enable-source-maps", ...props.environment },
      logGroup: this.logGroup,
      bundling: { minify: true, sourceMap: true, target: "node22" },
    });
  }
}
