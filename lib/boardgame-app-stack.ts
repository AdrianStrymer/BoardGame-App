import * as cdk from 'aws-cdk-lib';
import * as lambdanode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { generateBatch } from "../shared/util";
import {boardgames} from "../seed/boardgames";

import { Construct } from 'constructs';

export class BoardgameAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const boardgameFn = new lambdanode.NodejsFunction(this, "boardgameFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: `${__dirname}/../lambdas/boardgame.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });

    const boardgameFnURL = boardgameFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
      cors: {
        allowedOrigins: ["*"],
      },
    });

    const boardgameTable = new dynamodb.Table(this, "BoardgameTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Boardgames",
    });

    new custom.AwsCustomResource(this, "moviesddbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [boardgameTable.tableName]: generateBatch(boardgames),
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("moviesddbInitData"), 
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [boardgameTable.tableArn],
      }),
    });

    new cdk.CfnOutput(this, "Simple Function Url", { value: boardgameFnURL.url });

  }
}