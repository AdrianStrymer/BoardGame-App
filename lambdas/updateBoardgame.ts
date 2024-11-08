import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";
import { CookieMap, createPolicy, JwtToken, parseCookies, verifyToken } from "../shared/util";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["Boardgame"] || {});
const ddbDocClient = createDdbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async function (event:any) {
try {
  console.log("[EVENT]", JSON.stringify(event));

  const cookies: CookieMap = parseCookies(event);
    if (!cookies) {
      return {
        statusCode: 200,
        body: "Unauthorised request",
      };
    }

    const verifiedJwt: JwtToken | null = await verifyToken(
      cookies.token,
      process.env.USER_POOL_ID!,
      process.env.REGION!
    );

    if (!verifiedJwt) {
      return {
        statusCode: 403,
        body: "Forbidden: invalid token" ,
      };
    }


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

/*
{
    "id" : 6,
    "name": "a",
    "release_year": 2020,
    "country_of_origin": "United States",
    "description": "A classic board game where players buy, trade, and develop properties to build a real estate empire and drive their opponents into bankruptcy."

}
    */
