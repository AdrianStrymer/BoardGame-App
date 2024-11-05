import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
  GetCommandInput,
  GetCommand
} from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidQueryParams = ajv.compile(
  schema.definitions["PublisherQueryParams"] || {}
);

const ddbDocClient = createDocumentClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("Event: ", JSON.stringify(event));
    const queryParams = event.queryStringParameters;
    if (!queryParams) {
      return {
        statusCode: 500,
        headers: {
          "content-type": "application/json",
 },
        body: JSON.stringify({ message: "Missing query parameters" }),
 };
 }
    if (!queryParams.boardgameId) {
      return {
        statusCode: 500,
        headers: {
          "content-type": "application/json",
 },
        body: JSON.stringify({ message: "Missing boardgame Id parameter" }),
 };
 }
 if (!isValidQueryParams(queryParams)) {
  return {
    statusCode: 500,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      message: `Incorrect type. Must match Query parameters schema`,
      schema: schema.definitions["PublisherQueryParams"],
    }),
  };
}
    const boardgameId = parseInt(queryParams?.boardgameId);
    let commandInput: QueryCommandInput = {
      TableName: process.env.PUBLISHER_TABLE_NAME,
      KeyConditionExpression: "boardgameId = :m",
      ExpressionAttributeValues: { ":m": boardgameId },
 };
     if ("pubName" in queryParams) {
      commandInput = {
 ...commandInput,
        KeyConditionExpression: "boardgameId = :m and begins_with(pubName, :a) ",
        ExpressionAttributeValues: {
          ":m": boardgameId,
          ":a": queryParams.pubName,
 },
 };
 } 

 const commandOutput = await ddbDocClient.send(new QueryCommand(commandInput));
 let response : any = { data: commandOutput.Items };

 
 if (queryParams.facts === "true") {
   const boardgameCommandInput: GetCommandInput = {
     TableName: process.env.BOARDGAME_TABLE_NAME,
     Key: { id: boardgameId },
   };
   const boardgameOutput = await ddbDocClient.send(new GetCommand(boardgameCommandInput));
   response.boardgame = boardgameOutput.Item;
 }

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
 },
      body: JSON.stringify({
        response
 }),
 };
 } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
 },
      body: JSON.stringify({ error }),
 };
 }
};

function createDocumentClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
 };
  const unmarshallOptions = {
    wrapNumbers: false,
 };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}