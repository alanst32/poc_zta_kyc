#!/usr/bin/env node
// CDK app entry. Deploys to the account/region of your current AWS CLI credentials.
import * as cdk from "aws-cdk-lib";
import { ZtaStack } from "../lib/zta-stack";

const app = new cdk.App();
new ZtaStack(app, "ZtaKycExperiment", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  description: "PayVault ZTA/KYC authorisation experiment (Paper 1). Disposable: cdk destroy removes everything.",
});
cdk.Tags.of(app).add("project", "zta-kyc-experiment");
