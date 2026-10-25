// Experiment-wide infrastructure settings. Lambda settings are part of the reported
// environment (plan Part A §7), so change them deliberately and report the change.
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";

export const PROJECT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Everything is disposable: `cdk destroy` must leave nothing behind and no standing cost. */
export const REMOVAL_POLICY = cdk.RemovalPolicy.DESTROY;

export const LAMBDA_SETTINGS = {
  runtime: lambda.Runtime.NODEJS_22_X,
  architecture: lambda.Architecture.ARM_64,
  memorySize: 512,
  timeout: cdk.Duration.seconds(5),
} as const;
