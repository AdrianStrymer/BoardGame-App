import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";

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
    const boardgameId = parseInt(queryParams?.boardgameId);
    let commandInput: QueryCommandInput = {
      TableName: process.env.PUBLISHER_TABLE_NAME,
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
 } else {
      commandInput = {
 ...commandInput,
        KeyConditionExpression: "boardgameId = :m",
        ExpressionAttributeValues: {
          ":m": boardgameId,
 },
 };
 }

    const commandOutput = await ddbDocClient.send(
      new QueryCommand(commandInput)
 );

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
 },
      body: JSON.stringify({
        data: commandOutput.Items,
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