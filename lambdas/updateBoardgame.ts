import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["Boardgame"] || {});
const ddbDocClient = createDdbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
try {
  console.log("[EVENT]", JSON.stringify(event));

  const boardgameId = event.pathParameters?.boardgameId;
  const body = event.body ? JSON.parse(event.body) : undefined;

  if (!boardgameId || !body) {
    return {
        statusCode: 500,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Missing boardgame ID or request body" }),
      };
    }

    if (!isValidBodyParams(body)) {
        return {
          statusCode: 500,
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            message: `Incorrect type. Must match Boardgame schema`,
            schema: schema.definitions["Boardgame"],
          }),
        };
      }

  const updateParams: any = {
    TableName: process.env.TABLE_NAME,
    Key: { id: Number(boardgameId) },
    UpdateExpression:
      "SET #name = :name, release_year = :release_year, country_of_origin = :country_of_origin, description = :description",
    ExpressionAttributeNames: {
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":name": body.name,
      ":release_year": body.release_year,
      ":country_of_origin": body.country_of_origin,
      ":description": body.description,
    },
    ReturnValues: "UPDATED_NEW",
  };

    const commandOutput = await ddbDocClient.send(new UpdateCommand(updateParams));
    return {
        statusCode: 201,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "Boardgame added" }),
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

function createDdbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = { wrapNumbers: false };
  return DynamoDBDocumentClient.from(ddbClient, { marshallOptions, unmarshallOptions });
}
