import { Aws } from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as node from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambdanode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { generateBatch } from "../shared/util";
import {boardgames, publishers} from "../seed/boardgames";

type BoardgameAppApiProps = {
  userPoolId: string;
  userPoolClientId: string;
};

export class BoardgameAppApi extends Construct {
  constructor(scope: Construct, id: string, props: BoardgameAppApiProps) {
    super(scope, id);

    const boardgameAppApi = new apig.RestApi(this, "BoardgameAppApi", {
      description: "Boardgame App RestApi",
      deployOptions: {
        stageName: "dev",
      },
      endpointTypes: [apig.EndpointType.REGIONAL],
      defaultCorsPreflightOptions: {
        allowOrigins: apig.Cors.ALL_ORIGINS,
      },
    });


    const boardgameTable = new dynamodb.Table(this, "BoardgameTable", {
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        partitionKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        tableName: "Boardgames",
      });

      const publisherTable = new dynamodb.Table(this, "PublisherTable", {
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        partitionKey: { name: "boardgameId", type: dynamodb.AttributeType.NUMBER },
        sortKey: { name: "pubName", type: dynamodb.AttributeType.STRING },
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        tableName: "Publishers",
   });

   new custom.AwsCustomResource(this, "boardgamesddbInitData", {
    onCreate: {
      service: "DynamoDB",
      action: "batchWriteItem",
      parameters: {
        RequestItems: {
          [boardgameTable.tableName]: generateBatch(boardgames),
          [publisherTable.tableName]: generateBatch(publishers),  
  },
  },
      physicalResourceId: custom.PhysicalResourceId.of("moviesddbInitData"), 
  },
    policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
      resources: [boardgameTable.tableArn, publisherTable.tableArn], 
  }),
  });

    const newBoardgameFn = new lambdanode.NodejsFunction(this, "AddBoardgameFn", {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/../lambdas/addBoardgame.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: boardgameTable.tableName,
          REGION: "eu-west-1",
          USER_POOL_ID: props.userPoolId,
          CLIENT_ID: props.userPoolClientId,
        },
      });
      
      const updateBoardgameFn = new lambdanode.NodejsFunction(this, "UpdateBoardgameFn", {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_16_X,
        entry: `${__dirname}/../lambdas/updateBoardgame.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: boardgameTable.tableName,
          REGION: "eu-west-1",
          USER_POOL_ID: props.userPoolId,
          CLIENT_ID: props.userPoolClientId,
        },
      });

      const getPublishersFn = new lambdanode.NodejsFunction(
        this,
        "GetPublishersFn",
      {
          architecture: lambda.Architecture.ARM_64,
          runtime: lambda.Runtime.NODEJS_16_X,
          entry: `${__dirname}/../lambdas/getPublishers.ts`,
          timeout: cdk.Duration.seconds(10),
          memorySize: 128,
          environment: {
            PUBLISHER_TABLE_NAME: publisherTable.tableName,
            BOARDGAME_TABLE_NAME: boardgameTable.tableName,
            REGION: "eu-west-1",
      },
      }
      );

      const getBoardgameByIdFn = new lambdanode.NodejsFunction(
        this,
        "GetBoardgameByIdFn",
        {
          architecture: lambda.Architecture.ARM_64,
          runtime: lambda.Runtime.NODEJS_18_X,
          entry: `${__dirname}/../lambdas/getBoardgameById.ts`,
          timeout: cdk.Duration.seconds(10),
          memorySize: 128,
          environment: {
            TABLE_NAME: boardgameTable.tableName,
            REGION: 'eu-west-1',
          },
        }
      );

      publisherTable.grantReadData(getPublishersFn);
      boardgameTable.grantReadData(getPublishersFn); 
      boardgameTable.grantReadWriteData(updateBoardgameFn); 
      boardgameTable.grantReadWriteData(newBoardgameFn)
      publisherTable.grantReadData(getPublishersFn);
      boardgameTable.grantReadData(getPublishersFn);  
      boardgameTable.grantReadData(getBoardgameByIdFn)


      const authorizerFn = new node.NodejsFunction(this, "AuthorizerFn", {
        architecture: lambda.Architecture.ARM_64,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        runtime: lambda.Runtime.NODEJS_16_X,
        handler: "handler",
        entry: "./lambdas/auth/authorizer.ts",
        environment: {
        USER_POOL_ID: props.userPoolId,
        CLIENT_ID: props.userPoolClientId,
        REGION: cdk.Aws.REGION,
  }});
  
      const requestAuthorizer = new apig.RequestAuthorizer(
        this,
        "RequestAuthorizer",
        {
          identitySources: [apig.IdentitySource.header("cookie")],
          handler: authorizerFn,
          resultsCacheTtl: cdk.Duration.minutes(0),
        }
      );
  

      const boardgamesEndpoint = boardgameAppApi.root.addResource("boardgames");

boardgamesEndpoint.addMethod("POST", new apig.LambdaIntegration(newBoardgameFn), {
    authorizer: requestAuthorizer,
    authorizationType: apig.AuthorizationType.CUSTOM,
  });

const boardgameEndpoint = boardgamesEndpoint.addResource("{boardgameId}");
boardgameEndpoint.addMethod(
  "GET",
  new apig.LambdaIntegration(getBoardgameByIdFn, { proxy: true })
);

const publisherEndpoint = boardgamesEndpoint.addResource("publishers");
publisherEndpoint.addMethod(
    "GET",
    new apig.LambdaIntegration(getPublishersFn, { proxy: true })
);

boardgameEndpoint.addMethod("PUT", new apig.LambdaIntegration(updateBoardgameFn), {
  authorizer: requestAuthorizer,
  authorizationType: apig.AuthorizationType.CUSTOM,
  });
    }
}
    /*
    const appCommonFnProps = {
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "handler",
      environment: {
        USER_POOL_ID: props.userPoolId,
        CLIENT_ID: props.userPoolClientId,
        REGION: cdk.Aws.REGION,
      },
    };
    


    const protectedRes = appApi.root.addResource("protected");

    const publicRes = appApi.root.addResource("public");

    const protectedFn = new node.NodejsFunction(this, "ProtectedFn", {
      ...appCommonFnProps,
      entry: "./lambda/protected.ts",
    });

    const publicFn = new node.NodejsFunction(this, "PublicFn", {
      ...appCommonFnProps,
      entry: "./lambda/public.ts",
    });

    const authorizerFn = new node.NodejsFunction(this, "AuthorizerFn", {
      ...appCommonFnProps,
      entry: "./lambda/auth/authorizer.ts",
    });

    const requestAuthorizer = new apig.RequestAuthorizer(
      this,
      "RequestAuthorizer",
      {
        identitySources: [apig.IdentitySource.header("cookie")],
        handler: authorizerFn,
        resultsCacheTtl: cdk.Duration.minutes(0),
      }
    );

    protectedRes.addMethod("GET", new apig.LambdaIntegration(protectedFn), {
      authorizer: requestAuthorizer,
      authorizationType: apig.AuthorizationType.CUSTOM,
    });

    publicRes.addMethod("GET", new apig.LambdaIntegration(publicFn));
  }
}*/